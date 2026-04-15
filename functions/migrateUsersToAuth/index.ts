// functions/migrateUsersToAuth/index.ts
// Edge Function para migrar usuarios de public.users a auth.users
// Esto resuelve el problema de usuarios importados que no pueden iniciar sesión

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserToMigrate {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    identity_document: string | null;
    password?: string;
}

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
                JSON.stringify({ error: 'Solo administradores pueden migrar usuarios' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Obtener parámetros opcionales del request
        const body = await req.json().catch(() => ({}));
        const {
            userIds = [], // IDs específicos para migrar (opcional)
            useIdentityDocumentAsPassword = true, // Usar documento de identidad como contraseña
            defaultPassword = 'EduSpark2024!' // Contraseña por defecto si no hay documento
        } = body;

        // Obtener usuarios que necesitan migración
        let query = supabaseAdmin
            .from('users')
            .select('id, email, first_name, last_name, identity_document')
            .not('email', 'is', null);

        // Si se especificaron IDs, filtrar por ellos
        if (userIds.length > 0) {
            query = query.in('id', userIds);
        }

        const { data: publicUsers, error: fetchError } = await query;

        if (fetchError) {
            return new Response(
                JSON.stringify({ error: 'Error obteniendo usuarios: ' + fetchError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!publicUsers || publicUsers.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No hay usuarios para migrar',
                    total: 0,
                    migrated: 0,
                    skipped: 0,
                    failed: 0
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const results: any[] = [];
        let migratedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        // Procesar cada usuario
        for (const publicUser of publicUsers) {
            try {
                // Verificar si ya existe en auth.users
                const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(publicUser.id);

                if (existingAuth?.user) {
                    // Usuario ya existe en auth.users, saltar
                    results.push({
                        email: publicUser.email,
                        status: 'skipped',
                        reason: 'Ya existe en auth.users'
                    });
                    skippedCount++;
                    continue;
                }

                // Determinar contraseña
                let password: string;
                if (useIdentityDocumentAsPassword && publicUser.identity_document) {
                    password = publicUser.identity_document;
                } else {
                    password = defaultPassword;
                }

                // Validar que la contraseña tenga al menos 6 caracteres
                if (password.length < 6) {
                    password = password + '123456'.substring(0, 6 - password.length);
                }

                // Crear usuario en auth.users con el mismo ID
                const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: publicUser.email,
                    password: password,
                    email_confirm: true, // Confirmar email automáticamente
                    user_metadata: {
                        first_name: publicUser.first_name,
                        last_name: publicUser.last_name
                    }
                });

                if (createError) {
                    // Si el error es que el email ya existe, intentar obtener el usuario
                    if (createError.message.includes('already been registered')) {
                        results.push({
                            email: publicUser.email,
                            status: 'skipped',
                            reason: 'Email ya registrado en auth.users'
                        });
                        skippedCount++;
                    } else {
                        results.push({
                            email: publicUser.email,
                            status: 'failed',
                            error: createError.message
                        });
                        failedCount++;
                    }
                    continue;
                }

                // Actualizar public.users para sincronizar el ID si es diferente
                if (authUser.user && authUser.user.id !== publicUser.id) {
                    // Actualizar referencias en public.users
                    await supabaseAdmin
                        .from('users')
                        .update({ id: authUser.user.id })
                        .eq('id', publicUser.id);
                }

                results.push({
                    email: publicUser.email,
                    user_id: authUser.user?.id,
                    status: 'migrated',
                    password_used: useIdentityDocumentAsPassword && publicUser.identity_document
                        ? 'documento_identidad'
                        : 'contraseña_por_defecto'
                });
                migratedCount++;

            } catch (error: any) {
                results.push({
                    email: publicUser.email,
                    status: 'failed',
                    error: error.message || 'Error desconocido'
                });
                failedCount++;
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Migración completada: ${migratedCount} migrados, ${skippedCount} omitidos, ${failedCount} fallidos`,
                total: publicUsers.length,
                migrated: migratedCount,
                skipped: skippedCount,
                failed: failedCount,
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
