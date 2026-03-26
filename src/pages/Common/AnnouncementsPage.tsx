// pages/AnnouncementsPage.tsx
// Página para ver el tablero de avisos

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { announcementService, Announcement } from '@/services/announcementService';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
  IconBell,
  IconPlusCircle,
  IconPin,
  IconClock,
  IconUser,
  IconAlertTriangle,
  IconCheck,
  IconBookOpen,
  IconGraduationCap,
  IconUsers,
  IconTrendingUp,
  IconEdit,
  IconTrash
} from '@/components/Common/Icons';

const AnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(new Set());

  // Definir roles que pueden acceder a rutas de teacher
  const isTeacher = user?.role?.name === 'teacher' ||
    user?.role?.name === 'admin' ||
    user?.role?.name === 'admin-campus' ||
    user?.role?.name === 'coordinator' ||
    user?.role?.name === 'supervisor';
  const isTeacherRoute = location.pathname.startsWith('/teacher/announcements');

  // Redirigir estudiantes que intentan acceder a ruta de teacher
  useEffect(() => {
    if (user && !isTeacher && isTeacherRoute) {
      navigate('/announcements', { replace: true });
      return;
    }

    // Redirigir teachers/admin/etc que intentan acceder a ruta de estudiante
    if (user && isTeacher && !isTeacherRoute && location.pathname === '/announcements') {
      navigate('/teacher/announcements', { replace: true });
      return;
    }
  }, [user, isTeacher, isTeacherRoute, navigate, location.pathname]);

  useEffect(() => {
    if (user?.id) {
      loadAnnouncements();
    }
  }, [user?.id]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await announcementService.getVisibleAnnouncements(user!.id, user?.institution_id);
      setAnnouncements(data);

      // Cargar avisos leídos
      if (user?.id) {
        const unreadAnnouncements = await announcementService.getUnreadAnnouncements(user.id);
        const unreadIds = new Set(unreadAnnouncements.map(a => a.id));
        const allIds = data.map(a => a.id);
        const readIds = allIds.filter(id => !unreadIds.has(id));
        setReadAnnouncements(new Set(readIds));
      }
    } catch (err: any) {
      setError('Error al cargar los avisos');
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (announcementId: string) => {
    if (!user?.id) return;

    try {
      await announcementService.markAsRead(announcementId, user.id);
      setReadAnnouncements(prev => new Set([...prev, announcementId]));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!user?.id) return;

    if (!confirm('¿Estás seguro de que deseas eliminar este aviso?')) {
      return;
    }

    try {
      await announcementService.deleteAnnouncement(announcementId, user.id);
      // Recargar la lista de anuncios
      loadAnnouncements();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el aviso');
      console.error('Error deleting announcement:', err);
    }
  };

  const handleEdit = (announcementId: string) => {
    navigate(`/teacher/announcements/${announcementId}/edit`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50';
      case 'high':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50';
      case 'normal':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
      case 'low':
        return 'bg-muted text-text-light border-border';
      default:
        return 'bg-muted text-text-light border-border';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'normal':
        return 'Normal';
      case 'low':
        return 'Baja';
      default:
        return 'Normal';
    }
  };

  const getScopeLabel = (announcement: Announcement) => {
    if (announcement.scope === 'all') {
      return { label: 'Todos los usuarios', icon: IconUsers };
    } else if (announcement.scope === 'course' && announcement.target_course) {
      return { label: announcement.target_course.title, icon: IconBookOpen };
    } else if (announcement.scope === 'career' && announcement.target_career) {
      return { label: announcement.target_career.name, icon: IconGraduationCap };
    } else if (announcement.scope === 'role' && announcement.target_role) {
      return { label: announcement.target_role.name, icon: IconUser };
    }
    return { label: 'Específico', icon: IconAlertTriangle };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-dark">Tablero de Avisos</h1>
          <p className="text-sm text-text-light opacity-70 mt-1">
            Mantente informado sobre las últimas noticias y actualizaciones
          </p>
        </div>
        {isTeacher && (
          <div className="flex items-center gap-3">
            <Link to="/teacher/announcements/stats">
              <Button variant="secondary">
                <IconTrendingUp className="w-5 h-5 mr-2" />
                Estadísticas
              </Button>
            </Link>
            <Link to={isTeacher ? '/teacher/announcements/new' : '/announcements/new'}>
              <Button>
                <IconPlusCircle className="w-5 h-5 mr-2" />
                Crear Aviso
              </Button>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <Card>
          <div className="flex items-center gap-3 text-red-600">
            <IconAlertTriangle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {announcements.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <IconBell className="w-16 h-16 text-text-light opacity-30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-dark mb-2">No hay avisos</h3>
            <p className="text-text-light opacity-70">
              {isTeacher
                ? 'Crea tu primer aviso para comunicarte con los estudiantes'
                : 'No hay avisos disponibles en este momento'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const isRead = readAnnouncements.has(announcement.id);
            const scopeInfo = getScopeLabel(announcement);
            const ScopeIcon = scopeInfo.icon;

            return (
              <Card
                key={announcement.id}
                className={`transition-all hover:shadow-lg ${!isRead ? 'border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10' : ''
                  } ${announcement.is_pinned ? 'ring-2 ring-yellow-400/50 bg-yellow-400/5 dark:bg-yellow-400/10' : ''}`}
              >
                <div className="p-6">
                  {/* Header del aviso */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {announcement.is_pinned && (
                          <IconPin className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                        )}
                        <h2 className="text-xl font-bold text-text-dark">{announcement.title}</h2>
                        {!isRead && (
                          <span className="px-2 py-1 bg-primary text-white text-[10px] tracking-wider uppercase font-black rounded-lg">
                            Nuevo
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-text-light opacity-70">
                        <div className="flex items-center gap-1">
                          <IconUser className="w-4 h-4" />
                          <span>
                            {announcement.author?.first_name} {announcement.author?.last_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <IconClock className="w-4 h-4" />
                          <span>{formatDate(announcement.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ScopeIcon className="w-4 h-4" />
                          <span>{scopeInfo.label}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(
                          announcement.priority
                        )}`}
                      >
                        {getPriorityLabel(announcement.priority)}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="prose max-w-none mb-4 dark:prose-invert">
                    <p className="text-text-dark/90 whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-xs text-text-light opacity-50">
                      {announcement.expires_at && (
                        <span>
                          Expira: {formatDate(announcement.expires_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isRead && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMarkAsRead(announcement.id)}
                        >
                          <IconCheck className="w-4 h-4 mr-1" />
                          Marcar como leído
                        </Button>
                      )}
                      {isRead && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg">
                          <IconCheck className="w-4 h-4" />
                          Leído
                        </span>
                      )}
                      {/* Botones de editar y eliminar solo para profesores y solo si es el autor */}
                      {isTeacher && announcement.author_id === user?.id && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(announcement.id)}
                            className="bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            <IconEdit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDelete(announcement.id)}
                            className="bg-red-500/10 text-red-600 hover:bg-red-500/20"
                          >
                            <IconTrash className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;

