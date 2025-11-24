// pages/CourseStudentProgressPage.tsx
// Página para que docentes vean el progreso detallado de todos los estudiantes en un curso

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseService, Course, unitService, sessionService } from '../services/teacherCourses';
import { courseEnrollmentService, CourseEnrollment } from '../services/academicService';
import { quizService, Assessment } from '../services/quizService';
// No necesitamos studentService, obtendremos los datos directamente de la BD
import { progressService } from '../services/progressService';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import StudentProgressDetail from '../components/StudentProgressDetail';
import { IconChevronLeft, IconRefreshCw, IconUsers } from '../components/Icons';
import { supabase } from '../lib/supabase';

interface StudentProgressData {
  studentId: string;
  studentName: string;
  enrollment: CourseEnrollment;
  completedUnits: number;
  completedSessions: number;
  completedQuizzes: number;
}

export const CourseStudentProgressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<StudentProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Totales del curso
  const [totalUnits, setTotalUnits] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const courseId = parseInt(id);

      // Cargar curso
      const courseData = await courseService.getCourse(courseId);
      setCourse(courseData);

      // Cargar totales del curso
      const [units, sessions, quizzes] = await Promise.all([
        unitService.getCourseUnits(courseId),
        sessionService.getCourseSessions(courseId),
        quizService.getCourseAssessments(courseId, ['quiz', 'trivia'])
      ]);

      setTotalUnits(units.length);
      setTotalSessions(sessions.length);
      setTotalQuizzes(quizzes.length);

      // Cargar estudiantes inscritos
      const enrollments = await courseEnrollmentService.getCourseStudents(courseId);
      const activeEnrollments = enrollments.filter(e => e.status === 'active');

      // Cargar progreso detallado de cada estudiante
      const studentsWithProgress = await Promise.all(
        activeEnrollments.map(async (enrollment) => {
          try {
            // Obtener nombre del estudiante directamente de la BD
            const { data: studentData, error: studentError } = await supabase
              .from('users')
              .select('first_name, last_name')
              .eq('id', enrollment.student_id)
              .maybeSingle();
            
            if (studentError || !studentData) {
              console.warn(`No se pudo obtener datos del estudiante ${enrollment.student_id}`);
              return null;
            }
            
            const studentName = `${studentData.first_name} ${studentData.last_name}`;

            // Calcular progreso detallado
            const [completedUnits, completedSessions, completedQuizzes] = await Promise.all([
              // Unidades completadas
              supabase
                .from('unit_progress')
                .select('unit_id', { count: 'exact' })
                .eq('student_id', enrollment.student_id)
                .eq('course_id', courseId)
                .eq('is_completed', true)
                .then(({ count }) => count || 0),
              
              // Sesiones completadas
              supabase
                .from('session_progress')
                .select('session_id', { count: 'exact' })
                .eq('student_id', enrollment.student_id)
                .eq('course_id', courseId)
                .eq('is_completed', true)
                .then(({ count }) => count || 0),
              
              // Quizzes completados
              (async () => {
                const quizIds = quizzes.map(q => q.id);
                if (quizIds.length === 0) return 0;
                
                const { count } = await supabase
                  .from('assessment_attempts')
                  .select('assessment_id', { count: 'exact' })
                  .eq('student_id', enrollment.student_id)
                  .in('assessment_id', quizIds)
                  .in('status', ['submitted', 'graded']);
                
                // Contar únicos
                const { data } = await supabase
                  .from('assessment_attempts')
                  .select('assessment_id')
                  .eq('student_id', enrollment.student_id)
                  .in('assessment_id', quizIds)
                  .in('status', ['submitted', 'graded']);
                
                return new Set(data?.map(a => a.assessment_id) || []).size;
              })()
            ]);

            // Recalcular progreso del curso
            try {
              await progressService.updateCourseProgress(enrollment.student_id, courseId);
              // Recargar enrollment para obtener progreso actualizado
              const updatedEnrollments = await courseEnrollmentService.getCourseStudents(courseId);
              const updatedEnrollment = updatedEnrollments.find(e => e.id === enrollment.id);
              if (updatedEnrollment) {
                enrollment = updatedEnrollment;
              }
            } catch (progressError) {
              console.warn('Error actualizando progreso:', progressError);
            }

            return {
              studentId: enrollment.student_id,
              studentName,
              enrollment,
              completedUnits,
              completedSessions,
              completedQuizzes
            };
          } catch (err) {
            console.error(`Error cargando progreso para estudiante ${enrollment.student_id}:`, err);
            return null;
          }
        })
      );

      // Filtrar nulos y ordenar por progreso descendente
      const validStudents = studentsWithProgress
        .filter((s): s is StudentProgressData => s !== null)
        .sort((a, b) => (b.enrollment.completion_percentage || 0) - (a.enrollment.completion_percentage || 0));

      setStudents(validStudents);
    } catch (err: any) {
      console.error('Error loading course student progress:', err);
      setError(err.message || 'Error al cargar el progreso de los estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="bg-red-50 border-red-200">
          <div className="p-4">
            <p className="text-red-800">{error}</p>
            <Button onClick={loadData} className="mt-4">
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600">Curso no encontrado</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/teacher/courses">
            <Button variant="outline" leftIcon={<IconChevronLeft className="w-4 h-4" />}>
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Progreso de Estudiantes</h1>
            <p className="text-gray-600 mt-1">{course.title}</p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          leftIcon={<IconRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
        >
          {refreshing ? 'Actualizando...' : 'Actualizar Progreso'}
        </Button>
      </div>

      {/* Resumen del curso */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <IconUsers className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Resumen del Curso</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Estudiantes Activos</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Unidades Totales</p>
              <p className="text-2xl font-bold text-gray-900">{totalUnits}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sesiones Totales</p>
              <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Quizzes Totales</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuizzes}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Lista de estudiantes con progreso */}
      {students.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600">No hay estudiantes activos inscritos en este curso</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {students.map((student) => (
            <StudentProgressDetail
              key={student.studentId}
              studentId={student.studentId}
              studentName={student.studentName}
              courseId={course.id}
              totalUnits={totalUnits}
              completedUnits={student.completedUnits}
              totalSessions={totalSessions}
              completedSessions={student.completedSessions}
              totalQuizzes={totalQuizzes}
              completedQuizzes={student.completedQuizzes}
              overallProgress={student.enrollment.completion_percentage || 0}
              timeSpentMinutes={student.enrollment.time_spent_minutes || 0}
              showDetails={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseStudentProgressPage;

