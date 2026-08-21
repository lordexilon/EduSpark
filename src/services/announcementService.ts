// services/announcementService.ts
// Servicio para gestionar el sistema de avisos (announcements)

import { supabase } from '@/lib/supabase';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  scope: 'all' | 'course' | 'career' | 'role';
  target_course_id?: number;
  target_career_id?: number;
  target_role_id?: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  is_active: boolean;
  published_at?: string;
  expires_at?: string;
  attachments?: any[];
  metadata?: any;
  institution_id?: number;
  created_at: string;
  updated_at: string;
  // Campos relacionados
  author?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  target_course?: {
    id: number;
    title: string;
  };
  target_career?: {
    id: number;
    name: string;
  };
  target_role?: {
    id: number;
    name: string;
  };
}

export interface AnnouncementRecipient {
  id: string;
  announcement_id: string;
  recipient_id: string;
  sent_at: string;
  received_at?: string;
  read_at?: string;
  notification_sent: boolean;
  email_sent: boolean;
}

export interface AnnouncementStats {
  total_recipients: number;
  received_count: number;
  read_count: number;
  unread_count: number;
  read_percentage: number;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  scope: 'all' | 'course' | 'career' | 'role';
  target_course_id?: number;
  target_career_id?: number;
  target_role_id?: number;
  institution_id?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned?: boolean;
  published_at?: string;
  expires_at?: string;
  attachments?: any[];
}

class AnnouncementService {
  /**
   * Obtener todos los avisos visibles para el usuario actual
   */
  async getVisibleAnnouncements(userId?: string, institutionId?: number): Promise<Announcement[]> {
    try {
      let query = supabase
        .from('announcements')
        .select(
          `
          *,
          author:users!announcements_author_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          target_course:courses!announcements_target_course_id_fkey (
            id,
            title
          ),
          target_career:careers!announcements_target_career_id_fkey (
            id,
            name
          ),
          target_role:roles!announcements_target_role_id_fkey (
            id,
            name
          )
        `
        )
        .eq('is_active', true)
        .or('published_at.is.null,published_at.lte.' + new Date().toISOString())
        .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString())
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      // Filtrar por institución si se proporciona
      if (institutionId) {
        // Mostrar avisos de la institución O globales (institution_id user null)
        query = query.or(`institution_id.eq.${institutionId},institution_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtrar avisos según el alcance y el usuario
      if (userId) {
        const filtered = await this.filterAnnouncementsForUser(data || [], userId);
        return filtered;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
  }

  /**
   * Filtrar avisos según el alcance y el usuario
   */
  private async filterAnnouncementsForUser(
    announcements: Announcement[],
    userId: string
  ): Promise<Announcement[]> {
    const filtered: Announcement[] = [];

    for (const announcement of announcements) {
      let shouldInclude = false;

      if (announcement.scope === 'all') {
        shouldInclude = true;
      } else if (announcement.scope === 'course' && announcement.target_course_id) {
        // Verificar si el usuario está inscrito en el curso
        const { data: enrollment } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('student_id', userId)
          .eq('course_id', announcement.target_course_id)
          .eq('status', 'active')
          .single();
        shouldInclude = !!enrollment;
      } else if (announcement.scope === 'career' && announcement.target_career_id) {
        // Verificar si el usuario está inscrito en la carrera
        const { data: enrollment } = await supabase
          .from('career_enrollments')
          .select('id')
          .eq('student_id', userId)
          .eq('career_id', announcement.target_career_id)
          .eq('status', 'active')
          .single();
        shouldInclude = !!enrollment;
      } else if (announcement.scope === 'role' && announcement.target_role_id) {
        // Verificar si el usuario tiene el rol
        const { data: user } = await supabase
          .from('users')
          .select('role_id')
          .eq('id', userId)
          .maybeSingle();
        shouldInclude = user?.role_id === announcement.target_role_id;
      }

      if (shouldInclude) {
        filtered.push(announcement);
      }
    }

    return filtered;
  }

  /**
   * Obtener avisos no leídos para el usuario actual
   */
  async getUnreadAnnouncements(userId: string): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase.rpc('get_unread_announcements', { user_uuid: userId });

      if (error) {
        // Si la función no existe (404) o hay otro error, usar consulta manual
        if (
          error.code === 'P0001' ||
          error.message?.includes('does not exist') ||
          error.code === '42883'
        ) {
          // Función no existe, usar método alternativo
          const allAnnouncements = await this.getVisibleAnnouncements(userId);
          const unreadIds = await this.getUnreadAnnouncementIds(userId);
          return allAnnouncements.filter((a) => unreadIds.includes(a.id));
        }
        // Otro error, intentar método alternativo también
        const allAnnouncements = await this.getVisibleAnnouncements(userId);
        const unreadIds = await this.getUnreadAnnouncementIds(userId);
        return allAnnouncements.filter((a) => unreadIds.includes(a.id));
      }

      return data || [];
    } catch (error: any) {
      // Si hay un error (como función no encontrada), usar método alternativo
      console.warn(
        'Función get_unread_announcements no disponible, usando método alternativo:',
        error?.message
      );
      const allAnnouncements = await this.getVisibleAnnouncements(userId);
      const unreadIds = await this.getUnreadAnnouncementIds(userId);
      return allAnnouncements.filter((a) => unreadIds.includes(a.id));
    }
  }

  /**
   * Obtener IDs de avisos no leídos
   */
  private async getUnreadAnnouncementIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('announcement_recipients')
      .select('announcement_id')
      .eq('recipient_id', userId)
      .is('read_at', null);

    if (error) {
      console.error('Error fetching unread announcement IDs:', error);
      return [];
    }

    return (data || []).map((r) => r.announcement_id);
  }

  /**
   * Crear un nuevo aviso
   */
  async createAnnouncement(data: CreateAnnouncementData, authorId: string): Promise<Announcement> {
    try {
      // Crear el aviso
      const { data: announcement, error: createError } = await supabase
        .from('announcements')
        .insert({
          ...data,
          author_id: authorId,
          published_at: data.published_at || new Date().toISOString(),
        })
        .select(
          `
          *,
          author:users!announcements_author_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `
        )
        .single();

      if (createError) throw createError;

      // Crear destinatarios automáticamente
      const { error: recipientsError } = await supabase.rpc('create_announcement_recipients', {
        announcement_uuid: announcement.id,
      });

      if (recipientsError) {
        console.error('Error creating recipients:', recipientsError);
        // No lanzar error, el aviso ya se creó
      }

      return announcement;
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  }

  /**
   * Marcar un aviso como leído
   */
  async markAsRead(announcementId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('mark_announcement_read', {
        announcement_uuid: announcementId,
        user_uuid: userId,
      });

      if (error) {
        // Si la función falla, actualizar manualmente
        const { error: updateError } = await supabase
          .from('announcement_recipients')
          .update({ read_at: new Date().toISOString() })
          .eq('announcement_id', announcementId)
          .eq('recipient_id', userId)
          .is('read_at', null);

        if (updateError) throw updateError;
        return true;
      }

      return data || false;
    } catch (error) {
      console.error('Error marking announcement as read:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de un aviso
   */
  async getAnnouncementStats(announcementId: string): Promise<AnnouncementStats> {
    try {
      const { data, error } = await supabase.rpc('get_announcement_stats', {
        announcement_uuid: announcementId,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          total_recipients: 0,
          received_count: 0,
          read_count: 0,
          unread_count: 0,
          read_percentage: 0,
        };
      }

      return data[0];
    } catch (error) {
      console.error('Error fetching announcement stats:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los avisos creados por el usuario (para profesores/admins)
   */
  async getMyAnnouncements(authorId: string): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(
          `
          *,
          author:users!announcements_author_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          target_course:courses!announcements_target_course_id_fkey (
            id,
            title
          ),
          target_career:careers!announcements_target_career_id_fkey (
            id,
            name
          ),
          target_role:roles!announcements_target_role_id_fkey (
            id,
            name
          )
        `
        )
        .eq('author_id', authorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching my announcements:', error);
      throw error;
    }
  }

  /**
   * Actualizar un aviso
   */
  async updateAnnouncement(
    announcementId: string,
    data: Partial<CreateAnnouncementData>,
    authorId: string
  ): Promise<Announcement> {
    try {
      const { data: announcement, error } = await supabase
        .from('announcements')
        .update(data)
        .eq('id', announcementId)
        .eq('author_id', authorId) // Solo el autor puede actualizar
        .select(
          `
          *,
          author:users!announcements_author_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `
        )
        .single();

      if (error) throw error;

      return announcement;
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  }

  /**
   * Eliminar un aviso (soft delete)
   */
  async deleteAnnouncement(announcementId: string, authorId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: false })
        .eq('id', announcementId)
        .eq('author_id', authorId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  }

  /**
   * Obtener destinatarios de un aviso con información del usuario
   */
  async getAnnouncementRecipients(announcementId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('announcement_recipients')
        .select(
          `
          *,
          user:users!announcement_recipients_recipient_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `
        )
        .eq('announcement_id', announcementId)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching recipients:', error);
      throw error;
    }
  }
}

export const announcementService = new AnnouncementService();
