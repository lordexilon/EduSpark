// pages/ResetStudentProgressPage.tsx
// Página para que docentes y administradores reseteen el progreso de estudiantes en cursos

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService, Course } from '../services/teacherCourses';
import { courseEnrollmentService, CourseEnrollment, studentProgressResetService, ResetProgressResult, ResetMultipleProgressResult } from '../services/academicService';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconRefreshCw, IconAlertTriangle, IconCheckCircle, IconX, IconUsers, IconTrash } from '../components/Icons';

export const ResetStudentProgressPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [students, setStudents] = useState<CourseEnrollment[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadStudents();
    } else {
      setStudents([]);
      setSelectedStudentIds(new Set());
    }
  }, [selectedCourseId]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const userRole = user?.role?.name;
      const isAdminOrCoordinator = userRole === 'admin' || userRole === 'coordinator';
      
      const coursesData = isAdminOrCoordinator
        ? await courseService.getAllCourses()
        : await courseService.getMyCourses(user!.id);
      
      setCourses(coursesData);
      if (coursesData.length > 0 && !selectedCourseId) {
        setSelectedCourseId(coursesData[0].id);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      setMessage({ type: 'error', text: 'Error al cargar los cursos' });
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!selectedCourseId) return;
    
    try {
      setLoading(true);
      const studentsData = await courseEnrollmentService.getCourseStudents(selectedCourseId);
      // Filtrar solo estudiantes activos
      const activeStudents = studentsData.filter(s => s.status === 'active');
      setStudents(activeStudents);
      setSelectedStudentIds(new Set());
    } catch (error) {
      console.error('Error loading students:', error);
      setMessage({ type: 'error', text: 'Error al cargar los estudiantes' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudentIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map(s => s.student_id)));
    }
  };

  const handleResetStudent = async (studentId: string) => {
    if (!selectedCourseId) return;
    
    if (!confirm(`¿Estás seguro de que deseas resetear el progreso de este estudiante?\n\nEsta acción eliminará:\n- Progreso de unidades\n- Progreso de sesiones\n- Progreso de flashcards\n- Intentos de quizzes/trivias\n- Entregas de tareas\n- Conversaciones con el Tutor AI\n- Mensajes del Tutor AI\n- Interacciones con el Tutor AI\n- Métricas de rendimiento del Tutor AI\n\nEsta acción NO se puede deshacer.`)) {
      return;
    }

    try {
      setResetting(true);
      setMessage(null);
      
      const result: ResetProgressResult = await studentProgressResetService.resetStudentCourseProgress(
        studentId,
        selectedCourseId
      );

      if (result.success) {
        const deleted = result.deleted || {};
        const tutorCount = (deleted.tutor_conversations || 0) + (deleted.tutor_interactions || 0);
        setMessage({
          type: 'success',
          text: `Progreso reseteado exitosamente. Eliminados: ${deleted.unit_progress || 0} unidades, ${deleted.session_progress || 0} sesiones, ${deleted.flashcard_progress || 0} flashcards, ${deleted.assessment_attempts || 0} intentos de quizzes, ${deleted.assignment_submissions || 0} entregas de tareas, ${tutorCount} registros del Tutor AI.`
        });
        // Recargar estudiantes para actualizar datos
        await loadStudents();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Error al resetear el progreso del estudiante'
        });
      }
    } catch (error: any) {
      console.error('Error resetting student progress:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Error al resetear el progreso del estudiante'
      });
    } finally {
      setResetting(false);
    }
  };

  const handleResetSelected = async () => {
    if (!selectedCourseId || selectedStudentIds.size === 0) return;
    
    const count = selectedStudentIds.size;
    if (!confirm(`¿Estás seguro de que deseas resetear el progreso de ${count} estudiante${count > 1 ? 's' : ''}?\n\nEsta acción eliminará todo el progreso de los estudiantes seleccionados y NO se puede deshacer.`)) {
      return;
    }

    try {
      setResetting(true);
      setMessage(null);
      
      const studentIdsArray = Array.from(selectedStudentIds);
      const result: ResetMultipleProgressResult = await studentProgressResetService.resetMultipleStudentsProgress(
        studentIdsArray,
        selectedCourseId
      );

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Progreso reseteado para ${result.successful_resets} de ${result.total_students} estudiantes. ${result.failed_resets > 0 ? `${result.failed_resets} fallaron.` : ''}`
        });
        // Recargar estudiantes
        await loadStudents();
      } else {
        setMessage({
          type: 'error',
          text: 'Error al resetear el progreso de los estudiantes'
        });
      }
    } catch (error: any) {
      console.error('Error resetting multiple students progress:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Error al resetear el progreso de los estudiantes'
      });
    } finally {
      setResetting(false);
    }
  };

  const handleResetAll = async () => {
    if (!selectedCourseId) return;
    
    if (!confirm(`¿Estás seguro de que deseas resetear el progreso de TODOS los estudiantes en este curso?\n\nEsta acción eliminará todo el progreso de ${students.length} estudiantes y NO se puede deshacer.`)) {
      return;
    }

    try {
      setResetting(true);
      setMessage(null);
      
      const result: ResetMultipleProgressResult = await studentProgressResetService.resetAllStudentsProgress(
        selectedCourseId
      );

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Progreso reseteado para ${result.successful_resets} de ${result.total_students} estudiantes. ${result.failed_resets > 0 ? `${result.failed_resets} fallaron.` : ''}`
        });
        // Recargar estudiantes
        await loadStudents();
      } else {
        setMessage({
          type: 'error',
          text: 'Error al resetear el progreso de todos los estudiantes'
        });
      }
    } catch (error: any) {
      console.error('Error resetting all students progress:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Error al resetear el progreso de todos los estudiantes'
      });
    } finally {
      setResetting(false);
    }
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resetear Progreso de Estudiantes</h1>
          <p className="text-gray-600 mt-1">
            Permite resetear el progreso de estudiantes en cursos para que empiecen desde cero
          </p>
        </div>
      </div>

      {/* Mensaje de resultado */}
      {message && (
        <Card className={`p-4 ${
          message.type === 'success' ? 'bg-green-50 border-green-200' :
          message.type === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <IconCheckCircle className="w-5 h-5 text-green-600" />
            ) : message.type === 'error' ? (
              <IconAlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <IconAlertTriangle className="w-5 h-5 text-blue-600" />
            )}
            <p className={`text-sm ${
              message.type === 'success' ? 'text-green-800' :
              message.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {message.text}
            </p>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto"
            >
              <IconX className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        </Card>
      )}

      {/* Advertencia */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-2">
          <IconAlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">⚠️ Advertencia</h3>
            <p className="text-sm text-yellow-800">
              Al resetear el progreso de un estudiante, se eliminará permanentemente:
            </p>
            <ul className="text-sm text-yellow-800 list-disc list-inside mt-2 space-y-1">
              <li>Progreso de unidades y sesiones</li>
              <li>Progreso de flashcards</li>
              <li>Intentos de quizzes, trivias y exámenes</li>
              <li>Entregas de tareas</li>
              <li>Conversaciones y mensajes con el Tutor AI</li>
              <li>Interacciones y métricas del Tutor AI</li>
              <li>Porcentaje de completitud y tiempo invertido</li>
            </ul>
            <p className="text-sm text-yellow-800 font-semibold mt-2">
              Esta acción NO se puede deshacer.
            </p>
          </div>
        </div>
      </Card>

      {/* Selector de curso */}
      <Card>
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Curso
          </label>
          <select
            value={selectedCourseId || ''}
            onChange={(e) => setSelectedCourseId(parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={loading}
          >
            <option value="">-- Selecciona un curso --</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} {course.code ? `(${course.code})` : ''}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Lista de estudiantes */}
      {selectedCourseId && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Estudiantes Inscritos ({students.length})
                </h2>
                <p className="text-sm text-gray-600">
                  Selecciona uno o más estudiantes para resetear su progreso
                </p>
              </div>
              <div className="flex gap-2">
                {selectedStudentIds.size > 0 && (
                  <Button
                    variant="primary"
                    onClick={handleResetSelected}
                    disabled={resetting}
                    leftIcon={<IconRefreshCw className="w-4 h-4" />}
                  >
                    Resetear Seleccionados ({selectedStudentIds.size})
                  </Button>
                )}
                {students.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleResetAll}
                    disabled={resetting}
                    leftIcon={<IconUsers className="w-4 h-4" />}
                  >
                    Resetear Todos
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay estudiantes activos inscritos en este curso
              </div>
            ) : (
              <div className="space-y-2">
                {/* Checkbox para seleccionar todos */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.size === students.length && students.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Seleccionar todos ({selectedStudentIds.size} de {students.length})
                  </span>
                </div>

                {/* Lista de estudiantes */}
                {students.map((enrollment) => {
                  const isSelected = selectedStudentIds.has(enrollment.student_id);
                  return (
                    <div
                      key={enrollment.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isSelected
                          ? 'bg-primary/5 border-primary'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectStudent(enrollment.student_id)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {enrollment.student_first_name && enrollment.student_last_name
                            ? `${enrollment.student_first_name} ${enrollment.student_last_name}`
                            : `Estudiante ID: ${enrollment.student_id.substring(0, 8)}...`}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          {enrollment.student_email && (
                            <span className="text-gray-600">{enrollment.student_email}</span>
                          )}
                          <span>Progreso: {enrollment.completion_percentage.toFixed(1)}%</span>
                          <span>Tiempo: {Math.round(enrollment.time_spent_minutes / 60)}h {enrollment.time_spent_minutes % 60}m</span>
                          {enrollment.final_grade !== null && (
                            <span>Calificación: {enrollment.final_grade.toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetStudent(enrollment.student_id)}
                        disabled={resetting}
                        leftIcon={<IconTrash className="w-4 h-4" />}
                      >
                        Resetear
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ResetStudentProgressPage;

