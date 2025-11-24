// services/institutionService.ts
import { supabase } from '../lib/supabase';

export interface Institution {
  id: number;
  name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  email?: string; // Usar 'email' en lugar de 'contact_email' para compatibilidad con el esquema
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserInstitution {
  id: number;
  user_id: string;
  institution_id: number;
  is_primary: boolean;
  position?: string;
  joined_at: string;
  institution?: Institution;
}

export const institutionService = {
  /**
   * Obtener todas las instituciones activas
   * Nota: Las políticas RLS filtran automáticamente:
   * - Admin: ve todas las instituciones
   * - Otros roles: solo ven su institución
   */
  async getAllInstitutions(): Promise<Institution[]> {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener institución por ID
   */
  async getInstitution(id: number): Promise<Institution | null> {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  /**
   * Obtener institución principal de un usuario
   */
  async getUserInstitution(userId: string): Promise<Institution | null> {
    try {
      const { data, error } = await supabase
        .from('user_institutions')
        .select(`
          institution_id,
          institutions (*)
        `)
        .eq('user_id', userId)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) {
        console.error('Error obteniendo institución del usuario:', error);
        return null;
      }

      if (!data || !data.institutions) return null;
      return data.institutions as Institution;
    } catch (error) {
      console.error('Error obteniendo institución del usuario:', error);
      return null;
    }
  },

  /**
   * Obtener todas las instituciones de un usuario
   */
  async getUserInstitutions(userId: string): Promise<UserInstitution[]> {
    const { data, error } = await supabase
      .from('user_institutions')
      .select(`
        *,
        institutions (*)
      `)
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      institution_id: item.institution_id,
      is_primary: item.is_primary,
      position: item.position,
      joined_at: item.joined_at,
      institution: item.institutions as Institution
    }));
  },

  /**
   * Asignar usuario a institución
   */
  async assignUserToInstitution(
    userId: string,
    institutionId: number,
    isPrimary: boolean = false,
    position?: string
  ): Promise<UserInstitution> {
    // Si es primaria, desmarcar otras como primarias
    if (isPrimary) {
      await supabase
        .from('user_institutions')
        .update({ is_primary: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabase
      .from('user_institutions')
      .upsert({
        user_id: userId,
        institution_id: institutionId,
        is_primary: isPrimary,
        position: position || null
      }, {
        onConflict: 'user_id,institution_id'
      })
      .select(`
        *,
        institutions (*)
      `)
      .single();

    if (error) throw error;
    return {
      id: data.id,
      user_id: data.user_id,
      institution_id: data.institution_id,
      is_primary: data.is_primary,
      position: data.position,
      joined_at: data.joined_at,
      institution: data.institutions as Institution
    };
  },

  /**
   * Remover usuario de institución
   */
  async removeUserFromInstitution(userId: string, institutionId: number): Promise<void> {
    const { error } = await supabase
      .from('user_institutions')
      .delete()
      .eq('user_id', userId)
      .eq('institution_id', institutionId);

    if (error) throw error;
  },

  /**
   * Crear nueva institución
   */
  async createInstitution(institution: Omit<Institution, 'id' | 'created_at' | 'updated_at'>): Promise<Institution> {
    const { data, error } = await supabase
      .from('institutions')
      .insert([institution])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Actualizar institución
   */
  async updateInstitution(id: number, updates: Partial<Institution>): Promise<Institution> {
    const { data, error } = await supabase
      .from('institutions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Obtener usuarios de una institución
   */
  async getInstitutionUsers(institutionId: number): Promise<Array<{
    user_id: string;
    is_primary: boolean;
    position?: string;
    joined_at: string;
    user?: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role?: {
        id: number;
        name: string;
      };
    };
  }>> {
    // Primero obtener los user_institutions
    const { data: userInstitutions, error: uiError } = await supabase
      .from('user_institutions')
      .select(`
        user_id,
        is_primary,
        position,
        joined_at
      `)
      .eq('institution_id', institutionId)
      .order('is_primary', { ascending: false })
      .order('joined_at', { ascending: false });

    if (uiError) throw uiError;
    if (!userInstitutions || userInstitutions.length === 0) return [];

    // Obtener los IDs de usuarios
    const userIds = userInstitutions.map(ui => ui.user_id);

    // Obtener los usuarios con sus roles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role_id,
        roles (
          id,
          name
        )
      `)
      .in('id', userIds);

    if (usersError) throw usersError;

    // Crear un mapa de usuarios por ID
    const usersMap = new Map((users || []).map(user => [user.id, user]));

    // Combinar los datos
    return userInstitutions.map(item => {
      const user = usersMap.get(item.user_id);
      return {
        user_id: item.user_id,
        is_primary: item.is_primary,
        position: item.position,
        joined_at: item.joined_at,
        user: user ? {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: (user as any).roles
        } : undefined
      };
    });
  },

  /**
   * Buscar usuarios para asignar a instituciones
   */
  async searchUsers(query: string, limit: number = 20): Promise<Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role?: {
      id: number;
      name: string;
    };
  }>> {
    let queryBuilder = supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        roles (
          id,
          name
        )
      `)
      .limit(limit);

    // Si hay query, buscar por email, nombre o apellido
    if (query && query.trim().length > 0) {
      queryBuilder = queryBuilder.or(
        `email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`
      );
    }
    // Si no hay query, obtener los últimos usuarios registrados
    else {
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;
    return (data || []).map(user => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: (user as any).roles
    }));
  }
};

