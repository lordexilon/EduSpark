import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconArrowLeft, IconMessage, IconEdit, IconTrash, IconX } from '../components/Icons';
import { useAuth } from '../hooks/useAuth';
import { forumService, ForumTopic } from '../services/forumService';
import { forumRepliesService, ForumReply } from '../services/forumRepliesService';

const formatRelativeTime = (isoDate?: string | null) => {
  if (!isoDate) return 'Sin actividad';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Sin actividad';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Hace un momento';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getDisplayName = (
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string
) => {
  const parts = `${firstName || ''} ${lastName || ''}`.trim();
  return parts || fallback || 'Usuario';
};

const getAvatarInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
};

const ForumTopicPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  const canReply = useMemo(() => !!user?.id, [user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadTopicAndReplies = async () => {
      if (!topicId) {
        setError('Tema no encontrado.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [topicData, repliesData] = await Promise.all([
          forumService.getTopic(topicId),
          forumRepliesService.listReplies(topicId),
        ]);

        if (!isMounted) return;

        if (!topicData) {
          setError('El tema no existe o fue eliminado.');
        }

        setTopic(topicData);
        setReplies(repliesData);
      } catch (err: any) {
        console.error('[ForumTopicPage] Error cargando tema:', err);
        if (isMounted) {
          setError('No se pudo cargar la información del foro. Intenta nuevamente.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTopicAndReplies();

    return () => {
      isMounted = false;
    };
  }, [topicId]);

  const refreshTopicMetrics = useMemo(() => {
    if (!topicId) return null;

    return async () => {
      try {
        const updatedTopic = await forumService.getTopic(topicId);
        if (updatedTopic) {
          setTopic(updatedTopic);
        }
      } catch (err) {
        console.warn('[ForumTopicPage] No se pudo refrescar el tema tras la operación:', err);
      }
    };
  }, [topicId]);

  const canManageReply = (reply: ForumReply) => {
    if (!user?.id) return false;
    return reply.author_id === user.id;
  };

  const handlePostReply = async () => {
    if (!topicId || !user?.id || !replyText.trim()) return;

    try {
      setPosting(true);
      setPostError(null);
      setActionError(null);

      const reply = await forumRepliesService.createReply({
        topicId,
        authorId: user.id,
        content: replyText.trim(),
      });

      setReplies((prev) => [...prev, reply]);
      setReplyText('');
      if (refreshTopicMetrics) {
        await refreshTopicMetrics();
      }
    } catch (err: any) {
      console.error('[ForumTopicPage] Error publicando respuesta:', err);
      setPostError(err?.message || 'No se pudo publicar la respuesta');
    } finally {
      setPosting(false);
    }
  };

  const handleStartEditReply = (reply: ForumReply) => {
    setEditingReplyId(reply.id);
    setEditContent(reply.content);
    setActionError(null);
  };

  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditContent('');
    setSavingEdit(false);
  };

  const handleSaveEditReply = async () => {
    if (!editingReplyId || !editContent.trim()) {
      setActionError('El contenido no puede quedar vacío.');
      return;
    }

    try {
      setSavingEdit(true);
      setActionError(null);
      const updated = await forumRepliesService.updateReply(editingReplyId, editContent.trim());
      setReplies((prev) =>
        prev.map((reply) => (reply.id === updated.id ? updated : reply))
      );
      handleCancelEditReply();
      if (refreshTopicMetrics) {
        await refreshTopicMetrics();
      }
    } catch (err: any) {
      console.error('[ForumTopicPage] Error actualizando respuesta:', err);
      setActionError(err?.message || 'No se pudo actualizar la respuesta.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteReply = async (reply: ForumReply) => {
    if (!topicId) return;
    const confirmed = window.confirm('¿Deseas eliminar esta respuesta? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      setDeletingReplyId(reply.id);
      setActionError(null);
      await forumRepliesService.deleteReply(reply.id, topicId);
      setReplies((prev) => prev.filter((item) => item.id !== reply.id));
      if (refreshTopicMetrics) {
        await refreshTopicMetrics();
      }
    } catch (err: any) {
      console.error('[ForumTopicPage] Error eliminando respuesta:', err);
      setActionError(err?.message || 'No se pudo eliminar la respuesta.');
    } finally {
      setDeletingReplyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-slate-500">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm"
          >
            <IconArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>
        <Card>
          <div className="animate-pulse space-y-3 p-4">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-3 bg-slate-200 rounded w-full" />
            <div className="h-3 bg-slate-200 rounded w-2/3" />
          </div>
        </Card>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-slate-500">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm"
          >
            <IconArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>
        <Card>
          <div className="p-6 text-center">
            <IconMessage className="w-10 h-10 mx-auto text-slate-400 mb-4" />
            <p className="text-sm text-slate-600">{error || 'El tema no existe.'}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-slate-500">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm"
        >
          <IconArrowLeft className="w-4 h-4" />
          Volver
        </button>
      </div>

      <Card>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sky-600 text-xs font-medium uppercase tracking-wide">
            <IconMessage className="w-4 h-4" />
            Tema
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{topic.title}</h1>
          <div className="text-sm text-slate-500 flex items-center gap-3 flex-wrap">
            {topic.course_id && topic.courses?.title && (
              <span className="inline-flex items-center px-2 py-1 bg-slate-200 text-slate-700 rounded-full text-xs">
                {topic.courses.title}
              </span>
            )}
            <span>{formatRelativeTime(topic.last_message_at ?? topic.created_at)}</span>
            <span>·</span>
            <span>{topic.reply_count ?? replies.length} respuestas</span>
          </div>
          {topic.description && (
            <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {topic.description}
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Respuestas</h2>
        {actionError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {actionError}
          </p>
        )}

        {replies.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500 text-center py-6">Sé el primero en responder a este tema.</p>
          </Card>
        ) : (
          replies.map((reply) => {
            const name = getDisplayName(
              reply.author?.first_name,
              reply.author?.last_name,
              'Usuario'
            );
            return (
              <Card key={reply.id} className="border border-slate-200">
                <div className="p-4 flex gap-4">
                  {reply.author?.avatar_url ? (
                    <img
                      src={reply.author.avatar_url}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-semibold">
                      {getAvatarInitials(name)}
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-700">{name}</p>
                        {reply.author_id === user?.id && (
                          <span className="text-[10px] uppercase tracking-wide text-slate-400 bg-slate-100 rounded px-2 py-0.5">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400">
                          {formatRelativeTime(reply.updated_at ?? reply.created_at)}
                        </p>
                        {canManageReply(reply) && editingReplyId !== reply.id && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEditReply(reply)}
                              leftIcon={<IconEdit className="w-4 h-4" />}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteReply(reply)}
                              disabled={deletingReplyId === reply.id}
                              leftIcon={<IconTrash className="w-4 h-4" />}
                            >
                              {deletingReplyId === reply.id ? 'Eliminando…' : 'Eliminar'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {editingReplyId === reply.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(event) => setEditContent(event.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[120px] resize-y"
                          placeholder="Actualiza tu respuesta..."
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEditReply}
                            disabled={savingEdit}
                            leftIcon={<IconX className="w-4 h-4" />}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEditReply}
                            disabled={savingEdit || !editContent.trim()}
                          >
                            {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {reply.content}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Card>
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Agregar respuesta</h3>
          {!canReply ? (
            <p className="text-sm text-slate-500">
              Debes iniciar sesión para participar en el foro.
            </p>
          ) : (
            <>
              <textarea
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[120px] resize-y"
                placeholder="Comparte tu respuesta o pregunta... "
              />
              {postError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {postError}
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handlePostReply}
                  disabled={posting || !replyText.trim()}
                >
                  {posting ? 'Publicando...' : 'Publicar respuesta'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ForumTopicPage;

