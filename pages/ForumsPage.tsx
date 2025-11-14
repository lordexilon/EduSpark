import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconMessage, IconPlusCircle } from '../components/Icons';
import { useAuth } from '../hooks/useAuth';
import { forumService, ForumTopic } from '../services/forumService';
import { courseService, Course } from '../services/teacherCourses';
import { supabase } from '../lib/supabase';

interface CourseOption {
  id: number;
  title: string;
}

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
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const ForumsPage: React.FC = () => {
  const { user } = useAuth();
  const canCreate = useMemo(
    () =>
      user?.role?.name === 'admin' ||
      user?.role?.name === 'teacher' ||
      user?.role?.name === 'coordinator',
    [user?.role?.name]
  );
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    try {
      setLoadingTopics(true);
      setTopicsError(null);
      const data = await forumService.listTopics();
      setTopics(data);
    } catch (err: any) {
      console.error('[ForumsPage] Error cargando foros:', err);
      setTopicsError(
        err?.message?.includes('forum_topics')
          ? 'Aún no hay foros configurados en la base de datos.'
          : 'No pudimos cargar los foros. Intenta nuevamente más tarde.'
      );
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    const loadCourses = async () => {
      if (!canCreate || !user?.id) {
        setCourses([]);
        return;
      }

      try {
        setLoadingCourses(true);
        setCoursesError(null);

        let options: CourseOption[] = [];

        if (user.role?.name === 'teacher') {
          const myCourses = await courseService.getMyCourses(user.id);
          options = myCourses.map((course: Course) => ({
            id: course.id,
            title: course.title,
          }));
        } else {
          const { data, error } = await supabase
            .from('courses')
            .select('id, title')
            .order('title', { ascending: true });
          if (error) {
            throw error;
          }
          options = (data || []).map((course) => ({
            id: course.id,
            title: course.title,
          }));
        }

        setCourses(options);
      } catch (err: any) {
        console.error('[ForumsPage] Error cargando cursos:', err);
        setCoursesError('No pudimos obtener la lista de cursos.');
      } finally {
        setLoadingCourses(false);
      }
    };

    loadCourses();
  }, [canCreate, user?.id, user?.role?.name]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Foros de Discusión</h1>
          <p className="text-sm text-slate-500 mt-1">
            Participa en las conversaciones de tu curso, comparte dudas y colabora con tus compañeros.
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              leftIcon={<IconPlusCircle className="w-5 h-5" />}
              onClick={() => {
                setShowModal(true);
                setCreateError(null);
              }}
            >
              Crear nuevo tema
            </Button>
          </div>
        )}
      </div>

      {loadingTopics ? (
        <Card>
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((key) => (
              <div key={key} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-2 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : topicsError ? (
        <Card>
          <p className="text-slate-600 text-center py-6">{topicsError}</p>
        </Card>
      ) : topics.length === 0 ? (
        <Card>
          <p className="text-slate-600 text-center py-6">
            Aún no hay temas en el foro. Sé el primero en iniciar una conversación.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <Link to={`/forum/${topic.id}`} key={topic.id}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <IconMessage className="w-5 h-5 text-sky-600" />
                      <h2 className="text-lg font-semibold text-slate-700 line-clamp-2">{topic.title}</h2>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                      {topic.course_title && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                          {topic.course_title}
                        </span>
                      )}
                      <span>{topic.reply_count ?? 0} respuestas</span>
                      <span>·</span>
                      <span>{formatRelativeTime(topic.last_message_at)}</span>
                    </div>
                    {topic.last_message_excerpt && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                        {topic.last_message_excerpt}
                      </p>
                    )}
                  </div>
                  <button className="text-sm bg-sky-100 text-sky-700 px-3 py-1 rounded-full hover:bg-sky-200 transition-colors">
                    Ver tema
                  </button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {canCreate && showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Nuevo tema del foro</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Comparte un anuncio o inicia una conversación con tus estudiantes.
                </p>
              </div>
              <button
                onClick={() => {
                  if (!creating) {
                    setShowModal(false);
                    setTitle('');
                    setDescription('');
                    setSelectedCourseId('');
                    setCreateError(null);
                  }
                }}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setCreateError(null);

                if (!title.trim()) {
                  setCreateError('Ingresa un título para el tema.');
                  return;
                }

                if (!user?.id) {
                  setCreateError('Debes iniciar sesión para crear foros.');
                  return;
                }

                try {
                  setCreating(true);
                  await forumService.createTopic({
                    title: title.trim(),
                    description: description.trim() ? description.trim() : null,
                    courseId: selectedCourseId ? Number(selectedCourseId) : undefined,
                    createdBy: user.id,
                  });
                  setTitle('');
                  setDescription('');
                  setSelectedCourseId('');
                  setShowModal(false);
                  await loadTopics();
                } catch (err: any) {
                  console.error('[ForumsPage] Error creando tema:', err);
                  setCreateError(err?.message || 'No se pudo crear el tema.');
                } finally {
                  setCreating(false);
                }
              }}
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Ej: Discusión sobre el proyecto final"
                  maxLength={140}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mensaje inicial (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[120px]"
                  placeholder="Introduce el contexto o las instrucciones para tu tema..."
                />
                <p className="text-xs text-slate-400 mt-1">
                  Este texto se mostrará como primer mensaje y en el resumen del foro.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Curso asociado
                </label>
                {loadingCourses ? (
                  <p className="text-xs text-slate-400">Cargando cursos...</p>
                ) : coursesError ? (
                  <p className="text-xs text-red-600">{coursesError}</p>
                ) : (
                  <select
                    value={selectedCourseId}
                    onChange={(event) => setSelectedCourseId(event.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Foro general (sin curso)</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {createError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!creating) {
                      setShowModal(false);
                      setTitle('');
                      setDescription('');
                      setSelectedCourseId('');
                      setCreateError(null);
                    }
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={creating}>
                  {creating ? 'Creando...' : 'Publicar foro'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ForumsPage;
