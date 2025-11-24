// hooks/useUnreadAnnouncements.ts
// Hook para obtener y suscribirse a avisos no leídos

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { announcementService } from '../services/announcementService';
import { supabase } from '../lib/supabase';

export const useUnreadAnnouncements = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        setLoading(true);
        const unreadAnnouncements = await announcementService.getUnreadAnnouncements(user.id);
        setUnreadCount(unreadAnnouncements.length);
      } catch (error) {
        console.error('Error loading unread announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    // Cargar conteo inicial
    loadUnreadCount();

    // Suscribirse a cambios en avisos para actualizar el conteo
    const channel = supabase
      .channel('unread-announcements-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements'
        },
        async (payload) => {
          // Cuando se crea un nuevo aviso, verificar si el usuario es destinatario
          loadUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcement_recipients'
        },
        async (payload) => {
          // Cuando se crea un registro de destinatario, verificar si es para el usuario actual
          if (payload.new.recipient_id === user.id) {
            loadUnreadCount();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'announcement_recipients',
          filter: `recipient_id=eq.${user.id}`
        },
        async (payload) => {
          // Cuando se marca un aviso como leído, recargar el conteo
          if (payload.new.read_at) {
            loadUnreadCount();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscrito a actualizaciones de avisos no leídos');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [user?.id]);

  return { unreadCount, loading };
};

