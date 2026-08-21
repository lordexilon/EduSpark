// hooks/useUnreadMessages.ts
// Hook para obtener y suscribirse a mensajes no leídos

import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { messagingService } from '@/services/messagingService';
import { supabase } from '@/lib/supabase';

export const useUnreadMessages = () => {
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
        const conversations = await messagingService.getMyConversations();
        const totalUnread = conversations.reduce((sum, conv) => {
          return sum + (conv.unread_count || 0);
        }, 0);
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error loading unread messages:', error);
      } finally {
        setLoading(false);
      }
    };

    // Cargar conteo inicial
    loadUnreadCount();

    // Suscribirse a cambios en mensajes para actualizar el conteo
    const channel = supabase
      .channel(`unread-messages-updates-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          // Verificar si el mensaje es para el usuario actual
          const { data: conversation } = await supabase
            .from('conversations')
            .select('participant1_id, participant2_id')
            .eq('id', payload.new.conversation_id)
            .single();

          if (
            conversation &&
            (conversation.participant1_id === user.id || conversation.participant2_id === user.id)
          ) {
            // Solo contar si no es un mensaje propio
            if (payload.new.sender_id !== user.id) {
              // Recargar el conteo
              loadUnreadCount();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `is_read=eq.true`,
        },
        () => {
          // Cuando se marca un mensaje como leído, recargar el conteo
          loadUnreadCount();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscrito a actualizaciones de mensajes no leídos');
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
