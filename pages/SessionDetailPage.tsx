import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ACTIVITY_TYPE_DETAILS } from '../constants.ts';
import { ActivityType } from '../types.ts';
import Card from '../components/Card.tsx';
import Breadcrumbs from '../components/Breadcrumbs.tsx';
import { IconClock, IconChevronRight, IconBookOpen, IconCalendar, IconVideoCamera, IconPencil, IconChevronLeft, IconClipboardList, IconCheck, IconCards } from '../components/Icons.tsx';
import Button from '../components/Button.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import ProgressBar from '../components/ProgressBar.tsx';
import AssistantIA from '../components/AssistantIA.tsx';
import { sessionService, Session, materialService, Material } from '../services/teacherCourses';
import { courseService, Course } from '../services/teacherCourses';
import { RichTextDisplay } from '../components/RichTextDisplay.tsx';
import { progressService } from '../services/progressService';
import { VideoPlayer } from '../components/VideoPlayer.tsx';
import { VideoTranscriptService } from '../services/videoTranscriptService.ts';
import { quizService, Assessment } from '../services/quizService';
import { getFlashcardsBySession } from '../services/flashcardService';

const ActivityIcon: React.FC<{ type: ActivityType }> = ({ type }) => {
    const details = ACTIVITY_TYPE_DETAILS[type] || ACTIVITY_TYPE_DETAILS[ActivityType.ACTIVITY];
    const IconComponent = details.icon;
    return <IconComponent className="w-5 h-5 text-slate-500" />;
};

const ActivityTypeModal: React.FC<{ activityType: ActivityType, onClose: () => void }> = ({ activityType, onClose }) => {
    const details = ACTIVITY_TYPE_DETAILS[activityType];
    if (!details) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-type-title"
        >
            <div 
                className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center mb-4">
                    <div className="bg-primary/10 p-2 rounded-full mr-3">
                       <details.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 id="activity-type-title" className="text-2xl font-bold text-text-dark">{details.name}</h2>
                </div>
                <p className="text-text-light">{details.description}</p>
                <div className="mt-6 text-right">
                    <Button onClick={onClose} variant="primary">Entendido</Button>
                </div>
            </div>
        </div>
    );
};

const SessionDetailPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedActivityType, setSelectedActivityType] = useState<ActivityType | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [sessionProgress, setSessionProgress] = useState<any | null>(null);
    const [progressMessage, setProgressMessage] = useState<string | null>(null);
    const [savingCompletion, setSavingCompletion] = useState(false);
    const [sessionMaterials, setSessionMaterials] = useState<Material[]>([]);
    const [sessionAssessments, setSessionAssessments] = useState<Assessment[]>([]);
    const [sessionFlashcards, setSessionFlashcards] = useState<any[]>([]);
    const isTeacher = user?.role?.name === 'teacher' || user?.role?.name === 'admin';
    const isStudent = user?.role?.name === 'student';

    useEffect(() => {
        const loadSession = async () => {
            if (!sessionId) {
                setError('ID de sesión no proporcionado');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                // Obtener la sesión
                const sessionData = await sessionService.getSession(sessionId);
                
                if (!sessionData) {
                    setError('Sesión no encontrada');
                    setLoading(false);
                    return;
                }

                setSession(sessionData);

                // Si hay course_id, obtener el curso y todas las sesiones del curso para navegación
                if (sessionData.course_id) {
                    const [courseData, courseSessions, courseMaterials] = await Promise.all([
                        courseService.getCourse(sessionData.course_id).catch(() => null),
                        sessionService.getCourseSessions(sessionData.course_id),
                        materialService.getCourseMaterials(sessionData.course_id).catch(() => [])
                    ]);
                    
                    if (courseData) {
                        setCourse(courseData);
                    }
                    
                    // Ordenar por order_index o created_at
                    const sorted = courseSessions.sort((a, b) => {
                        if (a.order_index !== null && b.order_index !== null) {
                            return a.order_index - b.order_index;
                        }
                        if (a.order_index !== null) return -1;
                        if (b.order_index !== null) return 1;
                        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    });
                    setAllSessions(sorted);
                    
                    // Filtrar materiales de esta sesión
                    const sessionMats = courseMaterials.filter(m => m.session_id === sessionData.id);
                    setSessionMaterials(sessionMats);

                    // Cargar evaluaciones y flashcards de la sesión
                    if (sessionData.id) {
                        try {
                            const [assessments, flashcards] = await Promise.all([
                                quizService.getSessionAssessments(sessionData.id),
                                getFlashcardsBySession(sessionData.id).catch(() => [])
                            ]);
                            setSessionAssessments(assessments);
                            setSessionFlashcards(flashcards);
                        } catch (err) {
                            console.error('Error cargando evaluaciones de sesión:', err);
                        }
                    }
                }
            } catch (err: any) {
                console.error('Error cargando sesión:', err);
                setError(err.message || 'Error al cargar la sesión');
            } finally {
                setLoading(false);
            }
        };

        loadSession();
    }, [sessionId]);

    // Actualizar el tiempo cada minuto para refrescar los mensajes del sistema
    useEffect(() => {
        if (!session?.google_meet_link) return;

        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Actualizar cada minuto

        return () => clearInterval(interval);
    }, [session?.google_meet_link]);

    useEffect(() => {
        if (!session?.id || !user?.id || !isStudent) {
            return;
        }

        let isMounted = true;
        const totalActivities = session.activities?.length ?? 0;

        const syncProgress = async () => {
            try {
                const result = await progressService.trackSessionAccess(
                    user.id,
                    session.id,
                    session.course_id,
                    session.unit_id,
                    {
                        totalActivities: totalActivities > 0 ? totalActivities : undefined,
                    }
                );

                if (!isMounted) return;

                if (result) {
                    setSessionProgress(result);
                } else {
                    const fallback = await progressService.getSessionProgress(user.id, session.id);
                    if (isMounted) {
                        setSessionProgress(fallback);
                    }
                }
            } catch (err) {
                console.error('Error registrando acceso a la sesión:', err);
            }
        };

        syncProgress();

        return () => {
            isMounted = false;
        };
    }, [session?.id, session?.course_id, session?.unit_id, session?.activities?.length, user?.id, isStudent]);

    if (loading) {
        return (
            <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Cargando sesión...</p>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="text-center py-10">
                <h2 className="text-2xl font-semibold text-red-600">Sesión No Encontrada</h2>
                <p className="text-slate-600">{error || 'La sesión que buscas no existe.'}</p>
                <Link to="/dashboard" className="mt-4 inline-block text-sky-600 hover:underline">
                    &larr; Volver al Dashboard
                </Link>
            </div>
        );
    }

    // Calcular progreso basado en actividades y session_progress
    const activities = session.activities || [];
    const totalActivities = sessionProgress?.total_activities ?? activities.length;
    const completedActivities = sessionProgress?.activities_completed ?? (sessionProgress?.is_completed ? (sessionProgress.total_activities || activities.length) : 0) ?? 0;
    const progressPercentage = sessionProgress?.completion_percentage ?? (totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0);
    const isSessionCompleted = Boolean(sessionProgress?.is_completed);

    // Encontrar sesión anterior y siguiente
    const currentIndex = allSessions.findIndex(s => s.id === sessionId);
    const prevSession = currentIndex > 0 ? allSessions[currentIndex - 1] : null;
    const nextSession = currentIndex < allSessions.length - 1 ? allSessions[currentIndex + 1] : null;

    // Formatear fecha de inicio si existe
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        try {
            return new Date(dateStr).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    // Formatear fecha y hora para mensajes
    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return null;
        try {
            return new Date(dateStr).toLocaleString('es-ES', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    // Calcular el estado y mensaje de la videollamada
    const getMeetStatus = () => {
        if (!session.google_meet_link) return null;

        const now = currentTime;
        const startsAt = session.starts_at ? new Date(session.starts_at) : null;
        const endsAt = session.ends_at ? new Date(session.ends_at) : null;

        if (!startsAt) {
            return {
                status: 'scheduled' as const,
                message: 'Videollamada programada',
                color: 'blue',
                badge: 'Próximamente'
            };
        }

        if (now < startsAt) {
            // La videollamada aún no ha comenzado
            const diffMs = startsAt.getTime() - now.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            let timeMessage = '';
            if (diffDays > 0) {
                timeMessage = `en ${diffDays} día${diffDays > 1 ? 's' : ''}`;
            } else if (diffHours > 0) {
                timeMessage = `en ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
            } else if (diffMins > 0) {
                timeMessage = `en ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
            } else {
                timeMessage = 'pronto';
            }

            return {
                status: 'upcoming' as const,
                message: `La videollamada comienza ${timeMessage}`,
                color: 'blue',
                badge: 'Próximamente',
                startsAt: formatDateTime(session.starts_at)
            };
        }

        if (endsAt && now > endsAt) {
            // La videollamada ya finalizó
            return {
                status: 'ended' as const,
                message: 'Esta videollamada ya finalizó',
                color: 'gray',
                badge: 'Finalizada',
                startsAt: formatDateTime(session.starts_at),
                endsAt: formatDateTime(session.ends_at)
            };
        }

        // La videollamada está en curso
        return {
            status: 'live' as const,
            message: 'La videollamada está en curso',
            color: 'green',
            badge: 'En Vivo',
            startsAt: formatDateTime(session.starts_at),
            endsAt: endsAt ? formatDateTime(session.ends_at) : null
        };
    };

    const meetStatus = getMeetStatus();

    // Obtener número de sesión (order_index o índice + 1)
    const sessionNumber = session.order_index !== null ? session.order_index : (currentIndex + 1);

    // Renderizar actividades desde JSONB
    const renderActivity = (activity: any, index: number) => {
        const activityType = activity.type || 'other';
        const typeDetails = ACTIVITY_TYPE_DETAILS[activityType as ActivityType] || ACTIVITY_TYPE_DETAILS[ActivityType.ACTIVITY];
        return (
            <li key={activity.id || index} className="py-3 px-4 bg-slate-50 rounded-md transition-colors hover:bg-slate-100">
                <div className="flex items-start space-x-4">
                    <button 
                        onClick={() => setSelectedActivityType(activityType as ActivityType)} 
                        className="flex-shrink-0 mt-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full p-1"
                        aria-label={`Más información sobre ${typeDetails.name}`}
                    >
                        <ActivityIcon type={activityType as ActivityType} />
                    </button>
                    <div className="flex-1">
                        <h4 className="font-semibold text-slate-700">{activity.title || 'Actividad sin título'}</h4>
                        <button 
                            onClick={() => setSelectedActivityType(activityType as ActivityType)} 
                            className="text-xs text-primary font-medium hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded"
                            aria-label={`Más información sobre ${typeDetails.name}`}
                        >
                            Tipo: {typeDetails.name}
                        </button>
                        {activity.description && <p className="text-sm text-slate-600 mt-1">{activity.description}</p>}
                        {activity.instructions && <p className="text-sm text-slate-500 mt-1 italic">{activity.instructions}</p>}
                    </div>
                </div>
            </li>
        );
    };

    // Renderizar recursos desde JSONB
    const renderResource = (resource: any, index: number) => {
        const transcriptService = new VideoTranscriptService();
        
        // Si es un video, detectar plataforma
        const isVideo = resource.type === 'video';
        const platform = isVideo && resource.url 
            ? (transcriptService.detectPlatform(resource.url)?.name || 'other')
            : null;
        const videoId = isVideo && resource.url && platform
            ? transcriptService.detectPlatform(resource.url)?.extractId(resource.url) || undefined
            : undefined;
        
        // Si es video, mostrar con reproductor
        if (isVideo && resource.url) {
            return (
                <li key={resource.id || index} className="py-4 px-4 bg-blue-50 rounded-md">
                    <h4 className="font-semibold text-slate-700 mb-3">{resource.title}</h4>
                    <VideoPlayer
                        materialId={resource.id || `resource-${index}`}
                        url={resource.url}
                        platform={platform || 'other'}
                        videoId={videoId}
                        title={resource.title}
                        showProgress={true}
                    />
                </li>
            );
        }
        
        // Para otros tipos de recursos
        return (
            <li key={resource.id || index} className="py-2 px-4 bg-blue-50 rounded-md">
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                        {resource.type === 'image' && <IconBookOpen className="w-5 h-5 text-blue-600" />}
                        {resource.type === 'link' && <IconChevronRight className="w-5 h-5 text-blue-600" />}
                        {resource.type === 'document' && <IconBookOpen className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-slate-700">{resource.title}</h4>
                        {resource.url && (
                            <a 
                                href={resource.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                            >
                                Ver recurso →
                            </a>
                        )}
                    </div>
                </div>
            </li>
        );
    };

    const handleCompleteSession = async () => {
        if (!session || !user?.id || !isStudent) return;
        setSavingCompletion(true);
        setProgressMessage(null);
        try {
            const total = activities.length;
            const estimatedMinutes = session.duration_minutes && session.duration_minutes > 0
                ? session.duration_minutes
                : 15;
            const updated = await progressService.completeSession(
                user.id,
                session.id,
                session.course_id,
                session.unit_id,
                {
                    totalActivities: total > 0 ? total : undefined,
                    timeSpentMinutes: estimatedMinutes,
                }
            );
            setSessionProgress(updated);
            setProgressMessage('Sesión marcada como completada.');
        } catch (err: any) {
            console.error('Error marcando sesión como completada:', err);
            alert(err?.message || 'No se pudo marcar la sesión como completada.');
        } finally {
            setSavingCompletion(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {selectedActivityType && (
                <ActivityTypeModal 
                    activityType={selectedActivityType} 
                    onClose={() => setSelectedActivityType(null)} 
                />
            )}
            
            {/* Breadcrumbs */}
            {course && (
                <Breadcrumbs 
                    items={[
                        { label: 'Dashboard', path: '/dashboard' },
                        { label: 'Mis Cursos', path: '/my/courses' },
                        { label: course.title, path: `/courses/${course.id}` },
                        { label: 'Sesiones', path: `/sessions?courseId=${course.id}` },
                        { label: session.title }
                    ]}
                    className="mb-4"
                />
            )}
            
            {/* Header de la sesión */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md -mx-6 mb-6 px-6 pt-4 pb-4 border-b border-border">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center mb-1">
                            <IconBookOpen className="w-5 h-5 mr-2 text-primary" />
                            <span className="text-sm font-medium text-text-light">
                                Sesión {sessionNumber}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold mb-2 text-text-dark">{session.title}</h1>
                        {session.starts_at && (
                            <div className="flex items-center text-text-light text-sm mb-3">
                                <IconCalendar className="w-4 h-4 mr-1.5" />
                                <span>{formatDate(session.starts_at)}</span>
                            </div>
                        )}
                        {session.description && (
                            <p className="text-text-light text-sm mb-2">{session.description}</p>
                        )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-4">
                        {session.course_id && (
                            <Link to={`/assignments?courseId=${session.course_id}`}>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<IconClipboardList className="w-4 h-4" />}
                                >
                                    Ver Tareas
                                </Button>
                            </Link>
                        )}
                        {isTeacher && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => navigate(`/teacher/courses/${session.course_id}`)}
                                leftIcon={<IconPencil className="w-4 h-4" />}
                            >
                                Editar Sesión
                            </Button>
                        )}
                    </div>
                </div>

                {/* Barra de progreso */}
                {totalActivities > 0 && (
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-1 text-text-light">
                            <p className="text-sm font-medium">Progreso de la sesión</p>
                            <p className="text-sm font-medium">{completedActivities}/{totalActivities} actividades</p>
                        </div>
                        <ProgressBar value={progressPercentage} color="var(--primary)" height="8px" />
                        {isSessionCompleted && (
                            <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                                <IconCheck className="w-4 h-4" /> ¡Sesión completada!
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Objetivos de aprendizaje */}
            {session.learning_objectives && session.learning_objectives.length > 0 && (
                <div className="mb-6 bg-primary/10 p-4 rounded-lg border-l-4 border-primary/50">
                    <span className="font-semibold text-text-dark">Objetivos de aprendizaje:</span>
                    <ul className="list-disc list-inside mt-2 text-sm text-text-light">
                        {session.learning_objectives.map((objective, idx) => (
                            <li key={idx}>{objective}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Google Meet Link */}
            {session.google_meet_link && meetStatus && (
                <Card className={`mb-6 bg-gradient-to-r ${
                    meetStatus.status === 'live' ? 'from-green-50 to-emerald-50 border-2 border-green-200' :
                    meetStatus.status === 'ended' ? 'from-gray-50 to-slate-50 border-2 border-gray-200' :
                    'from-blue-50 to-indigo-50 border-2 border-blue-200'
                }`}>
                    <div className="flex flex-col space-y-4">
                        {/* Header con icono, título y badge */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`p-3 rounded-full ${
                                    meetStatus.status === 'live' ? 'bg-green-500 animate-pulse' :
                                    meetStatus.status === 'ended' ? 'bg-gray-400' :
                                    'bg-blue-500'
                                }`}>
                                    <IconVideoCamera className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-lg font-semibold text-text-dark">Videollamada Sincrónica</h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            meetStatus.status === 'live' ? 'bg-green-100 text-green-800' :
                                            meetStatus.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {meetStatus.badge}
                                        </span>
                                    </div>
                                    <p className={`text-sm mt-1 ${
                                        meetStatus.status === 'live' ? 'text-green-700 font-medium' :
                                        meetStatus.status === 'ended' ? 'text-gray-600' :
                                        'text-text-light'
                                    }`}>
                                        {meetStatus.message}
                                    </p>
                                </div>
                            </div>
                            {meetStatus.status === 'ended' ? (
                                <div className="flex-shrink-0">
                                    <Button
                                        variant="secondary"
                                        size="md"
                                        leftIcon={<IconVideoCamera className="w-5 h-5" />}
                                        disabled
                                    >
                                        Videollamada Finalizada
                                    </Button>
                                </div>
                            ) : (
                                <a
                                    href={session.google_meet_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0"
                                >
                                    <Button
                                        variant={meetStatus.status === 'live' ? 'primary' : 'secondary'}
                                        size="md"
                                        leftIcon={<IconVideoCamera className="w-5 h-5" />}
                                    >
                                        Unirse a la Videollamada
                                    </Button>
                                </a>
                            )}
                        </div>

                        {/* Información de horarios */}
                        {(meetStatus.startsAt || meetStatus.endsAt) && (
                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex flex-wrap gap-4 text-sm text-text-light">
                                    {meetStatus.startsAt && (
                                        <div className="flex items-center space-x-2">
                                            <IconCalendar className="w-4 h-4 text-primary" />
                                            <span>
                                                <strong>Inicio:</strong> {meetStatus.startsAt}
                                            </span>
                                        </div>
                                    )}
                                    {meetStatus.endsAt && (
                                        <div className="flex items-center space-x-2">
                                            <IconClock className="w-4 h-4 text-primary" />
                                            <span>
                                                <strong>Fin:</strong> {meetStatus.endsAt}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Contenido HTML de la sesión */}
            {session.content_html && (
                <Card className="mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-text-dark">Contenido de la Sesión</h2>
                    <RichTextDisplay content={session.content_html} />
                </Card>
            )}

            {/* Actividades */}
            {activities.length > 0 && (
                <Card className="mb-6">
                    <div className="flex items-center mb-4">
                        <IconClock className="w-5 h-5 mr-2 text-primary" />
                        <h2 className="text-lg font-semibold text-text-dark">Actividades</h2>
                    </div>
                    <ul className="space-y-2">
                        {activities.map((activity, index) => renderActivity(activity, index))}
                    </ul>
                </Card>
            )}

            {/* Videos de la Sesión */}
            {sessionMaterials.filter(m => m.kind === 'video').length > 0 && (
                <Card className="mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-text-dark">Videos de la Sesión</h2>
                    <div className="space-y-6">
                        {sessionMaterials.filter(m => m.kind === 'video').map((material) => {
                            const transcriptService = new VideoTranscriptService();
                            const platform = material.video_platform || transcriptService.detectPlatform(material.url || '')?.name || 'other';
                            const videoId = material.video_id || transcriptService.detectPlatform(material.url || '')?.extractId(material.url || '') || undefined;
                            
                            return (
                                <div key={material.id} className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="text-md font-semibold text-gray-800 mb-3">{material.title}</h3>
                                    {material.description && (
                                        <p className="text-sm text-gray-600 mb-3">{material.description}</p>
                                    )}
                                    <VideoPlayer
                                        materialId={material.id}
                                        url={material.url || ''}
                                        platform={platform as 'youtube' | 'vimeo' | 'other'}
                                        videoId={videoId}
                                        title={material.title}
                                        showProgress={true}
                                        transcription={material.transcription}
                                        transcriptionStatus={material.transcription_status}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Recursos */}
            {session.resources && session.resources.length > 0 && (
                <Card className="mb-6">
                    <h2 className="text-lg font-semibold mb-4 text-text-dark">Recursos</h2>
                    <ul className="space-y-2">
                        {session.resources.map((resource, index) => renderResource(resource, index))}
                    </ul>
                </Card>
            )}

            {/* Acción de completar sesión */}
            {isStudent && (
                <Card className={`mb-6 border transition-colors ${
                    isSessionCompleted 
                        ? 'bg-green-100 border-green-300' 
                        : 'bg-green-50 border-green-200'
                }`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className={`text-md font-semibold flex items-center gap-2 ${
                                isSessionCompleted ? 'text-green-800' : 'text-green-800'
                            }`}>
                                {isSessionCompleted && <IconCheck className="w-5 h-5 text-green-600" />}
                                {isSessionCompleted ? '¡Sesión Completada!' : '¿Terminaste de revisar esta sesión?'}
                            </h3>
                            <p className={`text-sm mt-1 ${
                                isSessionCompleted ? 'text-green-800' : 'text-green-700'
                            }`}>
                                {isSessionCompleted 
                                    ? 'Esta sesión ya fue marcada como completada. Tu avance ha sido registrado en el curso.'
                                    : 'Marca la sesión como completada para registrar tu avance en el curso.'
                                }
                            </p>
                            {sessionProgress?.completed_at && (
                                <p className="text-xs text-green-700 mt-2">
                                    Última vez marcada como completada: {formatDateTime(sessionProgress.completed_at)}
                                </p>
                            )}
                            {progressMessage && (
                                <p className="text-xs text-green-600 mt-2 font-medium">{progressMessage}</p>
                            )}
                        </div>
                        <div className="flex-shrink-0">
                            <Button
                                variant={isSessionCompleted ? 'secondary' : 'primary'}
                                size="md"
                                leftIcon={<IconCheck className="w-4 h-4" />}
                                onClick={handleCompleteSession}
                                disabled={savingCompletion || isSessionCompleted}
                                className={isSessionCompleted ? 'opacity-75 cursor-not-allowed' : ''}
                            >
                                {savingCompletion ? (
                                    <>
                                        <span className="animate-spin mr-2">⏳</span>
                                        Procesando...
                                    </>
                                ) : isSessionCompleted ? (
                                    'Sesión completada ✓'
                                ) : (
                                    'Marcar como completada'
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Evaluaciones al finalizar la sesión */}
            {isStudent && isSessionCompleted && (sessionAssessments.length > 0 || sessionFlashcards.length > 0) && (
                <Card className="mb-6 bg-blue-50 border border-blue-200">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                            <IconClipboardCheck className="w-5 h-5" />
                            Evaluaciones de la Sesión
                        </h3>
                        <p className="text-sm text-blue-700 mt-1">
                            Ahora puedes realizar las siguientes evaluaciones para medir tu comprensión del contenido de esta sesión.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* Quizzes y Trivias */}
                        {sessionAssessments.length > 0 && (
                            <div>
                                <h4 className="text-md font-semibold text-blue-800 mb-2">
                                    Quizzes y Trivias ({sessionAssessments.length})
                                </h4>
                                <div className="space-y-2">
                                    {sessionAssessments.map((assessment) => (
                                        <Link
                                            key={assessment.id}
                                            to={`/quiz/${assessment.id}`}
                                            className="block p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h5 className="font-semibold text-gray-900">{assessment.title}</h5>
                                                    {assessment.description && (
                                                        <p className="text-sm text-gray-600 mt-1">{assessment.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <IconClock className="w-4 h-4" />
                                                            {assessment.time_limit ? `${assessment.time_limit} min` : 'Sin límite'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <IconClipboardList className="w-4 h-4" />
                                                            {assessment.total_points} puntos
                                                        </span>
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                            {assessment.assessment_type === 'quiz' ? 'Quiz' : assessment.assessment_type === 'trivia' ? 'Trivia' : assessment.assessment_type}
                                                        </span>
                                                    </div>
                                                </div>
                                                <IconChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0 ml-4" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Flashcards */}
                        {sessionFlashcards.length > 0 && (
                            <div>
                                <h4 className="text-md font-semibold text-blue-800 mb-2">
                                    Flashcards ({sessionFlashcards.length})
                                </h4>
                                <Link
                                    to={`/courses/${session?.course_id}/flashcards?sessionId=${sessionId}`}
                                    className="block p-4 bg-white border border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                                                <IconCards className="w-5 h-5 text-blue-600" />
                                                Estudiar Flashcards de esta Sesión
                                            </h5>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Practica con {sessionFlashcards.length} {sessionFlashcards.length === 1 ? 'flashcard' : 'flashcards'} relacionadas con esta sesión
                                            </p>
                                        </div>
                                        <IconChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0 ml-4" />
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Navegación anterior/siguiente */}
            <div className="mt-8 flex justify-between items-center">
                {prevSession ? (
                    <Link to={`/session/${prevSession.id}`}>
                        <Button variant="secondary" leftIcon={<IconChevronLeft className="w-5 h-5" />}>
                            Anterior: {prevSession.title.substring(0, 30)}...
                        </Button>
                    </Link>
                ) : <div />}
                {nextSession ? (
                    <Link to={`/session/${nextSession.id}`}>
                        <Button variant="primary" rightIcon={<IconChevronRight className="w-5 h-5" />}>
                            Siguiente: {nextSession.title.substring(0, 30)}...
                        </Button>
                    </Link>
                ) : <div />}
            </div>

            {/* Link de retorno */}
            <Link to="/dashboard" className="mt-8 inline-block text-sky-600 hover:underline">
                &larr; Volver al Dashboard
            </Link>

            {/* Asistente IA */}
            {sessionId && (
                <div className="mt-8">
                    <AssistantIA 
                        courseId={session.course_id?.toString() || 'general'} 
                        sessionId={sessionId}
                    />
                </div>
            )}
        </div>
    );
};

export default SessionDetailPage;
