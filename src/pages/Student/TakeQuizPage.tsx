// pages/TakeQuizPage.tsx
// Página para que estudiantes tomen quizzes

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { quizService, Assessment, Question, QuestionResponse } from '@/services/quizService';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Common/Button';
import Card from '@/components/Common/Card';
import Breadcrumbs from '@/components/Common/Breadcrumbs';
import {
  IconCheck,
  IconX,
  IconClock,
  IconBookOpen,
  IconArrowLeft,
  IconCheckCircle,
  IconAlertTriangle,
} from '@/components/Common/Icons';

export const TakeQuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);

  useEffect(() => {
    if (quizId && user?.id) {
      loadQuiz();
    }
  }, [quizId, user?.id]);

  useEffect(() => {
    // Timer para límite de tiempo
    if (
      timeRemaining !== null &&
      timeRemaining > 0 &&
      attempt &&
      attempt.status === 'in_progress'
    ) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev !== null && prev > 0) {
            // Activar advertencia a los 10 segundos
            if (prev === 11) {
              // Será 10 en el siguiente render
              setShowTimeWarning(true);
            }
            return prev - 1;
          }
          return 0;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, attempt]);

  // Efecto separado para manejar el auto-submit cuando el tiempo llega a 0
  useEffect(() => {
    if (timeRemaining === 0 && attempt?.status === 'in_progress' && !submitting) {
      console.log('⏰ Tiempo agotado, enviando automáticamente...');
      setShowTimeWarning(false);
      setShowTimeUpModal(true);
      // Pequeño delay para que el usuario vea el modal antes de que se procese todo
      setTimeout(() => {
        handleAutoSubmit();
      }, 1500);
    }
  }, [timeRemaining, attempt, submitting]);

  const [searchParams] = useSearchParams();
  const isPracticeMode = searchParams.get('mode') === 'practice';

  const loadQuiz = async () => {
    try {
      setLoading(true);

      if (!user?.id || !quizId) return;

      // Cargar assessment y preguntas
      const { assessment: loadedAssessment, questions: loadedQuestions } =
        await quizService.getAssessmentWithQuestions(quizId);

      setAssessment(loadedAssessment);
      setQuestions(loadedQuestions);

      // MODO PRÁCTICA: No verificar intentos ni crear uno real
      if (isPracticeMode) {
        console.log('🎯 Modo Práctica activado');
        setAttempt({
          id: 'practice-attempt',
          status: 'in_progress',
          student_id: user.id,
          assessment_id: quizId,
          current_question_index: 0,
          started_at: new Date().toISOString(),
        });

        // Inicializar timer
        if (loadedAssessment.time_limit) {
          setTimeRemaining(loadedAssessment.time_limit * 60);
        }
        setLoading(false);
        return;
      }

      // Verificar intentos existentes
      const existingAttempts = await quizService.getExistingAttempts(user.id, quizId);

      // Verificar límite de intentos
      if (
        loadedAssessment.max_attempts &&
        existingAttempts.length >= loadedAssessment.max_attempts
      ) {
        alert('Has alcanzado el límite de intentos para este quiz');
        navigate(-1);
        return;
      }

      // Iniciar o recuperar intento activo
      let activeAttempt = await quizService.getActiveAttempt(user.id, quizId);

      if (activeAttempt) {
        setAttempt(activeAttempt);
        // Cargar respuestas existentes
        try {
          const { responses: existingResponses } = await quizService.getAttemptResults(
            activeAttempt.id
          );
          const responsesMap: Record<string, any> = {};
          existingResponses.forEach((r: any) => {
            responsesMap[r.question_id] = r.response_data;
          });
          setResponses(responsesMap);
        } catch (err) {
          console.warn('Error cargando respuestas existentes:', err);
          // Continuar sin las respuestas existentes
        }
      } else {
        // Crear nuevo intento
        try {
          const attemptNumber = existingAttempts.length + 1;
          const newAttempt = await quizService.startAttempt(user.id, quizId, attemptNumber);
          setAttempt(newAttempt);
        } catch (err: any) {
          // Si hay error 409 (conflicto), intentar recuperar el intento activo nuevamente
          if (
            err.code === '23505' ||
            err.message?.includes('409') ||
            err.message?.includes('duplicate')
          ) {
            console.log('Intento duplicado detectado, recuperando intento activo...');
            activeAttempt = await quizService.getActiveAttempt(user.id, quizId);
            if (activeAttempt) {
              setAttempt(activeAttempt);
              try {
                const { responses: existingResponses } = await quizService.getAttemptResults(
                  activeAttempt.id
                );
                const responsesMap: Record<string, any> = {};
                existingResponses.forEach((r: any) => {
                  responsesMap[r.question_id] = r.response_data;
                });
                setResponses(responsesMap);
              } catch (loadErr) {
                console.warn('Error cargando respuestas:', loadErr);
              }
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }

      // Inicializar timer
      if (loadedAssessment.time_limit) {
        // TODO: Calcular tiempo restante basado en started_at y time_limit
        setTimeRemaining(loadedAssessment.time_limit * 60);
      }
    } catch (error: any) {
      console.error('Error loading quiz:', error);
      setError(error.message || 'Error cargando el quiz');
    } finally {
      setLoading(false);
    }
  };

  const calculateGrade = (
    question: Question,
    answer: any
  ): { isCorrect: boolean | undefined; pointsEarned: number } => {
    let isCorrect: boolean | undefined;
    let pointsEarned = 0;

    if (question.question_type === 'multiple_choice' && question.options) {
      let correctAnswerValue = question.correct_answer;

      if (typeof correctAnswerValue === 'string') {
        if (correctAnswerValue.startsWith('"') && correctAnswerValue.endsWith('"')) {
          correctAnswerValue = correctAnswerValue.slice(1, -1);
        }
        try {
          const parsed = JSON.parse(correctAnswerValue);
          if (typeof parsed === 'string') {
            correctAnswerValue = parsed;
          }
        } catch (e) {}
      } else if (typeof correctAnswerValue === 'object' && correctAnswerValue !== null) {
        correctAnswerValue = String(correctAnswerValue);
      }

      const normalizedAnswer = String(answer).trim().toUpperCase();
      const normalizedCorrect = String(correctAnswerValue).trim().toUpperCase();

      isCorrect = normalizedAnswer === normalizedCorrect;
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.question_type === 'true_false') {
      let correctAnswerValue = question.correct_answer;

      if (typeof correctAnswerValue === 'string') {
        if (correctAnswerValue.startsWith('"') && correctAnswerValue.endsWith('"')) {
          correctAnswerValue = correctAnswerValue.slice(1, -1);
        }
        try {
          const parsed = JSON.parse(correctAnswerValue);
          if (typeof parsed === 'string' || typeof parsed === 'boolean') {
            correctAnswerValue = parsed;
          }
        } catch (e) {}
      }

      const normalizedAnswer = String(answer).toLowerCase().trim();
      const normalizedCorrect = String(correctAnswerValue).toLowerCase().trim();
      isCorrect = normalizedAnswer === normalizedCorrect;
      pointsEarned = isCorrect ? question.points : 0;
    } else if (question.question_type === 'short_answer' || question.question_type === 'essay') {
      let acceptableAnswers: string[] = [];

      if (question.correct_answer) {
        try {
          let correctAnswerParsed = question.correct_answer;
          if (typeof correctAnswerParsed === 'string') {
            correctAnswerParsed = JSON.parse(correctAnswerParsed);
          }

          if (Array.isArray(correctAnswerParsed)) {
            acceptableAnswers = correctAnswerParsed.map((a) => String(a).toLowerCase().trim());
          } else if (typeof correctAnswerParsed === 'string') {
            acceptableAnswers = [correctAnswerParsed.toLowerCase().trim()];
          }
        } catch (e) {
          acceptableAnswers = [String(question.correct_answer).toLowerCase().trim()];
        }
      }

      const normalizedAnswer = String(answer).toLowerCase().trim();

      isCorrect = acceptableAnswers.some((acceptable) => {
        if (normalizedAnswer === acceptable) return true;

        const answerWords = normalizedAnswer.split(/\s+/).filter((w) => w.length > 2);
        const acceptableWords = acceptable.split(/\s+/).filter((w) => w.length > 2);

        if (answerWords.length > 0 && acceptableWords.length > 0) {
          const matchingWords = answerWords.filter((w) =>
            acceptableWords.some((aw) => aw.includes(w) || w.includes(aw))
          );
          const similarity =
            matchingWords.length / Math.max(answerWords.length, acceptableWords.length);
          return similarity >= 0.7;
        }

        return false;
      });

      pointsEarned = 0; // Siempre 0 inicialmente para preguntas abiertas
    }

    return { isCorrect, pointsEarned };
  };

  const saveAnswer = async (questionId: string, answer: any) => {
    // Modo práctica: no guardar en base de datos
    if (isPracticeMode) return;

    if (!attempt || !user?.id) return;

    setSaving((prev) => ({ ...prev, [questionId]: true }));

    try {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return;

      const { isCorrect, pointsEarned } = calculateGrade(question, answer);

      await quizService.submitResponse({
        attempt_id: attempt.id,
        question_id: questionId,
        student_id: user.id,
        response_data: answer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      });

      console.log(`✅ Respuesta guardada para ${questionId}`);
    } catch (err) {
      console.error(`❌ Error guardando respuesta para ${questionId}:`, err);
      // Opcional: mostrar error al usuario
    } finally {
      setSaving((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleAnswer = (questionId: string, answer: any, autoSave: boolean = true) => {
    console.log('📝 handleAnswer llamado', { questionId, answer, autoSave });
    setResponses((prev) => {
      const newResponses = {
        ...prev,
        [questionId]: answer,
      };
      return newResponses;
    });

    if (autoSave) {
      saveAnswer(questionId, answer);
    }
  };

  const handleAutoSubmit = async () => {
    if (!attempt || submitting) return;

    setSubmitting(true);
    await submitQuiz(true);
  };

  const submitQuiz = async (isAutoSubmit: boolean = false) => {
    // Lógica para modo práctica
    if (isPracticeMode) {
      // Calcular nota simulada
      let totalPoints = 0;
      let earnedPoints = 0;

      questions.forEach((q) => {
        totalPoints += q.points;
        const ans = responses[q.id];
        if (ans) {
          const { pointsEarned } = calculateGrade(q, ans);
          earnedPoints += pointsEarned;
        }
      });

      const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      alert(
        `🎯 Práctica terminada.\nTu puntuación: ${earnedPoints} de ${totalPoints} puntos (${Math.round(score)}%)\n\n¡Sigue practicando para dominar el tema!`
      );
      navigate(-1);
      return;
    }

    if (!attempt || !user?.id) {
      console.error('❌ No se puede enviar: attempt o user no disponible', {
        attempt: !!attempt,
        user: !!user,
      });
      return;
    }

    try {
      console.log('📤 Iniciando envío del quiz...', {
        attemptId: attempt.id,
        responsesCount: Object.keys(responses).length,
        questionsCount: questions.length,
      });

      setSubmitting(true);

      // Verificar que haya respuestas
      if (Object.keys(responses).length === 0) {
        alert('Por favor responde al menos una pregunta antes de enviar.');
        setSubmitting(false);
        return;
      }

      // Asegurar que todas las respuestas estén guardadas antes de enviar
      // (Aunque ya deberían estarlo por el auto-save, esto es un respaldo)
      console.log('📝 Verificando respuestas guardadas...');
      for (const questionId in responses) {
        const answer = responses[questionId];
        await saveAnswer(questionId, answer);
      }

      console.log('✅ Todas las respuestas verificadas');

      // Calcular tiempo invertido
      const timeSpentMinutes = assessment?.time_limit
        ? assessment.time_limit - Math.floor((timeRemaining || 0) / 60)
        : undefined;

      console.log('📊 Finalizando intento...', { timeSpentMinutes });
      // Enviar intento
      const submittedAttempt = await quizService.submitAttempt(attempt.id, timeSpentMinutes);

      console.log('✅ Quiz enviado exitosamente:', submittedAttempt.id);

      // Navegar a la página de resultados
      navigate(`/quiz/${quizId}/results/${submittedAttempt.id}`);
    } catch (error: any) {
      console.error('❌ Error submitting quiz:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      alert(error.message || 'Error enviando el quiz. Por favor intenta de nuevo.');
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200 max-w-md">
          <IconAlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-700 mb-2">Error al cargar el Quiz</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <Button onClick={() => navigate(-1)} variant="secondary">
            Volver
          </Button>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Quiz no encontrado</p>
          <Button onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center p-6 bg-yellow-50 rounded-xl border border-yellow-200">
          <IconAlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-yellow-700 mb-2">Quiz sin preguntas</h3>
          <p className="text-yellow-600 mb-6">Este quiz aún no tiene preguntas configuradas.</p>
          <Button onClick={() => navigate(-1)} variant="secondary">
            Volver
          </Button>
        </div>
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
          { label: assessment.title },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{assessment.title}</h1>
          {assessment.description && <p className="text-gray-600 mt-1">{assessment.description}</p>}
        </div>
        {timeRemaining !== null && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg ${
              timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            <IconClock className="w-6 h-6" />
            <span>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Instrucciones */}
      {assessment.instructions && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <IconBookOpen className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Instrucciones</h3>
              <p className="text-blue-800 whitespace-pre-wrap">{assessment.instructions}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Pregunta Actual */}
      {currentQuestion && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-primary text-white rounded-full font-semibold">
                Pregunta {currentQuestionIndex + 1} de {questions.length}
              </span>
              <span className="text-sm text-gray-600">
                {currentQuestion.points} punto{currentQuestion.points > 1 ? 's' : ''}
              </span>
              {saving[currentQuestion.id] && (
                <span className="text-xs text-blue-600 flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  Guardando...
                </span>
              )}
            </div>
            {currentQuestion.is_required && (
              <span className="text-xs text-red-600 font-medium">* Requerida</span>
            )}
          </div>

          <div className="space-y-4">
            {/* Texto de la pregunta */}
            <h3 className="text-xl font-semibold text-gray-900">{currentQuestion.question_text}</h3>

            {/* Opciones según tipo */}
            {currentQuestion.question_type === 'multiple_choice' &&
              currentQuestion.options &&
              (() => {
                // Convertir options a array si es un objeto JSON
                let optionsArray: Array<{ id: string; text: string }> = [];

                if (Array.isArray(currentQuestion.options)) {
                  // Si ya es un array, usarlo directamente
                  optionsArray = currentQuestion.options;
                } else if (
                  typeof currentQuestion.options === 'object' &&
                  currentQuestion.options !== null
                ) {
                  // Si es un objeto JSON como {"A": "texto", "B": "texto"}, convertirlo a array
                  optionsArray = Object.entries(currentQuestion.options).map(([key, value]) => ({
                    id: key,
                    text: String(value),
                  }));
                }

                if (optionsArray.length === 0) return null;

                const savedAnswer = responses[currentQuestion.id];

                return (
                  <div className="space-y-2">
                    {optionsArray.map((option) => {
                      const isSelected = savedAnswer === option.id || savedAnswer === option.text;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🖱️ Click en opción:', option.id);
                            handleAnswer(currentQuestion.id, option.id);
                          }}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                          }`}
                          style={{
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : undefined,
                            borderColor: isSelected ? '#3b82f6' : undefined,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                              }`}
                              style={{
                                borderColor: isSelected ? '#3b82f6' : undefined,
                                backgroundColor: isSelected ? '#3b82f6' : undefined,
                              }}
                            >
                              {isSelected && <IconCheck className="w-4 h-4 text-white" />}
                            </div>
                            <span className="text-gray-900">{option.text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

            {currentQuestion.question_type === 'true_false' &&
              (() => {
                const savedAnswer = responses[currentQuestion.id];

                return (
                  <div className="grid grid-cols-2 gap-4">
                    {['Verdadero', 'Falso'].map((label, idx) => {
                      const value = idx === 0 ? 'true' : 'false';
                      const isSelected = String(savedAnswer) === String(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🖱️ Click en true/false:', value);
                            handleAnswer(currentQuestion.id, value);
                          }}
                          className={`p-6 rounded-lg border-2 transition-all text-center cursor-pointer ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                          }`}
                          style={{
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : undefined,
                            borderColor: isSelected ? '#3b82f6' : undefined,
                          }}
                        >
                          <span className="font-semibold text-gray-900">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

            {(currentQuestion.question_type === 'short_answer' ||
              currentQuestion.question_type === 'essay') && (
              <textarea
                value={responses[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value, false)}
                onBlur={(e) => saveAnswer(currentQuestion.id, e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                rows={currentQuestion.question_type === 'essay' ? 8 : 4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            )}
          </div>
        </Card>
      )}

      {/* Navegación y Envío */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          ← Anterior
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex < questions.length - 1 ? (
            <Button variant="primary" onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}>
              Siguiente →
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => submitQuiz(false)}
              disabled={submitting}
              leftIcon={<IconCheckCircle className="w-5 h-5" />}
            >
              {submitting ? 'Enviando...' : 'Enviar Quiz'}
            </Button>
          )}
        </div>
      </div>

      {/* Indicador de progreso */}
      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Alerta de tiempo restante */}
      {showTimeWarning && timeRemaining !== null && timeRemaining > 0 && (
        <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg animate-bounce z-50">
          <div className="flex items-center gap-2">
            <IconClock className="w-6 h-6" />
            <div>
              <p className="font-bold">¡Quedan 10 segundos!</p>
              <p className="text-sm">El quiz se enviará automáticamente.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Tiempo Agotado */}
      {showTimeUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconClock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Tiempo Agotado!</h2>
            <p className="text-gray-600 mb-6">
              El tiempo para realizar este quiz ha finalizado. Estamos enviando tus respuestas
              guardadas hasta el momento.
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante Tutor (solo en práctica) */}
      {isPracticeMode && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => {
              const q = questions[currentQuestionIndex];
              // Aquí iría la llamada real al agente
              alert(
                `🤖 EduSpark Coach:\n\nPara responder sobre "${q.question_text.substring(0, 40)}...", intenta recordar los conceptos clave de la unidad. ¡Tú puedes hacerlo!`
              );
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 hover:shadow-xl border-2 border-indigo-400"
          >
            <span className="material-symbols-outlined text-xl">psychology</span>
            <span>Pedir Pista al Coach</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TakeQuizPage;
