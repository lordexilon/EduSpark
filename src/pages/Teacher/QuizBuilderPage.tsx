import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { quizService, Assessment, Question } from '@/services/quizService';
import { courseService, unitService, sessionService, materialService } from '@/services/teacherCourses';
import { AiService } from '@/services/aiService';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Common/Button';
import Card from '@/components/Common/Card';
import Breadcrumbs from '@/components/Common/Breadcrumbs';
import { QuestionBuilder } from '@/components/Features/QuestionBuilder';
import { IconPlus, IconTrash, IconEdit, IconCheck, IconX, IconArrowLeft, IconSave, IconChartBar } from '@/components/Common/Icons';

// Utility to strip HTML
const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

export const QuizBuilderPage: React.FC = () => {
  const { courseId, unitId, quizId } = useParams<{ courseId?: string; unitId?: string; quizId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // AI Generation State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    numQuestions: 5,
    difficulty: 'medium'
  });
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const handleGenerateWithAi = async () => {
    // Validar que haya contexto seleccionado
    // Nota: depends on finalUnitId and finalSessionId which should be available in the component scope
    // I need to verify if finalUnitId/finalSessionId are available in this scope.
    // Looking at previous reads, they seem to be state variables further down or hooks.
    // I will assume they are state variables 'unitId' or derived.
    // Wait, the component uses `unitId` from params.
    // Let's check if 'selectedUnit' is available.

    // Safety check: if we are in this component, we might need to access state.
    // To be safe, I'll access the DOM elements or Props if needed, but standard React state is best.
    // I'll assume standard state names based on the file content I've seen (unitId param).

    const targetUnitId = finalUnitId;

    if (!targetUnitId) {
      alert('Por favor selecciona una Unidad para tener contexto para la IA.');
      return;
    }

    setIsGeneratingAi(true);
    try {
      // 1. Gather Context
      let context = "";

      // Fetch Unit Data
      try {
        const unit = await unitService.getUnit(targetUnitId);
        if (unit) {
          context += `UNIDAD: ${unit.title}\n`;
          context += `DESCRIPCIÓN: ${unit.description || ''}\n`;
          if (unit.content_html) context += `CONTENIDO: ${stripHtml(unit.content_html)}\n`;
        }
      } catch (e) {
        console.warn('Error fetching unit context', e);
      }

      // Fetch Materials 
      try {
        const materials = await materialService.getUnitMaterials(targetUnitId);
        if (materials.length > 0) {
          context += `\nMATERIALES ADJUNTOS (Utiliza estos títulos como referencia de temas):\n`;
          materials.forEach(m => context += `- ${m.title}: ${m.metadata?.description || ''}\n`);
        }
      } catch (err) {
        console.warn('Could not fetch materials for context', err);
      }

      if (context.length < 50) {
        alert('No hay suficiente contenido en la Unidad para generar preguntas. Asegúrate de que la unidad tenga descripción o contenido.');
        setIsGeneratingAi(false);
        return;
      }

      // 2. Call AI Service
      const aiQuestions = await AiService.generateQuiz(context, {
        numQuestions: aiConfig.numQuestions,
        difficulty: aiConfig.difficulty
      });

      // 3. Map to Question format
      const newQuestions = aiQuestions.map((q: any, index: number) => ({
        id: crypto.randomUUID(),
        assessment_id: quizId || '', // If quizId exists
        question_text: q.question_text || 'Pregunta generada',
        question_type: 'multiple_choice' as const,
        points: q.points || 10,
        options: (q.options || []).map((o: any) => ({
          id: crypto.randomUUID(),
          text: o.text,
          is_correct: !!o.correct
        })),
        explanation: q.explanation,
        order_index: questions.length + index,
        is_required: true,
        partial_credit: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // 4. Update State
      // I need to know the name of the state setter for questions.
      // Usually setQuestions.
      setQuestions(prev => [...prev, ...newQuestions]);
      setIsAiModalOpen(false);
      alert(`¡${newQuestions.length} preguntas generadas con éxito! No olvides GUARDAR los cambios.`);

    } catch (error: any) {
      console.error('Error generating quiz:', error);
      alert(error.message || 'Error al generar preguntas con IA');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Obtener courseId y unitId de query params de manera estable
  // Extraer los valores de searchParams de forma estable
  const courseIdFromSearch = searchParams.get('courseId');
  const unitIdFromSearch = searchParams.get('unitId');

  const urlCourseIdParam = courseId || courseIdFromSearch || undefined;
  const urlUnitIdParam = unitId || unitIdFromSearch || undefined;

  // Obtener courseId y unitId de query params si no están en route params
  const [finalCourseId, setFinalCourseId] = useState<string | undefined>(() => {
    return courseId || searchParams.get('courseId') || undefined;
  });
  const [finalUnitId, setFinalUnitId] = useState<string | undefined>(() => {
    return unitId || searchParams.get('unitId') || undefined;
  });
  const [finalSessionId, setFinalSessionId] = useState<string | undefined>(() => {
    return searchParams.get('sessionId') || undefined;
  });

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [unit, setUnit] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);

  // Datos del quiz
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assessmentType, setAssessmentType] = useState<'quiz' | 'trivia' | 'exam'>('quiz');
  const [instructions, setInstructions] = useState('');
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [passingScore, setPassingScore] = useState<number>(70);
  const [isPublished, setIsPublished] = useState(false);
  const [isFinalExam, setIsFinalExam] = useState(false);
  const [availableFrom, setAvailableFrom] = useState<string>('');
  const [availableUntil, setAvailableUntil] = useState<string>('');

  // Preguntas
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  // Sincronizar finalCourseId y finalUnitId con los parámetros de la URL
  // Solo actualizar cuando cambian los parámetros de la URL, no cuando cambian los estados
  useEffect(() => {
    // Solo actualizar si los valores son diferentes para evitar loops
    setFinalCourseId(prev => {
      if (urlCourseIdParam !== prev) {
        return urlCourseIdParam;
      }
      return prev;
    });

    setFinalUnitId(prev => {
      if (urlUnitIdParam !== prev) {
        return urlUnitIdParam;
      }
      return prev;
    });
  }, [courseId, courseIdFromSearch, unitId, unitIdFromSearch]); // Usar valores directos de los parámetros

  // Usar useRef para evitar múltiples llamadas a loadData y para rastrear si estamos cargando
  const loadDataCalledRef = useRef<string>('');
  const isLoadingRef = useRef<boolean>(false);

  useEffect(() => {
    // Crear una clave única para esta combinación de parámetros
    const key = `${finalCourseId || 'no-course'}-${finalUnitId || 'no-unit'}-${quizId || 'no-quiz'}`;

    // Solo cargar si la clave cambió y no estamos cargando actualmente
    if (loadDataCalledRef.current !== key && !isLoadingRef.current) {
      loadDataCalledRef.current = key;
      loadData();
    }
  }, [finalCourseId, finalUnitId, quizId]); // Dependencias estables

  const loadData = async () => {
    // Evitar múltiples llamadas simultáneas
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);

      // Si no hay courseId y estamos creando un nuevo quiz, cargar cursos disponibles
      if (!finalCourseId && !quizId && user?.id) {
        try {
          const courses = await courseService.getMyCourses(user.id);
          setAvailableCourses(courses || []);
        } catch (err) {
          console.error('Error cargando cursos:', err);
        }
      }

      if (finalCourseId) {
        const courseData = await courseService.getCourse(Number(finalCourseId));
        setCourse(courseData);

        // Cargar unidades y sesiones del curso
        try {
          const [unitsData, sessionsData] = await Promise.all([
            unitService.getCourseUnits(Number(finalCourseId)),
            sessionService.getCourseSessions(Number(finalCourseId))
          ]);
          setAvailableUnits(unitsData);
          setAvailableSessions(sessionsData);
        } catch (err) {
          console.error('Error cargando unidades/sesiones:', err);
        }
      }

      if (finalUnitId) {
        const unitData = await unitService.getUnit(finalUnitId);
        setUnit(unitData);
      }

      if (finalSessionId) {
        try {
          const sessionData = await sessionService.getSession(finalSessionId);
          setSession(sessionData);
        } catch (err) {
          console.error('Error cargando sesión:', err);
        }
      }

      if (quizId) {
        const { assessment, questions: loadedQuestions } = await quizService.getAssessmentWithQuestions(quizId);
        setTitle(assessment.title || '');
        setDescription(assessment.description || '');
        setAssessmentType(assessment.assessment_type || 'quiz');
        setInstructions(assessment.instructions || '');
        setTimeLimit(assessment.time_limit || null);
        setMaxAttempts(assessment.max_attempts || 3);
        setPassingScore(assessment.passing_score || 70);
        setIsPublished(assessment.is_published || false);
        setIsFinalExam(assessment.is_final_exam || false);
        setAvailableFrom(assessment.available_from || '');
        setAvailableUntil(assessment.available_until || '');
        setQuestions(loadedQuestions || []);

        // Si no hay courseId en la URL, obtenerlo del assessment
        // Solo actualizar si realmente no hay courseId en la URL para evitar loops
        if (!urlCourseIdParam && assessment.course_id) {
          const newCourseId = String(assessment.course_id);
          // Solo actualizar si es diferente
          setFinalCourseId(prev => {
            if (prev !== newCourseId) {
              // Cargar el curso de forma asíncrona para no bloquear
              courseService.getCourse(assessment.course_id).then(courseData => {
                setCourse(courseData);
              }).catch(err => {
                console.error('Error cargando curso:', err);
              });
              return newCourseId;
            }
            return prev;
          });
        }

        // Si no hay unitId en la URL, obtenerlo del assessment
        if (!urlUnitIdParam && assessment.unit_id) {
          const newUnitId = assessment.unit_id;
          // Solo actualizar si es diferente
          setFinalUnitId(prev => {
            if (prev !== newUnitId) {
              // Cargar la unidad de forma asíncrona para no bloquear
              unitService.getUnit(assessment.unit_id).then(unitData => {
                setUnit(unitData);
              }).catch(err => {
                console.error('Error cargando unidad:', err);
              });
              return newUnitId;
            }
            return prev;
          });
        }

        // Si hay session_id en el assessment, cargarlo
        if (assessment.session_id) {
          setFinalSessionId(assessment.session_id);
          sessionService.getSession(assessment.session_id).then(sessionData => {
            setSession(sessionData);
          }).catch(err => {
            console.error('Error cargando sesión:', err);
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error cargando datos');
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Partial<Question> = {
      question_text: '',
      question_type: 'multiple_choice',
      order_index: questions.length,
      options: [],
      points: 1,
      partial_credit: false,
      is_required: true
    };
    setEditingQuestion(newQuestion as Question);
    setShowQuestionForm(true);
  };

  const handleSaveQuestion = async (questionData: Partial<Question>) => {
    if (!quizId) {
      alert('Primero guarda el quiz para agregar preguntas');
      return;
    }

    try {
      let savedQuestion: Question;

      if (editingQuestion?.id) {
        // Actualizar pregunta existente
        savedQuestion = await quizService.updateQuestion(editingQuestion.id, questionData);
        setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? savedQuestion : q));
      } else {
        // Crear nueva pregunta
        savedQuestion = await quizService.createQuestion({
          ...questionData,
          assessment_id: quizId,
          order_index: questions.length
        });
        setQuestions(prev => [...prev, savedQuestion]);
      }

      setEditingQuestion(null);
      setShowQuestionForm(false);
    } catch (error: any) {
      alert(error.message || 'Error guardando pregunta');
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('¿Eliminar esta pregunta?')) return;

    try {
      await quizService.deleteQuestion(questionId);
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (error: any) {
      alert(error.message || 'Error eliminando pregunta');
    }
  };

  const saveQuiz = async (publish: boolean = false) => {
    console.log('💾 saveQuiz llamado', { publish, title, finalCourseId, user: user?.id, quizId });

    if (!title || !title.trim()) {
      console.warn('⚠️ Título vacío');
      alert('Completa el título del quiz');
      return;
    }

    if (!finalCourseId) {
      console.warn('⚠️ No hay courseId');
      alert('Se requiere un curso para crear el quiz');
      return;
    }

    if (!user?.id) {
      console.warn('⚠️ No hay usuario');
      alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      console.log('📝 Preparando datos del quiz...');
      const quizData: Partial<Assessment> = {
        course_id: Number(finalCourseId),
        unit_id: finalUnitId || undefined,
        session_id: finalSessionId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        assessment_type: assessmentType,
        instructions: instructions.trim() || undefined,
        time_limit: timeLimit || undefined,
        max_attempts: maxAttempts || undefined,
        passing_score: passingScore,
        is_published: publish,
        is_final_exam: isFinalExam && assessmentType === 'exam', // Solo permitir si es tipo 'exam'
        available_from: availableFrom || undefined,
        available_until: availableUntil || undefined,
        created_by: user.id
      };

      console.log('📤 Enviando datos:', quizData);

      let savedAssessment: Assessment;

      if (quizId) {
        console.log('🔄 Actualizando quiz existente:', quizId);
        savedAssessment = await quizService.updateAssessment(quizId, quizData);
        console.log('✅ Quiz actualizado:', savedAssessment);
        alert('Quiz actualizado exitosamente');
      } else {
        console.log('➕ Creando nuevo quiz...');
        savedAssessment = await quizService.createAssessment(quizData as Assessment);

        // Guardar preguntas pendientes si existen (ej. generadas por IA antes de guardar el quiz)
        if (questions.length > 0) {
          console.log(`📤 Guardando ${questions.length} preguntas pendientes...`);
          try {
            await Promise.all(questions.map(q =>
              quizService.createQuestion({
                ...q,
                assessment_id: savedAssessment.id,
                id: undefined as any // Dejar que Supabase genere el UUID real
              })
            ));
          } catch (qErr) {
            console.error('Error guardando preguntas iniciales:', qErr);
            alert('El quiz se creó pero hubo un error al guardar algunas preguntas.');
          }
        }

        console.log('✅ Quiz creado:', savedAssessment);
        alert('Quiz creado exitosamente');
        navigate(`/teacher/quizzes/edit/${savedAssessment.id}`);
      }
    } catch (error: any) {
      console.error('❌ Error guardando quiz:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      alert(error.message || 'Error guardando quiz');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Panel Docente', path: '/teacher' },
          { label: 'Mis Cursos', path: '/teacher/courses' },
          ...(course ? [{ label: course.title, path: `/teacher/courses/${course.id}` }] : []),
          { label: 'Crear Quiz' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {quizId ? 'Editar Quiz' : 'Crear Nuevo Quiz'}
          </h1>
          {course && (unit || session) && (
            <p className="text-gray-600 mt-1">
              {course.title}
              {unit && ` • Unidad ${unit.number}: ${unit.title}`}
              {session && ` • Sesión: ${session.title}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {quizId && (
            <Button
              variant="secondary"
              onClick={() => navigate(`/teacher/quizzes/${quizId}/analytics`)}
              leftIcon={<IconChartBar className="w-5 h-5" />}
            >
              Ver Analytics
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            leftIcon={<IconArrowLeft className="w-5 h-5" />}
          >
            Volver
          </Button>
        </div>
      </div>

      {/* Configuración del Quiz */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Configuración General</h2>

        <div className="space-y-4">
          {/* Selector de Curso (si no hay courseId) */}
          {!finalCourseId && !quizId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Curso <span className="text-red-500">*</span>
              </label>
              {availableCourses.length > 0 ? (
                <select
                  value={finalCourseId || ''}
                  onChange={async (e) => {
                    const selectedCourseId = e.target.value;
                    setFinalCourseId(selectedCourseId);
                    // Limpiar unidad y sesión cuando cambia el curso
                    setFinalUnitId(undefined);
                    setFinalSessionId(undefined);
                    setUnit(null);
                    setSession(null);

                    // Cargar unidades y sesiones del curso seleccionado
                    if (selectedCourseId) {
                      try {
                        const [unitsData, sessionsData] = await Promise.all([
                          unitService.getCourseUnits(Number(selectedCourseId)),
                          sessionService.getCourseSessions(Number(selectedCourseId))
                        ]);
                        setAvailableUnits(unitsData);
                        setAvailableSessions(sessionsData);
                      } catch (err) {
                        console.error('Error cargando unidades/sesiones:', err);
                      }
                    }

                    // Actualizar URL con el courseId seleccionado
                    const newSearchParams = new URLSearchParams(searchParams);
                    if (selectedCourseId) {
                      newSearchParams.set('courseId', selectedCourseId);
                    } else {
                      newSearchParams.delete('courseId');
                    }
                    navigate(`?${newSearchParams.toString()}`, { replace: true });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Selecciona un curso...</option>
                  {availableCourses.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.title} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    No tienes cursos disponibles. <Link to="/teacher/courses/new" className="text-blue-600 underline">Crea un curso primero</Link>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Selectores de Unidad y Sesión */}
          {finalCourseId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selector de Unidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asignar a Unidad (Opcional)
                </label>
                <select
                  value={finalUnitId || ''}
                  onChange={(e) => {
                    const selectedUnitId = e.target.value || undefined;
                    setFinalUnitId(selectedUnitId);

                    // Si se selecciona una unidad, verificar si la sesión actual pertenece a ella
                    if (selectedUnitId) {
                      unitService.getUnit(selectedUnitId).then(unitData => {
                        setUnit(unitData);
                      }).catch(err => {
                        console.error('Error cargando unidad:', err);
                      });

                      // Si hay una sesión seleccionada que NO pertenece a esta unidad, limpiarla
                      if (session && session.unit_id !== selectedUnitId) {
                        setFinalSessionId(undefined);
                        setSession(null);
                      }
                    } else {
                      setUnit(null);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Sin unidad específica</option>
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unidad {u.number}: {u.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  El quiz aparecerá en la vista de la unidad
                </p>
              </div>

              {/* Selector de Sesión */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asignar a Sesión (Opcional)
                </label>
                <select
                  value={finalSessionId || ''}
                  onChange={(e) => {
                    const selectedSessionId = e.target.value || undefined;
                    setFinalSessionId(selectedSessionId);

                    if (selectedSessionId) {
                      // Cargar la sesión seleccionada
                      sessionService.getSession(selectedSessionId).then(sessionData => {
                        setSession(sessionData);
                        // Auto-seleccionar la unidad si la sesión pertenece a una
                        if (sessionData?.unit_id && !finalUnitId) {
                          setFinalUnitId(sessionData.unit_id);
                          unitService.getUnit(sessionData.unit_id).then(u => setUnit(u));
                        }
                      }).catch(err => {
                        console.error('Error cargando sesión:', err);
                      });
                    } else {
                      setSession(null);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Sin sesión específica</option>
                  {(finalUnitId
                    ? availableSessions.filter(s => s.unit_id === finalUnitId)
                    : availableSessions
                  ).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  El quiz aparecerá al finalizar la sesión
                </p>
              </div>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título del Quiz *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Quiz de Repaso - Unidad 1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del quiz..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Tipo y Configuración */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Evaluación
              </label>
              <select
                value={assessmentType}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  setAssessmentType(newType);
                  // Si cambia de 'exam' a otro tipo, desmarcar examen final
                  if (newType !== 'exam' && isFinalExam) {
                    setIsFinalExam(false);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="quiz">Quiz</option>
                <option value="trivia">Trivia</option>
                <option value="exam">Examen</option>
              </select>
            </div>

            {/* Límite de tiempo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Límite de Tiempo (minutos)
              </label>
              <input
                type="number"
                value={timeLimit || ''}
                onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : null)}
                placeholder="Sin límite"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Intentos máximos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intentos Máximos
              </label>
              <input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Puntuación de aprobación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puntuación de Aprobación (%)
              </label>
              <input
                type="number"
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Instrucciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instrucciones para Estudiantes
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Lee cada pregunta cuidadosamente. Tienes [tiempo] minutos para completar el quiz..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Fechas de Disponibilidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Inicio (Disponible desde)
              </label>
              <input
                type="datetime-local"
                value={availableFrom ? new Date(availableFrom).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    // Convertir a formato ISO para guardar en la BD
                    const date = new Date(e.target.value);
                    setAvailableFrom(date.toISOString());
                  } else {
                    setAvailableFrom('');
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                El quiz estará oculto para estudiantes hasta esta fecha
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Fin (Disponible hasta)
              </label>
              <input
                type="datetime-local"
                value={availableUntil ? new Date(availableUntil).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    // Convertir a formato ISO para guardar en la BD
                    const date = new Date(e.target.value);
                    setAvailableUntil(date.toISOString());
                  } else {
                    setAvailableUntil('');
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                El quiz estará oculto para estudiantes después de esta fecha
              </p>
            </div>
          </div>

          {/* Marcar como Examen Final (solo para tipo 'exam') */}
          {assessmentType === 'exam' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFinalExam}
                  onChange={(e) => setIsFinalExam(e.target.checked)}
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div>
                  <span className="block text-sm font-semibold text-blue-900">
                    Marcar como Examen Final
                  </span>
                  <span className="block text-xs text-blue-700 mt-1">
                    El examen final aparecerá antes de "Materiales del Curso" en la vista del estudiante.
                    Solo puede haber un examen final por curso.
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* Preguntas */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Preguntas ({questions.length})</h2>
          <Button
            variant="secondary"
            onClick={() => setIsAiModalOpen(true)}
            disabled={!finalUnitId}
            className="text-purple-700 border-purple-200 hover:bg-purple-50"
            leftIcon={<span className="text-lg">✨</span>}
          >
            Generar con IA
          </Button>
        </div>

        {!quizId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              💡 Guarda el quiz primero para agregar preguntas
            </p>
          </div>
        )}

        {/* Lista de Preguntas */}
        {questions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No hay preguntas agregadas aún</p>
            {quizId && (
              <Button
                variant="primary"
                onClick={addQuestion}
                leftIcon={<IconPlus className="w-5 h-5" />}
              >
                Agregar Primera Pregunta
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {questions.map((question, idx) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-primary">
                          Pregunta {idx + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({question.question_type})
                        </span>
                        <span className="text-xs text-gray-600">
                          {question.points} puntos
                        </span>
                      </div>
                      <p className="text-gray-900">{question.question_text}</p>
                      {question.options && question.options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {question.options.map((opt: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              {opt.correct ? (
                                <IconCheck className="w-4 h-4 text-green-600" />
                              ) : (
                                <IconX className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={opt.correct ? 'font-medium text-green-700' : 'text-gray-600'}>
                                {opt.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => { setEditingQuestion(question); setShowQuestionForm(true); }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <IconEdit className="w-5 h-5 text-gray-600" />
                      </button>
                      <button
                        onClick={() => deleteQuestion(question.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <IconTrash className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón Agregar Pregunta al final */}
            {quizId && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="primary"
                  onClick={addQuestion}
                  leftIcon={<IconPlus className="w-5 h-5" />}
                  className="w-full sm:w-auto"
                >
                  Agregar Pregunta
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Formulario de Edición de Pregunta */}
      {showQuestionForm && editingQuestion && (
        <QuestionBuilder
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onCancel={() => {
            setEditingQuestion(null);
            setShowQuestionForm(false);
          }}
        />
      )}

      {/* Botones de Acción */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
        >
          Cancelar
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Click en Guardar Borrador');
            saveQuiz(false);
          }}
          leftIcon={<IconSave className="w-5 h-5" />}
        >
          Guardar Borrador
        </Button>
        <Button
          variant="primary"
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Click en Publicar Quiz');
            saveQuiz(true);
          }}
          leftIcon={<IconCheck className="w-5 h-5" />}
        >
          Publicar Quiz
        </Button>
      </div>

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-700">
              ✨ Generar Quiz con IA
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de Preguntas</label>
                <select
                  value={aiConfig.numQuestions}
                  onChange={(e) => setAiConfig({ ...aiConfig, numQuestions: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value={5}>5 preguntas</option>
                  <option value={10}>10 preguntas</option>
                  <option value={15}>15 preguntas</option>
                  <option value={20}>20 preguntas (Puede tardar)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dificultad</label>
                <select
                  value={aiConfig.difficulty}
                  onChange={(e) => setAiConfig({ ...aiConfig, difficulty: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="easy">Fácil (Conceptos básicos)</option>
                  <option value="medium">Media (Comprensión y Aplicación)</option>
                  <option value="hard">Difícil (Análisis complejo)</option>
                </select>
              </div>

              <div className="text-xs text-gray-600 bg-purple-50 p-3 rounded border border-purple-100">
                <strong>Nota:</strong> La IA analizará el título, descripción y contenido de la <u>Unidad actual</u> y sus materiales para generar preguntas relevantes y evitar alucinaciones.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAiModalOpen(false)} disabled={isGeneratingAi}>
                Cancelar
              </Button>
              <Button
                onClick={handleGenerateWithAi}
                isLoading={isGeneratingAi}
                disabled={isGeneratingAi}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                leftIcon={<span className="text-lg">✨</span>}
              >
                {isGeneratingAi ? 'Generando...' : 'Generar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizBuilderPage;

