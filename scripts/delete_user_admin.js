/**
 * Script para eliminar un usuario creado incorrectamente
 * Usuario: joaquinrios01800@gmail.com
 * ID: d4f83b3b-d5a5-4ebd-b1f0-256c9928dbdc
 * 
 * Ejecutar con: node scripts/delete_user_admin.js
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = 'https://mckfscukxcqwntpjagar.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NTQzNCwiZXhwIjoyMDc2MzIxNDM0fQ.gj8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8';

const USER_ID = 'd4f83b3b-d5a5-4ebd-b1f0-256c9928dbdc';
const USER_EMAIL = 'joaquinrios01800@gmail.com';

async function deleteUser() {
  // Crear cliente de Supabase con service_role para acceso admin
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔍 Verificando usuario antes de eliminar...');
    
    // 1. Verificar si existe en public.users
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', USER_ID)
      .single();

    if (publicError && publicError.code !== 'PGRST116') {
      console.error('❌ Error verificando public.users:', publicError);
    } else if (publicUser) {
      console.log('✅ Usuario encontrado en public.users:', publicUser);
    } else {
      console.log('ℹ️ Usuario no encontrado en public.users');
    }

    // 2. Verificar si existe en auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(USER_ID);
    
    if (authError) {
      console.error('❌ Error verificando auth.users:', authError);
    } else if (authUser?.user) {
      console.log('✅ Usuario encontrado en auth.users:', {
        id: authUser.user.id,
        email: authUser.user.email,
        created_at: authUser.user.created_at
      });
    } else {
      console.log('ℹ️ Usuario no encontrado en auth.users');
    }

    // 3. Verificar relaciones en user_institutions
    const { data: userInstitutions, error: uiError } = await supabase
      .from('user_institutions')
      .select('id, institution_id')
      .eq('user_id', USER_ID);

    if (uiError) {
      console.error('❌ Error verificando user_institutions:', uiError);
    } else if (userInstitutions && userInstitutions.length > 0) {
      console.log(`⚠️ Usuario tiene ${userInstitutions.length} relación(es) en user_institutions`);
    }

    // 4. Confirmar eliminación
    console.log('\n⚠️ ADVERTENCIA: Estás a punto de eliminar el usuario:');
    console.log(`   ID: ${USER_ID}`);
    console.log(`   Email: ${USER_EMAIL}`);
    console.log('\nPara continuar, descomenta las líneas de eliminación en el código.\n');

    // DESCOMENTAR LAS SIGUIENTES LÍNEAS PARA ELIMINAR REALMENTE:
    
    // // 5. Eliminar relaciones primero
    // if (userInstitutions && userInstitutions.length > 0) {
    //   const { error: deleteUIError } = await supabase
    //     .from('user_institutions')
    //     .delete()
    //     .eq('user_id', USER_ID);
    //   
    //   if (deleteUIError) {
    //     throw new Error(`Error eliminando user_institutions: ${deleteUIError.message}`);
    //   }
    //   console.log('✅ Relaciones en user_institutions eliminadas');
    // }

    // // 6. Eliminar de public.users
    // if (publicUser) {
    //   const { error: deletePublicError } = await supabase
    //     .from('users')
    //     .delete()
    //     .eq('id', USER_ID);
    //   
    //   if (deletePublicError) {
    //     throw new Error(`Error eliminando de public.users: ${deletePublicError.message}`);
    //   }
    //   console.log('✅ Usuario eliminado de public.users');
    // }

    // // 7. Eliminar de auth.users
    // if (authUser?.user) {
    //   const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(USER_ID);
    //   
    //   if (deleteAuthError) {
    //     throw new Error(`Error eliminando de auth.users: ${deleteAuthError.message}`);
    //   }
    //   console.log('✅ Usuario eliminado de auth.users');
    // }

    // console.log('\n✅ Usuario eliminado exitosamente');

  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    process.exit(1);
  }
}

// Ejecutar
deleteUser();

