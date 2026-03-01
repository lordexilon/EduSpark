const functions = require('@google-cloud/functions-framework');
const { createClient } = require('@supabase/supabase-js');

// No inicializar Supabase aquí - hacerlo dentro de la función para que las env vars estén disponibles
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[ServePDF] Variables de entorno faltantes:');
      console.error('  SUPABASE_URL:', supabaseUrl ? 'Definida' : 'NO DEFINIDA');
      console.error('  SUPABASE_SERVICE_KEY:', supabaseKey ? 'Definida (ocultada)' : 'NO DEFINIDA');
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridas');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('[ServePDF] Supabase inicializado correctamente');
  }
  return supabaseClient;
}

/**
 * Cloud Function para servir PDFs con restricciones de solo lectura
 * Previene descarga e impresión agregando headers HTTP restrictivos
 */
functions.http('servePdfReadOnly', async (req, res) => {
  console.log('[ServePDF] Solicitud recibida');

  // Configurar CORS - permitir desde el frontend
  const origin = req.headers.origin || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Inicializar Supabase (lazy)
    const supabase = getSupabase();
    // Obtener parámetros
    const { materialId, token } = req.query;

    if (!materialId) {
      return res.status(400).json({ error: 'Material ID es requerido' });
    }

    if (!token) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    console.log(`[ServePDF] Solicitud para materialId: ${materialId}`);

    // Verificar token de usuario
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData || !authData.user) {
      console.error('[ServePDF] Error de autenticación:', authError);
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const user = authData.user;
    console.log('[ServePDF] Usuario autenticado:', user.id);

    // Obtener rol del usuario para permisos especiales
    const { data: userData, error: userDetailsError } = await supabase
      .from('users')
      .select('*, roles(name)')
      .eq('id', user.id)
      .maybeSingle();

    if (userDetailsError) {
      console.warn('[ServePDF] Error obteniendo detalles del usuario:', userDetailsError);
    }

    const userRole = userData?.roles?.name;
    const isAdmin = userRole === 'admin';

    // 1. Intentar buscar en la tabla 'materials' (Cursos convencionales)
    let materialData = null;
    let hasAccess = isAdmin;

    console.log('[ServePDF] Buscando en tabla materials...');
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .maybeSingle();

    if (materialError) {
      console.error('[ServePDF] Error SQL en tabla materials:', materialError);
    }

    if (material) {
      console.log('[ServePDF] Encontrado en tabla materials');
      materialData = material;

      if (!hasAccess) {
        // Obtener curso para ver quién es el profesor
        const { data: course } = await supabase
          .from('courses')
          .select('teacher_id')
          .eq('id', material.course_id)
          .maybeSingle();

        if (course?.teacher_id === user.id) {
          hasAccess = true;
        } else {
          // Verificar inscripción
          const { data: enrollment } = await supabase
            .from('course_enrollments')
            .select('id')
            .eq('course_id', material.course_id)
            .eq('student_id', user.id)
            .maybeSingle();
          if (enrollment) hasAccess = true;
        }
      }
    } else {
      // 2. Intentar buscar en 'processed_documents' (Biblioteca de documentos)
      console.log('[ServePDF] No encontrado en materials, buscando en processed_documents...');
      const { data: doc, error: docError } = await supabase
        .from('processed_documents')
        .select('*')
        .eq('id', materialId)
        .maybeSingle();

      if (docError) {
        console.error('[ServePDF] Error SQL en tabla processed_documents:', docError);
      }

      if (doc) {
        console.log('[ServePDF] Encontrado en tabla processed_documents');
        materialData = doc;
        materialData.url = doc.file_url || doc.storage_path;

        if (!hasAccess) {
          // Verificar asignaciones a cursos
          const { data: assignments } = await supabase
            .from('document_course_assignments')
            .select('course_id')
            .eq('document_id', materialId);

          if (assignments && assignments.length > 0) {
            const courseIds = assignments.map(a => a.course_id);

            // Ver si es el profesor de alguno
            const { data: coursesAsTeacher } = await supabase
              .from('courses')
              .select('id')
              .in('id', courseIds)
              .eq('teacher_id', user.id);

            if (coursesAsTeacher && coursesAsTeacher.length > 0) {
              hasAccess = true;
            } else {
              // Ver si está inscrito en alguno
              const { data: studentEnrollments } = await supabase
                .from('course_enrollments')
                .select('id')
                .in('course_id', courseIds)
                .eq('student_id', user.id);

              if (studentEnrollments && studentEnrollments.length > 0) {
                hasAccess = true;
              }
            }
          }
        }
      } else {
        // 3. Intentar buscar en 'course_materials' (Nueva tabla del tutor)
        console.log('[ServePDF] No encontrado en biblioteca, buscando en course_materials...');
        const { data: cMaterial, error: cMatError } = await supabase
          .from('course_materials')
          .select('*')
          .eq('id', materialId)
          .maybeSingle();

        if (cMatError) {
          console.error('[ServePDF] Error SQL en tabla course_materials:', cMatError);
        }

        if (cMaterial) {
          console.log('[ServePDF] Encontrado en tabla course_materials');
          materialData = cMaterial;
          materialData.url = cMaterial.file_url;

          if (!hasAccess) {
            // Verificar acceso al curso
            const { data: enrollment } = await supabase
              .from('course_enrollments')
              .select('id')
              .eq('course_id', cMaterial.course_id)
              .eq('student_id', user.id)
              .maybeSingle();

            if (enrollment) {
              hasAccess = true;
            } else {
              const { data: course } = await supabase
                .from('courses')
                .select('teacher_id')
                .eq('id', cMaterial.course_id)
                .maybeSingle();
              if (course?.teacher_id === user.id) hasAccess = true;
            }
          }
        }
      }
    }

    if (!materialData) {
      console.error('[ServePDF] Material no encontrado en ninguna tabla id:', materialId);
      return res.status(404).json({ error: 'Documento no encontrado o no autorizado' });
    }

    if (!hasAccess) {
      console.error('[ServePDF] Usuario sin acceso verificado al material:', materialId);
      return res.status(403).json({ error: 'No tienes acceso a este documento' });
    }

    console.log('[ServePDF] Acceso verificado exitosamente');

    // Obtener la URL del archivo
    const fileUrl = materialData.url;

    if (!fileUrl) {
      console.error('[ServePDF] Material sin URL');
      return res.status(404).json({ error: 'Material sin archivo asociado' });
    }

    let fileBuffer;
    let contentType = 'application/pdf';

    // Determinar origen del archivo
    if (fileUrl.includes('supabase.co/storage') || !fileUrl.includes('drive.google.com')) {
      // --- CASO SUPABASE STORAGE ---
      console.log('[ServePDF] Procesando archivo de Supabase Storage');

      // Detectar bucket automáticamente (materials o course-documents)
      let bucketName = 'materials';
      if (fileUrl.includes('/course-documents/')) {
        bucketName = 'course-documents';
      }

      // Extraer el path del archivo (lo que viene después del nombre del bucket)
      let filePath = fileUrl;
      try {
        if (fileUrl.includes(`/${bucketName}/`)) {
          const parts = fileUrl.split(`${bucketName}/`);
          if (parts.length > 1) {
            filePath = parts[1].split('?')[0];
          }
        } else {
          // Fallback: intentar limpiar la URL si no encontramos el bucket directamente
          filePath = fileUrl.replace(/^.*\/v1\/object\/public\//, '').replace(/^.*\/v1\/object\/sign\//, '');
          if (filePath.includes('/')) {
            const pathParts = filePath.split('/');
            bucketName = pathParts[0];
            filePath = filePath.substring(bucketName.length + 1).split('?')[0];
          }
        }
      } catch (parseError) {
        console.error('[ServePDF] Error parseando URL de Supabase:', parseError);
        // Intentar usar la URL completa como fallback desesperado, aunque probablemente falle
      }

      console.log(`[ServePDF] Descargando: bucket=${bucketName}, path=${filePath}`);

      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (downloadError || !fileData) {
        console.error('[ServePDF] Error descargando de Supabase:', downloadError);
        return res.status(500).json({ error: 'Error descargando archivo de almacenamiento' });
      }

      const arrayBuffer = await fileData.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      contentType = fileData.type || 'application/pdf';
    } else {
      // --- CASO GOOGLE DRIVE ---
      console.log('[ServePDF] Procesando archivo de Google Drive');

      // Extraer ID de archivo de Drive
      const driveMatch = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
      const fileId = driveMatch ? driveMatch[1] : null;

      if (!fileId) {
        console.error('[ServePDF] No se pudo extraer ID de Drive de:', fileUrl);
        return res.status(400).json({ error: 'URL de Google Drive inválida' });
      }

      // Obtener token de Google del usuario para acceder al archivo
      const { data: googleToken, error: tokenError } = await supabase
        .from('user_google_tokens')
        .select('*')
        .eq('user_id', user.id)
        .in('service_type', ['drive', 'both'])
        .maybeSingle();

      if (tokenError || !googleToken) {
        console.error('[ServePDF] Token de Google no encontrado para el usuario');
        // Si es público en Drive, podríamos intentar bajarlo sin token, 
        // pero usualmente necesitaremos el token por seguridad
        return res.status(401).json({ error: 'Cuenta de Google Drive no vinculada' });
      }

      console.log('[ServePDF] Descargando desde Google Drive API');

      const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${googleToken.access_token}`
        }
      });

      if (!driveResponse.ok) {
        const errorData = await driveResponse.text();
        console.error('[ServePDF] Error descargando de Google Drive:', errorData);
        return res.status(500).json({ error: 'Error al obtener el archivo de Google Drive' });
      }

      const arrayBuffer = await driveResponse.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      contentType = driveResponse.headers.get('content-type') || 'application/pdf';
    }

    console.log('[ServePDF] Archivo obtenido, sirviendo con headers restrictivos');

    // Configurar headers para prevenir descarga e impresión
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', 'inline; filename="document.pdf"');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('X-Download-Options', 'noopen');
    res.set('X-Permitted-Cross-Domain-Policies', 'none');

    // CSP para seguridad
    res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors *;");

    // Enviar el archivo
    res.status(200).send(fileBuffer);
    console.log('[ServePDF] Archivo enviado exitosamente');

  } catch (error) {
    console.error('[ServePDF] Error General:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message,
      materialId: req.query.materialId
    });
  }
});
