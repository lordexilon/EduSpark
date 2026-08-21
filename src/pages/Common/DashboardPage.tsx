import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '@/components/Common/Card';
import ProgressBar from '@/components/Common/ProgressBar';
import Button from '@/components/Common/Button';
import {
  IconChevronRight,
  IconChevronLeft,
  IconPlusCircle,
  IconFilter,
  IconMessage,
  IconCalendar,
  IconBookOpen,
  IconClipboardList,
  IconVideoCamera,
  IconClock,
  IconGraduationCap,
} from '@/components/Common/Icons';
import { useAuth } from '@/hooks/useAuth';
import { careerEnrollmentService, courseEnrollmentService } from '@/services/academicService';
import { courseService, unitService, sessionService } from '@/services/teacherCourses';
import { careerService } from '@/services/academicService';
import { progressService } from '@/services/progressService';
import { messagingService, Conversation } from '@/services/messagingService';
import { assignmentService, submissionService, Assignment } from '@/services/assignments';

// --- SUB-COMPONENTS ---

const WelcomeHeader = ({ name }: { name: string }) => (
  <div className="mb-6 sm:mb-8">
    <p className="text-text-light text-sm sm:text-base">Bienvenida de nuevo, {name} 👋</p>
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
      <h1 className="text-2xl sm:text-3xl font-bold text-text-dark">
        ¡Hagamos que aprender sea divertido!
      </h1>
      <span className="bg-primary/20 text-primary text-xs sm:text-sm font-semibold px-3 py-1 rounded-full self-start sm:self-auto">
        Miembro Pro
      </span>
    </div>
  </div>
);

const CourseCard = ({
  imageUrl,
  title,
  tags,
  progress,
}: {
  imageUrl: string;
  title: string;
  tags: string[];
  progress: number;
}) => (
  <div
    className={`relative p-6 rounded-2xl text-white w-full h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-end min-h-[220px] overflow-hidden group`}
  >
    <div
      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
      style={{ backgroundImage: `url(${imageUrl})` }}
    ></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-2xl"></div>
    <div className="relative z-10">
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <div className="flex items-center gap-2 mb-4">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-white/20 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="text-sm font-medium mb-1 opacity-80">En Progreso</p>
      <div className="flex items-center gap-3">
        <ProgressBar value={progress} color="white" height="8px" className="bg-white/30" />
        <span className="text-sm font-semibold">{progress}%</span>
      </div>
    </div>
  </div>
);

interface CourseEnrollment {
  id: string;
  course_id: number;
  status: string;
  completion_percentage: number;
  course?: {
    id: number;
    title: string;
    code?: string;
    description?: string;
    thumbnail_url?: string;
  };
}

const CurrentClasses = ({ userId }: { userId: string }) => {
  const [courses, setCourses] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        setLoading(true);
        console.log('📚 CurrentClasses - Cargando inscripciones para userId:', userId);

        // Obtener inscripciones del estudiante
        const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
        console.log('📚 CurrentClasses - Inscripciones obtenidas:', enrollments.length);

        // Obtener detalles de cada curso y recalcular progreso
        const coursesWithDetails = await Promise.all(
          enrollments
            .filter((e) => e.status === 'active')
            .slice(0, 2) // Mostrar solo los primeros 2
            .map(async (enrollment) => {
              try {
                // Recalcular progreso del curso
                try {
                  await progressService.updateCourseProgress(userId, enrollment.course_id);
                  // Recargar el enrollment para obtener el progreso actualizado
                  const updatedEnrollments =
                    await courseEnrollmentService.getStudentEnrollments(userId);
                  const currentEnrollment = updatedEnrollments.find((e) => e.id === enrollment.id);
                  if (currentEnrollment) {
                    enrollment = currentEnrollment;
                  }
                } catch (progressError) {
                  console.warn(
                    'Error actualizando progreso, usando valor guardado:',
                    progressError
                  );
                }

                const course = await courseService.getCourse(enrollment.course_id);
                return {
                  ...enrollment,
                  course: {
                    id: course.id,
                    title: course.title,
                    code: course.code,
                    description: course.description,
                    thumbnail_url: course.thumbnail_url,
                  },
                };
              } catch (err) {
                console.error(`Error cargando curso ${enrollment.course_id}:`, err);
                return {
                  ...enrollment,
                  course: {
                    id: enrollment.course_id,
                    title: `Curso #${enrollment.course_id}`,
                    code: '',
                    description: '',
                    thumbnail_url: undefined,
                  },
                };
              }
            })
        );
        setCourses(coursesWithDetails);
      } catch (error: any) {
        console.error('Error cargando inscripciones:', error);
        console.error('Error details:', {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        });
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadEnrollments();
    }
  }, [userId]);

  if (loading) {
    return (
      <Card className="col-span-12 lg:col-span-7">
        <div className="p-6">
          <p className="text-gray-600">Cargando cursos...</p>
        </div>
      </Card>
    );
  }

  if (courses.length === 0) {
    return (
      <Card className="col-span-12 lg:col-span-7">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-2">Clases en Curso</h2>
          <p className="text-gray-600">No tienes cursos activos en este momento.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="col-span-12 lg:col-span-7 !p-0 overflow-hidden">
      <div className="p-4 sm:p-6 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold">Clases en Curso</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="!p-2 text-text-light">
              <IconChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button variant="secondary" size="sm" className="!p-2 text-text-light">
              <IconChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6 p-4 sm:p-6 pt-2 sm:pt-4">
        {courses.map((enrollment) => (
          <Link
            key={enrollment.id}
            to={`/courses/${enrollment.course_id}`}
            className="block w-full md:w-1/2"
          >
            <CourseCard
              imageUrl={
                enrollment.course?.thumbnail_url ||
                'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=80&w=800&auto=format&fit=crop'
              }
              title={enrollment.course?.title || `Curso #${enrollment.course_id}`}
              tags={enrollment.course?.code ? [enrollment.course.code] : []}
              progress={Math.round(enrollment.completion_percentage || 0)}
            />
          </Link>
        ))}
      </div>
    </Card>
  );
};

const LearningHours = ({ userId }: { userId: string }) => {
  const [timeframe, setTimeframe] = useState<'monthly' | 'weekly'>('monthly');
  const [data, setData] = useState<Array<{ day: string; hours: number }>>([]);
  const [categories, setCategories] = useState<
    Array<{ category: string; hours: number; minutes: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [maxHours, setMaxHours] = useState(10);

  useEffect(() => {
    const loadLearningHours = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const hoursData = await progressService.getLearningHours(userId, timeframe);
        const categoryData = await progressService.getLearningHoursByCategory(userId);

        console.log('📊 LearningHours Component - Datos recibidos:', {
          hoursData,
          categoryData,
          hoursDataLength: hoursData.length,
          categoryDataLength: categoryData.length,
        });

        setData(hoursData);
        setCategories(categoryData);

        // Calcular maxHours basado en los datos
        if (hoursData.length > 0) {
          const max = Math.max(...hoursData.map((d) => d.hours));
          setMaxHours(Math.ceil(max * 1.2)); // 20% más para espacio visual
          console.log('📊 MaxHours calculado:', Math.ceil(max * 1.2));
        } else {
          setMaxHours(timeframe === 'monthly' ? 10 : 5);
          console.log('📊 MaxHours por defecto:', timeframe === 'monthly' ? 10 : 5);
        }
      } catch (error) {
        console.error('Error cargando horas de aprendizaje:', error);
        setData([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadLearningHours();
  }, [userId, timeframe]);

  if (loading) {
    return (
      <Card className="col-span-12 lg:col-span-5">
        <div className="p-6">
          <p className="text-gray-600">Cargando horas de aprendizaje...</p>
        </div>
      </Card>
    );
  }

  // Si no hay datos, mostrar placeholder
  if (data.length === 0) {
    return (
      <Card className="col-span-12 lg:col-span-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Horas de Aprendizaje</h2>
          <div className="flex items-center gap-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as 'monthly' | 'weekly')}
              className="text-sm border-none bg-gray-100 rounded-md p-1 focus:ring-0 cursor-pointer"
            >
              <option value="monthly">Mensual</option>
              <option value="weekly">Semanal</option>
            </select>
            <Button variant="secondary" size="sm" className="!p-2 text-text-light">
              <IconFilter className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="p-6 text-center text-gray-600">
          <p>No hay datos de aprendizaje disponibles todavía.</p>
          <p className="text-sm mt-2">Comienza a estudiar para ver tus horas aquí.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="col-span-12 lg:col-span-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4">
        <h2 className="text-base sm:text-lg font-bold">Horas de Aprendizaje</h2>
        <div className="flex items-center gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as 'monthly' | 'weekly')}
            className="text-xs sm:text-sm border-none bg-gray-100 rounded-md p-1 focus:ring-0 cursor-pointer"
          >
            <option value="monthly">Mensual</option>
            <option value="weekly">Semanal</option>
          </select>
          <Button variant="secondary" size="sm" className="!p-2 text-text-light">
            <IconFilter className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>
      <div className="flex justify-around items-end h-32 mb-4 gap-3 px-2">
        {data.length > 0 ? (
          data.map((d) => {
            const heightPercent = maxHours > 0 ? (d.hours / maxHours) * 100 : 0;
            console.log('📊 Renderizando barra:', {
              day: d.day,
              hours: d.hours,
              heightPercent,
              maxHours,
            });
            return (
              <div key={d.day} className="flex flex-col items-center w-full group relative">
                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-800 text-white text-xs px-2 py-1 rounded-md pointer-events-none z-10">
                  {d.hours.toFixed(1)} hrs
                </div>
                <div className="w-5 bg-gray-200 rounded-md flex-grow flex items-end">
                  <div
                    className="w-full bg-primary rounded-md transition-all duration-300"
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                </div>
                <span className="text-xs text-text-light mt-2">{d.day}</span>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 text-sm">No hay datos para mostrar</div>
        )}
      </div>
      {categories.length > 0 && (
        <div className="flex justify-around border-t border-border pt-3">
          {categories.map((cat, index) => (
            <div key={index} className="text-center">
              <p className="text-xs text-text-light truncate max-w-[80px]" title={cat.category}>
                {cat.category.length > 12 ? cat.category.substring(0, 12) + '...' : cat.category}
              </p>
              <p className="font-bold">
                {cat.hours}h {cat.minutes}m
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const PendingTasks = ({ userId }: { userId: string }) => {
  const [tasks, setTasks] = useState<
    Array<{
      id: string;
      title: string;
      creationDate: string;
      dueDate: string;
      status: 'pending' | 'completed';
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Obtener el curso "Matemática para Empresas 1" (course_id = 1)
        const courseId = 1;

        // Obtener todas las tareas del curso
        const assignments = await assignmentService.getStudentAssignments(userId, courseId);

        // Obtener las entregas del estudiante para cada tarea
        const tasksWithStatus = await Promise.all(
          assignments.map(async (assignment: Assignment) => {
            // Verificar si el estudiante tiene una entrega
            const submission = await submissionService.getStudentSubmission(assignment.id, userId);

            const today = new Date();
            const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
            const isCompleted = submission !== null && submission.grade !== null;
            const isOverdue = dueDate && dueDate < today && !isCompleted;

            return {
              id: assignment.id,
              title: assignment.title,
              creationDate: assignment.created_at,
              dueDate: assignment.due_at || assignment.created_at,
              status: isCompleted ? ('completed' as const) : ('pending' as const),
              isOverdue,
            };
          })
        );

        // Ordenar: pendientes primero, luego vencidas, luego completadas
        const sortedTasks = tasksWithStatus.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        setTasks(sortedTasks);
      } catch (error) {
        console.error('Error cargando tareas:', error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [userId]);

  const today = new Date();

  const TaskProgress = ({ task }: { task: (typeof tasks)[0] }) => {
    const startDate = new Date(task.creationDate);
    const dueDate = new Date(task.dueDate);

    const totalDuration = dueDate.getTime() - startDate.getTime();
    const elapsedDuration = today.getTime() - startDate.getTime();
    const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    let progress = 0;
    let label = '';
    let color = 'var(--primary)';
    let textColor = 'text-text-light';

    if (task.status === 'completed') {
      progress = 100;
      label = 'Completada';
      color = 'var(--primary)';
      textColor = 'text-green-600';
    } else if (daysRemaining < 0) {
      progress = 100;
      label = 'Vencida';
      color = '#EF4444'; // red-500
      textColor = 'text-red-600';
    } else {
      progress =
        totalDuration > 0 ? Math.max(0, Math.min(100, (elapsedDuration / totalDuration) * 100)) : 0;
      label = `Faltan ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`;
      if (daysRemaining <= 3) {
        color = '#F59E0B'; // amber-500
        textColor = 'text-amber-600';
      } else {
        color = '#3B82F6'; // blue-500
        textColor = 'text-blue-600';
      }
    }

    return (
      <div>
        <ProgressBar value={progress} color={color} height="6px" className="my-2" />
        <p className={`text-xs font-medium ${textColor}`}>{label}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="col-span-12">
        <h2 className="text-lg font-bold mb-4">Tareas Pendientes</h2>
        <div className="p-6 text-center text-gray-600">
          <p>Cargando tareas...</p>
        </div>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="col-span-12">
        <h2 className="text-lg font-bold mb-4">Tareas Pendientes</h2>
        <div className="p-6 text-center text-gray-600">
          <p>No hay tareas disponibles en este momento.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="col-span-12">
      <h2 className="text-base sm:text-lg font-bold mb-4">Tareas Pendientes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {tasks.map((task) => (
          <Link key={task.id} to={`/assignments?assignmentId=${task.id}`} className="block">
            <div className="bg-background p-4 rounded-lg border border-border hover:bg-gray-100 hover:border-primary/50 transition-all h-full">
              <h3 className="font-semibold text-sm text-text-dark">{task.title}</h3>
              <TaskProgress task={task} />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
};

const StudentProgress = ({ userId }: { userId: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [progressData, setProgressData] = useState<
    Array<{
      id: string;
      session: string;
      completed: number;
      total: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Obtener cursos inscritos
        const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
        const activeEnrollment = enrollments.find((e) => e.status === 'active');

        if (!activeEnrollment) {
          setProgressData([]);
          setLoading(false);
          return;
        }

        // Obtener unidades del curso
        const units = await unitService.getCourseUnits(activeEnrollment.course_id);

        // Obtener todas las sesiones del curso una vez
        const allCourseSessions = await sessionService.getCourseSessions(
          activeEnrollment.course_id
        );

        // Agrupar sesiones por unidad
        const sessionsByUnit = new Map<string, typeof allCourseSessions>();
        allCourseSessions.forEach((session) => {
          if (session.unit_id) {
            if (!sessionsByUnit.has(session.unit_id)) {
              sessionsByUnit.set(session.unit_id, []);
            }
            sessionsByUnit.get(session.unit_id)!.push(session);
          }
        });

        // Crear datos de progreso para cada sesión
        const progressItems = units.flatMap((unit) => {
          const unitSessions = sessionsByUnit.get(unit.id) || [];
          return unitSessions.map((session, index) => {
            // Usar order_index si existe, sino usar el índice + 1
            const sessionNumber = session.order_index !== null ? session.order_index : index + 1;
            return {
              id: session.id,
              session: `Sesión ${sessionNumber}: ${session.title || 'Sin título'}`,
              unitTitle: unit.title,
              completed: 0, // TODO: Implementar tracking de progreso
              total: session.activities?.length || 0,
            };
          });
        });
        setProgressData(progressItems);
      } catch (error) {
        console.error('Error cargando progreso:', error);
        setProgressData([]);
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [userId]);

  if (loading) {
    return (
      <Card className="col-span-12">
        <h2 className="text-lg font-bold mb-4">Progreso del Estudiante</h2>
        <p className="text-gray-600">Cargando progreso...</p>
      </Card>
    );
  }

  if (progressData.length === 0) {
    return null; // No mostrar si no hay progreso
  }

  const displayedProgress = isExpanded ? progressData : progressData.slice(0, 5);

  return (
    <Card className="col-span-12">
      <h2 className="text-lg font-bold mb-4">Progreso del Estudiante</h2>
      <ul className="space-y-2">
        {displayedProgress.map((item) => {
          const percentage = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
          return (
            <li key={item.id}>
              <Link
                to={`/session/${item.id}`}
                className="block p-2 -mx-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="font-semibold text-sm text-text-dark">{item.session}</p>
                  <p className="text-xs text-text-light">
                    {item.completed}/{item.total} actividades
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={percentage} color="var(--primary)" height="6px" />
                  <span className="text-sm font-semibold w-12 text-right">{percentage}%</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {progressData.length > 5 && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Mostrar menos' : `Ver todas las ${progressData.length} sesiones`}
          </Button>
        </div>
      )}
    </Card>
  );
};

const Messages = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadConversations = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await messagingService.getMyConversations();
        if (isMounted) {
          setConversations(data);
        }
      } catch (err: any) {
        console.error('Error cargando conversaciones:', err);
        if (isMounted) {
          setError('No pudimos cargar tus mensajes. Intenta nuevamente.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadConversations();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Hace un momento';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getDisplayName = (conversation: Conversation) => {
    const first = conversation.other_user?.first_name?.trim() || '';
    const last = conversation.other_user?.last_name?.trim() || '';
    const combined = `${first} ${last}`.trim();
    return combined || conversation.other_user?.email || 'Usuario';
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  };

  const filteredConversations = conversations.filter((conversation) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = getDisplayName(conversation).toLowerCase();
    const email = conversation.other_user?.email?.toLowerCase() || '';
    return name.includes(term) || email.includes(term);
  });

  const handleOpenConversation = (conversationId: string) => {
    navigate(`/messages?conversationId=${conversationId}`);
  };

  return (
    <Card className="col-span-12 md:col-span-6 lg:col-span-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold">Mensajes</h2>
        <Button
          variant="secondary"
          size="sm"
          className="!p-2 text-text-light"
          onClick={() => navigate('/messages')}
        >
          <IconPlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>

      {!userId ? (
        <p className="text-sm text-text-light">Inicia sesión para ver tus mensajes.</p>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversación..."
            className="w-full text-xs sm:text-sm bg-background border-border border rounded-md p-2 mb-4 focus:ring-1 focus:ring-primary/50 outline-none"
          />

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((key) => (
                <div key={key} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                    <div className="h-2 bg-slate-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : filteredConversations.length === 0 ? (
            <p className="text-sm text-text-light">No tienes conversaciones todavía.</p>
          ) : (
            <ul className="space-y-3">
              {filteredConversations.map((conversation) => {
                const name = getDisplayName(conversation);
                const avatar = conversation.other_user?.avatar_url;
                const lastMessageContent = conversation.last_message?.content || 'Sin mensajes aún';
                const lastMessageTime = formatRelativeTime(
                  conversation.last_message?.created_at || conversation.last_message_at
                );

                return (
                  <li
                    key={conversation.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer p-2 sm:p-3"
                    onClick={() => handleOpenConversation(conversation.id)}
                  >
                    <div className="flex items-center gap-3">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                          {getInitials(name)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm line-clamp-1">{name}</p>
                        <p className="text-xs text-text-light line-clamp-1">{lastMessageContent}</p>
                        <p className="text-[10px] uppercase tracking-wide text-text-light mt-1">
                          {lastMessageTime || 'Sin actividad reciente'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {conversation.unread_count ? (
                        <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-1 text-xs font-semibold bg-primary text-white rounded-full">
                          {conversation.unread_count}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenConversation(conversation.id);
                        }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <IconMessage className="w-4 h-4" />
                        Abrir
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  );
};

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'session' | 'unit' | 'assignment' | 'videocall';
  color: string;
  icon: React.ReactNode;
  url?: string;
}

const Calendar = ({ userId }: { userId: string }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const allEvents: CalendarEvent[] = [];

        // Obtener cursos inscritos
        const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
        const activeEnrollments = enrollments.filter((e) => e.status === 'active');

        // Obtener sesiones (clases)
        for (const enrollment of activeEnrollments) {
          const sessions = await sessionService.getCourseSessions(enrollment.course_id);
          sessions.forEach((session) => {
            if (session.starts_at) {
              allEvents.push({
                id: `session-${session.id}`,
                title: session.title,
                date: new Date(session.starts_at),
                type: 'session',
                color: 'bg-blue-500',
                icon: <IconBookOpen className="w-3 h-3" />,
                url: `/session/${session.id}`,
              });
            }
          });

          // Obtener unidades (usar created_at como fecha de referencia)
          try {
            const units = await unitService.getCourseUnits(enrollment.course_id);
            units.forEach((unit) => {
              if (unit.created_at) {
                allEvents.push({
                  id: `unit-${unit.id}`,
                  title: unit.title,
                  date: new Date(unit.created_at),
                  type: 'unit',
                  color: 'bg-purple-500',
                  icon: <IconCalendar className="w-3 h-3" />,
                  url: `/courses/${enrollment.course_id}`,
                });
              }
            });
          } catch (err) {
            console.warn('Error cargando unidades:', err);
          }

          // Obtener tareas (assignments)
          try {
            const assignments = await assignmentService.getStudentAssignments(
              userId,
              enrollment.course_id
            );
            assignments.forEach((assignment) => {
              if (assignment.due_at) {
                allEvents.push({
                  id: `assignment-${assignment.id}`,
                  title: assignment.title,
                  date: new Date(assignment.due_at),
                  type: 'assignment',
                  color: 'bg-orange-500',
                  icon: <IconClipboardList className="w-3 h-3" />,
                  url: `/assignments?assignmentId=${assignment.id}`,
                });
              }
            });
          } catch (err) {
            console.warn('Error cargando tareas:', err);
          }

          // Obtener videollamadas (sesiones con google_meet_link)
          sessions.forEach((session) => {
            if (session.google_meet_link && session.starts_at) {
              allEvents.push({
                id: `videocall-${session.id}`,
                title: `Videollamada: ${session.title}`,
                date: new Date(session.starts_at),
                type: 'videocall',
                color: 'bg-green-500',
                icon: <IconVideoCamera className="w-3 h-3" />,
                url: `/session/${session.id}`,
              });
            }
          });
        }

        setEvents(allEvents);
      } catch (err) {
        console.error('Error cargando eventos del calendario:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [userId]);

  // Calcular días del mes
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Ajustar para que lunes sea 0
    const adjustedStartingDay = (startingDayOfWeek + 6) % 7;

    const days: Array<{ day: number | null; date: Date | null; events: CalendarEvent[] }> = [];

    // Días vacíos al inicio
    for (let i = 0; i < adjustedStartingDay; i++) {
      days.push({ day: null, date: null, events: [] });
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate.toDateString() === dayDate.toDateString();
      });
      days.push({ day, date: dayDate, events: dayEvents });
    }

    return days;
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <Card className="col-span-12 md:col-span-6 lg:col-span-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold">Calendario</h2>
        <Button variant="secondary" size="sm" onClick={goToToday} className="text-xs sm:text-sm">
          Hoy
        </Button>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <Button variant="ghost" size="sm" onClick={goToPreviousMonth} className="!p-1 sm:!p-2">
          <IconChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-sm sm:text-md font-semibold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <Button variant="ghost" size="sm" onClick={goToNextMonth} className="!p-1 sm:!p-2">
          <IconChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 text-center text-xs text-text-light mb-2">
        {weekDays.map((day) => (
          <span key={day} className="font-semibold uppercase">
            {day}
          </span>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 text-center text-xs sm:text-sm gap-0.5 sm:gap-1">
        {days.map((dayData, index) => {
          const isToday = dayData.date && dayData.date.toDateString() === new Date().toDateString();
          const isSelected =
            selectedDate &&
            dayData.date &&
            dayData.date.toDateString() === selectedDate.toDateString();

          return (
            <div
              key={index}
              className={`min-h-[50px] sm:min-h-[60px] p-0.5 sm:p-1 border border-transparent rounded-md ${
                dayData.day === null ? 'opacity-0' : 'cursor-pointer hover:bg-gray-50'
              } ${isToday ? 'border-primary bg-primary/5' : ''} ${
                isSelected ? 'bg-primary/10 border-primary' : ''
              }`}
              onClick={() => dayData.date && setSelectedDate(dayData.date)}
            >
              {dayData.day && (
                <>
                  <div
                    className={`text-xs font-medium mb-0.5 sm:mb-1 ${isToday ? 'text-primary font-bold' : 'text-text-dark'}`}
                  >
                    {dayData.day}
                  </div>
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {dayData.events.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`${event.color} w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full`}
                        title={event.title}
                      />
                    ))}
                    {dayData.events.length > 3 && (
                      <span className="text-[10px] sm:text-xs text-text-light">
                        +{dayData.events.length - 3}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Lista de eventos del día seleccionado */}
      {selectedDate && selectedEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-semibold mb-2 text-text-dark">
            {selectedDate.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedEvents.map((event) => (
              <Link
                key={event.id}
                to={event.url || '#'}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className={`${event.color} p-1 rounded text-white`}>{event.icon}</div>
                <span className="text-xs text-text-dark flex-1 truncate">{event.title}</span>
                <span className="text-xs text-text-light">
                  {new Date(event.date).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-text-light">Clases</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className="text-text-light">Unidades</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-text-light">Tareas</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-text-light">Videollamadas</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

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

const ClassPlanner = ({ userId }: { userId: string }) => {
  const [classes, setClasses] = useState<ClassPlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(0);

  useEffect(() => {
    const loadClasses = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const allClasses: ClassPlannerItem[] = [];

        // Obtener cursos inscritos
        const enrollments = await courseEnrollmentService.getStudentEnrollments(userId);
        const activeEnrollments = enrollments.filter((e) => e.status === 'active');

        // Obtener todas las sesiones con fechas de inicio
        for (const enrollment of activeEnrollments) {
          try {
            const sessions = await sessionService.getCourseSessions(enrollment.course_id);

            for (const session of sessions) {
              if (session.starts_at) {
                const startDate = new Date(session.starts_at);
                const now = new Date();

                // Solo mostrar sesiones futuras o del día actual
                const today = new Date(now);
                today.setHours(0, 0, 0, 0);
                if (startDate >= today) {
                  // Calcular progreso basado en session_access
                  let progress = 0;
                  try {
                    const { supabase } = await import('@/lib/supabase');
                    const { data: accessData } = await supabase
                      .from('session_progress')
                      .select('*')
                      .eq('session_id', session.id)
                      .eq('student_id', userId)
                      .maybeSingle();

                    if (accessData) {
                      // Si el estudiante ha visitado la sesión, consideramos un progreso mínimo
                      progress = 10;

                      // Si hay actividades, calcular progreso basado en actividades completadas
                      if (session.activities && session.activities.length > 0) {
                        // Por ahora, asumimos que si hay acceso, hay algún progreso
                        // En el futuro se puede calcular basado en actividades completadas
                        progress = Math.min(progress + 20, 100);
                      }
                    }
                  } catch (err) {
                    console.warn('Error calculando progreso:', err);
                  }

                  // Formatear hora de inicio y fin
                  const startTime = startDate.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                  let endTime: string | null = null;
                  if (session.ends_at) {
                    const endDate = new Date(session.ends_at);
                    endTime = endDate.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });
                  }

                  // Determinar color basado en si tiene videollamada o no
                  const color = session.google_meet_link ? '#10B981' : '#6366F1';

                  allClasses.push({
                    id: session.id,
                    title: session.title,
                    date: startDate,
                    startTime,
                    endTime,
                    progress,
                    color,
                    courseId: enrollment.course_id,
                    sessionId: session.id,
                    hasVideocall: !!session.google_meet_link,
                  });
                }
              }
            }
          } catch (err) {
            console.warn(`Error cargando sesiones del curso ${enrollment.course_id}:`, err);
          }
        }

        // Ordenar por fecha (más próximas primero)
        allClasses.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Limitar a las próximas 10 sesiones
        setClasses(allClasses.slice(0, 10));
      } catch (err) {
        console.error('Error cargando clases:', err);
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, [userId, currentWeek]);

  // Calcular rango de fechas para la semana actual
  const getWeekRange = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1 + currentWeek * 7); // Lunes de la semana
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  };

  const { weekStart, weekEnd } = getWeekRange();
  const filteredClasses = classes.filter((c) => {
    const classDate = new Date(c.date);
    return classDate >= weekStart && classDate <= weekEnd;
  });

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const month = monthNames[date.getMonth()];
    return { day, month };
  };

  const goToPreviousWeek = () => {
    setCurrentWeek((prev) => prev - 1);
  };

  const goToNextWeek = () => {
    setCurrentWeek((prev) => prev + 1);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(0);
  };

  if (loading) {
    return (
      <Card className="col-span-12 lg:col-span-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Planificador de Clases</h2>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-text-light">Cargando clases...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="col-span-12 lg:col-span-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4">
        <h2 className="text-base sm:text-lg font-bold">Planificador de Clases</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="!p-1.5 sm:!p-2 text-text-light"
            onClick={goToPreviousWeek}
          >
            <IconChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          {currentWeek !== 0 && (
            <Button variant="secondary" size="sm" onClick={goToCurrentWeek} className="text-xs">
              Hoy
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="!p-1.5 sm:!p-2 text-text-light"
            onClick={goToNextWeek}
          >
            <IconChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>
      {filteredClasses.length === 0 ? (
        <div className="text-center py-8">
          <IconCalendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-text-light">No hay clases programadas para esta semana</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredClasses.map((c) => {
            const { day, month } = formatDate(c.date);
            const timeDisplay = c.endTime ? `${c.startTime} - ${c.endTime}` : c.startTime;

            return (
              <li key={c.id}>
                <Link
                  to={`/session/${c.sessionId}`}
                  className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="text-center min-w-[50px]">
                    <p className="font-bold text-sm">{day}</p>
                    <p className="text-xs text-text-light">{month}</p>
                  </div>
                  <div
                    className="flex-1 p-3 rounded-lg"
                    style={{ backgroundColor: `${c.color}10` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm flex-1">{c.title}</p>
                      {c.hasVideocall && (
                        <IconVideoCamera className="w-4 h-4 text-green-600" title="Videollamada" />
                      )}
                    </div>
                    <p className="text-xs text-text-light mb-2">{timeDisplay}</p>
                    <ProgressBar value={c.progress} color={c.color} height="5px" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

interface CareerEnrollment {
  id: string;
  career_id: number;
  status: string;
  current_semester: number;
  career?: {
    id: number;
    name: string;
    code?: string;
  };
}

const MyCareers = ({ userId }: { userId: string }) => {
  const [careers, setCareers] = useState<CareerEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCareerEnrollments = async () => {
      try {
        setLoading(true);
        console.log('🎓 MyCareers - Cargando inscripciones en carreras para userId:', userId);

        // Obtener inscripciones en carreras del estudiante
        const enrollments = await careerEnrollmentService.getStudentEnrollments(userId);
        console.log('🎓 MyCareers - Inscripciones en carreras obtenidas:', enrollments.length);

        // Obtener detalles de cada carrera
        const careersWithDetails = await Promise.all(
          enrollments
            .filter((e) => e.status === 'active')
            .map(async (enrollment) => {
              try {
                const career = await careerService.getCareer(enrollment.career_id);
                return {
                  ...enrollment,
                  career: {
                    id: career.id,
                    name: career.name,
                    code: career.code,
                  },
                };
              } catch (err) {
                console.error(`Error cargando carrera ${enrollment.career_id}:`, err);
                return {
                  ...enrollment,
                  career: {
                    id: enrollment.career_id,
                    name: `Carrera #${enrollment.career_id}`,
                    code: '',
                  },
                };
              }
            })
        );
        setCareers(careersWithDetails);
      } catch (error: any) {
        console.error('Error cargando inscripciones en carreras:', error);
        console.error('Error details:', {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        });
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadCareerEnrollments();
    }
  }, [userId]);

  if (loading) {
    return null; // No mostrar nada mientras carga
  }

  if (careers.length === 0) {
    return null; // No mostrar si no hay carreras
  }

  return (
    <Card className="col-span-12">
      <h2 className="text-lg font-bold mb-4">Mis Carreras</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {careers.map((enrollment) => (
          <div
            key={enrollment.id}
            className="p-4 border border-gray-200 rounded-lg hover:border-primary/50 transition-colors flex gap-4"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <IconGraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                {enrollment.career?.name || `Carrera #${enrollment.career_id}`}
              </h3>
              {enrollment.career?.code && (
                <p className="text-sm text-gray-600 mb-2">{enrollment.career.code}</p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Semestre:</span>
                <span className="font-medium">{enrollment.current_semester}</span>
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    enrollment.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {enrollment.status === 'active' ? 'Activo' : enrollment.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// --- MAIN DASHBOARD APP ---
const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    console.log('📊 DashboardPage - Usuario actual:', {
      id: user?.id,
      email: user?.email,
      role: user?.role?.name,
      isAuthenticated: !!user,
    });
  }, [user]);

  return (
    <div>
      <WelcomeHeader name={user?.first_name || 'Estudiante'} />
      <main className="grid grid-cols-12 gap-4 sm:gap-6">
        <CurrentClasses userId={user?.id || ''} />
        <LearningHours userId={user?.id || ''} />
        <MyCareers userId={user?.id || ''} />
        <PendingTasks userId={user?.id || ''} />
        <StudentProgress userId={user?.id || ''} />
        <Messages userId={user?.id || ''} />
        <Calendar userId={user?.id || ''} />
        <ClassPlanner userId={user?.id || ''} />
      </main>
    </div>
  );
};

export default DashboardPage;
