// pages/QuizResultsPage.tsx
// Página para mostrar los resultados de un quiz/trivia completado

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { quizService, Assessment, Question, QuestionResponse, AssessmentAttempt } from '../services/quizService';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Breadcrumbs from '../components/Breadcrumbs';
import { IconCheck, IconX, IconClock, IconBookOpen, IconArrowLeft, IconTrophy, IconAlertTriangle, IconInfoCircle } from '../components/Icons';
import Button from '../components/Button';

interface QuestionResult {
  question: Question;
  response?: QuestionResponse;
  isCorrect: boolean;
  pointsEarned: number;
  pointsTotal: number;
}

export const QuizResultsPage: React.FC = () => {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quizId && attemptId && user?.id) {
      loadResults();
    }
  }, [quizId, attemptId, user?.id]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar assessment y preguntas
      const { assessment: assessmentData, questions } = await quizService.getAssessmentWithQuestions(quizId!);
      setAssessment(assessmentData);

      // Cargar resultados del intento
      const resultsData = await quizService.getAttemptResults(attemptId!);
      setAttempt(resultsData.attempt);

      // Combinar preguntas con respuestas
      const questionResults: QuestionResult[] = questions.map((question) => {
        const response = resultsData.responses.find((r: QuestionResponse) => r.question_id === question.id);
        const isCorrect = response?.is_correct ?? false;
        const pointsEarned = response?.points_earned ?? 0;
        const pointsTotal = question.points;

        return {
          question,
          response,
          isCorrect,
          pointsEarned,
          pointsTotal
        };
      });

      // Ordenar por order_index
      questionResults.sort((a, b) => a.question.order_index - b.question.order_index);
      setResults(questionResults);

    } catch (err: any) {
      console.error('Error loading quiz results:', err);
      setError(err.message || 'Error cargando los resultados del quiz');
    } finally {
      setLoading(false);
    }
  };

  const getScorePercentage = () => {
    if (!attempt || !assessment || results.length === 0) return 0;
    
    // Calcular puntos totales basado en las preguntas reales
    const totalPointsFromQuestions = results.reduce((sum, r) => sum + r.pointsTotal, 0);
    
    // Usar el total calculado de las preguntas (más preciso)
    const totalPoints = totalPointsFromQuestions > 0 ? totalPointsFromQuestions : assessment.total_points;
    
    // Calcular porcentaje basado en puntos reales (siempre recalcular, no usar el guardado)
    const score = attempt.score || 0;
    if (totalPoints > 0 && score >= 0) {
      return (score / totalPoints) * 100;
    }
    
    return 0;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 border-green-300';
    if (percentage >= 60) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !assessment || !attempt) {
    return (
      <div className="flex justify-center items-center h-64">
        <Card>
          <div className="text-center">
            <IconAlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error || 'Resultados no encontrados'}</p>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Volver
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const scorePercentage = getScorePercentage();
  // Calcular puntos totales reales para la comparación
  const totalPointsFromQuestions = results.reduce((sum, r) => sum + r.pointsTotal, 0);
  const totalPoints = totalPointsFromQuestions > 0 ? totalPointsFromQuestions : assessment.total_points;
  const passed = assessment.passing_score ? scorePercentage >= assessment.passing_score : false;
  
  console.log('📊 Cálculo de calificación:', {
    score: attempt.score,
    totalPoints,
    totalPointsFromQuestions,
    scorePercentage,
    passingScore: assessment.passing_score,
    passed
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs 
        items={[
          { 
            label: 'Dashboard', 
            path: user?.role?.name === 'teacher' || user?.role?.name === 'admin' 
              ? '/teacher/dashboard' 
              : '/dashboard' 
          },
          { 
            label: user?.role?.name === 'teacher' || user?.role?.name === 'admin' 
              ? 'Calificaciones' 
              : 'Mis Cursos', 
            path: user?.role?.name === 'teacher' || user?.role?.name === 'admin' 
              ? '/teacher/grades' 
              : '/my/courses' 
          },
          { label: assessment.title }
        ]}
      />

      {/* Header con Resultados */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{assessment.title} - Resultados</h1>
          {assessment.description && (
            <p className="text-gray-600 mt-1">{assessment.description}</p>
          )}
        </div>
        {attempt.submitted_at && (
          <div className="text-sm text-gray-500">
            Enviado: {new Date(attempt.submitted_at).toLocaleString('es-ES')}
          </div>
        )}
      </div>

      {/* Resumen de Calificación */}
      <Card className={`${getScoreBgColor(scorePercentage)} border-2`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <IconTrophy className={`w-8 h-8 ${getScoreColor(scorePercentage)}`} />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Resumen de Calificación</h2>
                <p className="text-sm text-gray-600">Intento #{attempt.attempt_number}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Puntuación</div>
                <div className={`text-3xl font-bold ${getScoreColor(scorePercentage)}`}>
                  {attempt.score || 0} / {(() => {
                    const totalPointsFromQuestions = results.reduce((sum, r) => sum + r.pointsTotal, 0);
                    return totalPointsFromQuestions > 0 ? totalPointsFromQuestions : assessment.total_points;
                  })()}
                </div>
                <div className="text-xs text-gray-500 mt-1">puntos</div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Porcentaje</div>
                <div className={`text-3xl font-bold ${getScoreColor(scorePercentage)}`}>
                  {scorePercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {assessment.passing_score ? `Aprobar: ${assessment.passing_score}%` : ''}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Estado</div>
                <div className={`text-2xl font-bold ${getScoreColor(scorePercentage)}`}>
                  {passed ? '✅ Aprobado' : '❌ No Aprobado'}
                </div>
                {attempt.time_spent_minutes && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <IconClock className="w-3 h-3" />
                    {Math.floor(attempt.time_spent_minutes / 60)}h {attempt.time_spent_minutes % 60}m
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Resumen de Respuestas */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Resumen de Respuestas</h2>
          <div className="text-sm text-gray-600">
            {results.filter(r => r.isCorrect).length} de {results.length} correctas
          </div>
        </div>
        
        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={result.question.id}
              className={`border-2 rounded-lg p-4 ${
                result.isCorrect
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {result.isCorrect ? (
                    <IconCheck className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  ) : (
                    <IconX className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        Pregunta {index + 1}
                      </span>
                      <span className={`text-sm font-medium ${
                        result.isCorrect ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.isCorrect ? '✓ Correcta' : '✗ Incorrecta'}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({result.pointsEarned} / {result.pointsTotal} puntos)
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium mb-3">
                      {result.question.question_text}
                    </p>
                  </div>
                </div>
              </div>

              {/* Respuesta del estudiante */}
              <div className="ml-9 mb-3">
                <div className="text-sm font-semibold text-gray-700 mb-1">Tu respuesta:</div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  {result.question.question_type === 'multiple_choice' && result.response?.response_data && (
                    <div>
                      {(() => {
                        const answer = result.response.response_data;
                        let optionsArray: Array<{id: string, text: string}> = [];
                        
                        if (Array.isArray(result.question.options)) {
                          optionsArray = result.question.options;
                        } else if (typeof result.question.options === 'object' && result.question.options !== null) {
                          optionsArray = Object.entries(result.question.options).map(([key, value]: [string, any]) => ({
                            id: key,
                            text: typeof value === 'string' ? value : (value?.text || value?.label || '')
                          }));
                        }
                        
                        const selectedOption = optionsArray.find(opt => opt.id === answer || opt.text === answer);
                        return selectedOption ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">{selectedOption.id}:</span>
                            <span>{selectedOption.text}</span>
                          </div>
                        ) : (
                          <span>{String(answer)}</span>
                        );
                      })()}
                    </div>
                  )}
                  {result.question.question_type === 'true_false' && result.response?.response_data && (
                    <div>
                      <span className="font-semibold">
                        {String(result.response.response_data).toLowerCase() === 'true' ? 'Verdadero' : 'Falso'}
                      </span>
                    </div>
                  )}
                  {(result.question.question_type === 'short_answer' || result.question.question_type === 'essay') && result.response?.response_data && (
                    <div className="whitespace-pre-wrap">
                      {String(result.response.response_data)}
                    </div>
                  )}
                </div>
              </div>

              {/* Respuesta correcta (si está incorrecta) */}
              {!result.isCorrect && (
                <div className="ml-9 mb-3">
                  <div className="text-sm font-semibold text-green-700 mb-1">Respuesta correcta:</div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    {result.question.question_type === 'multiple_choice' && result.question.options && result.question.correct_answer && (
                      <div>
                        {(() => {
                          // Obtener el ID de la respuesta correcta
                          let correctAnswerId = result.question.correct_answer;
                          
                          // Si correct_answer es un string JSON, extraer el valor
                          if (typeof correctAnswerId === 'string' && correctAnswerId.startsWith('"') && correctAnswerId.endsWith('"')) {
                            correctAnswerId = correctAnswerId.slice(1, -1);
                          } else if (typeof correctAnswerId === 'object' && correctAnswerId !== null) {
                            correctAnswerId = String(correctAnswerId);
                          }
                          
                          // Buscar la opción con ese ID en options
                          if (typeof result.question.options === 'object' && result.question.options !== null) {
                            const optionsObj = result.question.options;
                            const correctOptionText = optionsObj[String(correctAnswerId)];
                            
                            if (correctOptionText) {
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-green-700">{String(correctAnswerId)}:</span>
                                  <span>{typeof correctOptionText === 'string' ? correctOptionText : String(correctOptionText)}</span>
                                </div>
                              );
                            }
                          }
                          
                          return (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-green-700">{String(correctAnswerId)}</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {result.question.question_type === 'true_false' && result.question.correct_answer && (
                      <div>
                        {(() => {
                          let correctAnswer = result.question.correct_answer;
                          if (typeof correctAnswer === 'string' && correctAnswer.startsWith('"') && correctAnswer.endsWith('"')) {
                            correctAnswer = correctAnswer.slice(1, -1);
                          }
                          try {
                            const parsed = JSON.parse(String(correctAnswer));
                            if (typeof parsed === 'string' || typeof parsed === 'boolean') {
                              correctAnswer = parsed;
                            }
                          } catch (e) {
                            // Si falla el parse, usar el valor original
                          }
                          return (
                            <span className="font-semibold text-green-700">
                              {String(correctAnswer).toLowerCase() === 'true' || String(correctAnswer) === true ? 'Verdadero' : 'Falso'}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                    {(result.question.question_type === 'short_answer' || result.question.question_type === 'essay') && result.question.correct_answer && (
                      <div>
                        {(() => {
                          let acceptableAnswers: string[] = [];
                          try {
                            let correctAnswerParsed = result.question.correct_answer;
                            if (typeof correctAnswerParsed === 'string') {
                              correctAnswerParsed = JSON.parse(correctAnswerParsed);
                            }
                            if (Array.isArray(correctAnswerParsed)) {
                              acceptableAnswers = correctAnswerParsed.map(a => String(a));
                            } else {
                              acceptableAnswers = [String(correctAnswerParsed)];
                            }
                          } catch (e) {
                            acceptableAnswers = [String(result.question.correct_answer)];
                          }
                          
                          return (
                            <div>
                              <div className="text-sm text-green-700 mb-1">Respuestas aceptables:</div>
                              <ul className="list-disc list-inside space-y-1">
                                {acceptableAnswers.map((ans, idx) => (
                                  <li key={idx} className="text-green-800">{ans}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Explicación */}
              {result.question.explanation && (
                <div className="ml-9 mt-3">
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <IconInfoCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-blue-900 mb-1">Explicación:</div>
                      <div className="text-sm text-blue-800 whitespace-pre-wrap">
                        {result.question.explanation}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback del profesor */}
              {result.response?.teacher_feedback && (
                <div className="ml-9 mt-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="text-sm font-semibold text-purple-900 mb-1">Feedback del profesor:</div>
                    <div className="text-sm text-purple-800 whitespace-pre-wrap">
                      {result.response.teacher_feedback}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Botones de acción */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
          leftIcon={<IconArrowLeft className="w-5 h-5" />}
        >
          Volver
        </Button>
        
        {assessment.course_id && (
          <Link 
            to={
              user?.role?.name === 'teacher' || user?.role?.name === 'admin'
                ? `/teacher/courses/${assessment.course_id}`
                : `/courses/${assessment.course_id}`
            }
          >
            <Button variant="primary">
              Ver Curso
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default QuizResultsPage;

