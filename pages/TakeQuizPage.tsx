// pages/TakeQuizPage.tsx
// Página para que estudiantes tomen quizzes

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { quizService, Assessment, Question, QuestionResponse } from '../services/quizService';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import Card from '../components/Card';
import Breadcrumbs from '../components/Breadcrumbs';
import { IconCheck, IconX, IconClock, IconBookOpen, IconArrowLeft, IconCheckCircle, IconAlertTriangle } from '../components/Icons';

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

  useEffect(() => {
    if (quizId && user?.id) {
      loadQuiz();
    }
  }, [quizId, user?.id]);

  useEffect(() => {
    // Timer para límite de tiempo
    if (timeRemaining !== null && timeRemaining > 0 && attempt) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev !== null && prev > 0) {
            return prev - 1;
          }
          if (prev === 0 && attempt.status === 'in_progress') {
            handleAutoSubmit();
            return 0;
          }
          return prev;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, attempt]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      
      if (!user?.id || !quizId) return;

      // Cargar assessment y preguntas
      const { assessment: loadedAssessment, questions: loadedQuestions } = 
        await quizService.getAssessmentWithQuestions(quizId);
      
      setAssessment(loadedAssessment);
      setQuestions(loadedQuestions);

      // Verificar intentos existentes
      const existingAttempts = await quizService.getExistingAttempts(user.id, quizId);
      
      // Verificar límite de intentos
      if (loadedAssessment.max_attempts && existingAttempts.length >= loadedAssessment.max_attempts) {
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
          const { responses: existingResponses } = await quizService.getAttemptResults(activeAttempt.id);
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
          if (err.code === '23505' || err.message?.includes('409') || err.message?.includes('duplicate')) {
            console.log('Intento duplicado detectado, recuperando intento activo...');
            activeAttempt = await quizService.getActiveAttempt(user.id, quizId);
            if (activeAttempt) {
              setAttempt(activeAttempt);
              try {
                const { responses: existingResponses } = await quizService.getAttemptResults(activeAttempt.id);
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
      alert(error.message || 'Error cargando el quiz');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: any) => {
    console.log('📝 handleAnswer llamado', { questionId, answer });
    setResponses(prev => {
      const newResponses = {
        ...prev,
        [questionId]: answer
      };
      console.log('✅ Respuesta guardada:', newResponses);
      return newResponses;
    });
  };

  const handleAutoSubmit = async () => {
    if (!attempt || submitting) return;
    
    setSubmitting(true);
    await submitQuiz(true);
  };

  const submitQuiz = async (isAutoSubmit: boolean = false) => {
    if (!attempt || !user?.id) {
      console.error('❌ No se puede enviar: attempt o user no disponible', { attempt: !!attempt, user: !!user });
      return;
    }

    try {
      console.log('📤 Iniciando envío del quiz...', { 
        attemptId: attempt.id, 
        responsesCount: Object.keys(responses).length,
        questionsCount: questions.length 
      });
      
      setSubmitting(true);

      // Verificar que haya respuestas
      if (Object.keys(responses).length === 0) {
        alert('Por favor responde al menos una pregunta antes de enviar.');
        setSubmitting(false);
        return;
      }

      // Enviar todas las respuestas
      console.log('📝 Enviando respuestas...');
      for (const questionId in responses) {
        const answer = responses[questionId];
        const question = questions.find(q => q.id === questionId);
        
        if (!question) {
          console.warn('⚠️ Pregunta no encontrada:', questionId);
          continue;
        }

        // Determinar si es correcta (solo para opción múltiple y true/false)
        let isCorrect: boolean | undefined;
        let pointsEarned = 0;

        if (question.question_type === 'multiple_choice' && question.options) {
          // Para multiple_choice, comparar directamente con correct_answer
          // correct_answer puede ser un string JSON como "B" o el ID de la opción
          let correctAnswerValue = question.correct_answer;
          
          // Si correct_answer es un string JSON, extraer el valor
          if (typeof correctAnswerValue === 'string') {
            // Si es un string JSON con comillas, extraer el valor
            if (correctAnswerValue.startsWith('"') && correctAnswerValue.endsWith('"')) {
              correctAnswerValue = correctAnswerValue.slice(1, -1);
            }
            // Si es un string JSON escapado, intentar parsearlo
            try {
              const parsed = JSON.parse(correctAnswerValue);
              if (typeof parsed === 'string') {
                correctAnswerValue = parsed;
              }
            } catch (e) {
              // Si falla el parse, usar el valor original
            }
          } else if (typeof correctAnswerValue === 'object' && correctAnswerValue !== null) {
            // Si es un objeto, convertir a string
            correctAnswerValue = String(correctAnswerValue);
          }
          
          // Normalizar la respuesta del estudiante
          const normalizedAnswer = String(answer).trim().toUpperCase();
          const normalizedCorrect = String(correctAnswerValue).trim().toUpperCase();
          
          // Comparar directamente
          isCorrect = normalizedAnswer === normalizedCorrect;
          console.log(`  🔍 Comparación multiple_choice:`, {
            answer: normalizedAnswer,
            correct: normalizedCorrect,
            isCorrect,
            originalAnswer: answer,
            originalCorrect: question.correct_answer
          });
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.question_type === 'true_false') {
          // Normalizar comparación de true/false
          let correctAnswerValue = question.correct_answer;
          
          // Si correct_answer es un string JSON, extraer el valor
          if (typeof correctAnswerValue === 'string') {
            if (correctAnswerValue.startsWith('"') && correctAnswerValue.endsWith('"')) {
              correctAnswerValue = correctAnswerValue.slice(1, -1);
            }
            try {
              const parsed = JSON.parse(correctAnswerValue);
              if (typeof parsed === 'string' || typeof parsed === 'boolean') {
                correctAnswerValue = parsed;
              }
            } catch (e) {
              // Si falla el parse, usar el valor original
            }
          }
          
          const normalizedAnswer = String(answer).toLowerCase().trim();
          const normalizedCorrect = String(correctAnswerValue).toLowerCase().trim();
          isCorrect = normalizedAnswer === normalizedCorrect;
          console.log(`  🔍 Comparación true_false:`, {
            answer: normalizedAnswer,
            correct: normalizedCorrect,
            isCorrect
          });
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.question_type === 'short_answer' || question.question_type === 'essay') {
          // Para preguntas abiertas, comparar con las respuestas aceptables en correct_answer
          // correct_answer puede ser un array de strings con posibles respuestas
          let acceptableAnswers: string[] = [];
          
          if (question.correct_answer) {
            try {
              // Intentar parsear como JSON si es string
              let correctAnswerParsed = question.correct_answer;
              if (typeof correctAnswerParsed === 'string') {
                correctAnswerParsed = JSON.parse(correctAnswerParsed);
              }
              
              // Si es un array, usar directamente
              if (Array.isArray(correctAnswerParsed)) {
                acceptableAnswers = correctAnswerParsed.map(a => String(a).toLowerCase().trim());
              } else if (typeof correctAnswerParsed === 'string') {
                // Si es un string único, agregarlo al array
                acceptableAnswers = [correctAnswerParsed.toLowerCase().trim()];
              }
            } catch (e) {
              // Si falla el parse, usar el valor como string
              acceptableAnswers = [String(question.correct_answer).toLowerCase().trim()];
            }
          }
          
          // Normalizar la respuesta del estudiante
          const normalizedAnswer = String(answer).toLowerCase().trim();
          
          // Comparar con las respuestas aceptables (comparación flexible)
          isCorrect = acceptableAnswers.some(acceptable => {
            // Comparación exacta
            if (normalizedAnswer === acceptable) return true;
            
            // Comparación por palabras clave (al menos 70% de palabras coinciden)
            const answerWords = normalizedAnswer.split(/\s+/).filter(w => w.length > 2);
            const acceptableWords = acceptable.split(/\s+/).filter(w => w.length > 2);
            
            if (answerWords.length > 0 && acceptableWords.length > 0) {
              const matchingWords = answerWords.filter(w => 
                acceptableWords.some(aw => aw.includes(w) || w.includes(aw))
              );
              const similarity = matchingWords.length / Math.max(answerWords.length, acceptableWords.length);
              return similarity >= 0.7;
            }
            
            return false;
          });
          
          console.log(`  🔍 Comparación short_answer:`, {
            answer: normalizedAnswer,
            acceptableAnswers,
            isCorrect
          });
          
          // Para preguntas abiertas, el docente debe calificar manualmente
          // Inicialmente damos 0 puntos hasta que el docente califique
          // Si la respuesta coincide con alguna aceptable, marcamos is_correct como true
          // pero points_earned será 0 hasta que el docente lo califique
          pointsEarned = 0; // Siempre 0 inicialmente para preguntas abiertas
        }

        console.log(`  ✓ Enviando respuesta para pregunta ${questionId}:`, { 
          answer, 
          isCorrect, 
          pointsEarned 
        });

        try {
          const submittedResponse = await quizService.submitResponse({
            attempt_id: attempt.id,
            question_id: questionId,
            student_id: user.id,
            response_data: answer,
            is_correct: isCorrect,
            points_earned: pointsEarned
          });
          console.log(`  ✅ Respuesta enviada exitosamente para pregunta ${questionId}:`, submittedResponse.id);
        } catch (responseError: any) {
          console.error(`  ❌ Error enviando respuesta para pregunta ${questionId}:`, responseError);
          console.error('  Error details:', {
            message: responseError.message,
            code: responseError.code,
            details: responseError.details,
            hint: responseError.hint
          });
          // Continuar con las demás respuestas aunque una falle
        }
      }

      console.log('✅ Todas las respuestas enviadas');

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
        hint: error.hint
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

  if (!assessment || questions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Quiz no encontrado</p>
          <Button onClick={() => navigate(-1)}>Volver</Button>
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
          { label: assessment.title }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{assessment.title}</h1>
          {assessment.description && (
            <p className="text-gray-600 mt-1">{assessment.description}</p>
          )}
        </div>
        {timeRemaining !== null && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg ${
            timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
          }`}>
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
            </div>
            {currentQuestion.is_required && (
              <span className="text-xs text-red-600 font-medium">* Requerida</span>
            )}
          </div>

          <div className="space-y-4">
            {/* Texto de la pregunta */}
            <h3 className="text-xl font-semibold text-gray-900">
              {currentQuestion.question_text}
            </h3>

            {/* Opciones según tipo */}
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (() => {
              // Convertir options a array si es un objeto JSON
              let optionsArray: Array<{id: string, text: string}> = [];
              
              if (Array.isArray(currentQuestion.options)) {
                // Si ya es un array, usarlo directamente
                optionsArray = currentQuestion.options;
              } else if (typeof currentQuestion.options === 'object' && currentQuestion.options !== null) {
                // Si es un objeto JSON como {"A": "texto", "B": "texto"}, convertirlo a array
                optionsArray = Object.entries(currentQuestion.options).map(([key, value]) => ({
                  id: key,
                  text: String(value)
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
                          borderColor: isSelected ? '#3b82f6' : undefined
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                            }`}
                            style={{
                              borderColor: isSelected ? '#3b82f6' : undefined,
                              backgroundColor: isSelected ? '#3b82f6' : undefined
                            }}
                          >
                            {isSelected && <IconCheck className="w-4 h-4 text-white" />}
                          </div>
                          <span className="font-medium text-gray-700 mr-2">{option.id}:</span>
                          <span className="text-gray-900">{option.text}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {currentQuestion.question_type === 'true_false' && (() => {
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
                        borderColor: isSelected ? '#3b82f6' : undefined
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
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
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
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          ← Anterior
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
            >
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
    </div>
  );
};

export default TakeQuizPage;

