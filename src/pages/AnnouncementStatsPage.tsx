// pages/AnnouncementStatsPage.tsx
// Página para ver estadísticas de recepción y lectura de avisos

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { announcementService, Announcement } from '../services/announcementService';
import Card from '../components/Card';
import Button from '../components/Button';
import Breadcrumbs from '../components/Breadcrumbs';
import { 
  IconArrowLeft, 
  IconUsers, 
  IconCheckCircle, 
  IconXCircle,
  IconClock,
  IconEye,
  IconTrendingUp,
  IconAlertTriangle
} from '../components/Icons';

interface AnnouncementStats {
  total_recipients: number;
  received_count: number;
  read_count: number;
  unread_count: number;
  read_percentage: number;
}

interface RecipientStatus {
  id: string;
  recipient_id: string;
  announcement_id: string;
  sent_at: string;
  received_at: string | null;
  read_at: string | null;
  notification_sent: boolean;
  email_sent: boolean;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

const AnnouncementStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [stats, setStats] = useState<AnnouncementStats | null>(null);
  const [recipients, setRecipients] = useState<RecipientStatus[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTeacher = user?.role?.name === 'teacher' || user?.role?.name === 'admin' || user?.role?.name === 'coordinator';
  const isTeacherRoute = location.pathname.startsWith('/teacher/announcements');

  // Redirigir estudiantes que intentan acceder a ruta de teacher
  useEffect(() => {
    if (user && !isTeacher && isTeacherRoute) {
      navigate('/announcements', { replace: true });
      return;
    }
  }, [user, isTeacher, isTeacherRoute, navigate]);

  useEffect(() => {
    if (user?.id && isTeacher) {
      loadAnnouncements();
    }
  }, [user?.id, isTeacher]);

  useEffect(() => {
    if (selectedAnnouncement) {
      loadStats(selectedAnnouncement.id);
      loadRecipients(selectedAnnouncement.id);
    }
  }, [selectedAnnouncement]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const myAnnouncements = await announcementService.getMyAnnouncements(user!.id);
      setAnnouncements(myAnnouncements);
      if (myAnnouncements.length > 0 && !selectedAnnouncement) {
        setSelectedAnnouncement(myAnnouncements[0]);
      }
    } catch (err: any) {
      setError('Error al cargar los avisos');
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (announcementId: string) => {
    try {
      const statsData = await announcementService.getAnnouncementStats(announcementId);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading stats:', err);
    }
  };

  const loadRecipients = async (announcementId: string) => {
    try {
      setLoadingRecipients(true);
      const recipientsData = await announcementService.getAnnouncementRecipients(announcementId);
      setRecipients(recipientsData);
    } catch (err: any) {
      console.error('Error loading recipients:', err);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScopeLabel = (announcement: Announcement) => {
    if (announcement.scope === 'all') return 'Todos los usuarios';
    if (announcement.scope === 'course' && announcement.target_course) {
      return `Curso: ${announcement.target_course.title}`;
    }
    if (announcement.scope === 'career' && announcement.target_career) {
      return `Carrera: ${announcement.target_career.name}`;
    }
    if (announcement.scope === 'role' && announcement.target_role) {
      return `Rol: ${announcement.target_role.name}`;
    }
    return 'Específico';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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
        return priority;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { 
            label: 'Dashboard', 
            path: user?.role?.name === 'teacher' ? '/teacher/dashboard' : '/dashboard' 
          },
          { 
            label: 'Avisos', 
            path: user?.role?.name === 'teacher' ? '/teacher/announcements' : '/announcements' 
          },
          { label: 'Estadísticas' }
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
          Estadísticas de Avisos
        </h1>
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
          leftIcon={<IconArrowLeft className="w-5 h-5" />}
        >
          Volver
        </Button>
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
          <div className="text-center py-8">
            <IconUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No has creado ningún aviso aún</p>
            <Button
              variant="primary"
              onClick={() => navigate('/teacher/announcements/new')}
              className="mt-4"
            >
              Crear Primer Aviso
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de avisos */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-lg font-semibold mb-4">Mis Avisos</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {announcements.map((announcement) => (
                  <button
                    key={announcement.id}
                    onClick={() => setSelectedAnnouncement(announcement)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedAnnouncement?.id === announcement.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{announcement.title}</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {formatDate(announcement.published_at)}
                        </p>
                        <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded border ${getPriorityColor(announcement.priority)}`}>
                          {getPriorityLabel(announcement.priority)}
                        </span>
                      </div>
                      {announcement.is_pinned && (
                        <span className="text-yellow-500 text-xs">📌</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Estadísticas y destinatarios */}
          <div className="lg:col-span-2 space-y-6">
            {selectedAnnouncement && (
              <>
                {/* Información del aviso seleccionado */}
                <Card>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-bold mb-2">{selectedAnnouncement.title}</h2>
                      <p className="text-sm text-gray-600 mb-2">{getScopeLabel(selectedAnnouncement)}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Publicado: {formatDate(selectedAnnouncement.published_at)}</span>
                        {selectedAnnouncement.expires_at && (
                          <span>Expira: {formatDate(selectedAnnouncement.expires_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 text-xs rounded border ${getPriorityColor(selectedAnnouncement.priority)}`}>
                        {getPriorityLabel(selectedAnnouncement.priority)}
                      </span>
                      {selectedAnnouncement.is_pinned && (
                        <span className="text-yellow-500 text-sm">📌 Fijado</span>
                      )}
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedAnnouncement.content}</p>
                  </div>
                </Card>

                {/* Estadísticas generales */}
                {stats && (
                  <Card>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <IconTrendingUp className="w-5 h-5" />
                      Estadísticas de Recepción
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{stats.total_recipients}</div>
                        <div className="text-sm text-gray-600 mt-1">Total Destinatarios</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{stats.received_count}</div>
                        <div className="text-sm text-gray-600 mt-1">Recibidos</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{stats.read_count}</div>
                        <div className="text-sm text-gray-600 mt-1">Leídos</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{stats.unread_count}</div>
                        <div className="text-sm text-gray-600 mt-1">No Leídos</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Porcentaje de Lectura</span>
                        <span className="text-lg font-bold text-blue-600">{stats.read_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${stats.read_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Lista de destinatarios */}
                <Card>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <IconUsers className="w-5 h-5" />
                    Destinatarios ({recipients.length})
                  </h3>
                  
                  {loadingRecipients ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : recipients.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <IconUsers className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No hay destinatarios registrados aún</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Filtros */}
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => {
                            const sorted = [...recipients].sort((a, b) => {
                              if (a.read_at && !b.read_at) return 1;
                              if (!a.read_at && b.read_at) return -1;
                              return 0;
                            });
                            setRecipients(sorted);
                          }}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Ordenar por estado
                        </button>
                      </div>

                      {/* Lista */}
                      <div className="max-h-[500px] overflow-y-auto space-y-2">
                        {recipients.map((recipient) => (
                          <div
                            key={recipient.id}
                            className={`p-4 rounded-lg border-2 ${
                              recipient.read_at
                                ? 'border-green-200 bg-green-50'
                                : 'border-orange-200 bg-orange-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {recipient.read_at ? (
                                    <IconCheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <IconXCircle className="w-5 h-5 text-orange-600" />
                                  )}
                                  <span className="font-semibold">
                                    {recipient.user
                                      ? `${recipient.user.first_name} ${recipient.user.last_name}`
                                      : 'Usuario'}
                                  </span>
                                  <span className={`px-2 py-0.5 text-xs rounded ${
                                    recipient.read_at
                                      ? 'bg-green-200 text-green-800'
                                      : 'bg-orange-200 text-orange-800'
                                  }`}>
                                    {recipient.read_at ? 'Leído' : 'No Leído'}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <IconClock className="w-4 h-4" />
                                    <span>Enviado: {formatDate(recipient.sent_at)}</span>
                                  </div>
                                  {recipient.received_at && (
                                    <div className="flex items-center gap-2">
                                      <IconEye className="w-4 h-4" />
                                      <span>Recibido: {formatDate(recipient.received_at)}</span>
                                    </div>
                                  )}
                                  {recipient.read_at && (
                                    <div className="flex items-center gap-2 text-green-700">
                                      <IconCheckCircle className="w-4 h-4" />
                                      <span>Leído: {formatDate(recipient.read_at)}</span>
                                    </div>
                                  )}
                                </div>
                                {recipient.user && (
                                  <div className="text-xs text-gray-500 mt-2">
                                    {recipient.user.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementStatsPage;

