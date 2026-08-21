// components/ChatWindow.tsx
// Componente de ventana de chat individual

import React, { useState, useEffect, useRef } from 'react';
import { messagingService, Message, Conversation } from '@/services/messagingService';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Common/Button';
import { IconDownload } from '@/components/Common/Icons';

interface ChatWindowProps {
  conversation: Conversation;
  onClose?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    loadMessages();
    markAsRead();

    // Limpiar suscripción anterior si existe
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Suscribirse a nuevos mensajes en tiempo real
    const channel = messagingService.subscribeToMessages(conversation.id, (message) => {
      // Verificar que el mensaje no esté ya en la lista (evitar duplicados)
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
      markAsRead();
    });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await messagingService.getMessages(conversation.id);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await messagingService.markAsRead(conversation.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const message = await messagingService.sendMessage(conversation.id, content);
      setMessages((prev) => [...prev, message]);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content); // Restaurar el mensaje si falla
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (minutes < 1440) return `Hace ${Math.floor(minutes / 60)}h`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const formatFullDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
  };

  const shouldShowAvatar = (currentMessage: Message, previousMessage: Message | null) => {
    if (!previousMessage) return true;
    if (currentMessage.sender_id !== previousMessage.sender_id) return true;
    const timeDiff =
      new Date(currentMessage.created_at).getTime() -
      new Date(previousMessage.created_at).getTime();
    return timeDiff > 300000; // 5 minutos
  };

  const shouldShowDateHeader = (currentMessage: Message, previousMessage: Message | null) => {
    if (!previousMessage) return true;
    const currentDate = new Date(currentMessage.created_at).toDateString();
    const previousDate = new Date(previousMessage.created_at).toDateString();
    return currentDate !== previousDate;
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const exportData = messages.map((msg) => ({
        id: msg.id,
        remitente:
          msg.sender_id === user?.id
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
            : `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim(),
        email_remitente:
          msg.sender_id === user?.id ? user.email || 'N/A' : msg.sender?.email || 'N/A',
        contenido: msg.content,
        fecha_hora: formatFullDateTime(msg.created_at),
        leido: msg.is_read ? 'Sí' : 'No',
        conversacion_id: msg.conversation_id,
      }));

      const otherUser = conversation.other_user;
      const fileName = `mensajes_${otherUser?.first_name}_${otherUser?.last_name}_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        // Crear CSV
        const headers = [
          'ID',
          'Remitente',
          'Email Remitente',
          'Contenido',
          'Fecha y Hora',
          'Leído',
          'Conversación ID',
        ];
        const csvRows = [
          headers.join(','),
          ...exportData.map((row) =>
            [
              row.id,
              `"${row.remitente}"`,
              `"${row.email_remitente}"`,
              `"${row.contenido.replace(/"/g, '""')}"`,
              `"${row.fecha_hora}"`,
              row.leido,
              row.conversacion_id,
            ].join(',')
          ),
        ];
        const csvContent = csvRows.join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Crear JSON
        const jsonContent = JSON.stringify(
          {
            conversacion: {
              id: conversation.id,
              participante: `${otherUser?.first_name} ${otherUser?.last_name}`,
              email_participante: otherUser?.email,
              curso_id: conversation.course_id || null,
              fecha_creacion: conversation.created_at,
            },
            mensajes: exportData,
            exportado_el: new Date().toISOString(),
            total_mensajes: messages.length,
          },
          null,
          2
        );
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting messages:', error);
      alert('Error al exportar los mensajes. Por favor, intenta de nuevo.');
    }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const otherUser = conversation.other_user;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
        <div className="flex items-center space-x-3">
          {otherUser?.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={`${otherUser.first_name} ${otherUser.last_name}`}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary font-semibold">
                {otherUser?.first_name?.[0]}
                {otherUser?.last_name?.[0]}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-text-dark">
              {otherUser?.first_name} {otherUser?.last_name}
            </h3>
            <p className="text-xs text-text-light opacity-60">
              {otherUser?.role?.name === 'teacher' ? 'Docente' : 'Estudiante'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón de exportar */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Exportar mensajes"
              title="Exportar mensajes"
            >
              <IconDownload className="w-5 h-5 text-text-light" />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-xl border border-border z-20">
                  <button
                    onClick={() => {
                      handleExport('csv');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-text-dark hover:bg-muted first:rounded-t-lg last:rounded-b-lg"
                  >
                    Exportar como CSV
                  </button>
                  <button
                    onClick={() => {
                      handleExport('json');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-text-dark hover:bg-muted first:rounded-t-lg last:rounded-b-lg"
                  >
                    Exportar como JSON
                  </button>
                </div>
              </>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-text-light"
              aria-label="Cerrar chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-background">
        <div className="space-y-3">
          {messages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const showAvatar = !isOwn && shouldShowAvatar(message, previousMessage);
            const showDateHeader = shouldShowDateHeader(message, previousMessage);
            const showTime =
              index === messages.length - 1 ||
              message.sender_id !== messages[index + 1]?.sender_id ||
              new Date(messages[index + 1].created_at).getTime() -
                new Date(message.created_at).getTime() >
                300000;

            return (
              <React.Fragment key={message.id}>
                {showDateHeader && (
                  <div className="flex justify-center my-4">
                    <div className="px-3 py-1 bg-surface rounded-full shadow-sm border border-border">
                      <span className="text-xs font-semibold text-text-light opacity-60 capitalize">
                        {formatDateHeader(message.created_at)}
                      </span>
                    </div>
                  </div>
                )}
                <div
                  className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'} ${
                    showAvatar ? 'mt-4' : 'mt-1'
                  }`}
                >
                  {!isOwn && (
                    <div
                      className={`flex-shrink-0 ${showAvatar ? 'w-8 h-8' : 'w-0 h-0'} transition-all duration-200`}
                    >
                      {showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shadow-sm border border-primary/20">
                          {message.sender?.avatar_url ? (
                            <img
                              src={message.sender.avatar_url}
                              alt={message.sender.first_name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <span className="text-primary text-xs font-bold">
                              {message.sender?.first_name?.[0]}
                              {message.sender?.last_name?.[0]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}
                  >
                    {!isOwn && showAvatar && (
                      <span className="text-xs text-text-light opacity-60 mb-1 px-1">
                        {message.sender?.first_name} {message.sender?.last_name}
                      </span>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200 ${
                        isOwn
                          ? 'bg-primary text-white rounded-br-sm shadow-lg shadow-primary/20'
                          : 'bg-surface text-text-dark rounded-bl-sm border border-border shadow-sm'
                      }`}
                    >
                      <p
                        className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${
                          isOwn ? 'text-white' : 'text-text-dark'
                        }`}
                      >
                        {message.content}
                      </p>
                      {showTime && (
                        <p
                          className={`text-xs mt-1.5 font-medium ${
                            isOwn ? 'text-white/70' : 'text-text-light opacity-60'
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  {isOwn && (
                    <div
                      className={`flex-shrink-0 ${showAvatar ? 'w-8 h-8' : 'w-0 h-0'} transition-all duration-200`}
                    >
                      {showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shadow-sm border border-primary/20">
                          {user?.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.first_name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <span className="text-primary text-xs font-bold">
                              {user?.first_name?.[0]}
                              {user?.last_name?.[0]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-surface">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 px-4 py-2 bg-background text-text-dark border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none placeholder:text-text-light/50"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 h-[44px]"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
