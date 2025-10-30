// =====================================================
// Componente Selector de Curso
// Permite seleccionar el curso para el tutor virtual
// =====================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-shared';

interface Course {
  id: string;
  title: string;
  code: string;
  description: string;
  teacherName: string;
  coverImageUrl?: string;
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
  disabled = false
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar cursos disponibles
  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setIsLoadingCourses(true);
      setError(null);

      // Cargar cursos reales desde Supabase
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          code,
          description,
          teacher_id,
          users!courses_teacher_id_fkey(first_name, last_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (coursesError) {
        throw coursesError;
      }

      if (!coursesData || coursesData.length === 0) {
        setCourses([]);
        return;
      }
      
      // Convertir los cursos de Supabase al formato esperado
      const courses: Course[] = coursesData.map((course: any) => ({
        id: course.id.toString(), // Convertir INTEGER a string
        title: course.title || 'Sin título',
        code: course.code || `CURSO-${course.id}`,
        description: course.description || 'Sin descripción',
        teacherName: course.users ? `${course.users.first_name} ${course.users.last_name}` : 'Profesor',
        coverImageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=300&h=200&fit=crop'
      }));

      setCourses(courses);
    } catch (error) {
      console.error('Error loading courses:', error);
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
      <h3 className="text-xl font-semibold text-white mb-4">
        Selecciona un Curso
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            onClick={() => handleCourseSelect(course.id)}
            className={`relative bg-slate-700 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              selectedCourseId === course.id
                ? 'ring-2 ring-sky-500 bg-slate-600'
                : 'hover:bg-slate-600 hover:shadow-lg'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {/* Imagen del curso */}
            <div className="aspect-video bg-slate-600 rounded-md mb-3 overflow-hidden">
              {course.coverImageUrl ? (
                <img
                  src={course.coverImageUrl}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  📚
                </div>
              )}
            </div>

            {/* Información del curso */}
            <div className="space-y-2">
              <h4 className="font-medium text-white text-lg">{course.title}</h4>
              <p className="text-slate-400 text-sm">{course.code}</p>
              <p className="text-slate-300 text-sm line-clamp-2">{course.description}</p>
              <p className="text-slate-400 text-xs">Profesor: {course.teacherName}</p>
            </div>

            {/* Indicador de selección */}
            {selectedCourseId === course.id && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
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
            Contacta a tu administrador para obtener acceso a los cursos.
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
