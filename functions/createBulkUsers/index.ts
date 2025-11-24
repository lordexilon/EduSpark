// functions/createBulkUsers/index.ts
// Edge Function para crear usuarios masivamente en auth.users sin confirmación de email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obtener variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Crear cliente con service role key (tiene permisos de admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Obtener token de autorización
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el usuario que hace la petición es admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el usuario es admin
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single();

    if (!userData || (userData as any).roles?.name !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Solo administradores pueden crear usuarios masivamente' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos del request
    const { users } = await req.json();

    if (!Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Se requiere un array de usuarios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    // Procesar cada usuario
    for (const userData of users) {
      try {
        const {
          email,
          password,
          first_name,
          last_name,
          role = 'student',
          institution_id,
          career_id,
          subject_id,
          course_id,
          position
        } = userData;

        // Validar datos requeridos
        if (!email || !first_name || !last_name || !institution_id) {
          results.push({
            success: false,
            email: email || 'sin email',
            error: 'Faltan datos requeridos: email, first_name, last_name, institution_id'
          });
          failedCount++;
          continue;
        }

        // Generar contraseña si no se proporciona
        const userPassword = password || generateRandomPassword();

        // Crear usuario en auth.users sin confirmación de email
        const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: userPassword,
          email_confirm: true, // Confirmar email automáticamente
          user_metadata: {
            first_name,
            last_name
          }
        });

        if (createError || !authUser.user) {
          results.push({
            success: false,
            email,
            error: createError?.message || 'Error creando usuario en auth.users'
          });
          failedCount++;
          continue;
        }

        const userId = authUser.user.id;

        // Obtener role_id
        const { data: roleData } = await supabaseAdmin
          .from('roles')
          .select('id')
          .eq('name', role)
          .single();

        const roleId = roleData?.id || 1; // Default: student

        // Crear/actualizar usuario en public.users
        await supabaseAdmin
          .from('users')
          .upsert({
            id: userId,
            email,
            first_name,
            last_name,
            role_id: roleId,
            email_verified: true,
            is_active: true
          }, {
            onConflict: 'id'
          });

        // Asignar a institución
        await supabaseAdmin
          .from('user_institutions')
          .upsert({
            user_id: userId,
            institution_id,
            is_primary: true,
            position: position || null
          }, {
            onConflict: 'user_id,institution_id'
          });

        // Asignar a carrera si se proporciona
        if (career_id) {
          await supabaseAdmin
            .from('career_enrollments')
            .upsert({
              student_id: userId,
              career_id,
              status: 'active'
            }, {
              onConflict: 'student_id,career_id'
            });
        }

        // Asignar a curso si se proporciona
        if (course_id) {
          await supabaseAdmin
            .from('course_enrollments')
            .upsert({
              student_id: userId,
              course_id,
              status: 'active'
            }, {
              onConflict: 'student_id,course_id'
            });
        }

        results.push({
          success: true,
          user_id: userId,
          email,
          password: userPassword, // Devolver contraseña generada
          message: 'Usuario creado exitosamente'
        });
        successCount++;

      } catch (error: any) {
        results.push({
          success: false,
          email: userData.email || 'sin email',
          error: error.message || 'Error desconocido'
        });
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: users.length,
        success_count: successCount,
        failed_count: failedCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

