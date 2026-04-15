# 🚀 Despliegue Manual de Edge Function `migrateUsersToAuth`

## ⚠️ **Problema Identificado**
El CLI de Supabase requiere Docker para desplegar Edge Functions, pero Docker no está instalado en tu sistema.

## ✅ **Solución: Despliegue Manual desde Dashboard**

### **Opción 1: Usar Dashboard de Supabase** (Recomendado - Sin Docker)

#### Paso 1: Acceder al Dashboard
1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions
2. Inicia sesión con tu cuenta de Supabase

#### Paso 2: Crear Nueva Edge Function
1. Clic en **"New Edge Function"** o **"Create Function"**
2. Nombre: `migrateUsersToAuth`
3. Seleccionar **"TypeScript"**

#### Paso 3: Copiar el Código
Copia TODO el contenido del archivo:
```
functions/migrateUsersToAuth/index.ts
```

El código completo está aquí:

```typescript
// functions/migrateUsersToAuth/index.ts
// Edge Function para migrar usuarios de public.users a auth.users

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

        // Crear cliente con service role key
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

        // Verificar que el usuario es admin
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Token inválido' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verificar rol de admin
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

        // Obtener parámetros del request
        const body = await req.json().catch(() => ({}));
        const {
            userIds = [],
            useIdentityDocumentAsPassword = true,
            defaultPassword = 'EduSpark2024!'
        } = body;

        // Obtener usuarios para migrar
        let query = supabaseAdmin
            .from('users')
            .select('id, email, first_name, last_name, identity_document')
            .not('email', 'is', null);

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

                // Validar longitud mínima
                if (password.length < 6) {
                    password = password + '123456'.substring(0, 6 - password.length);
                }

                // Crear usuario en auth.users
                const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: publicUser.email,
                    password: password,
                    email_confirm: true,
                    user_metadata: {
                        first_name: publicUser.first_name,
                        last_name: publicUser.last_name
                    }
                });

                if (createError) {
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

                // Sincronizar IDs si son diferentes
                if (authUser.user && authUser.user.id !== publicUser.id) {
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
                        ? 'identity_document'
                        : 'default_password'
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
```

#### Paso 4: Desplegar
1. Clic en **"Deploy"** o **"Save & Deploy"**
2. Esperar confirmación de despliegue exitoso

#### Paso 5: Verificar Variables de Entorno
La función necesita acceso a `SUPABASE_SERVICE_ROLE_KEY`. Verifica que esté configurada en:
- Dashboard → Settings → Edge Functions → Secrets

Si no está, agrégala:
```
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

---

### **Opción 2: Instalar Docker** (Para futuros despliegues)

Si prefieres usar el CLI en el futuro:

1. Descargar Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Instalar y reiniciar el sistema
3. Ejecutar Docker Desktop
4. Luego podrás usar: `supabase functions deploy migrateUsersToAuth`

---

## ✅ **Post-Despliegue**

### Verificar que la función esté activa:
1. Ve a: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar/functions
2. Deberías ver `migrateUsersToAuth` en la lista
3. Estado: **"Deployed"** o **"Active"**

### Probar la función:
1. Ve a: https://cacavelos.com.py/admin/migrate-orphan-users
2. Clic en **"Iniciar Migración Masiva"**
3. Deberías ver:
   - Progress bar
   - Resultados detallados
   - "12 usuarios migrados"

---

## 🔧 **Troubleshooting**

### Error: "Edge Function not found"
- Verifica que la función se desplegó correctamente en el dashboard
- Verifica el nombre exacto: `migrateUsersToAuth` (case-sensitive)

### Error: "Service role key not found"
- Ve a Dashboard → Settings → Secrets
- Agregar: `SUPABASE_SERVICE_ROLE_KEY`

### La función se ejecuta pero falla:
- Revisa los logs en: Dashboard → Functions → migrateUsersToAuth → Logs
- Busca errores específicos

---

**Última actualización:** 17 de Enero 2026  
**Proyecto:** mckfscukxcqwntpjagar  
**Dominio:** https://cacavelos.com.py
