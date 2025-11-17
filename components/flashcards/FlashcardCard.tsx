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

  const handleFlip = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped(!isFlipped);
    if (onFlip) onFlip();
    setTimeout(() => setIsAnimating(false), 300);
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
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Indicador de dominio */}
      {progress && (
        <div className="absolute -top-2 right-0 z-10">
          <div
            className={`w-4 h-4 rounded-full ${masteryColors[masteryLevel as keyof typeof masteryColors] || 'bg-gray-200'}`}
            title={`Nivel de dominio: ${masteryLevel}/5`}
          />
        </div>
      )}

      {/* Tarjeta */}
      <div
        className={`relative w-full h-96 perspective-1000 ${
          !studyMode ? 'cursor-pointer' : ''
        } ${isAnimating ? 'pointer-events-none' : ''}`}
        onClick={!studyMode ? handleFlip : undefined}
      >
        <div
          className={`relative w-full h-full preserve-3d transition-transform duration-300 ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Frente */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rounded-lg shadow-lg p-6 flex flex-col items-center justify-center bg-white border-2 border-gray-200 ${
              isFlipped ? 'hidden' : ''
            }`}
          >
            {flashcard.front_image_url && (
              <img
                src={flashcard.front_image_url}
                alt="Flashcard front"
                className="max-w-full max-h-64 object-contain mb-4 rounded"
              />
            )}
            {flashcard.front_text && (
              <p className="text-xl font-semibold text-center text-gray-800">
                {flashcard.front_text}
              </p>
            )}
            {!flashcard.front_text && !flashcard.front_image_url && (
              <p className="text-gray-400 italic">Sin contenido en el frente</p>
            )}
            {studyMode && !isFlipped && (
              <div className="mt-6">
                <Button
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFlip();
                  }}
                >
                  <IconRefreshCw className="w-4 h-4 mr-2" />
                  Ver Respuesta
                </Button>
              </div>
            )}
            {!studyMode && (
              <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                <IconRefreshCw className="w-4 h-4" />
                <span>Haz clic para ver la respuesta</span>
              </div>
            )}
          </div>

          {/* Reverso */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-lg shadow-lg p-6 flex flex-col items-center justify-center bg-blue-50 border-2 border-blue-200 ${
              !isFlipped ? 'hidden' : ''
            }`}
          >
            {flashcard.back_image_url && (
              <img
                src={flashcard.back_image_url}
                alt="Flashcard back"
                className="max-w-full max-h-64 object-contain mb-4 rounded"
              />
            )}
            <p className="text-lg text-center text-gray-800 mb-4">{flashcard.back_text}</p>

            {/* Botones de respuesta (modo estudio) */}
            {studyMode && onAnswer && (
              <div className="mt-6 grid grid-cols-3 gap-2 w-full max-w-md">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnswer(0)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <IconX className="w-4 h-4 mr-1" />
                  Muy difícil
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnswer(2)}
                  className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                >
                  Regular
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnswer(5)}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <IconCheck className="w-4 h-4 mr-1" />
                  Fácil
                </Button>
              </div>
            )}

            {!studyMode && (
              <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                <IconRefreshCw className="w-4 h-4" />
                <span>Haz clic para volver</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estilos CSS para 3D flip */}
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
      `}</style>
    </div>
  );
};

export default FlashcardCard;

