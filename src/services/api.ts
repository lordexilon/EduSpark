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
        
        // Extraer el código de error de diferentes formas posibles
        const errorObj = error as any;
        const errorCode = errorObj?.code || error.code || error.status;
        const errorMsg = (error.message?.toLowerCase() || '').trim();
        
        // Si es un AuthApiError, también verificar su código interno
        const authErrorCode = errorObj?.__isAuthError ? errorObj?.code : null;
        const fullErrorCode = authErrorCode || errorCode;
        
        console.log('🔍 Analizando error:', { errorCode, authErrorCode, fullErrorCode, errorMsg, status: error.status });

        // Errores específicos de Supabase Auth
        if (errorCode === 'email_not_confirmed' ||
          errorMsg.includes('email not confirmed') ||
          errorMsg.includes('email_not_confirmed') ||
          errorMsg.includes('email address not confirmed')) {
          errorMessage = 'Tu email no ha sido confirmado. Por favor, verifica tu correo electrónico o contacta al administrador para confirmarlo.';
        }
        // Credenciales inválidas - verificar múltiples formas
        else if (fullErrorCode === 'invalid_credentials' ||
          fullErrorCode === 'invalid_grant' ||
          errorCode === 'invalid_credentials' ||
          errorCode === 'invalid_grant' ||
          (error.status === 400 && (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid_credentials'))) ||
          errorMsg.includes('invalid login credentials') ||
          errorMsg.includes('invalid_credentials') ||
          errorMsg.includes('invalid password') ||
          errorMsg.includes('wrong password') ||
          errorMsg.includes('incorrect password') ||
          (error.status === 400 && errorMsg.includes('invalid'))) {
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
        // Error 400 genérico - verificar si es de credenciales primero
        else if (error.status === 400 || errorCode === 400) {
          // Si el mensaje contiene "invalid" o "credentials", es un error de credenciales
          if (errorMsg.includes('invalid') && (errorMsg.includes('credential') || errorMsg.includes('login') || errorMsg.includes('password'))) {
            errorMessage = 'Email o contraseña incorrectos. Por favor, verifica tus credenciales e intenta nuevamente.';
          }
          else if (error.message) {
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

      // Intentar consulta con join de roles
      let userResponse;
      try {
        userResponse = await supabase
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
        
        // Si hay error 406, no mostrar en consola (el fallback lo manejará)
        if (userError && ((userError as any)?.status === 406 || (userError as any)?.code === 'PGRST116')) {
          // Error esperado, el fallback lo manejará silenciosamente
          userError = userResponse.error;
        }
      } catch (err: any) {
        // Capturar errores de sintaxis o 406
        if ((err as any)?.status !== 406 && (err as any)?.code !== 'PGRST116') {
          console.warn('⚠️ Error en consulta con join de roles:', err?.message || err);
        }
        userError = err;
        userData = null;
      }

      // Si hay error (especialmente 400, 406) o no hay datos, intentar sin el join
      if (userError || !userData) {
        const errorCode = (userError as any)?.code || (userError as any)?.status || '';
        // Solo mostrar warning si no es un error 406 esperado
        if (errorCode !== 406 && errorCode !== 'PGRST116') {
          const errorMessage = (userError as any)?.message || '';
          console.warn(`⚠️ Error con join de roles (${errorCode}), intentando consulta alternativa:`, errorMessage || 'Sin datos');
        }

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
          identity_document,
          identity_document_type,
          avatar_url,
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
  // Obtener todos los usuarios (filtrado automático por RLS según institución)
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      // Las políticas RLS filtran automáticamente por institución para admin-campus y coordinator
      // NO agregamos join con user_institutions aquí porque las políticas RLS ya lo hacen
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
        console.error('Error al obtener usuarios:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Usuarios obtenidos (filtrados por RLS):', data?.length || 0)

      return { success: true, data: data as User[] }
    } catch (error) {
      console.error('Error al obtener usuarios:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  },

  // Crear usuario (admin) - Requiere password para crear cuenta en Supabase Auth
  async createUser(userData: RegisterData, autoConfirmEmail: boolean = false): Promise<ApiResponse<User>> {
    try {
      console.log('🔐 createUser: Creando usuario con autoConfirmEmail:', autoConfirmEmail);
      
      // Primero crear el usuario en Supabase Auth con metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role_id: userData.roleId
          },
          emailRedirectTo: undefined // No requerir confirmación de email
        }
      })

      if (authError) {
        return { success: false, error: authError.message }
      }

      if (!authData.user) {
        return { success: false, error: 'No se pudo crear el usuario en Supabase Auth' }
      }

      // Si se solicita auto-confirmar email, hacerlo inmediatamente
      if (autoConfirmEmail && authData.user.id) {
        console.log('📧 createUser: Auto-confirmando email para usuario:', authData.user.id);
        
        // Usar changeUserPassword con la misma contraseña para confirmar el email
        const confirmResult = await this.changeUserPassword(authData.user.id, userData.password);
        
        if (!confirmResult.success) {
          console.warn('⚠️ createUser: No se pudo auto-confirmar email, pero el usuario fue creado:', confirmResult.error);
          // No fallar si no se puede confirmar, el usuario ya fue creado
        } else {
          console.log('✅ createUser: Email auto-confirmado exitosamente');
        }
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
      console.log('📤 API: Actualizando usuario', { userId, userData });
      
      // Primero hacer el update sin select
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update(userData)
        .eq('id', userId)
        .select('id, first_name, last_name, identity_document') // Seleccionar solo para verificar

      if (updateError) {
        console.error('❌ API: Error en update', updateError);
        console.error('❌ API: Detalles del error:', JSON.stringify(updateError, null, 2));
        return { success: false, error: updateError.message }
      }

      console.log('✅ API: Update exitoso, datos actualizados directamente:', updateData);
      
      // Si el array está vacío, significa que no se actualizó ninguna fila
      // Esto puede ser por RLS o porque no se encontró la fila
      if (!updateData || updateData.length === 0) {
        console.warn('⚠️ API: UPDATE no devolvió filas. Posible problema con RLS o la fila no existe.');
        console.warn('⚠️ API: Verificando si el usuario existe...');
        
        // Verificar si el usuario existe
        const { data: checkData, error: checkError } = await supabase
          .from('users')
          .select('id, first_name, last_name, identity_document')
          .eq('id', userId)
          .single();
        
        if (checkError) {
          console.error('❌ API: Error al verificar usuario:', checkError);
        } else {
          console.log('🔍 API: Usuario existe en BD:', checkData);
          console.warn('⚠️ API: El UPDATE no se ejecutó. Verifica las políticas RLS.');
        }
      }
      
      // Si el update devolvió datos, verificar que se actualizaron correctamente
      if (updateData && updateData.length > 0) {
        const updated = updateData[0];
        console.log('🔍 API: Verificando datos actualizados:', {
          first_name: updated.first_name,
          last_name: updated.last_name,
          identity_document: updated.identity_document
        });
        
        // Si los datos no se actualizaron, hay un problema
        if (updated.first_name !== userData.first_name || 
            updated.last_name !== userData.last_name ||
            updated.identity_document !== userData.identity_document) {
          console.warn('⚠️ API: Los datos no coinciden con lo enviado. Posible problema con RLS o constraints.', {
            enviado: { first_name: userData.first_name, last_name: userData.last_name, identity_document: userData.identity_document },
            recibido: { first_name: updated.first_name, last_name: updated.last_name, identity_document: updated.identity_document }
          });
        }
      }

      console.log('🔄 API: Obteniendo datos completos con join de roles...');

      // Luego hacer el select por separado para obtener los datos actualizados
      const { data, error: selectError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          identity_document,
          identity_document_type,
          avatar_url,
          created_at,
          updated_at,
          role:roles(id, name)
        `)
        .eq('id', userId)
        .single()

      if (selectError) {
        console.error('❌ API: Error en select después de update', selectError);
        return { success: false, error: selectError.message }
      }

      console.log('✅ API: Datos obtenidos después de update', data);
      
      // Asegurar que el rol esté en el formato correcto
      const finalUserData = data as any;
      if (finalUserData.role && Array.isArray(finalUserData.role) && finalUserData.role.length > 0) {
        finalUserData.role = finalUserData.role[0];
      }
      
      return { success: true, data: finalUserData as User }
    } catch (error: any) {
      console.error('Error al actualizar usuario:', error)
      return { success: false, error: error?.message || 'Error interno del servidor' }
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
  // Solución temporal: Usa changeUserPassword con contraseña temporal para activar el usuario
  // La función changeUserPassword ahora también confirma el email automáticamente
  async confirmUserEmail(userId: string): Promise<ApiResponse<{ email: string; email_confirmed_at: string | null }>> {
    try {
      // Validar que userId sea un UUID válido
      if (!userId || typeof userId !== 'string') {
        return {
          success: false,
          error: 'ID de usuario inválido'
        };
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return {
          success: false,
          error: 'El ID de usuario no tiene un formato válido'
        };
      }

      // Obtener token de autenticación de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('❌ confirmUserEmail: Error obteniendo sesión:', sessionError);
        return {
          success: false,
          error: 'No se pudo obtener la sesión de autenticación. Por favor, inicia sesión nuevamente.'
        }
      }

      // URL de la Cloud Function confirmUserEmail
      const CONFIRM_EMAIL_URL = import.meta.env.VITE_CONFIRM_EMAIL_URL || 
        'https://us-central1-eduspark-py.cloudfunctions.net/confirmUserEmail'

      console.log('📧 confirmUserEmail: Enviando solicitud a:', CONFIRM_EMAIL_URL);
      console.log('📧 confirmUserEmail: userId:', userId);

      const response = await fetch(CONFIRM_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId
        })
      });

      console.log('📧 confirmUserEmail: Respuesta recibida:', { status: response.status, statusText: response.statusText, ok: response.ok });

      const responseText = await response.text();
      console.log('📧 confirmUserEmail: Texto de respuesta:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📧 confirmUserEmail: Datos parseados:', data);
      } catch (parseError) {
        console.error('❌ confirmUserEmail: Error parseando respuesta:', parseError);
        return {
          success: false,
          error: 'Error en la respuesta del servidor. Por favor, intenta nuevamente.'
        };
      }

      if (!response.ok) {
        console.error('❌ confirmUserEmail: Error en la respuesta:', data);
        return {
          success: false,
          error: data.error || `Error al confirmar el email (${response.status})`
        };
      }

      if (!data.success) {
        console.error('❌ confirmUserEmail: La respuesta indica fallo:', data);
        return {
          success: false,
          error: data.error || 'Error al confirmar el email del usuario'
        };
      }

      console.log('✅ confirmUserEmail: Email confirmado exitosamente');

      return {
        success: true,
        data: {
          email: data.user?.email || '',
          email_confirmed_at: data.user?.email_confirmed_at || new Date().toISOString()
        }
      };
    } catch (error: any) {
      console.error('Error al confirmar email:', error);
      return {
        success: false,
        error: error?.message || 'Error interno del servidor'
      };
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
  // Usa Google Cloud Function que tiene acceso al service role key
  async changeUserPassword(userId: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      // Validar que userId sea un UUID válido
      if (!userId || typeof userId !== 'string') {
        console.error('❌ changeUserPassword: userId inválido:', userId);
        return {
          success: false,
          error: 'ID de usuario inválido. Por favor, recarga la página e intenta nuevamente.'
        }
      }

      // Validar formato UUID básico
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('❌ changeUserPassword: userId no es un UUID válido:', userId);
        return {
          success: false,
          error: 'El ID de usuario no tiene un formato válido. Por favor, contacta al administrador.'
        }
      }

      // Obtener token de autenticación de Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('❌ changeUserPassword: Error obteniendo sesión:', sessionError);
        return {
          success: false,
          error: 'No se pudo obtener la sesión de autenticación. Por favor, inicia sesión nuevamente.'
        }
      }

      // URL de la Cloud Function en Cloud Run (debe estar en variables de entorno)
      const CHANGE_PASSWORD_URL = import.meta.env.VITE_CHANGE_PASSWORD_URL || 
        'https://changeuserpassword-mcc5aevj6a-uc.a.run.app'

      console.log('🔐 changeUserPassword: Enviando solicitud a:', CHANGE_PASSWORD_URL);
      console.log('🔐 changeUserPassword: userId:', userId);
      console.log('🔐 changeUserPassword: newPassword length:', newPassword.length);

      const response = await fetch(CHANGE_PASSWORD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId,
          newPassword
        })
      })

      console.log('🔐 changeUserPassword: Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      // Intentar parsear la respuesta como JSON, pero manejar errores si no es JSON
      let data: any = {};
      try {
        const text = await response.text();
        console.log('🔐 changeUserPassword: Texto de respuesta:', text);
        if (text) {
          data = JSON.parse(text);
          console.log('🔐 changeUserPassword: Datos parseados:', data);
        }
      } catch (parseError) {
        console.error('❌ changeUserPassword: Error parseando respuesta:', parseError);
        // Si no se puede parsear, usar el texto como mensaje de error
        data = { error: response.statusText || 'Error desconocido' };
      }

      if (!response.ok) {
        // Mensajes de error más descriptivos según el código de estado
        let errorMessage = data.error || 'Error al cambiar la contraseña';
        
        if (response.status === 400) {
          if (data.error?.includes('userId') || data.error?.includes('newPassword')) {
            errorMessage = 'Faltan datos requeridos. Por favor, verifica que todos los campos estén completos.';
          } else if (data.error?.includes('no existe') || data.error?.includes('not found') || data.error?.includes('does not exist')) {
            errorMessage = 'El usuario especificado no existe en el sistema de autenticación. Esto puede ocurrir si el usuario fue eliminado o si hay un problema con los datos. Por favor, verifica que el usuario esté activo.';
            console.error('❌ changeUserPassword: Usuario no encontrado en Supabase Auth:', userId);
          } else if (data.error?.includes('contraseña') || data.error?.includes('password')) {
            errorMessage = data.error; // Usar el mensaje específico de la función
          } else {
            errorMessage = data.error || 'Datos inválidos. Por favor, verifica la información e intenta nuevamente.';
          }
        } else if (response.status === 401) {
          errorMessage = 'No autorizado. Tu sesión puede haber expirado. Por favor, inicia sesión nuevamente.';
        } else if (response.status === 403) {
          errorMessage = 'No tienes permisos para cambiar contraseñas. Solo los administradores pueden realizar esta acción.';
        } else if (response.status === 500) {
          errorMessage = 'Error del servidor. Por favor, intenta nuevamente en unos momentos.';
        }

        console.error('❌ changeUserPassword: Error al cambiar contraseña:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: errorMessage,
          data: data
        });

        return { 
          success: false, 
          error: errorMessage
        }
      }

      console.log('✅ changeUserPassword: Contraseña cambiada exitosamente');
      return { success: true }
    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error)
      
      // Mensajes de error más específicos según el tipo de error
      let errorMessage = 'No se pudo conectar con el servidor para cambiar la contraseña';
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'La solicitud tardó demasiado. Por favor, intenta nuevamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
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
