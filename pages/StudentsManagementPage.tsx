// pages/StudentsManagementPage.tsx
// Página de administración de estudiantes

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { studentService, Student, StudentWithEnrollments } from '../services/studentService';
import { careerService, Career } from '../services/academicService';
import { courseService, Course } from '../services/teacherCourses';
import { careerEnrollmentService, courseEnrollmentService } from '../services/academicService';
import Card from '../components/Card';
import Button from '../components/Button';

const StudentsManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithEnrollments | null>(null);
  const [careers, setCareers] = useState<Career[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEnrollCareerModal, setShowEnrollCareerModal] = useState(false);
  const [showEnrollCourseModal, setShowEnrollCourseModal] = useState(false);
  const [selectedCareerId, setSelectedCareerId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role?.name === 'admin' || user?.role?.name === 'teacher') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [studentsData, careersData, coursesData] = await Promise.all([
        studentService.getAllStudents(),
        careerService.getAllCareers(),
        courseService.getMyCourses(user!.id).catch(() => [])
      ]);
      setStudents(studentsData);
      setCareers(careersData);
      setCourses(coursesData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = async (student: Student) => {
    try {
      const studentWithEnrollments = await studentService.getStudentWithEnrollments(student.id);
      setSelectedStudent(studentWithEnrollments);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los detalles del estudiante');
      console.error(err);
    }
  };

  const handleEnrollCareer = async () => {
    if (!selectedStudent || !selectedCareerId) return;

    try {
      await careerEnrollmentService.enrollStudent({
        student_id: selectedStudent.id,
        career_id: selectedCareerId,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active',
        current_semester: 1,
        total_credits_earned: 0,
        academic_status: 'normal'
      });
      
      // Recargar datos del estudiante
      const updated = await studentService.getStudentWithEnrollments(selectedStudent.id);
      setSelectedStudent(updated);
      setShowEnrollCareerModal(false);
      setSelectedCareerId(null);
      alert('Estudiante inscrito en la carrera exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al inscribir al estudiante');
      console.error(err);
    }
  };

  const handleEnrollCourse = async () => {
    if (!selectedStudent || !selectedCourseId) return;

    try {
      await courseEnrollmentService.enrollStudent({
        student_id: selectedStudent.id,
        course_id: parseInt(selectedCourseId, 10),
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active',
        attendance_percentage: 0,
        participation_score: 0,
        completion_percentage: 0,
        time_spent_minutes: 0
      });
      
      // Recargar datos del estudiante
      const updated = await studentService.getStudentWithEnrollments(selectedStudent.id);
      setSelectedStudent(updated);
      setShowEnrollCourseModal(false);
      setSelectedCourseId(null);
      alert('Estudiante inscrito en el curso exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al inscribir al estudiante en el curso');
      console.error(err);
    }
  };

  const handleSuspendCareer = async (enrollmentId: string) => {
    if (!selectedStudent) return;
    if (!confirm('¿Estás seguro de suspender al estudiante de esta carrera?')) return;

    try {
      await careerEnrollmentService.suspendStudent(enrollmentId);
      const updated = await studentService.getStudentWithEnrollments(selectedStudent.id);
      setSelectedStudent(updated);
      alert('Estudiante suspendido de la carrera exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al suspender al estudiante');
      console.error(err);
    }
  };

  const handleReactivateCareer = async (enrollmentId: string) => {
    if (!selectedStudent) return;

    try {
      await careerEnrollmentService.updateEnrollment(enrollmentId, { status: 'active' });
      const updated = await studentService.getStudentWithEnrollments(selectedStudent.id);
      setSelectedStudent(updated);
      alert('Estudiante reactivado en la carrera exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al reactivar al estudiante');
      console.error(err);
    }
  };

  const handleUnenrollCareer = async (enrollmentId: string) => {
    if (!selectedStudent) return;
    if (!confirm('¿Estás seguro de desmatricular al estudiante de esta carrera? Esta acción no se puede deshacer.')) return;

    try {
      await careerEnrollmentService.deleteEnrollment(enrollmentId);
      const updated = await studentService.getStudentWithEnrollments(selectedStudent.id);
      setSelectedStudent(updated);
      alert('Estudiante desmatriculado de la carrera exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al desmatricular al estudiante');
      console.error(err);
    }
  };

  const handleSuspendCourse = async (enrollmentId: string) => {
    if (!selectedStudent) return;
    if (!confirm('¿Estás seguro de suspender al estudiante de este curso?')) return;

    try {
      await courseEnrollmentService.suspendStudent(enrollmentId);
      const updated = await studentService.getStudentWithEnrollments(selectedStudent.id);
      setSelectedStudent(updated);
      alert('Estudiante suspendido del curso exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al suspender al estudiante');
      console.error(err);
    }
  };

  const handleReactivateCourse = async (enrollmentId: string) => {
    if (!selectedStudent) return;

    try {
      await courseEnrollmentService.updateEnrollment(enrollmentId, { status: 'active' });
      const updated = await studentService.getStudentWithEnrollments(selectedStudent.id);
      setSelectedStudent(updated);
      alert('Estudiante reactivado en el curso exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al reactivar al estudiante');
      console.error(err);
    }
  };

  const handleUnenrollCourse = async (enrollmentId: string) => {
    if (!selectedStudent) return;
    if (!confirm('¿Estás seguro de desmatricular al estudiante de este curso? Esta acción no se puede deshacer.')) return;

    try {
      await courseEnrollmentService.deleteEnrollment(enrollmentId);
      const updated = await studentService.getStudentWithEnrollments(selectedStudent.id);
      setSelectedStudent(updated);
      alert('Estudiante desmatriculado del curso exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al desmatricular al estudiante');
      console.error(err);
    }
  };

  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase();
    return (
      student.first_name.toLowerCase().includes(query) ||
      student.last_name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query)
    );
  });

  if (!user || (user.role?.name !== 'admin' && user.role?.name !== 'teacher')) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Administración de Estudiantes</h1>
        <p className="text-gray-600 mt-2">Gestiona estudiantes, carreras y cursos</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Estudiantes */}
        <div className="lg:col-span-2">
          <Card>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar estudiantes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Cargando estudiantes...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No se encontraron estudiantes</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedStudent?.id === student.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {student.first_name} {student.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {student.is_active ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            Activo
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Detalles del Estudiante */}
        <div className="lg:col-span-1">
          {selectedStudent ? (
            <Card>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">Detalles del Estudiante</h2>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">Nombre</p>
                  <p className="font-semibold">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{selectedStudent.email}</p>
                </div>
              </div>

              {/* Carreras */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Carreras</h3>
                  <Button
                    onClick={() => setShowEnrollCareerModal(true)}
                    className="px-3 py-1 text-sm"
                  >
                    + Inscribir
                  </Button>
                </div>
                {selectedStudent.career_enrollments && selectedStudent.career_enrollments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudent.career_enrollments.map((enrollment: any) => (
                      <div key={enrollment.id} className="p-3 bg-gray-50 rounded text-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">
                              {careers.find(c => c.id === enrollment.career_id)?.name || 'Carrera'}
                            </p>
                            <p className="text-xs text-gray-600">
                              Semestre: {enrollment.current_semester} | Estado: 
                              <span className={`ml-1 px-2 py-0.5 rounded ${
                                enrollment.status === 'active' ? 'bg-green-100 text-green-800' :
                                enrollment.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {enrollment.status === 'active' ? 'Activo' :
                                 enrollment.status === 'suspended' ? 'Suspendido' :
                                 'Inactivo'}
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            {enrollment.status === 'active' && (
                              <Button
                                onClick={() => handleSuspendCareer(enrollment.id)}
                                variant="secondary"
                                className="px-2 py-1 text-xs"
                                title="Suspender"
                              >
                                ⏸️
                              </Button>
                            )}
                            {enrollment.status === 'suspended' && (
                              <Button
                                onClick={() => handleReactivateCareer(enrollment.id)}
                                variant="secondary"
                                className="px-2 py-1 text-xs"
                                title="Reactivar"
                              >
                                ▶️
                              </Button>
                            )}
                            <Button
                              onClick={() => handleUnenrollCareer(enrollment.id)}
                              variant="secondary"
                              className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
                              title="Desmatricular"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No inscrito en ninguna carrera</p>
                )}
              </div>

              {/* Cursos */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Cursos</h3>
                  <Button
                    onClick={() => setShowEnrollCourseModal(true)}
                    className="px-3 py-1 text-sm"
                  >
                    + Inscribir
                  </Button>
                </div>
                {selectedStudent.course_enrollments && selectedStudent.course_enrollments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudent.course_enrollments.map((enrollment: any) => (
                      <div key={enrollment.id} className="p-3 bg-gray-50 rounded text-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">
                              {courses.find(c => c.id === enrollment.course_id)?.title || 'Curso'}
                            </p>
                            <p className="text-xs text-gray-600">
                              Progreso: {enrollment.completion_percentage || 0}% | Estado: 
                              <span className={`ml-1 px-2 py-0.5 rounded ${
                                enrollment.status === 'active' ? 'bg-green-100 text-green-800' :
                                enrollment.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {enrollment.status === 'active' ? 'Activo' :
                                 enrollment.status === 'suspended' ? 'Suspendido' :
                                 'Inactivo'}
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            {enrollment.status === 'active' && (
                              <Button
                                onClick={() => handleSuspendCourse(enrollment.id)}
                                variant="secondary"
                                className="px-2 py-1 text-xs"
                                title="Suspender"
                              >
                                ⏸️
                              </Button>
                            )}
                            {enrollment.status === 'suspended' && (
                              <Button
                                onClick={() => handleReactivateCourse(enrollment.id)}
                                variant="secondary"
                                className="px-2 py-1 text-xs"
                                title="Reactivar"
                              >
                                ▶️
                              </Button>
                            )}
                            <Button
                              onClick={() => handleUnenrollCourse(enrollment.id)}
                              variant="secondary"
                              className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
                              title="Desmatricular"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No inscrito en ningún curso</p>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-600">Selecciona un estudiante para ver sus detalles</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Inscribir en Carrera */}
      {showEnrollCareerModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Inscribir en Carrera</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carrera
              </label>
              <select
                value={selectedCareerId || ''}
                onChange={(e) => setSelectedCareerId(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecciona una carrera</option>
                {careers.filter(c => c.is_active).map((career) => (
                  <option key={career.id} value={career.id}>
                    {career.name} ({career.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleEnrollCareer}
                disabled={!selectedCareerId}
                className="flex-1"
              >
                Inscribir
              </Button>
              <Button
                onClick={() => {
                  setShowEnrollCareerModal(false);
                  setSelectedCareerId(null);
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inscribir en Curso */}
      {showEnrollCourseModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Inscribir en Curso</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Curso
              </label>
              <select
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecciona un curso</option>
                {courses.map((course) => (
                  <option key={course.id} value={String(course.id)}>
                    {course.title} {course.code ? `(${course.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleEnrollCourse}
                disabled={!selectedCourseId}
                className="flex-1"
              >
                Inscribir
              </Button>
              <Button
                onClick={() => {
                  setShowEnrollCourseModal(false);
                  setSelectedCourseId(null);
                }}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManagementPage;

