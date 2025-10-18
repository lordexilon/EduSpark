import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SESSIONS_DATA, ACTIVITY_TYPE_DETAILS, STUDENT_PROGRESS_DATA } from '../constants.ts';
import { CourseSession, SessionBlock, Activity, ActivityType } from '../types.ts';
import Card from '../components/Card.tsx';
import { IconClock, IconInfoCircle, IconChevronRight, IconBookOpen, IconCalendar, IconChatAlt2, IconClipboardList, IconVideoCamera, IconPencil, IconChevronLeft } from '../components/Icons.tsx';
import Button from '../components/Button.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import ProgressBar from '../components/ProgressBar.tsx';
import AssistantIA from '../components/AssistantIA.tsx';

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
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
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

    const session = SESSIONS_DATA.find(s => s.id === sessionId);

    if (!session) {
        return (
            <div className="text-center py-10">
                <h2 className="text-2xl font-semibold text-red-600">Sesión No Encontrada</h2>
                <p className="text-slate-600">La sesión que buscas no existe.</p>
                <Link to="/sessions" className="mt-4 inline-block text-sky-600 hover:underline">
                    &larr; Volver a la Lista de Sesiones
                </Link>
            </div>
        );
    }

    const totalActivities = session.blocks.reduce((sum, block) => sum + block.activities.length, 0);
    const completedActivities = STUDENT_PROGRESS_DATA[session.id] ?? 0;
    const progressPercentage = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

    const renderActivity = (activity: Activity, index: number) => {
      const typeDetails = ACTIVITY_TYPE_DETAILS[activity.type] || ACTIVITY_TYPE_DETAILS[ActivityType.ACTIVITY];
      return (
        <li key={index} className="py-3 px-4 bg-slate-50 rounded-md transition-colors">
            <div className="flex items-start space-x-4">
                <button 
                    onClick={() => setSelectedActivityType(activity.type)} 
                    className="flex-shrink-0 mt-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full p-1"
                    aria-label={`Más información sobre ${typeDetails.name}`}
                >
                    <ActivityIcon type={activity.type} />
                </button>
                <div className="flex-1">
                    <h4 className="font-semibold text-slate-700">{activity.title}</h4>
                     <button 
                        onClick={() => setSelectedActivityType(activity.type)} 
                        className="text-xs text-primary font-medium hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded"
                        aria-label={`Más información sobre ${typeDetails.name}`}
                    >
                        Tipo: {typeDetails.name}
                    </button>
                    {activity.description && <p className="text-sm text-slate-600 mt-1">{activity.description}</p>}
                    {activity.details && (
                        <ul className="list-disc list-inside text-sm text-slate-500 mt-1 pl-2">
                            {activity.details.map((detail, i) => <li key={i}>{detail}</li>)}
                        </ul>
                    )}
                </div>
            </div>
        </li>
    );
    };


    const renderSessionBlock = (block: SessionBlock, index: number) => (
        <Card key={index} className="mb-6">
            <div className="flex items-center text-slate-500 mb-3">
                <IconClock className="w-5 h-5 mr-2" />
                <h3 className="text-lg font-semibold text-slate-800">{block.timeRange} - {block.title}</h3>
            </div>
            {block.activities.length > 0 ? (
                <ul className="space-y-2">
                    {block.activities.map(renderActivity)}
                </ul>
            ) : (
                <p className="text-sm text-slate-500">No hay actividades específicas listadas para este bloque.</p>
            )}
        </Card>
    );

    const currentIndex = SESSIONS_DATA.findIndex(s => s.id === sessionId);
    const prevSession = currentIndex > 0 ? SESSIONS_DATA[currentIndex - 1] : null;
    const nextSession = currentIndex < SESSIONS_DATA.length - 1 ? SESSIONS_DATA[currentIndex + 1] : null;

    return (
        <div className="max-w-4xl mx-auto">
             {selectedActivityType && <ActivityTypeModal activityType={selectedActivityType} onClose={() => setSelectedActivityType(null)} />}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md -mx-6 mb-6 px-6 pt-4 pb-4 border-b border-border">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center mb-1">
                            <IconBookOpen className="w-5 h-5 mr-2 text-primary" />
                            <span className="text-sm font-medium text-text-light">Clase {session.number}</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-2 text-text-dark">{session.title}</h1>
                        <div className="flex items-center text-text-light text-sm mb-3">
                            <IconCalendar className="w-4 h-4 mr-1.5" />
                            <span>{session.date}</span>
                        </div>
                    </div>
                    {user?.role === 'teacher' && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/session/editar/${session.id}`)}
                            leftIcon={<IconPencil className="w-4 h-4" />}
                            className="flex-shrink-0 ml-4"
                        >
                            Editar Sesión
                        </Button>
                    )}
                </div>

                <div className="mt-4">
                    <div className="flex justify-between items-center mb-1 text-text-light">
                        <p className="text-sm font-medium">Progreso de la sesión</p>
                        <p className="text-sm font-medium">{completedActivities}/{totalActivities} actividades</p>
                    </div>
                    <ProgressBar value={progressPercentage} color="var(--primary)" height="8px" />
                </div>
            </div>

            <p className="text-text-light mb-6 bg-primary/10 p-4 rounded-lg border-l-4 border-primary/50 text-sm">
                <span className="font-semibold">Objetivo de la clase:</span> {session.objective}
            </p>

            {session.googleMeetLink && (
              <div className="mb-6">
                <a
                  href={session.googleMeetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <Button variant="primary" leftIcon={<IconVideoCamera className="w-5 h-5" />}>
                    Unirse a Videoconferencia (Google Meet)
                  </Button>
                </a>
              </div>
            )}


            {session.blocks.map(renderSessionBlock)}

            <div className="mt-8 flex justify-between items-center">
                {prevSession ? (
                    <Link to={`/session/${prevSession.id}`}>
                        <Button variant="secondary" leftIcon={<IconChevronLeft className="w-5 h-5" />}>
                            Anterior: {prevSession.title.substring(0, 20)}...
                        </Button>
                    </Link>
                ) : <div />}
                {nextSession ? (
                    <Link to={`/session/${nextSession.id}`}>
                        <Button variant="primary" rightIcon={<IconChevronRight className="w-5 h-5" />}>
                            Siguiente: {nextSession.title.substring(0, 20)}...
                        </Button>
                    </Link>
                ) : <div />}
            </div>
            <Link to="/sessions" className="mt-8 inline-block text-sky-600 hover:underline">
                &larr; Volver a la Lista de Sesiones
            </Link>

            <AssistantIA courseId={sessionId || 'general'} />
        </div>
    );
};

export default SessionDetailPage;