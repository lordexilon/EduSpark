// services/messagingService.ts
// Servicio para gestión de mensajería entre usuarios

import { supabase } from '../lib/supabase';

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  course_id?: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  // Campos calculados
  other_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    role?: {
      name: string;
    };
  };
  unread_count?: number;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  // Campos calculados
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    avatar_url?: string;
  };
}

export const messagingService = {
  // Obtener o crear una conversación entre dos usuarios
  async getOrCreateConversation(
    participant1Id: string,
    participant2Id: string,
    courseId?: number
  ): Promise<Conversation> {
    const { data, error } = await supabase.rpc('get_or_create_conversation', {
      p_participant1_id: participant1Id,
      p_participant2_id: participant2Id,
      p_course_id: courseId || null
    });

    if (error) throw error;

    // Obtener la conversación completa con información del otro usuario
    return this.getConversation(data);
  },

  // Obtener una conversación por ID
  async getConversation(conversationId: string): Promise<Conversation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    // Obtener información de los participantes
    const [participant1Response, participant2Response] = await Promise.all([
      supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          role_id,
          roles(id, name)
        `)
        .eq('id', data.participant1_id)
        .maybeSingle(),
      supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          role_id,
          roles(id, name)
        `)
        .eq('id', data.participant2_id)
        .maybeSingle()
    ]);

    // Manejar errores silenciosamente (puede ser que un usuario no exista o no sea accesible)
    const participant1Data = participant1Response.data;
    const participant2Data = participant2Response.data;

    if (participant1Response.error && participant1Response.error.code !== 'PGRST116') {
      console.warn('Error obteniendo participant1:', participant1Response.error);
    }
    if (participant2Response.error && participant2Response.error.code !== 'PGRST116') {
      console.warn('Error obteniendo participant2:', participant2Response.error);
    }

    // Determinar quién es el otro usuario (puede ser null si no existe o no es accesible)
    const otherUser = data.participant1_id === user.id
      ? (participant2Data ? { ...participant2Data, role: participant2Data?.roles } : null)
      : (participant1Data ? { ...participant1Data, role: participant1Data?.roles } : null);

    return {
      ...data,
      other_user: otherUser
    };
  },

  // Obtener todas las conversaciones del usuario actual
  async getMyConversations(): Promise<Conversation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Procesar conversaciones para determinar el otro usuario y contar no leídos
    const conversations = await Promise.all(
      (data || []).map(async (conv) => {
        const otherUserId = conv.participant1_id === user.id
          ? conv.participant2_id
          : conv.participant1_id;

        // Obtener información del otro usuario
        const { data: otherUserData, error: otherUserError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            role_id,
            roles(id, name)
          `)
          .eq('id', otherUserId)
          .maybeSingle();

        // Manejar errores silenciosamente (puede ser que el usuario no exista o no sea accesible)
        if (otherUserError && otherUserError.code !== 'PGRST116') {
          console.warn(`Error obteniendo información del usuario ${otherUserId}:`, otherUserError);
        }

        const otherUser = otherUserData ? {
          ...otherUserData,
          role: otherUserData.roles
        } : null;

        // Contar mensajes no leídos
        // Usar try-catch para manejar errores de permisos RLS
        let unreadCount = 0;
        try {
          const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          if (countError) {
            console.warn('Error contando mensajes no leídos:', countError);
            // Si falla el conteo con HEAD, intentar con una consulta normal
            const { data: unreadMessages } = await supabase
              .from('messages')
              .select('id')
              .eq('conversation_id', conv.id)
              .eq('is_read', false)
              .neq('sender_id', user.id);
            unreadCount = unreadMessages?.length || 0;
          } else {
            unreadCount = count || 0;
          }
        } catch (error) {
          console.warn('Error contando mensajes no leídos, usando 0:', error);
          unreadCount = 0;
        }

        // Obtener último mensaje
        const { data: lastMessageData } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let lastMessage = undefined;
        if (lastMessageData) {
          const { data: senderData } = await supabase
            .from('users')
            .select('id, first_name, last_name, avatar_url')
            .eq('id', lastMessageData.sender_id)
            .maybeSingle();

          lastMessage = {
            ...lastMessageData,
            sender: senderData || undefined
          };
        }

        return {
          ...conv,
          other_user: otherUser,
          unread_count: unreadCount,
          last_message: lastMessage
        };
      })
    );

    return conversations;
  },

  // Obtener mensajes de una conversación
  async getMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Obtener información de los senders
    const messagesWithSenders = await Promise.all(
      (messages || []).map(async (message) => {
        const { data: senderData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, avatar_url')
          .eq('id', message.sender_id)
          .maybeSingle();

        return {
          ...message,
          sender: senderData || undefined
        };
      })
    );

    return messagesWithSenders;
  },

  // Enviar un mensaje
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: messageData, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim()
      })
      .select('*')
      .maybeSingle();

    if (error) throw error;

    // Obtener información del sender
    const { data: senderData } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    return {
      ...messageData,
      sender: senderData || undefined
    };
  },

  // Marcar mensajes como leídos
  async markAsRead(conversationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  },

  // Suscribirse a nuevos mensajes en tiempo real
  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ) {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          try {
            // Obtener información del sender
            const { data: sender } = await supabase
              .from('users')
              .select('id, first_name, last_name, email, avatar_url')
              .eq('id', payload.new.sender_id)
              .maybeSingle();

            callback({
              ...payload.new as Message,
              sender: sender || undefined
            });
          } catch (error) {
            console.error('Error loading sender in message subscription:', error);
            // Aún así, llamar al callback con el mensaje básico
            callback(payload.new as Message);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Suscrito a mensajes de conversación ${conversationId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error en canal de mensajes ${conversationId}`);
        }
      });

    return channel;
  },

  // Suscribirse a nuevas conversaciones y actualizaciones
  async subscribeToConversations(callback: (conversation: Conversation) => void): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const channel = supabase
      .channel('conversations-updates')
      // Escuchar cambios en conversaciones (nuevas o actualizadas)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant1_id=eq.${user.id}`
        },
        async (payload) => {
          try {
            const conversationId = (payload.new as any)?.id;
            if (conversationId) {
              const conversation = await this.getConversation(conversationId);
              callback(conversation);
            }
          } catch (error) {
            console.error('Error loading conversation in subscription:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant2_id=eq.${user.id}`
        },
        async (payload) => {
          try {
            const conversationId = (payload.new as any)?.id;
            if (conversationId) {
              const conversation = await this.getConversation(conversationId);
              callback(conversation);
            }
          } catch (error) {
            console.error('Error loading conversation in subscription:', error);
          }
        }
      )
      // Escuchar nuevos mensajes para actualizar la lista de conversaciones
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          try {
            // Obtener la conversación del mensaje
            const { data: conversationData } = await supabase
              .from('conversations')
              .select('*')
              .eq('id', payload.new.conversation_id)
              .maybeSingle();

            if (conversationData) {
              // Verificar si el usuario actual es participante
              if (
                conversationData.participant1_id === user.id ||
                conversationData.participant2_id === user.id
              ) {
                const conversation = await this.getConversation(conversationData.id);
                callback(conversation);
              }
            }
          } catch (error) {
            console.error('Error handling new message in conversations subscription:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscrito a actualizaciones de conversaciones');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal de conversaciones');
        }
      });

    return channel;
  }
};

