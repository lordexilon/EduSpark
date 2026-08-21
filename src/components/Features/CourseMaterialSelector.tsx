// components/CourseMaterialSelector.tsx
// Selector de curso y categoría de material

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Book, BookOpen, FileText, File, ChevronDown } from 'lucide-react';
import type { MaterialCategory } from '@/types/fileProcessing';

interface Course {
  id: string | number;
  title: string;
  code?: string;
}

interface CourseMaterialSelectorProps {
  userId: string;
  onSelect: (courseId: string, category: MaterialCategory) => void;
  selectedCourseId?: string;
  selectedCategory?: MaterialCategory;
  disabled?: boolean;
}

export const CourseMaterialSelector: React.FC<CourseMaterialSelectorProps> = ({
  userId,
  onSelect,
  selectedCourseId,
  selectedCategory,
  disabled = false,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const categories: Array<{
    value: MaterialCategory;
    label: string;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      value: 'book',
      label: 'Libro',
      icon: <Book size={20} className="text-blue-500" />,
      description: 'Libros de texto o material de lectura principal',
    },
    {
      value: 'bibliography',
      label: 'Bibliografía',
      icon: <BookOpen size={20} className="text-green-500" />,
      description: 'Referencias bibliográficas y fuentes adicionales',
    },
    {
      value: 'syllabus',
      label: 'Temario',
      icon: <FileText size={20} className="text-purple-500" />,
      description: 'Temarios, programas de estudio y guías',
    },
    {
      value: 'exam',
      label: 'Examen',
      icon: <FileText size={20} className="text-red-500" />,
      description: 'Exámenes, pruebas y evaluaciones',
    },
    {
      value: 'pamphlet',
      label: 'Folleto',
      icon: <File size={20} className="text-orange-500" />,
      description: 'Folletos, guías rápidas y material de referencia',
    },
    {
      value: 'other',
      label: 'Otro',
      icon: <File size={20} className="text-gray-500" />,
      description: 'Otro tipo de material educativo',
    },
  ];

  useEffect(() => {
    loadCourses();
  }, [userId]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar cursos del usuario (como teacher)
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select('id, title, code')
        .eq('teacher_id', userId)
        .order('title');

      if (fetchError) throw fetchError;

      setCourses(data || []);
    } catch (err: any) {
      console.error('Error cargando cursos:', err);
      setError(err.message || 'Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  };

  const selectedCourse = courses.find((c) => String(c.id) === String(selectedCourseId));
  const selectedCategoryData = categories.find((c) => c.value === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Selector de Curso */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Curso para el Tutor RAG
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setShowCourseDropdown(!showCourseDropdown)}
            disabled={disabled}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
          >
            <span>
              {selectedCourse
                ? `${selectedCourse.title}${selectedCourse.code ? ` (${selectedCourse.code})` : ''}`
                : 'Selecciona un curso'}
            </span>
            <ChevronDown
              size={20}
              className={`transition-transform ${showCourseDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {showCourseDropdown && !disabled && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
              {loading ? (
                <div className="px-4 py-2 text-gray-600 dark:text-gray-400">Cargando cursos...</div>
              ) : courses.length === 0 ? (
                <div className="px-4 py-2 text-gray-600 dark:text-gray-400">
                  No tienes cursos disponibles
                </div>
              ) : (
                courses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      onSelect(String(course.id), selectedCategory || 'book');
                      setShowCourseDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    {course.title}
                    {course.code && <span className="text-gray-500 ml-2">({course.code})</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>

      {/* Selector de Categoría */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Categoría del Material
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setShowCategoryDropdown(!showCategoryDropdown)}
            disabled={disabled || !selectedCourseId}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
          >
            <span className="flex items-center space-x-2">
              {selectedCategoryData ? (
                <>
                  {selectedCategoryData.icon}
                  <span>{selectedCategoryData.label}</span>
                </>
              ) : (
                <span>Selecciona una categoría</span>
              )}
            </span>
            <ChevronDown
              size={20}
              className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {showCategoryDropdown && !disabled && selectedCourseId && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg">
              {categories.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => {
                    onSelect(selectedCourseId, category.value);
                    setShowCategoryDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center space-x-3"
                >
                  {category.icon}
                  <div>
                    <div className="font-medium">{category.label}</div>
                    <div className="text-xs text-gray-500">{category.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Información */}
      {selectedCourseId && selectedCategory && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            ✓ El material se procesará y estará disponible en el Tutor RAG del curso{' '}
            <strong>{selectedCourse?.title}</strong> como{' '}
            <strong>{selectedCategoryData?.label}</strong>
          </p>
        </div>
      )}
    </div>
  );
};
