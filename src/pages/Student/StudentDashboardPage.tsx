// pages/StudentDashboardPage.tsx
// Panel de Estudiante Rediseñado - EduSpark AI
// Diseño moderno con UX premium y totalmente responsive
// NOTA: Este componente usa el Layout existente (no incluye sidebar propio)

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { courseEnrollmentService, careerEnrollmentService, careerService } from '@/services/academicService';
import { courseService, unitService, sessionService } from '@/services/teacherCourses';
import { progressService } from '@/services/progressService';
import { assignmentService, submissionService } from '@/services/assignments';
import { messagingService, Conversation } from '@/services/messagingService';
import { supabase } from '@/lib/supabase';
import { StudentProgressCard } from '@/components/Dashboard/StudentProgressCard';
import { InteractiveTutorial } from '@/components/Features/InteractiveTutorial';
import { useTutorial } from '@/hooks/useTutorial';
import { welcomeTutorial } from '@/config/tutorialConfigs';

// ==========================================
// Interfaces
// ==========================================
interface CourseEnrollment {
    id: string;
    course_id: number;
    status: string;
    completion_percentage: number;
    course?: {
        id: number; deps
        title: string;
        code?: string;
        description?: string;
        thumbnail_url?: string;
    };
}

interface TaskItem {
    id: string;
    title: string;
    description?: string;
    dueDate: string;
    status: 'pending' | 'completed';
    isOverdue: boolean;
    daysRemaining: number;
    progress?: number;
}

interface LearningData {
    day: string;
    hours: number;
}

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    type: 'session' | 'unit' | 'assignment' | 'videocall';
    color: string;
    icon: string;
    url?: string;
}

interface ClassPlannerItem {
    id: string;
    title: string;
    date: Date;
    startTime: string;
    endTime: string | null;
    progress: number;
    color: string;
    courseId: number;
    sessionId: string;
    hasVideocall: boolean;
}

// ==========================================
// Weekly Progress Component
// ==========================================
const WeeklyProgress: React.FC<{ userId: string }> = ({ userId }) => {
    const navigate = useNavigate();
    const [data, setData] = useState<LearningData[]>([]);
    const [loading, setLoading] = useState(true);
    const [weeklyPercentage, setWeeklyPercentage] = useState(0);
    const [improvement, setImprovement] = useState(0);
    const [isImprovement, setIsImprovement] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!userId) return;
            try {
                // Obtener datos de esta semana
                const hoursData = await progressService.getLearningHours(userId, 'weekly');
                setData(hoursData);

                // Calcular total de horas de esta semana
                const totalHours = hoursData.reduce((acc, d) => acc + d.hours, 0);
                const percentage = Math.min(100, Math.round((totalHours / 10) * 100));
                setWeeklyPercentage(percentage);

                // Calcular mejora real comparando con semana anterior
                try {
                    // Obtener datos de semana anterior (simular moviendo la fecha 7 días atrás)
                    // Para esto necesitamos obtener más datos históricos
                    const now = new Date();
                    const lastWeekStart = new Date(now);
                    lastWeekStart.setDate(now.getDate() - 14); // 14 días atrás para la semana anterior

                    // Obtener session_progress de las últimas 2 semanas
                    const { data: sessionProgress } = await supabase
                        .from('session_progress')
                        .select('time_spent_minutes, last_accessed_at')
                        .eq('student_id', userId)
                        .gte('last_accessed_at', lastWeekStart.toISOString());

                    if (sessionProgress && sessionProgress.length > 0) {
                        const weekStartDate = new Date(now);
                        const dayOfWeek = weekStartDate.getDay();
                        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                        weekStartDate.setDate(weekStartDate.getDate() - daysToMonday);
                        weekStartDate.setHours(0, 0, 0, 0);

                        let currentWeekMinutes = 0;
                        let previousWeekMinutes = 0;

                        sessionProgress.forEach((sp: any) => {
                            const accessDate = new Date(sp.last_accessed_at);
                            const minutes = sp.time_spent_minutes || 0;

                            if (accessDate >= weekStartDate) {
                                currentWeekMinutes += minutes;
                            } else {
                                const previousWeekStart = new Date(weekStartDate);
                                previousWeekStart.setDate(previousWeekStart.getDate() - 7);
                                if (accessDate >= previousWeekStart) {
                                    previousWeekMinutes += minutes;
                                }
                            }
                        });

                        // Calcular porcentaje de mejora
                        if (previousWeekMinutes > 0) {
                            const improvementValue = ((currentWeekMinutes - previousWeekMinutes) / previousWeekMinutes) * 100;
                            setImprovement(Math.abs(Math.round(improvementValue)));
                            setIsImprovement(improvementValue >= 0);
                        } else if (currentWeekMinutes > 0) {
                            // Si no hay datos de semana anterior pero hay actividad esta semana
                            setImprovement(100);
                            setIsImprovement(true);
                        }
                    }
                } catch (error) {
                    console.warn('Error calculando mejora semanal:', error);
                    // Mantener valores por defecto
                }
            } catch (error) {
                console.error('Error loading weekly progress:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [userId]);

    const handleAnalyze = () => {
        window.open('https://cacavelos.com.py/grades', '_blank');
    };

    if (loading) {
        return (
            <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 animate-pulse h-full">
                <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-16 bg-muted rounded mb-4"></div>
                <div className="h-24 bg-muted rounded"></div>
            </div>
        );
    }

    const maxHours = Math.max(...data.map(d => d.hours), 1);

    return (
        <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 flex flex-col justify-between h-full relative overflow-hidden group">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-primary/20"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-lg font-bold text-text-dark">Progreso Semanal</h3>
                    <button
                        onClick={handleAnalyze}
                        className="text-xs text-primary font-bold flex items-center gap-1 hover:underline mt-1 bg-primary/10 px-2 py-1 rounded-lg transition-colors border border-primary/20"
                    >
                        <span className="material-symbols-outlined text-sm">smart_toy</span>
                        Analizar Desempeño
                    </button>
                </div>
                {improvement > 0 && (
                    <span className={`${isImprovement ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'} text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1`}>
                        <span className="material-symbols-outlined text-sm">{isImprovement ? 'trending_up' : 'trending_down'}</span>
                        {isImprovement ? '+' : '-'}{improvement}%
                    </span>
                )}
            </div>

            <div className="flex items-end gap-2 mb-4">
                <span className="text-5xl font-black text-text-dark tracking-tight">
                    {weeklyPercentage}<span className="text-2xl text-text-light opacity-50">%</span>
                </span>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-2 h-24 w-full mt-auto">
                {data.map((d, i) => {
                    const heightPercent = maxHours > 0 ? (d.hours / maxHours) * 100 : 0;
                    const isToday = i === data.length - 1;
                    return (
                        <div
                            key={d.day}
                            className="w-full bg-muted rounded-t-lg relative cursor-pointer overflow-hidden group/bar"
                            style={{ height: '100%' }}
                            title={`${d.hours} horas`}
                        >
                            <div
                                className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-1000 ${isToday
                                    ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]'
                                    : 'bg-primary/40 hover:bg-primary/60'
                                    }`}
                                style={{ height: `${heightPercent}%` }}
                            ></div>
                        </div>
                    );
                })}
            </div>
            <p className="text-center text-xs font-bold text-text-light opacity-60 mt-3 uppercase tracking-wider">
                {data.map(d => d.day.charAt(0)).join(' - ')}
            </p>
        </div>
    );
};

// ==========================================
// My Exams Card Component
// ==========================================
const MyExamsCard: React.FC<{ userId: string }> = ({ userId }) => {
    const [loading, setLoading] = useState(true);
    const [examsData, setExamsData] = useState<{
        exam1Score: number | null;
        exam2Score: number | null;
        finalExamScore: number | null;
        weights: { exam1_weight: number; exam2_weight: number; final_exam_weight: number } | null;
        totalExams: number;
        completedExams: number;
    }>({
        exam1Score: null,
        exam2Score: null,
        finalExamScore: null,
        weights: null,
        totalExams: 0,
        completedExams: 0
    });

    useEffect(() => {
        const loadExamsData = async () => {
            if (!userId) return;

            try {
                setLoading(true);

                // Obtener el primer curso activo del estudiante
                const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
                const activeEnrollment = enrollments.find(e => e.status === 'active');

                if (!activeEnrollment) {
                    setLoading(false);
                    return;
                }

                // Importar gradingService
                const { gradingService } = await import('@/services/gradingService');

                // Calcular calificaciones finales (incluye scores de exámenes)
                const finalGrade = await gradingService.calculateFinalGrade(userId, activeEnrollment.course_id);

                // Determinar cuántos exámenes están configurados según las ponderaciones
                let totalExams = 0;
                let completedExams = 0;

                if (finalGrade.weights) {
                    if (finalGrade.weights.exam1_weight > 0) totalExams++;
                    if (finalGrade.weights.exam2_weight > 0) totalExams++;
                    if (finalGrade.weights.final_exam_weight > 0) totalExams++;

                    if (finalGrade.exam1Score !== null) completedExams++;
                    if (finalGrade.exam2Score !== null) completedExams++;
                    if (finalGrade.finalExamScore !== null) completedExams++;
                }

                setExamsData({
                    exam1Score: finalGrade.exam1Score,
                    exam2Score: finalGrade.exam2Score,
                    finalExamScore: finalGrade.finalExamScore,
                    weights: finalGrade.weights ? {
                        exam1_weight: finalGrade.weights.exam1_weight,
                        exam2_weight: finalGrade.weights.exam2_weight,
                        final_exam_weight: finalGrade.weights.final_exam_weight
                    } : null,
                    totalExams,
                    completedExams
                });
            } catch (error) {
                console.error('Error loading exams data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadExamsData();
    }, [userId]);

    if (loading) {
        return (
            <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 animate-pulse h-full">
                <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-16 bg-muted rounded mb-4"></div>
                <div className="h-24 bg-muted rounded"></div>
            </div>
        );
    }

    if (examsData.totalExams === 0) {
        return (
            <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 h-full flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-text-light opacity-30 mb-2">quiz</span>
                <p className="text-sm text-text-light font-medium">No hay exámenes configurados</p>
            </div>
        );
    }

    const progressPercentage = examsData.totalExams > 0 ? (examsData.completedExams / examsData.totalExams) * 100 : 0;

    return (
        <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 h-full relative overflow-hidden group">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-red-600/20"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-600">quiz</span>
                        Mis Exámenes
                    </h3>
                    <p className="text-xs text-text-light mt-1">
                        {examsData.completedExams} de {examsData.totalExams} completados
                    </p>
                </div>
                <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs font-bold px-2.5 py-1 rounded-full">
                    {Math.round(progressPercentage)}%
                </span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-red-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </div>

            {/* Exam scores */}
            <div className="space-y-2 relative z-10">
                {examsData.weights && examsData.weights.exam1_weight > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${examsData.exam1Score !== null ? 'bg-green-500' : 'bg-muted'}`}></div>
                            <span className="text-sm font-medium text-text-light">Examen 1</span>
                            <span className="text-xs text-text-light opacity-50">({examsData.weights.exam1_weight}%)</span>
                        </div>
                        <span className={`text-sm font-bold ${examsData.exam1Score !== null ? 'text-text-dark' : 'text-text-light opacity-50'}`}>
                            {examsData.exam1Score !== null ? `${examsData.exam1Score.toFixed(1)}%` : 'Pendiente'}
                        </span>
                    </div>
                )}

                {examsData.weights && examsData.weights.exam2_weight > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${examsData.exam2Score !== null ? 'bg-green-500' : 'bg-muted'}`}></div>
                            <span className="text-sm font-medium text-text-light">Examen 2</span>
                            <span className="text-xs text-text-light opacity-50">({examsData.weights.exam2_weight}%)</span>
                        </div>
                        <span className={`text-sm font-bold ${examsData.exam2Score !== null ? 'text-text-dark' : 'text-text-light opacity-50'}`}>
                            {examsData.exam2Score !== null ? `${examsData.exam2Score.toFixed(1)}%` : 'Pendiente'}
                        </span>
                    </div>
                )}

                {examsData.weights && examsData.weights.final_exam_weight > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${examsData.finalExamScore !== null ? 'bg-green-500' : 'bg-muted'}`}></div>
                            <span className="text-sm font-medium text-text-light">Final</span>
                            <span className="text-xs text-text-light opacity-50">({examsData.weights.final_exam_weight}%)</span>
                        </div>
                        <span className={`text-sm font-bold ${examsData.finalExamScore !== null ? 'text-text-dark' : 'text-text-light opacity-50'}`}>
                            {examsData.finalExamScore !== null ? `${examsData.finalExamScore.toFixed(1)}%` : 'Pendiente'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// AI Tutor Card Component (Compact)
// ==========================================
const AITutorCard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div
            data-tutorial="tutor-link"
            onClick={() => navigate('/tutor')}
            className="relative overflow-hidden rounded-2xl p-6 cursor-pointer group h-full shadow-lg shadow-black/5 dark:shadow-black/20 min-h-[180px] flex flex-col justify-center"
        >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 group-hover:scale-105 transition-transform duration-500"></div>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-white text-8xl">auto_awesome</span>
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3 text-indigo-200">
                    <span className="material-symbols-outlined text-yellow-300">auto_awesome</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Tutor IA Personal</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 leading-tight">¿Tienes dudas?</h3>
                <p className="text-indigo-100 text-sm mb-4 line-clamp-2">Pregúntale a Spark AI sobre cualquier tema de tus cursos.</p>
                <button
                    className="bg-stone-50/10 hover:bg-stone-50/20 text-white border border-white/20 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 w-fit backdrop-blur-sm"
                >
                    <span>Abrir Chat</span>
                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                </button>
            </div>
        </div>
    );
};

// ==========================================
// Calendar Component
// ==========================================
const DashboardCalendar: React.FC<{ userId: string }> = ({ userId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    useEffect(() => {
        const loadEvents = async () => {
            if (!userId) return;

            try {
                setLoading(true);
                const allEvents: CalendarEvent[] = [];

                // Get enrolled courses
                const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
                const activeEnrollments = enrollments.filter(e => e.status === 'active');

                // Fetch events for each course
                for (const enrollment of activeEnrollments) {
                    // Sessions
                    try {
                        const sessions = await sessionService.getCourseSessions(enrollment.course_id);
                        sessions.forEach(session => {
                            if (session.starts_at) {
                                allEvents.push({
                                    id: `session-${session.id}`,
                                    title: session.title,
                                    date: new Date(session.starts_at),
                                    type: 'session',
                                    color: 'bg-indigo-500',
                                    icon: 'menu_book',
                                    url: `/session/${session.id}`
                                });
                            }
                            // Videocalls
                            if (session.google_meet_link && session.starts_at) {
                                allEvents.push({
                                    id: `videocall-${session.id}`,
                                    title: `Videollamada: ${session.title}`,
                                    date: new Date(session.starts_at),
                                    type: 'videocall',
                                    color: 'bg-green-500',
                                    icon: 'videocam',
                                    url: `/session/${session.id}`
                                });
                            }
                        });
                    } catch (e) {
                        console.warn('Error loading sessions', e);
                    }

                    // Units
                    try {
                        const units = await unitService.getCourseUnits(enrollment.course_id);
                        units.forEach(unit => {
                            if (unit.created_at) {
                                allEvents.push({
                                    id: `unit-${unit.id}`,
                                    title: unit.title,
                                    date: new Date(unit.created_at),
                                    type: 'unit',
                                    color: 'bg-purple-500',
                                    icon: 'folder',
                                    url: `/courses/${enrollment.course_id}`
                                });
                            }
                        });
                    } catch (e) {
                        console.warn('Error loading units', e);
                    }

                    // Assignments
                    try {
                        const assignments = await assignmentService.getStudentAssignments(userId, enrollment.course_id);
                        assignments.forEach(assignment => {
                            if (assignment.due_at) {
                                allEvents.push({
                                    id: `assignment-${assignment.id}`,
                                    title: assignment.title,
                                    date: new Date(assignment.due_at),
                                    type: 'assignment',
                                    color: 'bg-orange-500',
                                    icon: 'assignment',
                                    url: `/assignments?assignmentId=${assignment.id}`
                                });
                            }
                        });
                    } catch (e) {
                        console.warn('Error loading assignments', e);
                    }
                }

                setEvents(allEvents);
            } catch (err) {
                console.error('Error loading calendar events:', err);
            } finally {
                setLoading(false);
            }
        };

        loadEvents();
    }, [userId]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        // Monday as 0
        const adjustedStartingDay = (startingDayOfWeek + 6) % 7;

        const days = [];
        // Empty days
        for (let i = 0; i < adjustedStartingDay; i++) {
            days.push({ day: null, date: null, events: [] });
        }
        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(year, month, day);
            const dayEvents = events.filter(e => new Date(e.date).toDateString() === dayDate.toDateString());
            days.push({ day, date: dayDate, events: dayEvents });
        }
        return days;
    };

    const days = getDaysInMonth(currentDate);
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const getEventsForDate = (date: Date | null) => {
        if (!date) return [];
        return events.filter(e => new Date(e.date).toDateString() === date.toDateString());
    };

    const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    return (
        <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">calendar_month</span>
                    Calendario
                </h3>
                <button
                    onClick={() => setCurrentDate(new Date())}
                    className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
                >
                    Hoy
                </button>
            </div>

            <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-muted rounded-lg">
                    <span className="material-symbols-outlined text-text-light opacity-50">chevron_left</span>
                </button>
                <h4 className="font-bold text-text-dark capitalize">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h4>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-muted rounded-lg">
                    <span className="material-symbols-outlined text-text-light opacity-50">chevron_right</span>
                </button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-bold text-text-light opacity-50 mb-2">
                {weekDays.map(d => <span key={d}>{d}</span>)}
            </div>

            <div className="grid grid-cols-7 gap-1 mb-6">
                {days.map((d, i) => {
                    const isToday = d.date && d.date.toDateString() === new Date().toDateString();
                    const isSelected = selectedDate && d.date && d.date.toDateString() === selectedDate.toDateString();

                    return (
                        <div
                            key={i}
                            onClick={() => d.date && setSelectedDate(d.date)}
                            className={`
                aspect-square rounded-lg flex flex-col items-center justify-center relative cursor-pointer transition-all
                ${d.day ? 'hover:bg-muted' : ''}
                ${isSelected ? 'bg-primary text-white shadow-md shadow-primary/20' : ''}
                ${!isSelected && isToday ? 'border border-primary text-primary font-bold' : ''}
              `}
                        >
                            {d.day && (
                                <>
                                    <span className={`text-sm ${isSelected ? 'text-white' : 'text-text-dark'}`}>{d.day}</span>
                                    <div className="flex gap-0.5 mt-1">
                                        {d.events.slice(0, 3).map((e, idx) => (
                                            <div key={idx} className={`w-2 h-2 rounded-full ${isSelected ? 'bg-stone-50' : e.color.replace('bg-', 'bg-')}`}></div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedDate && (
                <div className="border-t border-border pt-4">
                    <h5 className="text-sm font-bold text-text-dark mb-3 flex items-center gap-2">
                        Eventos del {selectedDate.getDate()}
                        <span className="text-text-light font-normal opacity-50">({selectedEvents.length})</span>
                    </h5>

                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1 scroll-smooth">
                        {selectedEvents.length === 0 ? (
                            <p className="text-xs text-text-light opacity-50 text-center py-4">No hay eventos para este día</p>
                        ) : (
                            selectedEvents.map(event => (
                                <Link
                                    key={event.id}
                                    to={event.url || '#'}
                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-background hover:bg-muted transition-colors group"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${event.color} shadow-lg shadow-black/5 dark:shadow-black/20 group-hover:scale-110 transition-transform`}>
                                        <span className="material-symbols-outlined text-sm">{event.icon}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-text-dark truncate">{event.title}</p>
                                        <p className="text-[10px] text-text-light opacity-60 capitalize">{event.type}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-text-light opacity-30 text-sm">chevron_right</span>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                    <span className="text-xs text-text-light opacity-60">Clases</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-text-light opacity-60">Unidades</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-text-light opacity-60">Tareas</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span className="text-xs text-text-light opacity-60">Videollamadas</span>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// Pending Tasks Component
// ==========================================
const PendingTasks: React.FC<{ userId: string }> = ({ userId }) => {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTasks = async () => {
            if (!userId) return;

            try {
                // Get all courses first
                const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
                const activeEnrollments = enrollments.filter(e => e.status === 'active');

                const allTasks: TaskItem[] = [];

                for (const enrollment of activeEnrollments.slice(0, 3)) {
                    try {
                        const assignments = await assignmentService.getStudentAssignments(userId, enrollment.course_id);

                        for (const assignment of assignments) {
                            const submission = await submissionService.getStudentSubmission(assignment.id, userId);
                            const today = new Date();
                            const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
                            const isCompleted = submission !== null && submission.grade !== null;
                            const daysRemaining = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) : 999;
                            const isOverdue = dueDate && dueDate < today && !isCompleted;

                            if (!isCompleted) {
                                allTasks.push({
                                    id: assignment.id,
                                    title: assignment.title,
                                    description: assignment.description,
                                    dueDate: assignment.due_at || '',
                                    status: isCompleted ? 'completed' : 'pending',
                                    isOverdue: isOverdue || false,
                                    daysRemaining: daysRemaining,
                                    progress: submission ? 33 : 0,
                                });
                            }
                        }
                    } catch (err) {
                        console.warn('Error loading assignments for course:', enrollment.course_id);
                    }
                }

                // Sort by due date
                allTasks.sort((a, b) => a.daysRemaining - b.daysRemaining);
                setTasks(allTasks.slice(0, 4));
            } catch (error) {
                console.error('Error loading tasks:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTasks();
    }, [userId]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                        <div key={i} className="animate-pulse bg-gray-100 h-32 rounded-2xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="bg-surface rounded-2xl p-8 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 text-center">
                <span className="material-symbols-outlined text-4xl text-green-500 mb-2">task_alt</span>
                <p className="text-text-light">¡No tienes tareas pendientes!</p>
            </div>
        );
    }

    const getUrgencyColor = (daysRemaining: number, isOverdue: boolean) => {
        if (isOverdue) return { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-600', label: 'Vencida' };
        if (daysRemaining <= 1) return { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-600', label: 'Mañana' };
        if (daysRemaining <= 3) return { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', label: `${daysRemaining} días` };
        if (daysRemaining <= 7) return { border: 'border-l-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Esta semana' };
        return { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-600', label: 'Próximamente' };
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">task_alt</span>
                    Tareas Pendientes
                </h3>
                <Link to="/assignments" className="text-sm font-medium text-primary hover:text-primary/80">
                    Ver Calendario
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tasks.map((task) => {
                    const urgency = getUrgencyColor(task.daysRemaining, task.isOverdue);
                    return (
                        <Link
                            key={task.id}
                            to={`/assignments?assignmentId=${task.id}`}
                            className={`bg-surface p-4 rounded-xl border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-md transition-all relative overflow-hidden group ${urgency.border} border-l-4`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`${urgency.bg} ${urgency.text} dark:bg-opacity-20 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider`}>
                                    {urgency.label}
                                </span>
                            </div>
                            <h4 className="text-base font-bold text-text-dark mb-1 group-hover:text-primary transition-colors line-clamp-1">
                                {task.title}
                            </h4>
                            {task.description && (
                                <p className="text-sm text-text-light opacity-60 mb-3 line-clamp-1">{task.description.replace(/<[^>]*>/g, '')}</p>
                            )}
                            {task.progress !== undefined && task.progress > 0 && (
                                <>
                                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                                        <div className={`${urgency.text.replace('text-', 'bg-')} h-full rounded-full`} style={{ width: `${task.progress}%` }}></div>
                                    </div>
                                    <div className="mt-1.5 text-xs font-bold text-right text-text-light opacity-50">
                                        {task.progress}% Completado
                                    </div>
                                </>
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

// ==========================================
// Upcoming Sessions Component (ClassPlanner)
// ==========================================
const UpcomingSessions: React.FC<{ userId: string }> = ({ userId }) => {
    const [sessions, setSessions] = useState<ClassPlannerItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSessions = async () => {
            if (!userId) return;

            try {
                setLoading(true);
                const allSessions: ClassPlannerItem[] = [];

                const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
                const activeEnrollments = enrollments.filter(e => e.status === 'active');

                for (const enrollment of activeEnrollments) {
                    try {
                        const courseSessions = await sessionService.getCourseSessions(enrollment.course_id);

                        for (const session of courseSessions) {
                            if (session.starts_at) {
                                const startDate = new Date(session.starts_at);
                                const now = new Date();
                                const today = new Date(now);
                                today.setHours(0, 0, 0, 0);

                                if (startDate >= today) {
                                    // Progress logic (simplified from original)
                                    let progress = 0; // Default

                                    // Format times
                                    const startTime = startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                    let endTime: string | null = null;
                                    if (session.ends_at) {
                                        endTime = new Date(session.ends_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                                    }

                                    allSessions.push({
                                        id: session.id,
                                        title: session.title,
                                        date: startDate,
                                        startTime,
                                        endTime,
                                        progress,
                                        color: session.google_meet_link ? 'bg-green-500' : 'bg-indigo-500',
                                        courseId: enrollment.course_id,
                                        sessionId: session.id,
                                        hasVideocall: !!session.google_meet_link
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Error loading sessions', e);
                    }
                }

                // Sort by date and take next 5
                allSessions.sort((a, b) => a.date.getTime() - b.date.getTime());
                setSessions(allSessions.slice(0, 5));

            } catch (err) {
                console.error('Error loading upcoming sessions:', err);
            } finally {
                setLoading(false);
            }
        };

        loadSessions();
    }, [userId]);

    if (loading) {
        return (
            <div className="bg-surface rounded-2xl p-6 border-2 border-border h-full animate-pulse shadow-lg shadow-black/5 dark:shadow-black/20">
                <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl opacity-50"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                    Próximas Sesiones
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {sessions.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center">
                        <span className="material-symbols-outlined text-text-light opacity-30 text-4xl mb-2">event_busy</span>
                        <p className="text-text-light opacity-60 text-sm">No tienes sesiones programadas próximamente</p>
                    </div>
                ) : (
                    sessions.map(session => {
                        const isToday = session.date.toDateString() === new Date().toDateString();
                        const dateStr = session.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

                        return (
                            <Link
                                key={session.id}
                                to={`/session/${session.sessionId}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-background/50 hover:bg-primary/5 transition-colors group border border-transparent hover:border-primary/20"
                            >
                                <div className={`flex flex-col items-center justify-center min-w-[50px] p-2 rounded-lg ${isToday ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface border-2 border-border'}`}>
                                    <span className={`text-base font-bold ${isToday ? 'text-white' : 'text-text-dark'}`}>{session.date.getDate()}</span>
                                    <span className={`text-[10px] uppercase font-bold ${isToday ? 'text-white/70' : 'text-text-light opacity-50'}`}>
                                        {session.date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-bold text-text-dark truncate group-hover:text-primary transition-colors">
                                            {session.title}
                                        </h4>
                                        {session.hasVideocall && (
                                            <span className="material-symbols-outlined text-green-500 text-sm" title="Videollamada disponible">videocam</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-text-light opacity-60">
                                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                                        <span>{session.startTime} {session.endTime ? `- ${session.endTime}` : ''}</span>
                                    </div>
                                </div>

                                <span className="material-symbols-outlined text-text-light opacity-30 group-hover:text-primary transition-colors">chevron_right</span>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// ==========================================
// AI Insights Component
// ==========================================
const AIInsights: React.FC = () => {
    return (
        <div className="space-y-4 h-full">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-600">psychology</span>
                    Insights
                </h3>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 p-5 rounded-xl border border-purple-100 dark:border-border flex flex-col gap-4 shadow-lg shadow-black/5 dark:shadow-black/20 h-[calc(100%-40px)]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface rounded-lg shadow-lg shadow-black/5 dark:shadow-black/20 text-purple-600">
                        <span className="material-symbols-outlined">lightbulb</span>
                    </div>
                    <h4 className="font-bold text-text-dark text-sm">Sugerencia de Aprendizaje</h4>
                </div>
                <p className="text-sm text-text-light opacity-80 leading-relaxed">
                    Notamos que has mejorado un <span className="font-bold text-green-600">+15%</span> en redacción. Para tu próximo ensayo, enfócate en fortalecer tu <span className="font-bold border-b-2 border-purple-600/30 text-text-dark">tesis principal</span>.
                </p>
                <button className="mt-auto w-full py-2 rounded-lg bg-surface border border-purple-100 dark:border-border text-purple-600 font-bold text-sm hover:bg-purple-50 dark:hover:bg-muted transition-colors shadow-lg shadow-black/5 dark:shadow-black/20">
                    Ver Análisis Completo
                </button>
            </div>
        </div>
    );
};

// ==========================================
// Courses In Progress Component
// ==========================================
const CoursesInProgress: React.FC<{ userId: string }> = ({ userId }) => {
    const [courses, setCourses] = useState<CourseEnrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const loadCourses = async () => {
            if (!userId) return;

            try {
                const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
                // Get ALL active courses
                const activeEnrollments = enrollments.filter(e => e.status === 'active');

                const coursesWithDetails = await Promise.all(
                    activeEnrollments.map(async (enrollment) => {
                        try {
                            // Update progress
                            await progressService.updateCourseProgress(userId, enrollment.course_id);
                            const updatedEnrollments = await courseEnrollmentService.getStudentEnrollments(userId);
                            const current = updatedEnrollments.find(e => e.id === enrollment.id) || enrollment;
                            const course = await courseService.getCourse(enrollment.course_id);
                            return {
                                ...current,
                                course: {
                                    id: course.id,
                                    title: course.title,
                                    code: course.code,
                                    description: course.description,
                                    thumbnail_url: course.thumbnail_url,
                                }
                            };
                        } catch (e) {
                            return {
                                ...enrollment,
                                course: {
                                    id: enrollment.course_id,
                                    title: `Curso #${enrollment.course_id}`
                                }
                            };
                        }
                    })
                );

                setCourses(coursesWithDetails);
            } catch (error) {
                console.error('Error loading courses:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCourses();
    }, [userId]);

    const nextCourse = () => {
        setCurrentIndex((prev) => (prev + 1) % courses.length);
    };

    const prevCourse = () => {
        setCurrentIndex((prev) => (prev - 1 + courses.length) % courses.length);
    };

    if (loading) {
        return (
            <div className="h-full min-h-[14rem] bg-surface rounded-2xl p-6 border-2 border-border animate-pulse shadow-lg shadow-black/5 dark:shadow-black/20">
                <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-20 bg-muted rounded-xl mb-4 opacity-50"></div>
                <div className="h-8 bg-muted rounded-lg w-full opacity-30"></div>
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="h-full min-h-[14rem] bg-surface rounded-2xl p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-text-light opacity-30 mb-2">school</span>
                <p className="text-sm text-text-light opacity-60 font-medium">Sin cursos activos</p>
                <Link to="/my/courses" className="text-primary font-bold text-xs hover:underline mt-2">
                    Explorar
                </Link>
            </div>
        );
    }

    const enrollment = courses[currentIndex];
    const progress = Math.round(enrollment.completion_percentage || 0);
    const isNew = progress < 15;

    return (
        <div
            data-tutorial="courses-section"
            className="relative w-full min-h-[22rem] flex flex-col justify-end bg-gray-900 rounded-3xl p-8 md:p-10 shadow-xl overflow-hidden group border-2 border-border"
        >
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                    backgroundImage: enrollment.course?.thumbnail_url
                        ? `url(${enrollment.course.thumbnail_url})`
                        : `url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop)`
                }}
            ></div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent"></div>

            {/* Carousel Navigation - Only show if more than 1 course */}
            {courses.length > 1 && (
                <>
                    {/* Left Arrow */}
                    <button
                        onClick={prevCourse}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-full transition-all"
                        aria-label="Curso anterior"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Right Arrow */}
                    <button
                        onClick={nextCourse}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-full transition-all"
                        aria-label="Siguiente curso"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* Dots Indicator */}
                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                        {courses.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                                    ? 'bg-white w-6'
                                    : 'bg-white/40 hover:bg-white/60'
                                    }`}
                                aria-label={`Ir a curso ${index + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Content */}
            <div className="relative z-10 w-full max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-primary px-4 py-1.5 rounded-full text-white text-xs font-bold mb-6 shadow-lg ring-1 ring-white/20">
                    <span className="material-symbols-outlined text-sm">play_circle</span>
                    {isNew ? 'Curso Nuevo' : 'Continuar Aprendiendo'}
                </div>

                <h3 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight drop-shadow-lg">
                    {enrollment.course?.title}
                </h3>
                <p className="text-gray-200 text-sm md:text-base mb-8 line-clamp-2 font-medium drop-shadow-lg text-opacity-90 max-w-xl">
                    {enrollment.course?.description || 'Continúa avanzando en tu aprendizaje y completa tus objetivos.'}
                </p>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 max-w-lg mb-6">
                    <div className="flex items-center justify-between text-white text-sm font-bold mb-3">
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary-light">flag</span>
                            Progreso General
                        </span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                        <div
                            className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.6)] relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/40"></div>
                        </div>
                    </div>
                </div>

                <div>
                    <Link to={`/courses/${enrollment.course_id}`}>
                        <button className="px-8 py-3.5 rounded-xl bg-white text-primary font-bold hover:bg-primary/5 transition-all shadow-xl shadow-black/20 flex items-center gap-3 transform hover:-translate-y-1 active:scale-95">
                            {isNew ? 'Comenzar Ahora' : 'Reanudar Clase'}
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// MyCareers Component
// ==========================================
const MyCareers: React.FC<{ userId: string }> = ({ userId }) => {
    const [careers, setCareers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!userId) return;
            try {
                const enrollments = await careerEnrollmentService.getStudentEnrollments(userId);
                const withDetails = await Promise.all(enrollments.map(async (e) => {
                    try {
                        const career = await careerService.getCareer(e.career_id);
                        return { ...e, career };
                    } catch { return e; }
                }));
                setCareers(withDetails);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, [userId]);

    if (loading || careers.length === 0) return null;

    return (
        <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 h-full">
            <h3 className="text-lg font-bold text-text-dark flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">school</span>
                Mis Carreras
            </h3>
            <div className="flex flex-col gap-4">
                {careers.map(c => (
                    <div key={c.id} className="p-4 rounded-xl border-2 border-border bg-background/50 flex items-center gap-4 hover:shadow-md transition-shadow group">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined">school</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-text-dark capitalize truncate">{c.career?.name || 'Carrera'}</h4>
                            <p className="text-xs text-text-light opacity-60">Semestre {c.current_semester}</p>
                        </div>
                        <Link to="/academic" className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-primary hover:bg-primary/10 rounded-lg" title="Ver Malla Curricular">
                            <span className="material-symbols-outlined">grid_view</span>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ==========================================
// DashboardMessages Component
// ==========================================
const DashboardMessages: React.FC<{ userId: string }> = ({ userId }) => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!userId) return;
            try {
                const data = await messagingService.getMyConversations();

                // Fix: Si other_user es null, intentar cargar manualmente
                const conversationsWithUsers = await Promise.all(
                    data.map(async (conv) => {
                        if (!conv.other_user) {
                            // Determinar el ID del otro usuario
                            const otherUserId = conv.participant1_id === userId
                                ? conv.participant2_id
                                : conv.participant1_id;

                            try {
                                // Intentar cargar el usuario directamente
                                const { data: userData, error } = await supabase
                                    .from('users')
                                    .select('id, first_name, last_name, email, avatar_url')
                                    .eq('id', otherUserId)
                                    .maybeSingle();

                                if (!error && userData) {
                                    return {
                                        ...conv,
                                        other_user: userData
                                    };
                                }
                            } catch (e) {
                                console.error('❌ Excepción cargando usuario:', e);
                            }
                        }
                        return conv;
                    })
                );

                setConversations(conversationsWithUsers.slice(0, 5));
            } catch (e) {
                console.error('❌ Error loading conversations:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    const getDisplayName = (c: Conversation) => {
        const u = c.other_user;

        if (!u) {
            console.warn('Conversación sin other_user:', c.id);
            return 'Usuario';
        }

        // Intentar first_name + last_name
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
        if (fullName) {
            return fullName;
        }

        // Fallback a email
        if (u.email) {
            // Mostrar la parte antes del @ del email
            return u.email.split('@')[0];
        }

        // Último fallback
        return 'Usuario';
    };

    return (
        <div className="bg-surface rounded-2xl p-6 border-2 border-border shadow-lg shadow-black/5 dark:shadow-black/20 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text-dark flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">forum</span>
                    Mensajes
                </h3>
                <button onClick={() => navigate('/messages')} className="p-2 hover:bg-muted rounded-full text-primary">
                    <span className="material-symbols-outlined">add</span>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {conversations.map(c => (
                    <div key={c.id} onClick={() => navigate(`/messages?conversationId=${c.id}`)} className="p-3 hover:bg-muted rounded-xl cursor-pointer flex gap-3 items-center border border-transparent hover:border-border transition-colors">
                        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 overflow-hidden relative">
                            {c.other_user?.avatar_url ? <img src={c.other_user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-text-light opacity-50 text-xs font-bold">{getDisplayName(c)[0]}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-sm text-text-dark truncate">{getDisplayName(c)}</h4>
                                {c.unread_count > 0 && <span className="bg-red-500 text-white text-[10px] flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full font-bold">{c.unread_count}</span>}
                            </div>
                            <p className="text-xs text-text-light opacity-60 truncate mt-0.5">{c.last_message?.content || '...'}</p>
                        </div>
                    </div>
                ))}
                {conversations.length === 0 && !loading && <p className="text-xs text-text-light opacity-50 text-center py-4">No hay mensajes recientes</p>}
            </div>
        </div>
    );
};

// ==========================================
// Main Student Dashboard Component
// ==========================================
const StudentDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [streak] = useState(5); // Could be loaded from backend

    // Tutorial de bienvenida - se inicia automáticamente al iniciar sesión
    const tutorial = useTutorial({
        tutorialId: 'welcome',
        autoStart: true,
        showOnFirstVisit: true
    });



    const userName = user?.first_name || 'Estudiante';

    return (
        <div className="min-h-screen bg-background">
            <div className="space-y-8 pb-10" data-tutorial="dashboard-overview">
                {/* Material Symbols Font */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                    rel="stylesheet"
                />

                {/* Welcome Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-text-dark tracking-tight">
                            Hola, {userName} 👋
                        </h1>
                        <p className="text-text-light opacity-70 font-medium">
                            Aquí tienes tu resumen de aprendizaje para hoy.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Botón para iniciar tutorial manualmente (solo en desarrollo o para testing) */}
                        {!tutorial.isOpen && (
                            <button
                                onClick={tutorial.startTutorial}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition-all border border-primary/20"
                                title="Iniciar tutorial de bienvenida"
                            >
                                <span className="material-symbols-outlined text-base">help</span>
                                Ver Tutorial
                            </button>
                        )}
                        <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-full shadow-lg shadow-black/5 dark:shadow-black/20 border-2 border-border">
                            <span className="material-symbols-outlined text-primary text-lg">verified</span>
                            <span className="font-bold text-text-dark text-sm">Miembro Pro</span>
                        </div>
                    </div>
                </header>

                {/* Academic Section */}
                <div className="mb-6">
                    <CoursesInProgress userId={user?.id || ''} />
                </div>

                {/* Row 1: Careers | Exams | Tutor | Progress */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                    <div className="h-full min-h-[14rem]">
                        <MyCareers userId={user?.id || ''} />
                    </div>
                    <div className="h-full min-h-[14rem]">
                        <MyExamsCard userId={user?.id || ''} />
                    </div>
                    <div className="h-full min-h-[14rem]">
                        <AITutorCard />
                    </div>
                    <div className="h-full min-h-[14rem]">
                        <StudentProgressCard userId={user?.id || ''} />
                    </div>
                </div>

                {/* Row 2: Messages | Tasks */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="h-96">
                        <DashboardMessages userId={user?.id || ''} />
                    </div>
                    <div>
                        <PendingTasks userId={user?.id || ''} />
                    </div>
                </div>

                {/* Row 3: Calendar | Sessions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div>
                        <DashboardCalendar userId={user?.id || ''} />
                    </div>
                    <div>
                        <UpcomingSessions userId={user?.id || ''} />
                    </div>
                </div>

                {/* Tutorial Interactivo de Bienvenida */}
                <InteractiveTutorial
                    config={welcomeTutorial}
                    isOpen={tutorial.isOpen}
                    onClose={tutorial.closeTutorial}
                    onComplete={tutorial.completeTutorial}
                    startStep={tutorial.startStep}
                />
            </div>
        </div>
    );
};

export default StudentDashboardPage;


