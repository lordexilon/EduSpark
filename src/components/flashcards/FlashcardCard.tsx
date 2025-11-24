// components/flashcards/FlashcardCard.tsx
// Componente para mostrar una flashcard (frente/reverso)

import React, { useState } from 'react';
import { Flashcard, FlashcardProgress } from '../../services/flashcardService';
import Button from '../Button';
import { IconRefreshCw, IconCheck, IconX } from '../Icons';

interface FlashcardCardProps {
  flashcard: Flashcard;
  progress?: FlashcardProgress;
  onFlip?: () => void;
  onAnswer?: (quality: number) => void; // 0-5
  showAnswer?: boolean; // Si se muestra el reverso
  studyMode?: boolean; // Modo de estudio (con botones de respuesta)
}

const FlashcardCard: React.FC<FlashcardCardProps> = ({
  flashcard,
  progress,
  onFlip,
  onAnswer,
  showAnswer = false,
  studyMode = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(showAnswer);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleFlip = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped(!isFlipped);
    if (onFlip) onFlip();
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleSelectOption = (optionIndex: number) => {
    if (showFeedback || !flashcard.is_multiple_choice || !flashcard.answer_options) return;

    setSelectedOptionIndex(optionIndex);
    const correct = optionIndex === flashcard.correct_answer_index;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Después de mostrar feedback, registrar respuesta y continuar
    setTimeout(() => {
      if (onAnswer) {
        // Calidad basada en si es correcta o no (0-5)
        const quality = correct ? 5 : 0;
        onAnswer(quality);
        // Resetear para la siguiente flashcard
        setTimeout(() => {
          setIsFlipped(false);
          setSelectedOptionIndex(null);
          setShowFeedback(false);
        }, 1000);
      }
    }, 2000); // Mostrar feedback por 2 segundos
  };

  const handleAnswer = (quality: number) => {
    if (onAnswer) {
      onAnswer(quality);
      // Voltear de vuelta al frente después de responder
      setTimeout(() => {
        setIsFlipped(false);
      }, 1000);
    }
  };

  const masteryLevel = progress?.mastery_level || 0;
  const masteryColors = {
    0: 'bg-gray-200', // No visto
    1: 'bg-red-200', // Muy difícil
    2: 'bg-orange-200', // Difícil
    3: 'bg-yellow-200', // Regular
    4: 'bg-green-200', // Fácil
    5: 'bg-green-400', // Dominado
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Indicador de dominio */}
      {progress && (
        <div className="absolute -top-3 right-0 z-10">
          <div
            className={`w-6 h-6 rounded-full shadow-md ${masteryColors[masteryLevel as keyof typeof masteryColors] || 'bg-gray-200'}`}
            title={`Nivel de dominio: ${masteryLevel}/5`}
          />
        </div>
      )}

      {/* Tarjeta */}
      <div
        className={`relative w-full perspective-1000 fade-in ${!studyMode ? 'cursor-pointer' : ''
          } ${isAnimating ? 'pointer-events-none' : ''}`}
        style={{
          height: flashcard.is_multiple_choice ? 'calc(100vh - 250px)' : 'calc(100vh - 350px)',
          minHeight: flashcard.is_multiple_choice ? '600px' : '500px'
        }}
        onClick={!studyMode ? handleFlip : undefined}
      >
        <div
          className={`relative w-full h-full preserve-3d transition-transform duration-300 ${isFlipped ? 'rotate-y-180' : ''
            }`}
        >
          {/* Frente */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 border-2 border-gray-200/50 overflow-y-auto ${isFlipped ? 'hidden' : ''
              }`}
          >
            <div className={`flex-1 flex flex-col items-center ${flashcard.is_multiple_choice ? 'justify-start' : 'justify-center'}`}>
              {/* Imagen - Mejorada para ser más prominente */}
              {flashcard.front_image_url && (
                <div className="w-full flex justify-center items-center mb-4 flex-shrink-0">
                  <div className="relative w-full max-w-2xl flex items-center justify-center">
                    <img
                      src={flashcard.front_image_url}
                      alt="Flashcard front"
                      className="max-w-full max-h-[350px] w-auto h-auto object-contain rounded-xl shadow-xl"
                    />
                  </div>
                </div>
              )}

              {/* Pregunta - Mejorada con mejor tipografía */}
              {flashcard.front_text && (
                <div className="w-full text-center flex-shrink-0 px-4 mb-4">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-relaxed">
                    {flashcard.front_text}
                  </h2>
                </div>
              )}
              {!flashcard.front_text && !flashcard.front_image_url && (
                <p className="text-gray-400 italic text-center text-lg flex-shrink-0 mb-4">Sin contenido en el frente</p>
              )}
            </div>

            {/* Mostrar opciones múltiples si está en modo estudio y es multiple choice */}
            {studyMode && flashcard.is_multiple_choice && flashcard.answer_options && !isFlipped && (
              <div className="w-full max-w-4xl mx-auto space-y-4 mt-4 pb-4">
                {flashcard.answer_options.map((option, index) => {
                  const isCorrectOption = index === flashcard.correct_answer_index;
                  const isSelected = selectedOptionIndex === index;

                  return (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOption(index);
                      }}
                      disabled={showFeedback}
                      className={`w-full p-5 text-left rounded-2xl border-3 transition-all duration-300 transform ${showFeedback
                        ? isCorrectOption
                          ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-500 shadow-xl scale-[1.02]'
                          : isSelected
                            ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-500 shadow-xl scale-[1.02]'
                            : 'bg-gray-50 border-gray-200 opacity-50'
                        : isSelected
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 shadow-lg scale-[1.01]'
                          : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-lg hover:scale-[1.01]'
                        } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start gap-4">
                        <span className={`font-bold text-xl w-12 h-12 flex items-center justify-center rounded-full shadow-md transition-all flex-shrink-0 ${showFeedback
                          ? isCorrectOption
                            ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                            : isSelected
                              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                              : 'bg-gray-300 text-gray-600'
                          : isSelected
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}>
                          {option.label}
                        </span>
                        <div className="flex-1 flex flex-col gap-3">
                          {/* Imagen de la opción si existe */}
                          {option.image_url && (
                            <div className="w-full flex justify-center items-center">
                              <img
                                src={option.image_url}
                                alt={`Opción ${option.label}`}
                                className="max-w-full max-h-[200px] w-auto h-auto object-contain rounded-lg shadow-md"
                              />
                            </div>
                          )}
                          {/* Texto de la opción */}
                          <span className="text-lg md:text-xl font-semibold text-gray-800 leading-relaxed">
                            {option.text}
                          </span>
                        </div>
                        {/* Indicadores de feedback */}
                        {showFeedback && isCorrectOption && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full flex-shrink-0">
                            <IconCheck className="w-6 h-6 text-green-600" />
                            <span className="text-green-700 font-bold text-base">Correcta</span>
                          </div>
                        )}
                        {showFeedback && isSelected && !isCorrect && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-full flex-shrink-0">
                            <IconX className="w-6 h-6 text-red-600" />
                            <span className="text-red-700 font-bold text-base">Incorrecta</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Mensaje de feedback mejorado */}
                {showFeedback && (
                  <div className={`mt-8 p-6 rounded-2xl text-center shadow-2xl transform transition-all duration-500 animate-pulse-feedback ${isCorrect
                    ? 'bg-gradient-to-r from-green-100 via-green-50 to-green-100 border-3 border-green-400 text-green-900'
                    : 'bg-gradient-to-r from-red-100 via-red-50 to-red-100 border-3 border-red-400 text-red-900'
                    }`}>
                    {isCorrect ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-3xl font-bold">¡Correcto! 🎉</p>
                        <p className="text-lg opacity-90 font-medium">Excelente trabajo</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-2xl font-bold">Incorrecto</p>
                        <p className="text-lg">
                          La respuesta correcta es: <span className="font-bold text-xl text-green-700">
                            {flashcard.answer_options[flashcard.correct_answer_index!]?.label} - {flashcard.answer_options[flashcard.correct_answer_index!]?.text}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Botón "Ver Respuesta" solo para flashcards tradicionales (no multiple choice) */}
            {studyMode && !isFlipped && !flashcard.is_multiple_choice && (
              <div className="mt-6 w-full flex justify-center flex-shrink-0 pb-4">
                <Button
                  variant="primary"
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFlip();
                  }}
                  className="px-10 py-4 text-xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <IconRefreshCw className="w-6 h-6 mr-3" />
                  Ver Respuesta
                </Button>
              </div>
            )}
            {!studyMode && (
              <div className="mt-6 text-sm text-gray-500 flex items-center justify-center gap-2 flex-shrink-0 pb-4">
                <IconRefreshCw className="w-4 h-4" />
                <span>Haz clic para ver la respuesta</span>
              </div>
            )}
          </div>

          {/* Reverso - solo mostrar si NO es multiple choice */}
          {!flashcard.is_multiple_choice && (
            <div
              className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl shadow-2xl p-8 md:p-10 flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300/50 overflow-y-auto ${!isFlipped ? 'hidden' : ''
                }`}
            >
              <div className="flex-1 flex flex-col items-center justify-center">
                {flashcard.back_image_url && (
                  <div className="w-full flex justify-center items-center mb-6 flex-shrink-0">
                    <div className="relative w-full max-w-2xl flex items-center justify-center">
                      <img
                        src={flashcard.back_image_url}
                        alt="Flashcard back"
                        className="max-w-full max-h-[400px] w-auto h-auto object-contain rounded-xl shadow-xl"
                      />
                    </div>
                  </div>
                )}
                <div className="w-full text-center flex-shrink-0 px-4">
                  <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-800 leading-relaxed">
                    {flashcard.back_text}
                  </p>
                </div>
              </div>

              {/* Botones de respuesta (modo estudio) - Mejorados */}
              {studyMode && onAnswer && (
                <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-2xl flex-shrink-0 pb-4">
                  <button
                    onClick={() => handleAnswer(0)}
                    className="text-red-700 border-3 border-red-400 bg-white hover:bg-gradient-to-br hover:from-red-50 hover:to-red-100 hover:border-red-500 shadow-lg hover:shadow-xl transition-all font-bold text-lg py-4 px-6 rounded-lg transform hover:scale-105 flex items-center justify-center"
                  >
                    <IconX className="w-6 h-6 mr-2" />
                    Muy difícil
                  </button>
                  <button
                    onClick={() => handleAnswer(2)}
                    className="text-yellow-700 border-3 border-yellow-400 bg-white hover:bg-gradient-to-br hover:from-yellow-50 hover:to-yellow-100 hover:border-yellow-500 shadow-lg hover:shadow-xl transition-all font-bold text-lg py-4 px-6 rounded-lg transform hover:scale-105"
                  >
                    Regular
                  </button>
                  <button
                    onClick={() => handleAnswer(5)}
                    className="text-green-700 border-3 border-green-400 bg-white hover:bg-gradient-to-br hover:from-green-50 hover:to-green-100 hover:border-green-500 shadow-lg hover:shadow-xl transition-all font-bold text-lg py-4 px-6 rounded-lg transform hover:scale-105 flex items-center justify-center"
                  >
                    <IconCheck className="w-6 h-6 mr-2" />
                    Fácil
                  </button>
                </div>
              )}

              {!studyMode && (
                <div className="mt-6 text-sm text-gray-600 flex items-center justify-center gap-2">
                  <IconRefreshCw className="w-4 h-4" />
                  <span>Haz clic para volver</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estilos CSS para 3D flip y animaciones */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .scale-102 {
          transform: scale(1.02);
        }
        .border-3 {
          border-width: 3px;
        }
        @keyframes pulse-feedback {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.03);
            opacity: 0.95;
          }
        }
        .animate-pulse-feedback {
          animation: pulse-feedback 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FlashcardCard;
