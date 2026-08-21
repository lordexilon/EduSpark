// =====================================================
// Componente Selector de Curso
// Permite seleccionar el curso para el tutor virtual
// =====================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-shared';
import { useAuth } from '@/hooks/useAuth';
import { useUserInstitution } from '@/hooks/useUserInstitution';

interface Course {
  id: string;
  title: string;
  code: string;
  description: string;
  teacherName: string;
  coverImageUrl?: string;
  tutorName?: string;
}

interface CourseSelectorProps {
  selectedCourseId?: string;
  onCourseSelect: (courseId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const CourseSelector: React.FC<CourseSelectorProps> = ({
  selectedCourseId,
  onCourseSelect,
  isLoading = false,
  disabled = false,
}) => {
  const { user } = useAuth();
  const { institution } = useUserInstitution();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determinar si debemos filtrar por institución
  const shouldFilterByInstitution =
    user?.role?.name &&
    ['supervisor', 'admin-campus', 'coordinator', 'teacher'].includes(user.role.name);
  const isAdmin = user?.role?.name === 'admin';

  // Cargar cursos disponibles
  useEffect(() => {
    // Esperar a que la institución se cargue si es necesario
    if (shouldFilterByInstitution && !institution) {
      return;
    }
    loadCourses();
  }, [institution, shouldFilterByInstitution]);

  const loadCourses = async () => {
    try {
      setIsLoadingCourses(true);
      setError(null);

      console.log('📚 CourseSelector: Cargando cursos', {
        userRole: user?.role?.name,
        institutionId: institution?.id,
        shouldFilterByInstitution,
        isAdmin,
      });

      // Construir la consulta base
      let query = supabase
        .from('courses')
        .select(
          `
          id,
          title,
          code,
          description,
          teacher_id,
          institution_id,
          users!courses_teacher_id_fkey(first_name, last_name),
          course_pedagogical_settings(voice_name)
        `
        )
        .eq('status', 'active');

      // Filtrar por institución si es necesario
      if (shouldFilterByInstitution && institution?.id && !isAdmin) {
        query = query.eq('institution_id', institution.id);
        console.log('📚 CourseSelector: Filtrando por institución', institution.id);
      }

      // Ordenar y ejecutar
      const { data: coursesData, error: coursesError } = await query.order('created_at', {
        ascending: false,
      });

      if (coursesError) {
        console.error('❌ CourseSelector: Error al cargar cursos', coursesError);
        throw coursesError;
      }

      console.log('📚 CourseSelector: Resultado de consulta', {
        totalCursos: coursesData?.length || 0,
        cursos: coursesData,
        filtroAplicado:
          shouldFilterByInstitution && institution?.id
            ? `institution_id = ${institution.id}`
            : 'ninguno',
      });

      if (!coursesData || coursesData.length === 0) {
        console.log('📚 CourseSelector: No se encontraron cursos', {
          filtroInstitucion: shouldFilterByInstitution,
          institutionId: institution?.id,
          isAdmin,
          query: query,
        });
        setCourses([]);
        return;
      }

      console.log('📚 CourseSelector: Cursos encontrados', coursesData.length);

      // Convertir los cursos de Supabase al formato esperado
      const courses: Course[] = coursesData.map((course: any) => ({
        id: course.id.toString(), // Convertir INTEGER a string
        title: course.title || 'Sin título',
        code: course.code || `CURSO-${course.id}`,
        description: course.description || 'Sin descripción',
        teacherName: course.users
          ? `${course.users.first_name} ${course.users.last_name}`
          : 'Docente',
        tutorName: course.course_pedagogical_settings?.[0]?.voice_name || 'Kore',
        coverImageUrl:
          'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=300&h=200&fit=crop',
      }));

      setCourses(courses);
    } catch (error) {
      console.error('❌ CourseSelector: Error loading courses:', error);
      setError('Error al cargar los cursos');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleCourseSelect = (courseId: string) => {
    if (!disabled) {
      onCourseSelect(courseId);
    }
  };

  if (isLoadingCourses) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-400"></div>
          <span className="text-slate-300">Cargando cursos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️</div>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={loadCourses}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-4">Selecciona un Curso</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            onClick={() => handleCourseSelect(course.id)}
            className={`relative bg-white dark:bg-slate-700 rounded-xl p-4 cursor-pointer transition-all duration-300 border border-slate-200 dark:border-slate-600 ${
              selectedCourseId === course.id
                ? 'ring-2 ring-blue-500 shadow-md transform scale-[1.02]'
                : 'hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {/* Imagen del curso */}
            <div className="aspect-video bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg mb-4 overflow-hidden relative group">
              {course.coverImageUrl ? (
                <img
                  src={course.coverImageUrl}
                  alt={course.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <span className="text-4xl">📚</span>
                </div>
              )}

              {/* Badge de Tutor */}
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1.5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs font-medium text-white">{course.tutorName || 'Kore'}</span>
              </div>
            </div>

            {/* Información del curso */}
            <div className="space-y-2">
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-slate-800 dark:text-white text-base leading-tight line-clamp-2">
                  {course.title}
                </h4>
              </div>

              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-fit">
                {course.code}
              </p>

              <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-2 min-h-[2.5em]">
                {course.description}
              </p>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-600 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="bg-slate-200 dark:bg-slate-600 p-1 rounded-full">👤</span>
                  <span className="font-medium truncate max-w-[100px]" title={course.teacherName}>
                    {course.teacherName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <span className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded-full">🤖</span>
                  <span className="font-medium">{course.tutorName || 'Kore'}</span>
                </div>
              </div>
            </div>

            {/* Indicador de selección */}
            {selectedCourseId === course.id && (
              <div className="absolute top-3 right-3 z-10">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-300 scale-110">
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-8">
          <div className="text-slate-400 text-4xl mb-4">📚</div>
          <p className="text-slate-300 mb-2">No hay cursos disponibles</p>
          <p className="text-slate-400 text-sm">
            {shouldFilterByInstitution && institution
              ? `No hay cursos activos para la institución ${institution.name}.`
              : 'Contacta a tu administrador para obtener acceso a los cursos.'}
          </p>
        </div>
      )}

      {isLoading && (
        <div className="mt-4 p-3 bg-slate-700 rounded-md">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-400"></div>
            <span className="text-slate-300 text-sm">Inicializando tutor virtual...</span>
          </div>
        </div>
      )}
    </div>
  );
};
