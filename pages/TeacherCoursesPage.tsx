// pages/TeacherCoursesPage.tsx
// Página principal de gestión de cursos para docentes

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { courseService, unitService, sessionService, Course, CourseUnit, Session } from '../services/teacherCourses';
import { subjectService, careerService, Subject, Career } from '../services/academicService';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconBookOpen, IconChevronRight } from '../components/Icons';

interface CourseWithAcademic extends Course {
  subject?: Subject | null;
  career?: Career | null;
  units?: CourseUnit[];
  sessions?: Session[];
}

export const TeacherCoursesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState<CourseWithAcademic[]>([]);
  const [allCourses, setAllCourses] = useState<CourseWithAcademic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterByCareer, setFilterByCareer] = useState<number | null>(null);
  const [filterBySubject, setFilterBySubject] = useState<number | null>(null);
  const [careers, setCareers] = useState<Career[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'hierarchy'>('grid');
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (user?.id) {
      loadCourses();
      loadAcademicData();
    }
    
    // Verificar filtros en URL
    const subjectIdParam = searchParams.get('subjectId');
    if (subjectIdParam) {
      setFilterBySubject(parseInt(subjectIdParam));
    }
  }, [user?.id, searchParams]);

  const loadAcademicData = async () => {
    try {
      const [careersData, subjectsData] = await Promise.all([
        careerService.getActiveCareers(),
        subjectService.getAllSubjects()
      ]);
      setCareers(careersData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Error loading academic data:', err);
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await courseService.getMyCourses(user!.id);
      
      // Cargar información académica y unidades para cada curso
      const coursesWithAcademic: CourseWithAcademic[] = await Promise.all(
        data.map(async (course) => {
          let subject: Subject | null = null;
          let career: Career | null = null;
          let units: CourseUnit[] = [];
          let sessions: Session[] = [];
          
          if (course.subject_id) {
            try {
              subject = await subjectService.getSubject(course.subject_id);
              if (subject?.career_id) {
                career = await careerService.getCareer(subject.career_id);
              }
            } catch (err) {
              console.error('Error loading academic info for course:', course.id, err);
            }
          }
          
          // Cargar unidades y sesiones del curso
          try {
            [units, sessions] = await Promise.all([
              unitService.getCourseUnits(course.id),
              sessionService.getCourseSessions(course.id)
            ]);
          } catch (err) {
            console.error('Error loading units/sessions for course:', course.id, err);
          }
          
          return {
            ...course,
            subject,
            career,
            units,
            sessions
          };
        })
      );
      
      setAllCourses(coursesWithAcademic);
      applyFilters(coursesWithAcademic);
    } catch (err) {
      setError('Error al cargar los cursos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (coursesData: CourseWithAcademic[]) => {
    let filtered = [...coursesData];
    
    if (filterByCareer) {
      filtered = filtered.filter(c => c.career?.id === filterByCareer);
    }
    
    if (filterBySubject) {
      filtered = filtered.filter(c => c.subject?.id === filterBySubject);
    }
    
    setCourses(filtered);
  };

  useEffect(() => {
    if (allCourses.length > 0) {
      applyFilters(allCourses);
    }
  }, [filterByCareer, filterBySubject]);

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este curso?')) return;

    try {
      await courseService.deleteCourse(id);
      setCourses(courses.filter(c => c.id !== id));
    } catch (err) {
      setError('Error al eliminar el curso');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'draft': return 'text-yellow-600 bg-yellow-100';
      case 'archived': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'draft': return 'Borrador';
      case 'archived': return 'Archivado';
      default: return status;
    }
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
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
        <Button onClick={loadCourses} className="mt-2">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cursos</h1>
          <p className="text-gray-600">Gestiona tus cursos y contenido académico</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/subjects">
            <Button variant="outline">
              Ver Materias
            </Button>
          </Link>
          <Link to="/teacher/courses/new">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Curso
            </Button>
          </Link>
        </div>
      </div>

      {/* Sección explicativa de la jerarquía */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">📚 Estructura Académica</h3>
          <div className="text-xs text-gray-700 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">Carrera</span>
              <span>→</span>
              <span className="font-medium">Materia</span>
              <span>→</span>
              <span className="font-medium">Curso</span>
              <span>→</span>
              <span className="font-medium">Unidades/Sesiones/Contenido</span>
            </div>
            <p className="text-gray-600 mt-2">
              Cada curso pertenece a una <strong>Materia</strong> que está dentro de una <strong>Carrera</strong>. 
              El curso contiene el contenido (unidades, sesiones, materiales) que los estudiantes verán.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => navigate('/admin/careers')}
                className="text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Gestionar Carreras →
              </button>
              <button
                onClick={() => navigate('/admin/subjects')}
                className="text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Gestionar Materias →
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      {(careers.length > 0 || subjects.length > 0) && (
        <Card>
          <div className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
              
              <select
                value={filterByCareer || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : null;
                  setFilterByCareer(value);
                  // Si hay filtro por carrera, filtrar también las materias
                  if (value) {
                    const careerSubjects = subjects.filter(s => s.career_id === value);
                    // Si el subject actual no pertenece a esta carrera, limpiar filtro
                    if (filterBySubject && !careerSubjects.find(s => s.id === filterBySubject)) {
                      setFilterBySubject(null);
                    }
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Todas las carreras</option>
                {careers.map(career => (
                  <option key={career.id} value={career.id}>{career.name}</option>
                ))}
              </select>

              <select
                value={filterBySubject || ''}
                onChange={(e) => setFilterBySubject(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={filterByCareer ? false : false}
              >
                <option value="">Todas las materias</option>
                {(filterByCareer 
                  ? subjects.filter(s => s.career_id === filterByCareer)
                  : subjects
                ).map(subject => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>

              {(filterByCareer || filterBySubject) && (
                <Button
                  onClick={() => {
                    setFilterByCareer(null);
                    setFilterBySubject(null);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {courses.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes cursos</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza creando tu primer curso.</p>
            <div className="mt-6">
              <Link to="/teacher/courses/new">
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Curso
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => {
            const courseWithData = course as CourseWithAcademic;
            const courseUnits = courseWithData.units || [];
            const courseSessions = courseWithData.sessions || [];
            const isCourseExpanded = expandedCourses.has(course.id);
            const sessionsByUnit: Record<string, Session[]> = {};
            
            // Agrupar sesiones por unidad
            courseSessions.forEach(session => {
              const unitId = session.unit_id || 'sin-unidad';
              if (!sessionsByUnit[unitId]) {
                sessionsByUnit[unitId] = [];
              }
              sessionsByUnit[unitId].push(session);
            });

            const toggleCourse = () => {
              setExpandedCourses(prev => {
                const newSet = new Set(prev);
                if (newSet.has(course.id)) {
                  newSet.delete(course.id);
                } else {
                  newSet.add(course.id);
                }
                return newSet;
              });
            };

            const toggleUnit = (unitId: string) => {
              setExpandedUnits(prev => {
                const newSet = new Set(prev);
                if (newSet.has(unitId)) {
                  newSet.delete(unitId);
                } else {
                  newSet.add(unitId);
                }
                return newSet;
              });
            };

            return (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={toggleCourse}
                          className="flex items-center gap-2 hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                          title={isCourseExpanded ? "Ocultar unidades" : "Mostrar unidades"}
                        >
                          <IconChevronRight
                            className={`w-5 h-5 text-gray-600 transition-transform ${
                              isCourseExpanded ? 'transform rotate-90' : ''
                            }`}
                          />
                          <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
                        </button>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(course.status)}`}>
                          {getStatusText(course.status)}
                        </span>
                      </div>
                      {course.code && (
                        <p className="text-sm text-gray-500 ml-7">Código: {course.code}</p>
                      )}
                      {courseWithData.subject && (
                        <div className="mt-2 ml-7 space-y-1">
                          {courseWithData.career && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-gray-500">Carrera:</span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/admin/careers?careerId=${courseWithData.career?.id}`);
                                }}
                                className="text-purple-600 hover:text-purple-800 hover:underline font-medium"
                              >
                                {courseWithData.career?.name}
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-gray-500">Materia:</span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/admin/subjects?subjectId=${courseWithData.subject?.id}`);
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              {courseWithData.subject?.name}
                            </button>
                          </div>
                          {course.academic_period && (
                            <p className="text-xs text-gray-500">
                              Período: {course.academic_period}
                            </p>
                          )}
                        </div>
                      )}
                      {!courseWithData.subject && (
                        <div className="mt-2 ml-7">
                          <p className="text-xs text-yellow-600 italic">
                            Sin materia asignada - <Link to={`/teacher/courses/${course.id}/edit`} className="underline">Asignar materia</Link>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-gray-600 text-sm mb-4 ml-7 line-clamp-2">{course.description}</p>
                  )}

                  <div className="text-xs text-gray-500 mb-4 ml-7">
                    Creado: {new Date(course.created_at).toLocaleDateString()}
                    {courseUnits.length > 0 && (
                      <span className="ml-2">• {courseUnits.length} {courseUnits.length === 1 ? 'unidad' : 'unidades'}</span>
                    )}
                    {courseSessions.length > 0 && (
                      <span className="ml-2">• {courseSessions.length} {courseSessions.length === 1 ? 'sesión' : 'sesiones'}</span>
                    )}
                  </div>

                  {/* Unidades del curso (formato similar a CourseViewPage) */}
                  {isCourseExpanded && courseUnits.length > 0 && (
                    <div className="mt-4 ml-7 space-y-4 border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Unidades del Curso ({courseUnits.length})
                      </h4>
                      {courseUnits.map((unit) => {
                        const unitSessions = sessionsByUnit[unit.id] || [];
                        const isExpanded = expandedUnits.has(unit.id);
                        
                        return (
                          <Card key={unit.id} className="overflow-hidden">
                            <div
                              className="cursor-pointer p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                              onClick={() => toggleUnit(unit.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <span className="text-primary font-semibold text-sm">
                                      {unit.number}
                                    </span>
                                  </div>
                                  <div>
                                    <h5 className="text-lg font-semibold text-gray-900">
                                      {unit.title}
                                    </h5>
                                    {unit.description && (
                                      <p className="text-sm text-gray-600 mt-1">{unit.description}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                      {unitSessions.length} {unitSessions.length === 1 ? 'sesión' : 'sesiones'}
                                    </p>
                                  </div>
                                </div>
                                <IconChevronRight
                                  className={`w-5 h-5 text-gray-400 transition-transform ${
                                    isExpanded ? 'transform rotate-90' : ''
                                  }`}
                                />
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-gray-200 p-4 space-y-4">
                                {/* Contenido de la Unidad */}
                                {unit.content_html && (
                                  <div className="prose prose-sm max-w-none">
                                    <div 
                                      className="unit-content"
                                      dangerouslySetInnerHTML={{ __html: unit.content_html }}
                                    />
                                  </div>
                                )}
                                {!unit.content_html && unit.content_markdown && (
                                  <div className="prose prose-sm max-w-none">
                                    <div 
                                      className="unit-content whitespace-pre-wrap"
                                    >
                                      {unit.content_markdown}
                                    </div>
                                  </div>
                                )}
                                {!unit.content_html && !unit.content_markdown && unit.description && (
                                  <div className="prose prose-sm max-w-none">
                                    <p className="text-gray-700">{unit.description}</p>
                                  </div>
                                )}
                                
                                {/* Objetivos de Aprendizaje */}
                                {unit.learning_objectives && unit.learning_objectives.length > 0 && (
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-blue-900 mb-2">
                                      Objetivos de Aprendizaje
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1">
                                      {unit.learning_objectives.map((objective, idx) => (
                                        <li key={idx} className="text-sm text-blue-800">{objective}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {unit.duration_hours && (
                                  <p className="text-xs text-gray-500">
                                    Duración: {unit.duration_hours} horas
                                  </p>
                                )}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {isCourseExpanded && courseUnits.length === 0 && (
                    <div className="mt-4 ml-7 border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-500 text-center py-4">
                        Este curso aún no tiene unidades definidas.
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2 mt-4">
                    <Link 
                      to={`/teacher/courses/${course.id}`}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                    >
                      Ver Curso
                    </Link>
                    <Link 
                      to={`/teacher/courses/${course.id}/modules`}
                      className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors text-center"
                    >
                      Módulos
                    </Link>
                    <Link 
                      to={`/teacher/courses/${course.id}/edit`}
                      className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors text-center"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
