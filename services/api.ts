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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'No se pudo obtener información del usuario' }
      }

      // Obtener información completa del usuario desde nuestra tabla personalizada
      const { data: userData, error: userError } = await supabase
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
        .eq('id', data.user.id)
        .single()

      if (userError) {
        console.error('Error al obtener datos del usuario:', userError)
        return { success: false, error: 'Error al obtener información del usuario' }
      }

      return {
        success: true,
        user: userData as User,
        token: data.session?.access_token
      }
    } catch (error) {
      console.error('Error en login:', error)
      return { success: false, error: 'Error interno del servidor' }
    }
  },

  // Registro de nuevo usuario
  async register(userData: RegisterData): Promise<ApiResponse<User>> {
    try {
      // Crear el usuario en Supabase Auth con metadata
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
        return { success: false, error: 'No se pudo crear el usuario' }
      }

      // El trigger automáticamente creará el registro en nuestra tabla
      // Esperamos un poco para que el trigger se ejecute
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Obtener los datos del usuario desde nuestra tabla
      const { data: userRecord, error: userError } = await supabase
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
        .single()

      if (userError) {
        console.error('Error al obtener datos del usuario:', userError)
        return { success: false, error: 'Error al obtener el perfil del usuario' }
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

  // Crear usuario (admin)
  async createUser(userData: Omit<RegisterData, 'password'>): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
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
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data as User }
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

  // Eliminar usuario
  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error al eliminar usuario:', error)
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
