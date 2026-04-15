// Edge Function para migrar archivos de Google Drive a Supabase Storage
// Maneja CORS correctamente para llamadas desde el frontend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  materialId: string;
  sourceFileId: string;
  courseId: number;
  fileName: string;
  mimeType?: string;
  action?: 'migrate' | 'get_token';
}

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      }
    });
  }

  try {
    // Obtener el token de autorización del header
    const authHeader = req.headers.get("Authorization");
    const apikey = req.headers.get("apikey");

    console.log("🔍 Headers recibidos:", {
      hasAuth: !!authHeader,
      hasApikey: !!apikey,
      authHeaderPrefix: authHeader?.substring(0, 20) || "none"
    });

    if (!authHeader) {
      console.error("❌ No se proporcionó token de autorización en el header");
      return new Response(
        JSON.stringify({ error: "No se proporcionó token de autorización" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Inicializar cliente de Supabase con SERVICE_ROLE_KEY para operaciones administrativas
    // pero validar el token del usuario
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Variables de entorno faltantes:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ error: "Configuración del servidor incompleta" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Crear cliente con SERVICE_ROLE_KEY para poder hacer operaciones administrativas
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Extraer el token del header
    const token = authHeader.replace("Bearer ", "");
    const anonKey = apikey || Deno.env.get("SUPABASE_ANON_KEY") || "";

    // Crear cliente con el token del usuario para validar autenticación
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Parsear el body de la petición
    const body: RequestBody = await req.json();
    const { materialId, sourceFileId, courseId, fileName, mimeType } = body;

    if (!sourceFileId || !materialId) {
      return new Response(
        JSON.stringify({
          error: "sourceFileId y materialId son requeridos",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `🔄 Iniciando migración: materialId=${materialId}, sourceFileId=${sourceFileId}`
    );

    // 1. Validar el token del usuario
    // Usar el cliente admin con el header Authorization del usuario para validar
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error("❌ Error validando usuario:", userError);
      return new Response(
        JSON.stringify({
          error: "Usuario no autenticado",
          details: userError?.message || "Token inválido o expirado"
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Usuario autenticado: ${user.id} (${user.email || 'sin email'})`);

    // Obtener token de Google Drive del usuario usando el cliente admin (con SERVICE_ROLE_KEY)
    // para poder leer la tabla user_google_tokens con RLS
    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from("user_google_tokens")
      .select("access_token, refresh_token, expires_at, service_type")
      .eq("user_id", user.id)
      .in("service_type", ["drive", "both"])
      .limit(1)
      .maybeSingle();

    if (tokenError) {
      console.error("❌ Error consultando tokens de Google Drive:", tokenError);
      return new Response(
        JSON.stringify({
          error: "Error al consultar tokens de Google Drive",
          details: tokenError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!tokens) {
      console.warn(`⚠️ No se encontró token de Google Drive para usuario ${user.id}`);
      return new Response(
        JSON.stringify({
          error: "No se encontró token de Google Drive. El usuario debe conectar su cuenta de Google.",
          details: "El usuario necesita autorizar el acceso a Google Drive primero"
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Token de Google Drive encontrado para usuario ${user.id}`);

    let accessToken = tokens.access_token;
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!googleClientId || !googleClientSecret) {
      console.error("❌ GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados");
      return new Response(
        JSON.stringify({
          error: "Configuración de Google OAuth incompleta en el servidor",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verificar si el token está expirado y refrescarlo si es necesario
    let needsRefresh = false;
    if (tokens.expires_at) {
      const expiresAt = new Date(tokens.expires_at);
      const now = new Date();
      // Refrescar si está expirado o si expira en menos de 5 minutos
      if (expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
        needsRefresh = true;
        console.log("🔄 Token expirado o próximo a expirar, refrescando...");
      }
    } else {
      // Si no hay fecha de expiración, intentar refrescar de todos modos
      needsRefresh = true;
      console.log("🔄 No hay fecha de expiración, intentando refrescar token...");
    }

    if (needsRefresh && tokens.refresh_token) {
      try {
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: tokens.refresh_token,
            grant_type: "refresh_token",
          }),
        });

        if (refreshResponse.ok) {
          const refreshed = await refreshResponse.json();
          accessToken = refreshed.access_token;
          console.log("✅ Token refrescado exitosamente");

          // Actualizar token en Supabase
          const expiresAtStr = new Date(
            Date.now() + (refreshed.expires_in || 3600) * 1000
          ).toISOString();

          const { error: updateError } = await supabaseAdmin
            .from("user_google_tokens")
            .update({
              access_token: refreshed.access_token,
              expires_at: expiresAtStr,
            })
            .eq("user_id", user.id)
            .eq("service_type", tokens.service_type);

          if (updateError) {
            console.error("⚠️ Error actualizando token en Supabase:", updateError);
          }
        } else {
          const refreshError = await refreshResponse.text();
          console.error("❌ Error refrescando token:", refreshError);
          // Continuar con el token original como último recurso
          console.log("⚠️ Usando token original (puede estar expirado)");
        }
      } catch (refreshError) {
        console.error("❌ Error al refrescar token:", refreshError);
        // Continuar con el token original como último recurso
        console.log("⚠️ Usando token original (puede estar expirado)");
      }
    } else if (!tokens.refresh_token) {
      console.warn("⚠️ No hay refresh_token disponible, usando token actual");
    }

    // 2. Verificar que el token es válido probando acceso a Drive
    console.log(`🔍 Verificando token de Google Drive...`);
    const testResponse = await fetch(
      `https://www.googleapis.com/drive/v3/about?fields=user`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.error(`❌ Token inválido o sin permisos: ${testResponse.status} - ${testError}`);
      return new Response(
        JSON.stringify({
          error: `Token de Google Drive inválido o sin permisos. El usuario debe reconectar su cuenta de Google Drive.`,
          details: testResponse.status === 401 ? "Token expirado o inválido" : "Sin permisos de acceso a Drive",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Token válido, procediendo...`);

    // NUEVO: Si la acción es solo obtener el token (para migración desde el cliente)
    if (body.action === 'get_token') {
      console.log(`✅ Acción get_token solicitada, retornando token refrescado`);
      return new Response(
        JSON.stringify({
          success: true,
          accessToken: accessToken,
          expiresAt: tokens.expires_at
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Procediendo con descarga...`);

    // 3. Obtener metadata del archivo ANTES de descargar para verificar tamaño
    console.log(`🔍 Obteniendo metadata del archivo: ${sourceFileId}`);
    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${sourceFileId}?fields=id,name,mimeType,size,webViewLink,webContentLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let fileMimeType = mimeType || "application/pdf";
    let fileSize = 0;
    let fileMetadata: any = null;

    if (metadataResponse.ok) {
      fileMetadata = await metadataResponse.json();
      fileMimeType = fileMetadata.mimeType || fileMimeType;
      fileSize = parseInt(fileMetadata.size || "0", 10);
      console.log(`📊 Metadata del archivo: tamaño=${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB), tipo=${fileMimeType}`);
    } else {
      console.warn(`⚠️ No se pudo obtener metadata del archivo, continuando...`);
    }

    // Límite de tamaño para Supabase Storage (1GB)
    const MAX_SUPABASE_SIZE = 1024 * 1024 * 1024; // 1 GB

    // Si el archivo es demasiado grande, usar Google Drive directamente sin migrar
    if (fileSize > MAX_SUPABASE_SIZE) {
      console.log(`⚠️ Archivo demasiado grande (${(fileSize / 1024 / 1024).toFixed(2)} MB > ${MAX_SUPABASE_SIZE / 1024 / 1024} MB), usando Google Drive directamente`);

      // Obtener URL de Google Drive para visualización
      const driveUrl = fileMetadata?.webViewLink || `https://drive.google.com/file/d/${sourceFileId}/view`;
      const driveDownloadUrl = fileMetadata?.webContentLink || `https://drive.google.com/uc?export=download&id=${sourceFileId}`;

      return new Response(
        JSON.stringify({
          success: true,
          bucketPath: null, // No se subió a Supabase Storage
          publicUrl: driveUrl,
          downloadUrl: driveDownloadUrl,
          fileSize,
          mimeType: fileMimeType,
          source: "google_drive", // Indica que el archivo está en Google Drive, no en Supabase Storage
          message: `Archivo demasiado grande (${(fileSize / 1024 / 1024).toFixed(2)} MB) para migrar a Supabase Storage. Se usará Google Drive directamente.`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Descargar archivo de Google Drive (solo si es pequeño)
    console.log(`⬇️ Descargando archivo de Google Drive: ${sourceFileId} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${sourceFileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      console.error(`❌ Error descargando archivo: ${driveResponse.status} - ${errorText}`);

      // Si el error es 403 (permisos insuficientes), proporcionar un mensaje más útil
      if (driveResponse.status === 403) {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.code === 403 && errorJson.error?.message?.includes("insufficient authentication scopes")) {
            return new Response(
              JSON.stringify({
                error: "El token de Google Drive no tiene los permisos necesarios. El usuario debe reconectar su cuenta de Google Drive con permisos completos.",
                details: "El token actual solo tiene permisos limitados (drive.file). Se necesitan permisos completos (drive) para acceder a archivos en Google Drive.",
                action: "reconnect_google_drive"
              }),
              {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } catch (e) {
          // Si no podemos parsear el error, continuar con el error genérico
        }
      }

      return new Response(
        JSON.stringify({
          error: `Error al descargar archivo de Google Drive: ${driveResponse.status}`,
          details: errorText,
        }),
        {
          status: driveResponse.status === 403 ? 403 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fileBlob = await driveResponse.blob();
    const fileArrayBuffer = await fileBlob.arrayBuffer();
    const fileBuffer = new Uint8Array(fileArrayBuffer);

    const actualFileSize = fileBuffer.length;
    console.log(`✅ Archivo descargado: ${actualFileSize} bytes`);

    // 5. Verificar tamaño real del archivo descargado (por si acaso)
    if (actualFileSize > MAX_SUPABASE_SIZE) {
      console.warn(`⚠️ Archivo descargado es más grande de lo esperado (${(actualFileSize / 1024 / 1024).toFixed(2)} MB), usando Google Drive directamente`);

      const driveUrl = fileMetadata?.webViewLink || `https://drive.google.com/file/d/${sourceFileId}/view`;
      const driveDownloadUrl = fileMetadata?.webContentLink || `https://drive.google.com/uc?export=download&id=${sourceFileId}`;

      return new Response(
        JSON.stringify({
          success: true,
          bucketPath: null,
          publicUrl: driveUrl,
          downloadUrl: driveDownloadUrl,
          fileSize: actualFileSize,
          mimeType: fileMimeType,
          source: "google_drive",
          message: `Archivo demasiado grande (${(actualFileSize / 1024 / 1024).toFixed(2)} MB) para migrar a Supabase Storage. Se usará Google Drive directamente.`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. Generar nombre único para el archivo en el bucket
    const fileExtension = fileMimeType.includes("pdf")
      ? ".pdf"
      : fileMimeType.includes("image")
        ? ".jpg"
        : ".bin";
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .substring(0, 100);
    const timestamp = Date.now();
    const bucketPath = `materials/${courseId}/${sanitizedFileName}_${timestamp}${fileExtension}`;

    // 7. Subir archivo a Supabase Storage
    // Usar el bucket "course-documents" que ya existe en el sistema
    // Usar cliente admin para subir archivos (requiere SERVICE_ROLE_KEY)
    console.log(`⬆️ Subiendo archivo a Supabase Storage: ${bucketPath}`);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("course-documents")
      .upload(bucketPath, fileBuffer, {
        contentType: fileMimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`❌ Error subiendo archivo:`, uploadError);
      // Si el error es por tamaño excedido, usar Google Drive directamente
      if (uploadError.statusCode === "413" || uploadError.message?.includes("exceeded") || uploadError.message?.includes("maximum")) {
        console.warn(`⚠️ Archivo excede límite de Supabase Storage, usando Google Drive directamente`);

        const driveUrl = fileMetadata?.webViewLink || `https://drive.google.com/file/d/${sourceFileId}/view`;
        const driveDownloadUrl = fileMetadata?.webContentLink || `https://drive.google.com/uc?export=download&id=${sourceFileId}`;

        return new Response(
          JSON.stringify({
            success: true,
            bucketPath: null,
            publicUrl: driveUrl,
            downloadUrl: driveDownloadUrl,
            fileSize: actualFileSize,
            mimeType: fileMimeType,
            source: "google_drive",
            message: `Archivo demasiado grande (${(actualFileSize / 1024 / 1024).toFixed(2)} MB) para migrar a Supabase Storage. Se usará Google Drive directamente.`,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const MAX_SIZE_MB = 1024; // 1 GB
      return new Response(
        JSON.stringify({
          error: `Error al subir archivo a Storage: ${uploadError.message}`,
          details: uploadError.statusCode === "413"
            ? `El archivo es demasiado grande (${(actualFileSize / 1024 / 1024).toFixed(2)} MB). El límite de Supabase Storage es ${MAX_SIZE_MB} MB.`
            : uploadError.message,
        }),
        {
          status: uploadError.statusCode === "413" ? 413 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Archivo subido exitosamente: ${bucketPath}`);

    // 8. Obtener URL pública del archivo
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("course-documents").getPublicUrl(bucketPath);

    console.log(`✅ URL pública generada: ${publicUrl}`);

    // 9. Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        bucketPath,
        publicUrl,
        fileSize: actualFileSize,
        mimeType: fileMimeType,
        source: "supabase_storage", // Indica que el archivo está en Supabase Storage
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Error en migrate-drive-to-bucket:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Error desconocido al migrar archivo",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

