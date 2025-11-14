/**
 * Servicio de API unificado para EduSpark
 * Combina funcionalidades de autenticación, usuarios y gestión de contenido
 */

import { supabase, type User, type AuthUser } from '../lib/supabase'

// Configuración del backend de administración
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3001/api'

// Tipos para las respuestas de la API
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface LoginResponse {
  success: boolean
  user?: User
  token?: string
  error?: string
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  roleId: number
}

// Servicio de autenticación
export const authAPI = {
  // Login con Supabase Auth
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('🔐 Intentando iniciar sesión para:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })

      if (error) {
        console.error('❌ Error en Supabase Auth signInWithPassword:');
        console.error('  - Código:', error.status || error.code);
        console.error('  - Mensaje:', error.message);
        console.error('  - Error completo:', JSON.stringify(error, null, 2));
        
        // Traducir errores comunes a mensajes más amigables y específicos
        let errorMessage = 'Error desconocido al iniciar sesión';
        const errorCode = error.code || error.status;
        const errorMsg = error.message?.toLowerCase() || '';
        
        // Errores específicos de Supabase Auth
        if (errorCode === 'email_not_confirmed' || 
            errorMsg.includes('email not confirmed') ||
            errorMsg.includes('email_not_confirmed') ||
            errorMsg.includes('email address not confirmed')) {
          errorMessage = 'Tu email no ha sido confirmado. Por favor, verifica tu correo electrónico o contacta al administrador para confirmarlo.';
        } 
        // Credenciales inválidas
        else if (errorCode === 'invalid_credentials' || 
            errorCode === 'invalid_grant' ||
            errorMsg.includes('invalid login credentials') ||
            errorMsg.includes('invalid password') ||
            errorMsg.includes('wrong password') ||
            errorMsg.includes('incorrect password')) {
          errorMessage = 'Email o contraseña incorrectos. Por favor, verifica tus credenciales e intenta nuevamente.';
        } 
        // Demasiados intentos
        else if (errorCode === 'too_many_requests' ||
            errorMsg.includes('too many requests') ||
            errorMsg.includes('rate limit') ||
            errorMsg.includes('too many attempts')) {
          errorMessage = 'Demasiados intentos fallidos. Por favor, espera unos minutos e intenta nuevamente.';
        } 
        // Usuario no encontrado
        else if (errorCode === 'user_not_found' ||
            errorMsg.includes('user not found') ||
            errorMsg.includes('no user found')) {
          errorMessage = 'No existe un usuario con este email. Por favor, verifica tu email o regístrate si es tu primera vez.';
        }
        // Email inválido
        else if (errorCode === 'invalid_email' ||
            errorMsg.includes('invalid email') ||
            errorMsg.includes('email format')) {
          errorMessage = 'El formato del email no es válido. Por favor, verifica que esté escrito correctamente.';
        }
        // Contraseña débil o inválida
        else if (errorCode === 'weak_password' ||
            errorMsg.includes('password') && errorMsg.includes('weak')) {
          errorMessage = 'La contraseña no cumple con los requisitos de seguridad.';
        }
        // Cuenta deshabilitada o suspendida
        else if (errorMsg.includes('disabled') ||
            errorMsg.includes('suspended') ||
            errorMsg.includes('banned')) {
          errorMessage = 'Tu cuenta ha sido deshabilitada. Por favor, contacta al administrador para más información.';
        }
        // Error de red o conexión
        else if (errorCode === 'network_error' ||
            errorMsg.includes('network') ||
            errorMsg.includes('connection') ||
            errorMsg.includes('timeout') ||
            errorMsg.includes('fetch failed')) {
          errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.';
        }
        // Error 400 genérico
        else if (error.status === 400 || errorCode === 400) {
          if (error.message) {
            // Intentar usar el mensaje original si es descriptivo
            const originalMsg = error.message;
            if (originalMsg.length < 100) {
              errorMessage = `Error al iniciar sesión: ${originalMsg}`;
            } else {
              errorMessage = 'Error al iniciar sesión. Por favor, verifica tus credenciales e intenta nuevamente.';
            }
          } else {
            errorMessage = 'Error al iniciar sesión. Por favor, verifica tus credenciales e intenta nuevamente.';
          }
        }
        // Error 401 - No autorizado
        else if (error.status === 401 || errorCode === 401) {
          errorMessage = 'No autorizado. Por favor, verifica tus credenciales e intenta nuevamente.';
        }
        // Error 403 - Prohibido
        else if (error.status === 403 || errorCode === 403) {
          errorMessage = 'Acceso prohibido. Por favor, contacta al administrador si crees que esto es un error.';
        }
        // Error 500 - Servidor
        else if (error.status === 500 || errorCode === 500) {
          errorMessage = 'Error del servidor. Por favor, intenta nuevamente en unos momentos.';
        }
        // Si hay un mensaje descriptivo, usarlo
        else if (error.message && error.message.length < 150) {
          errorMessage = error.message;
        }
        // Mensaje genérico como último recurso
        else {
          errorMessage = 'Error al iniciar sesión. Por favor, verifica tus credenciales e intenta nuevamente.';
        }
        
        return { success: false, error: errorMessage }
      }

      if (!data.user) {
        console.error('⚠️ Supabase Auth devolvió éxito pero sin datos de usuario');
        return { success: false, error: 'No se pudo obtener información del usuario' }
      }

      console.log('✅ Autenticación exitosa, obteniendo datos del usuario...');

      // Obtener información completa del usuario desde nuestra tabla personalizada
      // Intentar primero con join de roles
      let userData: any = null;
      let userError: any = null;
      
      const userResponse = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          created_at,
          updated_at,
          role_id,
          roles(id, name)
        `)
        .eq('id', data.user.id)
        .maybeSingle();

      userData = userResponse.data;
      userError = userResponse.error;

      // Si hay error (especialmente 400) o no hay datos, intentar sin el join
      if (userError || !userData) {
        console.warn('⚠️ Error con join de roles, intentando consulta alternativa:', userError?.message || 'Sin datos');
        
        const userResponseAlt = await supabase
          .from('users')
          .select('id, email, first_name, last_name, created_at, updated_at, role_id')
          .eq('id', data.user.id)
          .maybeSingle();
        
        if (userResponseAlt.data && !userResponseAlt.error) {
          // Obtener el rol por separado
          if (userResponseAlt.data.role_id) {
            const roleResponse = await supabase
              .from('roles')
              .select('id, name')
              .eq('id', userResponseAlt.data.role_id)
              .single();
            
            userData = {
              ...userResponseAlt.data,
              roles: roleResponse.data || null
            };
            userError = null; // Limpiar el error anterior
          } else {
            userData = userResponseAlt.data;
            userError = null; // Limpiar el error anterior
          }
        } else {
          userError = userResponseAlt.error || userError;
        }
      }

      if (userError) {
        console.error('❌ Error al obtener datos del usuario:', userError)
        return { success: false, error: 'Error al obtener información del usuario' }
      }

      if (!userData) {
        console.error('⚠️ Usuario autenticado pero no encontrado en public.users');
        return { success: false, error: 'Tu usuario no está registrado en el sistema. Por favor, contacta al administrador.' }
      }

      // Extraer el rol de la respuesta (puede venir como roles o role según la sintaxis)
      const roleData = userData.roles || (userData as any).role || null;
      const finalUserData = {
        ...userData,
        role: roleData ? {
          id: roleData.id,
          name: roleData.name
        } : {
          id: userData.role_id || 1,
          name: 'student' // Default si no se puede obtener el rol
        }
      };

      console.log('✅ Login exitoso:', { email: finalUserData.email, role: finalUserData.role?.name });

      return {
        success: true,
        user: finalUserData as User,
        token: data.session?.access_token
      }
    } catch (error: any) {
      console.error('❌ Error inesperado en login:', error)
      return { success: false, error: error?.message || 'Error interno del servidor. Por favor, intenta nuevamente.' }
    }
  },

  // Registro de nuevo usuario
  async register(userData: RegisterData): Promise<ApiResponse<User>> {
    try {
      // Validar datos antes de enviar
      if (!userData.email || !userData.password) {
        return { success: false, error: 'Email y contraseña son requeridos' }
      }

      if (userData.password.length < 6) {
        return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' }
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userData.email)) {
        return { success: false, error: 'El formato del email no es válido' }
      }

      // ⚠️ SEGURIDAD: Todos los usuarios nuevos SIEMPRE se crean como estudiantes (role_id: 1)
      // El rol solo puede ser cambiado DESPUÉS del registro por un administrador
      // Esto previene que alguien se registre como admin durante el proceso de registro
      // Mapeo correcto: 1=student, 2=teacher, 3=admin, 4=coordinator
      const forcedRoleId = 1; // Siempre estudiante (role_id: 1)
      
      console.log('📝 Registrando usuario:', {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        roleId: forcedRoleId,
        note: 'Todos los usuarios se crean como estudiantes. El rol puede ser cambiado después por un administrador.'
      })

      // Crear el usuario en Supabase Auth con metadata
      // ⚠️ IMPORTANTE: No enviar role_id en metadata para evitar que el trigger lo use
      // El trigger siempre usará role_id = 1 (student) por defecto
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName
            // ⚠️ NO incluir role_id aquí - el trigger siempre usará role_id = 1 (student)
          },
          emailRedirectTo: undefined // No requerir confirmación de email (opcional)
        }
      })

      if (authError) {
        console.error('❌ Error en Supabase Auth signUp:')
        console.error('  - Código:', authError.status || authError.code)
        console.error('  - Mensaje:', authError.message)
        console.error('  - Error completo:', JSON.stringify(authError, null, 2))
        
        // Traducir errores comunes a mensajes más amigables
        let errorMessage = authError.message || 'Error desconocido al registrar usuario'
        
        // Errores comunes de Supabase
        if (authError.message?.toLowerCase().includes('already registered') || 
            authError.message?.toLowerCase().includes('already exists') ||
            authError.message?.toLowerCase().includes('user already registered')) {
          errorMessage = 'Este email ya está registrado. Por favor, inicia sesión o usa otro email.'
        } else if (authError.code === 'email_address_invalid') {
          // Supabase a veces devuelve "email_address_invalid" cuando el email ya existe (por seguridad)
          // Verificar si el email existe en nuestra base de datos
          console.log('🔍 Verificando si el email ya existe en la base de datos...')
          try {
            const { data: existingUser } = await supabase
              .from('users')
              .select('email')
              .eq('email', userData.email.trim().toLowerCase())
              .maybeSingle()
            
            if (existingUser) {
              errorMessage = 'Este email ya está registrado. Por favor, inicia sesión o usa otro email.'
            } else {
              // El email puede estar en auth.users pero no en public.users (estado inconsistente)
              // o puede ser una restricción de dominio/configuración de Supabase
              errorMessage = `El email "${userData.email}" no está disponible. Puede estar ya registrado, eliminado o bloqueado. Por favor, usa otro email o contacta al administrador.`
            }
          } catch (checkError) {
            console.error('Error al verificar email existente:', checkError)
            errorMessage = `El email "${userData.email}" no está disponible. Por favor, intenta con otro email o contacta al administrador si crees que es un error.`
          }
        } else if (authError.message?.toLowerCase().includes('password') || 
                   authError.message?.toLowerCase().includes('weak password')) {
          errorMessage = 'La contraseña no cumple con los requisitos de seguridad. Debe tener al menos 6 caracteres.'
        } else if (authError.message?.toLowerCase().includes('email') && 
                   authError.message?.toLowerCase().includes('invalid')) {
          errorMessage = `El email "${userData.email}" no es válido. Por favor, verifica el formato del email.`
        } else if (authError.status === 400) {
          // Error 400 genérico - mostrar mensaje más detallado
          errorMessage = `Error en el registro: ${authError.message || 'Por favor, verifica todos los campos e intenta nuevamente.'}`
        }
        
        return { success: false, error: errorMessage }
      }

      if (!authData.user) {
        return { success: false, error: 'No se pudo crear el usuario' }
      }

      // El trigger automáticamente creará el registro en nuestra tabla
      // Intentar obtener el usuario con reintentos (el trigger puede tardar)
      let userRecord = null;
      let userError = null;
      let userNotFound = false; // Flag para detectar si el usuario no existe
      const maxRetries = 5;
      const retryDelay = 500; // 500ms entre intentos

      console.log('🔍 Buscando usuario en base de datos (ID:', authData.user.id, ')');

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            created_at,
            updated_at,
            role:roles(id, name)
          `)
          .eq('id', authData.user.id)
          .maybeSingle(); // Usar maybeSingle en lugar de single para evitar error si no existe

        if (!error && data) {
          console.log('✅ Usuario encontrado en base de datos en intento', attempt + 1);
          userRecord = data;
          break;
        }
        
        // maybeSingle devuelve { data: null, error: null } cuando no encuentra el registro
        if (!error && !data) {
          console.log(`⏳ Intento ${attempt + 1}/${maxRetries}: Usuario aún no existe en la BD (esperando trigger)...`);
          userNotFound = true;
          continue;
        }
        
        // Si hay un error diferente a "no encontrado"
        if (error) {
          userError = error;
          console.error(`❌ Error al buscar usuario (intento ${attempt + 1}):`, error);
          
          // Si es PGRST116 (no encontrado), continuar intentando
          if (error.code === 'PGRST116') {
            userNotFound = true;
            continue;
          }
          
          // Si es otro error, salir del loop
          break;
        }
      }

      if (!userRecord) {
        // Si el usuario no existe después de todos los reintentos, crearlo manualmente usando RPC
        if (userNotFound || userError?.code === 'PGRST116') {
          console.log('⚠️ El trigger no creó el registro después de', maxRetries, 'intentos, creando manualmente vía RPC...');
          
          // Intentar usar la función RPC (requiere que el usuario esté autenticado)
          // Primero, verificar que la sesión esté disponible
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !sessionData.session) {
            console.warn('⚠️ No hay sesión disponible todavía, esperando un momento...');
            // Esperar un poco más para que la sesión se establezca
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Usar función RPC que tiene SECURITY DEFINER y evita problemas de RLS
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('create_user_profile', {
              p_user_id: authData.user.id,
              p_email: authData.user.email || userData.email,
              p_first_name: userData.firstName,
              p_last_name: userData.lastName,
              p_role_id: userData.roleId
            });

          if (rpcError) {
            console.error('❌ Error al crear usuario vía RPC:', rpcError);
            
            // Si el RPC falla, intentar el método directo como último recurso
            console.log('🔄 Intentando método directo como último recurso...');
            const { data: manualUser, error: manualError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                email: authData.user.email || userData.email,
                first_name: userData.firstName,
                last_name: userData.lastName,
                role_id: userData.roleId
              })
              .select(`
                id,
                email,
                first_name,
                last_name,
                created_at,
                updated_at,
                role:roles(id, name)
              `)
              .single();

            if (manualError || !manualUser) {
              return { 
                success: false, 
                error: `Error al crear el usuario: ${manualError?.message || rpcError.message || 'No se pudo crear el registro en la base de datos'}` 
              };
            }
            
            userRecord = manualUser;
          } else if (rpcData && (Array.isArray(rpcData) ? rpcData.length > 0 : rpcData)) {
            // La función RPC devuelve una tabla, puede ser un array o un objeto
            const rpcUser = Array.isArray(rpcData) ? rpcData[0] : rpcData;
            console.log('✅ Usuario creado vía RPC exitosamente');
            
            // Obtener el usuario con la relación de roles (necesario para la estructura User)
            const { data: fullUser, error: fetchError } = await supabase
              .from('users')
              .select(`
                id,
                email,
                first_name,
                last_name,
                created_at,
                updated_at,
                role:roles(id, name)
              `)
              .eq('id', rpcUser.id)
              .single();
            
            if (!fetchError && fullUser) {
              userRecord = fullUser;
            } else {
              console.warn('⚠️ No se pudo obtener el usuario completo con roles, usando datos del RPC');
              // Si no podemos obtener el usuario completo, construir uno básico con los datos del RPC
              // Nota: esto requerirá que el hook obtenga el rol después, pero al menos el usuario existirá
              const { data: roleData } = await supabase
                .from('roles')
                .select('id, name')
                .eq('id', rpcUser.role_id)
                .single();
              
              userRecord = {
                ...rpcUser,
                role: roleData || { id: rpcUser.role_id || 1, name: 'student' }
              } as User;
            }
          } else {
            console.error('❌ Función RPC no devolvió datos');
            return { 
              success: false, 
              error: 'Error al crear el usuario: La función RPC no devolvió datos' 
            };
          }
        } else if (userError) {
          console.error('❌ Error al obtener datos del usuario:', userError);
          return { 
            success: false, 
            error: `Error al obtener el perfil del usuario: ${userError.message || 'Error desconocido'}` 
          };
        } else {
          console.error('❌ No se pudo obtener el usuario por una razón desconocida');
          return { 
            success: false, 
            error: 'Error desconocido al obtener el perfil del usuario' 
          };
        }
      }

      return {
        success: true,
        data: userRecord as User
      }
    } catch (error) {
      console.error('Error en registro:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  },

  // Logout
  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  // Obtener usuario actual
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return null

      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          created_at,
          updated_at,
          role:roles(id, name)
        `)
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error al obtener usuario actual:', error)
        return null
      }

      return userData as User
    } catch (error) {
      console.error('Error al obtener usuario actual:', error)
      return null
    }
  },

  // Verificar sesión
  async getSession() {
    return await supabase.auth.getSession()
  }
}

// Servicio de usuarios (para administradores)
export const usersAPI = {
  // Obtener todos los usuarios
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          is_active,
          created_at,
          updated_at,
          role:roles(id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data as User[] }
    } catch (error) {
      console.error('Error al obtener usuarios:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  },

  // Crear usuario (admin) - Requiere password para crear cuenta en Supabase Auth
  async createUser(userData: RegisterData): Promise<ApiResponse<User>> {
    try {
      // Primero crear el usuario en Supabase Auth con metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role_id: userData.roleId
          }
        }
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'No se pudo crear el usuario en Supabase Auth' }
      }

      // El trigger automáticamente creará el registro en nuestra tabla
      // Intentar obtener el usuario con reintentos (el trigger puede tardar)
      let userRecord = null;
      let userError = null;
      const maxRetries = 5;
      const retryDelay = 500; // 500ms entre intentos

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            created_at,
            updated_at,
            role:roles(id, name)
          `)
          .eq('id', authData.user.id)
          .maybeSingle(); // Usar maybeSingle en lugar de single para evitar error si no existe

        if (!error && data) {
          userRecord = data;
          break;
        }
        
        userError = error;
        
        // Si es PGRST116 (no encontrado), continuar intentando
        if (error?.code === 'PGRST116') {
          console.log(`⏳ Intento ${attempt + 1}/${maxRetries}: Esperando que el trigger cree el registro...`);
          continue;
        }
        
        // Si es otro error, salir del loop
        break;
      }

      if (!userRecord) {
        console.error('Error al obtener datos del usuario después de reintentos:', userError);
        
        // Si el trigger falló, intentar crear el registro manualmente
        if (userError?.code === 'PGRST116') {
          console.log('⚠️ El trigger no creó el registro, intentando crear manualmente...');
          
          const { data: manualUser, error: manualError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: authData.user.email || userData.email,
              first_name: userData.firstName,
              last_name: userData.lastName,
              role_id: userData.roleId
            })
            .select(`
              id,
              email,
              first_name,
              last_name,
              created_at,
              updated_at,
              role:roles(id, name)
            `)
            .single();

          if (manualError || !manualUser) {
            return { 
              success: false, 
              error: `Error al crear el usuario: ${manualError?.message || 'No se pudo crear el registro en la base de datos'}` 
            };
          }
          
          userRecord = manualUser;
        } else {
          return { 
            success: false, 
            error: `Error al obtener el perfil del usuario: ${userError?.message || 'Error desconocido'}` 
          };
        }
      }

      return {
        success: true,
        data: userRecord as User
      }
    } catch (error) {
      console.error('Error al crear usuario:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  },

  // Actualizar usuario
  async updateUser(userId: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select(`
          id,
          email,
          first_name,
          last_name,
          created_at,
          updated_at,
          role:roles(id, name)
        `)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data as User }
    } catch (error) {
      console.error('Error al actualizar usuario:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  },

  // Eliminar usuario (soft delete - desactivar)
  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    try {
      // En lugar de eliminar, desactivamos el usuario
      const { error } = await supabase
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error al eliminar usuario:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  },

  // Confirmar email de un usuario (solo para admins/coordinators)
  async confirmUserEmail(userId: string): Promise<ApiResponse<{ email: string; email_confirmed_at: string | null }>> {
    try {
      const { data, error } = await supabase
        .rpc('admin_confirm_user_email', { p_user_id: userId })

      if (error) {
        console.error('Error al confirmar email:', error)
        return { success: false, error: error.message || 'Error al confirmar el email del usuario' }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'No se pudo confirmar el email' }
      }

      const result = data[0]
      return { 
        success: true, 
        data: {
          email: result.email,
          email_confirmed_at: result.email_confirmed_at
        }
      }
    } catch (error: any) {
      console.error('Error al confirmar email:', error)
      return { success: false, error: error?.message || 'Error interno del servidor' }
    }
  },

  // Activar/desactivar usuario
  async toggleUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select(`
          id,
          email,
          first_name,
          last_name,
          created_at,
          updated_at,
          role:roles(id, name)
        `)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data as User }
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  },

  // Cambiar contraseña de usuario (requiere admin)
  // ⚠️ NOTA: Cambiar contraseñas requiere el service role key de Supabase
  // que no está disponible desde el cliente por seguridad.
  // Opciones: backend API o Supabase Dashboard
  async changeUserPassword(userId: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      // Intentar usar Supabase Admin API (solo funciona si tienes service role key configurado)
      // En el cliente normal, esto no funcionará por seguridad
      if (supabase.auth.admin) {
        const { error } = await supabase.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        )

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true }
      }

      // Si admin API no está disponible (normal en cliente), mostrar mensaje informativo
      return { 
        success: false, 
        error: 'Para cambiar contraseñas, necesitas usar el Supabase Dashboard (Authentication > Users) o un endpoint backend con service role key. Por seguridad, esto no puede hacerse desde el cliente.' 
      }
    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error)
      return { 
        success: false, 
        error: 'No se pudo cambiar la contraseña. Por seguridad, usa el Supabase Dashboard o contacta al administrador del sistema.' 
      }
    }
  },

  // Actualizar rol de usuario
  async updateUserRole(userId: string, roleId: number): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ role_id: roleId, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select(`
          id,
          email,
          first_name,
          last_name,
          created_at,
          updated_at,
          role:roles(id, name)
        `)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data as User }
    } catch (error) {
      console.error('Error al actualizar rol del usuario:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  }
}

// Servicio de roles
export const rolesAPI = {
  // Obtener todos los roles directamente desde Supabase
  async getRoles() {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description')

      if (error) {
        console.error('Error al obtener roles:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error al obtener roles:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  }
}

// Servicio de contenido (para el Tutor Virtual)
export const contentAPI = {
  // Obtener contenido de un curso
  async getCourseContent(courseId: string) {
    try {
      const { data, error } = await supabase
        .from('course_content_chunks')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at')

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error al obtener contenido del curso:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  }
}
