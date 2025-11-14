// pages/CourseViewPage.tsx
// Vista de curso para estudiantes - Muestra módulos y sesiones organizadas

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseService, Course } from '../services/teacherCourses';
import { unitService, CourseUnit } from '../services/teacherCourses';
import { sessionService, Session } from '../services/teacherCourses';
import { materialService, Material } from '../services/teacherCourses';
import { subjectService, careerService, Subject, Career } from '../services/academicService';
import Card from '../components/Card';
import Button from '../components/Button';
import Breadcrumbs from '../components/Breadcrumbs';
import ProgressIndicator from '../components/ProgressIndicator';
import { IconBookOpen, IconChevronRight, IconCalendar, IconEye, IconRobot, IconClipboardList, IconClipboardCheck, IconClock } from '../components/Icons';
import { MaterialDisplay } from '../components/MaterialDisplay';
import { useAuth } from '../hooks/useAuth';
import { courseEnrollmentService, CourseEnrollment } from '../services/academicService';
import { progressService } from '../services/progressService';
import { quizService, Assessment } from '../services/quizService';
import { VideoTranscriptService } from '../services/videoTranscriptService';

export const CourseViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [sessionsByUnit, setSessionsByUnit] = useState<Record<string, Session[]>>({});
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [career, setCareer] = useState<Career | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [quizzesByUnit, setQuizzesByUnit] = useState<Record<string, Assessment[]>>({});
  const [generalQuizzes, setGeneralQuizzes] = useState<Assessment[]>([]);

  useEffect(() => {
    if (id) {
      loadCourseData();
    }
  }, [id]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const courseId = parseInt(id!);
      
      const [courseData, unitsData, sessionsData, materialsData] = await Promise.all([
        courseService.getCourse(courseId),
        unitService.getCourseUnits(courseId),
        sessionService.getCourseSessions(courseId),
        materialService.getCourseMaterials(courseId)
      ]);

      setCourse(courseData);
      setUnits(unitsData);
      setMaterials(materialsData);

      // Agrupar sesiones por unidad
      const groupedSessions: Record<string, Session[]> = {};
      sessionsData.forEach(session => {
        const unitId = session.unit_id || 'sin-unidad';
        if (!groupedSessions[unitId]) {
          groupedSessions[unitId] = [];
        }
        groupedSessions[unitId].push(session);
      });
      setSessionsByUnit(groupedSessions);

      // Expandir automáticamente la primera unidad
      if (unitsData.length > 0) {
        setExpandedUnits(new Set([unitsData[0].id]));
      }

      // Cargar información académica
      if (courseData?.subject_id) {
        try {
          const subjectData = await subjectService.getSubject(courseData.subject_id);
          setSubject(subjectData);
          if (subjectData?.career_id) {
            const careerData = await careerService.getCareer(subjectData.career_id);
            setCareer(careerData);
          }
        } catch (err) {
          console.error('Error loading academic info:', err);
        }
      }

      // Cargar enrollment del estudiante para obtener progreso
      if (user?.id) {
        try {
          const enrollments = await courseEnrollmentService.getStudentEnrollments(user.id);
          const courseEnrollment = enrollments.find(e => e.course_id === courseId);
          if (courseEnrollment) {
            setEnrollment(courseEnrollment);
          }
        } catch (err) {
          console.error('Error loading enrollment:', err);
        }
      }

      // Cargar quizzes publicados del curso
      try {
        const courseQuizzes = await quizService.getCourseAssessments(courseId, ['quiz', 'trivia', 'exam']);
        
        // Separar quizzes por unidad y generales (sin unidad)
        const grouped: Record<string, Assessment[]> = {};
        const general: Assessment[] = [];
        
        courseQuizzes.forEach(quiz => {
          if (quiz.unit_id) {
            if (!grouped[quiz.unit_id]) {
              grouped[quiz.unit_id] = [];
            }
            grouped[quiz.unit_id].push(quiz);
          } else {
            // Quizzes generales del curso (sin unidad específica)
            general.push(quiz);
          }
        });
        
        setQuizzesByUnit(grouped);
        setGeneralQuizzes(general);
      } catch (err) {
        console.error('Error loading quizzes:', err);
      }
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
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

  // Función auxiliar para detectar si un material es un video
  const isVideoMaterial = (material: Material): boolean => {
    if (material.kind === 'video') return true;
    if (!material.url) return false;
    const transcriptService = new VideoTranscriptService();
    const platform = transcriptService.detectPlatform(material.url);
    return platform !== null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900">Curso no encontrado</h2>
        <Button onClick={() => navigate('/my/courses')} className="mt-4">
          Volver a Mis Cursos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs 
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Mis Cursos', path: '/my/courses' },
          { label: course.title }
        ]}
      />
      
      {/* Header del Curso */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
            {course.code && (
              <p className="text-gray-600 mb-3">Código: {course.code}</p>
            )}
            {course.description && (
              <p className="text-gray-700 mb-4">{course.description}</p>
            )}
            
            {/* Información Académica */}
            {(subject || career) && (
              <div className="flex flex-wrap gap-4 text-sm mt-4">
                {subject && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Materia:</span>
                    <span className="font-medium">{subject.name}</span>
                  </div>
                )}
                {career && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Carrera:</span>
                    <span className="font-medium">{career.name}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Indicador de Progreso */}
            {enrollment && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <ProgressIndicator
                  value={enrollment.completion_percentage || 0}
                  label="Progreso del Curso"
                  showIcon={true}
                  size="md"
                  showPercentage={true}
                />
                {enrollment.time_spent_minutes > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Tiempo invertido: {Math.round(enrollment.time_spent_minutes / 60)} horas {enrollment.time_spent_minutes % 60} minutos
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Acciones */}
          <div className="flex gap-2 ml-4 flex-wrap">
            <Link to={`/assignments?courseId=${course.id}`}>
              <Button variant="secondary" leftIcon={<IconClipboardList className="w-5 h-5" />}>
                Ver Tareas
              </Button>
            </Link>
            <Link to={`/sessions?courseId=${course.id}`}>
              <Button variant="secondary" leftIcon={<IconBookOpen className="w-5 h-5" />}>
                Ver Todas las Sesiones
              </Button>
            </Link>
            <Link to={`/tutor?courseId=${course.id}`}>
              <Button variant="primary" leftIcon={<IconRobot className="w-5 h-5" />}>
                Abrir Tutor
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Evaluaciones Generales del Curso (sin unidad específica) */}
      {generalQuizzes.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Evaluaciones Generales</h2>
          <div className="space-y-2">
            {generalQuizzes.map((quiz) => {
              const typeLabels: Record<string, string> = {
                'quiz': 'Quiz',
                'trivia': 'Trivia',
                'exam': 'Examen',
                'project': 'Proyecto',
                'assignment': 'Tarea'
              };
              const typeColors: Record<string, string> = {
                'quiz': 'bg-blue-100 text-blue-700',
                'trivia': 'bg-purple-100 text-purple-700',
                'exam': 'bg-red-100 text-red-700',
                'project': 'bg-green-100 text-green-700',
                'assignment': 'bg-yellow-100 text-yellow-700'
              };

              return (
                <Link
                  key={quiz.id}
                  to={`/quiz/${quiz.id}`}
                  className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <IconClipboardCheck className="w-5 h-5 text-primary flex-shrink-0" />
                        <h4 className="text-base font-semibold text-gray-900 group-hover:text-primary">
                          {quiz.title}
                        </h4>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${typeColors[quiz.assessment_type] || 'bg-gray-100 text-gray-700'}`}>
                          {typeLabels[quiz.assessment_type] || quiz.assessment_type}
                        </span>
                      </div>
                      {quiz.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {quiz.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        {quiz.time_limit && (
                          <div className="flex items-center gap-1">
                            <IconClock className="w-3 h-3" />
                            <span>{quiz.time_limit} minutos</span>
                          </div>
                        )}
                        {quiz.max_attempts && (
                          <span>{quiz.max_attempts} intento{quiz.max_attempts > 1 ? 's' : ''}</span>
                        )}
                        {!quiz.max_attempts && (
                          <span className="text-green-600 font-medium">Intentos ilimitados</span>
                        )}
                        {quiz.passing_score && (
                          <span>Aprobar: {quiz.passing_score}%</span>
                        )}
                      </div>
                    </div>
                    <IconChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0 ml-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Módulos y Sesiones */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Contenido del Curso</h2>
        
        {units.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <IconBookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Este curso aún no tiene módulos definidos.</p>
            </div>
          </Card>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-2">Total de unidades: {units.length}</p>
            {units.map((unit) => {
            const unitSessions = sessionsByUnit[unit.id] || [];
            // Excluir materiales asociados a sesiones (solo mostrar materiales de unidad sin session_id)
            const unitMaterials = materials.filter((material) => 
              material.unit_id === unit.id && !material.session_id
            );
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
                        <h3 className="text-lg font-semibold text-gray-900">
                          {unit.title}
                        </h3>
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

                    {/* Botón de "Entendido" */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-green-900 mb-1">
                            ¡Contenido Leído!
                          </h4>
                          <p className="text-xs text-green-700">
                            Marca esta unidad como leída. Tu comprensión se evaluará en las actividades y tareas del curso.
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!user?.id) return;
                            try {
                              // Marcar unidad como accedida (método simplificado)
                              await progressService.completeSession(
                                user.id,
                                unit.id,
                                parseInt(id!),
                                unit.id,
                                { timeSpentMinutes: 15 }
                              );
                              alert('✅ Unidad marcada como leída');
                            } catch (err) {
                              console.error('Error:', err);
                              alert('Ya has marcado esta unidad como leída');
                            }
                          }}
                          className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Entendido ✓
                        </button>
                      </div>
                    </div>

                    {/* Quizzes/Evaluaciones */}
                    {(() => {
                      const unitQuizzes = quizzesByUnit[unit.id] || [];
                      if (unitQuizzes.length === 0) return null;

                      return (
                        <div className="space-y-2 mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Evaluaciones ({unitQuizzes.length})
                          </h4>
                          <div className="space-y-2">
                            {unitQuizzes.map((quiz) => {
                              const typeLabels: Record<string, string> = {
                                'quiz': 'Quiz',
                                'trivia': 'Trivia',
                                'exam': 'Examen',
                                'project': 'Proyecto',
                                'assignment': 'Tarea'
                              };
                              const typeColors: Record<string, string> = {
                                'quiz': 'bg-blue-100 text-blue-700',
                                'trivia': 'bg-purple-100 text-purple-700',
                                'exam': 'bg-red-100 text-red-700',
                                'project': 'bg-green-100 text-green-700',
                                'assignment': 'bg-yellow-100 text-yellow-700'
                              };

                              return (
                                <Link
                                  key={quiz.id}
                                  to={`/quiz/${quiz.id}`}
                                  className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <IconClipboardCheck className="w-4 h-4 text-primary flex-shrink-0" />
                                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-primary">
                                          {quiz.title}
                                        </h4>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeColors[quiz.assessment_type] || 'bg-gray-100 text-gray-700'}`}>
                                          {typeLabels[quiz.assessment_type] || quiz.assessment_type}
                                        </span>
                                      </div>
                                      {quiz.description && (
                                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                          {quiz.description}
                                        </p>
                                      )}
                                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                        {quiz.time_limit && (
                                          <div className="flex items-center gap-1">
                                            <IconClock className="w-3 h-3" />
                                            <span>{quiz.time_limit} min</span>
                                          </div>
                                        )}
                                        {quiz.max_attempts && (
                                          <span>{quiz.max_attempts} intento{quiz.max_attempts > 1 ? 's' : ''}</span>
                                        )}
                                        {quiz.passing_score && (
                                          <span>Aprobar: {quiz.passing_score}%</span>
                                        )}
                                      </div>
                                    </div>
                                    <IconChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0 ml-3" />
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Sesiones */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        Sesiones ({unitSessions.length})
                      </h4>
                      {unitSessions.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Este módulo aún no tiene sesiones.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {unitSessions
                            .sort((a, b) => {
                              // Ordenar por order_index si existe, sino por fecha
                              if (a.order_index !== null && b.order_index !== null) {
                                return a.order_index - b.order_index;
                              }
                              if (a.starts_at && b.starts_at) {
                                return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
                              }
                              return 0;
                            })
                            .map((session) => (
                              <Link
                                key={session.id}
                                to={`/session/${session.id}`}
                                className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all group"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <IconBookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-primary">
                                        {session.title}
                                      </h4>
                                    </div>
                                    {session.description && (
                                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                        {session.description}
                                      </p>
                                    )}
                                    {session.starts_at && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <IconCalendar className="w-3 h-3" />
                                        <span>
                                          {new Date(session.starts_at).toLocaleDateString('es-ES', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                          })}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <IconEye className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0 ml-3" />
                                </div>
                              </Link>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Videos de la Unidad */}
                    {unitMaterials.filter(isVideoMaterial).length > 0 && (
                      <div className="space-y-4 mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Videos ({unitMaterials.filter(isVideoMaterial).length})
                        </h4>
                        <div className="space-y-6">
                          {unitMaterials.filter(isVideoMaterial).map((material) => (
                            <div key={material.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <MaterialDisplay 
                                material={material}
                                showFullPlayer={true}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Otros Materiales de la Unidad */}
                    {unitMaterials.filter(m => !isVideoMaterial(m)).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Otros Materiales ({unitMaterials.filter(m => !isVideoMaterial(m)).length})
                        </h4>
                        <div className="space-y-2">
                          {unitMaterials.filter(m => !isVideoMaterial(m)).map((material) => (
                            <MaterialDisplay 
                              key={material.id}
                              material={material}
                              showFullPlayer={false}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
          </>
        )}

        {/* Sesiones sin módulo asignado */}
        {sessionsByUnit['sin-unidad'] && sessionsByUnit['sin-unidad'].length > 0 && (
          <Card>
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Sesiones sin Módulo
              </h3>
              <div className="space-y-2">
                {sessionsByUnit['sin-unidad'].map((session) => (
                  <Link
                    key={session.id}
                    to={`/session/${session.id}`}
                    className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">{session.title}</h4>
                        {session.description && (
                          <p className="text-xs text-gray-600 mt-1">{session.description}</p>
                        )}
                      </div>
                      <IconEye className="w-5 h-5 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Materiales generales del curso (sin unidad y sin sesión) */}
      {materials.filter((material) => !material.unit_id && !material.session_id).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Materiales del Curso</h2>
          
          {/* Videos generales del curso (sin unidad y sin sesión) */}
          {materials.filter((material) => !material.unit_id && !material.session_id && isVideoMaterial(material)).length > 0 && (
            <Card className="mb-4">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Videos del Curso ({materials.filter((material) => !material.unit_id && !material.session_id && isVideoMaterial(material)).length})
                </h3>
                <div className="space-y-6">
                  {materials
                    .filter((material) => !material.unit_id && !material.session_id && isVideoMaterial(material))
                    .map((material) => (
                      <div key={material.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <MaterialDisplay 
                          material={material}
                          showFullPlayer={true}
                        />
                      </div>
                    ))}
                </div>
              </div>
            </Card>
          )}

          {/* Otros materiales generales del curso (sin unidad y sin sesión) */}
          {materials.filter((material) => !material.unit_id && !material.session_id && !isVideoMaterial(material)).length > 0 && (
            <Card>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Otros Materiales ({materials.filter((material) => !material.unit_id && !material.session_id && !isVideoMaterial(material)).length})
                </h3>
                <div className="space-y-2">
                  {materials
                    .filter((material) => !material.unit_id && !material.session_id && !isVideoMaterial(material))
                    .map((material) => (
                      <MaterialDisplay 
                        key={material.id}
                        material={material}
                        showFullPlayer={false}
                      />
                    ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseViewPage;

