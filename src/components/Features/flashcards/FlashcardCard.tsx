// components/flashcards/FlashcardCard.tsx
// Componente para mostrar una flashcard (frente/reverso) - Mobile-First Responsive

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Flashcard, FlashcardProgress } from '@/services/flashcardService';
import Button from '@/components/Common/Button';
import { IconRefreshCw, IconCheck, IconX } from '@/components/Common/Icons';

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

  // Touch/swipe support for mobile
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const handleFlip = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped(!isFlipped);
    if (onFlip) onFlip();
    setTimeout(() => setIsAnimating(false), 400);
  }, [isAnimating, isFlipped, onFlip]);

  // Swipe gesture handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || studyMode) return;
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      // Only flip on horizontal swipe (not scroll)
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        handleFlip();
      }
      touchStartRef.current = null;
    },
    [studyMode, handleFlip]
  );

  const handleSelectOption = (optionIndex: number) => {
    if (showFeedback || !flashcard.is_multiple_choice || !flashcard.answer_options) return;

    setSelectedOptionIndex(optionIndex);
    const correct = optionIndex === flashcard.correct_answer_index;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Scroll feedback into view on mobile
    setTimeout(() => {
      feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    // Después de mostrar feedback, registrar respuesta y continuar
    setTimeout(() => {
      if (onAnswer) {
        const quality = correct ? 5 : 0;
        onAnswer(quality);
        setTimeout(() => {
          setIsFlipped(false);
          setSelectedOptionIndex(null);
          setShowFeedback(false);
        }, 800);
      }
    }, 1800);
  };

  const handleAnswer = (quality: number) => {
    if (onAnswer) {
      onAnswer(quality);
      setTimeout(() => {
        setIsFlipped(false);
      }, 800);
    }
  };

  const masteryLevel = progress?.mastery_level || 0;
  const masteryConfig: Record<number, { bg: string; label: string }> = {
    0: { bg: '#e5e7eb', label: 'Nuevo' },
    1: { bg: '#fecaca', label: 'Muy difícil' },
    2: { bg: '#fed7aa', label: 'Difícil' },
    3: { bg: '#fde68a', label: 'Regular' },
    4: { bg: '#bbf7d0', label: 'Fácil' },
    5: { bg: '#4ade80', label: 'Dominado' },
  };

  const currentMastery = masteryConfig[masteryLevel] || masteryConfig[0];

  return (
    <div className="fc-container">
      {/* Indicador de dominio */}
      {progress && (
        <div className="fc-mastery-badge" title={`Nivel: ${currentMastery.label}`}>
          <span className="fc-mastery-dot" style={{ backgroundColor: currentMastery.bg }} />
          <span className="fc-mastery-label">{currentMastery.label}</span>
        </div>
      )}

      {/* Tarjeta con perspectiva 3D */}
      <div
        className={`fc-perspective ${!studyMode ? 'fc-clickable' : ''} ${isAnimating ? 'fc-no-events' : ''}`}
        onClick={!studyMode ? handleFlip : undefined}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`fc-inner ${isFlipped ? 'fc-flipped' : ''}`}>
          {/* ═══ FRENTE ═══ */}
          <div className={`fc-face fc-front ${isFlipped ? 'fc-hidden' : ''}`}>
            <div
              className={`fc-content ${flashcard.is_multiple_choice ? 'fc-content-mc' : 'fc-content-centered'}`}
            >
              {/* Imagen */}
              {flashcard.front_image_url && (
                <div className="fc-image-wrap">
                  <img
                    src={flashcard.front_image_url}
                    alt="Flashcard"
                    className="fc-image"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Pregunta */}
              {flashcard.front_text && <h2 className="fc-question">{flashcard.front_text}</h2>}
              {!flashcard.front_text && !flashcard.front_image_url && (
                <p className="fc-empty">Sin contenido en el frente</p>
              )}
            </div>

            {/* Opciones múltiples */}
            {studyMode &&
              flashcard.is_multiple_choice &&
              flashcard.answer_options &&
              !isFlipped && (
                <div className="fc-options">
                  {flashcard.answer_options.map((option, index) => {
                    const isCorrectOption = index === flashcard.correct_answer_index;
                    const isSelected = selectedOptionIndex === index;

                    let optionClass = 'fc-option';
                    if (showFeedback) {
                      if (isCorrectOption) optionClass += ' fc-option-correct';
                      else if (isSelected) optionClass += ' fc-option-wrong';
                      else optionClass += ' fc-option-dimmed';
                    } else if (isSelected) {
                      optionClass += ' fc-option-selected';
                    }

                    return (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectOption(index);
                        }}
                        disabled={showFeedback}
                        className={optionClass}
                      >
                        <span
                          className={`fc-option-label ${showFeedback && isCorrectOption ? 'fc-label-correct' : showFeedback && isSelected ? 'fc-label-wrong' : ''}`}
                        >
                          {option.label}
                        </span>
                        <div className="fc-option-content">
                          {option.image_url && (
                            <img
                              src={option.image_url}
                              alt={`Opción ${option.label}`}
                              className="fc-option-image"
                              loading="lazy"
                            />
                          )}
                          <span className="fc-option-text">{option.text}</span>
                        </div>
                        {showFeedback && isCorrectOption && (
                          <span className="fc-feedback-icon fc-feedback-correct">
                            <IconCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                          </span>
                        )}
                        {showFeedback && isSelected && !isCorrect && (
                          <span className="fc-feedback-icon fc-feedback-wrong">
                            <IconX className="w-4 h-4 sm:w-5 sm:h-5" />
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Mensaje de feedback */}
                  {showFeedback && (
                    <div
                      ref={feedbackRef}
                      className={`fc-feedback-msg ${isCorrect ? 'fc-feedback-success' : 'fc-feedback-error'}`}
                    >
                      {isCorrect ? (
                        <div className="fc-feedback-inner">
                          <span className="fc-feedback-emoji">🎉</span>
                          <p className="fc-feedback-title">¡Correcto!</p>
                          <p className="fc-feedback-sub">Excelente trabajo</p>
                        </div>
                      ) : (
                        <div className="fc-feedback-inner">
                          <p className="fc-feedback-title">Incorrecto</p>
                          <p className="fc-feedback-sub">
                            Respuesta correcta:{' '}
                            <strong>
                              {flashcard.answer_options[flashcard.correct_answer_index!]?.label} -{' '}
                              {flashcard.answer_options[flashcard.correct_answer_index!]?.text}
                            </strong>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            {/* Botón "Ver Respuesta" - flashcards tradicionales */}
            {studyMode && !isFlipped && !flashcard.is_multiple_choice && (
              <div className="fc-action-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFlip();
                  }}
                  className="fc-flip-btn"
                >
                  <IconRefreshCw className="w-5 h-5 mr-2" />
                  Ver Respuesta
                </button>
              </div>
            )}

            {!studyMode && (
              <div className="fc-hint">
                <IconRefreshCw className="w-3.5 h-3.5" />
                <span>Toca para ver la respuesta</span>
              </div>
            )}
          </div>

          {/* ═══ REVERSO ═══ */}
          {!flashcard.is_multiple_choice && (
            <div className={`fc-face fc-back ${!isFlipped ? 'fc-hidden' : ''}`}>
              <div className="fc-content fc-content-centered">
                {flashcard.back_image_url && (
                  <div className="fc-image-wrap">
                    <img
                      src={flashcard.back_image_url}
                      alt="Respuesta"
                      className="fc-image"
                      loading="lazy"
                    />
                  </div>
                )}
                <p className="fc-answer">{flashcard.back_text}</p>
              </div>

              {/* Botones de calificación */}
              {studyMode && onAnswer && (
                <div className="fc-rating-buttons">
                  <button onClick={() => handleAnswer(0)} className="fc-rate-btn fc-rate-hard">
                    <IconX className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Difícil</span>
                  </button>
                  <button onClick={() => handleAnswer(2)} className="fc-rate-btn fc-rate-medium">
                    <span>Regular</span>
                  </button>
                  <button onClick={() => handleAnswer(5)} className="fc-rate-btn fc-rate-easy">
                    <IconCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Fácil</span>
                  </button>
                </div>
              )}

              {!studyMode && (
                <div className="fc-hint fc-hint-back">
                  <IconRefreshCw className="w-3.5 h-3.5" />
                  <span>Toca para volver</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ ESTILOS ═══ */}
      <style>{`
        /* ── Container ── */
        .fc-container {
          position: relative;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          padding: 0 4px;
        }

        /* ── Mastery Badge ── */
        .fc-mastery-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          position: absolute;
          top: -8px;
          right: 8px;
          z-index: 10;
          background: white;
          padding: 4px 10px 4px 6px;
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          font-size: 11px;
          font-weight: 600;
          color: #374151;
        }
        .fc-mastery-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .fc-mastery-label {
          display: none;
        }
        @media (min-width: 640px) {
          .fc-mastery-label { display: inline; }
        }

        /* ── Perspective & 3D ── */
        .fc-perspective {
          perspective: 1200px;
          width: 100%;
        }
        .fc-clickable {
          cursor: pointer;
        }
        .fc-no-events {
          pointer-events: none;
        }
        .fc-inner {
          position: relative;
          width: 100%;
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fc-flipped {
          transform: rotateY(180deg);
        }

        /* ── Faces ── */
        .fc-face {
          width: 100%;
          border-radius: 16px;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          backface-visibility: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
          animation: fc-fadeIn 0.3s ease-out;
        }
        .fc-front {
          background: linear-gradient(135deg, #ffffff 0%, #eef2ff 50%, #e0e7ff 100%);
          border: 1.5px solid rgba(99, 102, 241, 0.15);
        }
        .fc-back {
          background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #ede9fe 100%);
          border: 1.5px solid rgba(99, 102, 241, 0.2);
          position: absolute;
          top: 0;
          left: 0;
          transform: rotateY(180deg);
        }
        .fc-hidden {
          visibility: hidden;
          position: absolute;
          top: 0;
          left: 0;
        }

        @media (min-width: 640px) {
          .fc-face {
            border-radius: 20px;
            padding: 28px 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.04);
          }
        }
        @media (min-width: 1024px) {
          .fc-face {
            padding: 36px 32px;
          }
        }

        /* ── Content Area ── */
        .fc-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .fc-content-centered {
          justify-content: center;
          min-height: 180px;
        }
        .fc-content-mc {
          justify-content: flex-start;
        }
        @media (min-width: 640px) {
          .fc-content-centered {
            min-height: 220px;
          }
          .fc-content {
            gap: 16px;
          }
        }

        /* ── Image ── */
        .fc-image-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
          flex-shrink: 0;
        }
        .fc-image {
          max-width: 100%;
          max-height: 180px;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        @media (min-width: 640px) {
          .fc-image {
            max-height: 240px;
          }
        }
        @media (min-width: 1024px) {
          .fc-image {
            max-height: 320px;
          }
        }

        /* ── Text ── */
        .fc-question {
          font-size: 1.125rem;
          line-height: 1.5;
          font-weight: 700;
          color: #1f2937;
          text-align: center;
          padding: 0 4px;
          margin: 0;
          word-break: break-word;
        }
        .fc-answer {
          font-size: 1.05rem;
          line-height: 1.6;
          font-weight: 600;
          color: #1f2937;
          text-align: center;
          padding: 0 4px;
          margin: 0;
          word-break: break-word;
        }
        .fc-empty {
          font-size: 0.875rem;
          color: #9ca3af;
          font-style: italic;
          text-align: center;
        }

        @media (min-width: 640px) {
          .fc-question {
            font-size: 1.5rem;
            padding: 0 12px;
          }
          .fc-answer {
            font-size: 1.35rem;
            padding: 0 12px;
          }
        }
        @media (min-width: 1024px) {
          .fc-question {
            font-size: 1.875rem;
            padding: 0 20px;
          }
          .fc-answer {
            font-size: 1.625rem;
            padding: 0 20px;
          }
        }

        /* ── Options (Multiple Choice) ── */
        .fc-options {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
          padding-bottom: 8px;
        }
        @media (min-width: 640px) {
          .fc-options {
            gap: 12px;
            margin-top: 16px;
          }
        }

        .fc-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          background: white;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .fc-option:active:not(:disabled) {
          transform: scale(0.98);
        }
        .fc-option:hover:not(:disabled) {
          border-color: #818cf8;
          background: #f5f3ff;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
        }
        @media (min-width: 640px) {
          .fc-option {
            gap: 14px;
            padding: 14px 18px;
            border-radius: 14px;
            font-size: 1rem;
          }
        }

        .fc-option-selected {
          border-color: #6366f1;
          background: #eef2ff;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
        }
        .fc-option-correct {
          border-color: #22c55e;
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          box-shadow: 0 0 16px rgba(34, 197, 94, 0.25);
          transform: scale(1.01);
        }
        .fc-option-wrong {
          border-color: #ef4444;
          background: linear-gradient(135deg, #fef2f2, #fecaca);
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.2);
        }
        .fc-option-dimmed {
          opacity: 0.45;
        }

        /* Option label circle */
        .fc-option-label {
          width: 32px;
          height: 32px;
          min-width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f3f4f6;
          color: #4b5563;
          font-weight: 700;
          font-size: 0.8rem;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        @media (min-width: 640px) {
          .fc-option-label {
            width: 38px;
            height: 38px;
            min-width: 38px;
            font-size: 0.9rem;
          }
        }
        .fc-label-correct {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
        }
        .fc-label-wrong {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .fc-option-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .fc-option-image {
          max-width: 100%;
          max-height: 100px;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        @media (min-width: 640px) {
          .fc-option-image {
            max-height: 140px;
          }
        }
        .fc-option-text {
          font-weight: 600;
          color: #374151;
          line-height: 1.4;
          word-break: break-word;
        }

        /* Feedback icon on option */
        .fc-feedback-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .fc-feedback-correct {
          background: #dcfce7;
          color: #16a34a;
        }
        .fc-feedback-wrong {
          background: #fecaca;
          color: #dc2626;
        }

        /* ── Feedback Message ── */
        .fc-feedback-msg {
          padding: 14px 16px;
          border-radius: 14px;
          text-align: center;
          margin-top: 8px;
          animation: fc-popIn 0.35s ease-out;
        }
        .fc-feedback-success {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 2px solid #86efac;
          color: #166534;
        }
        .fc-feedback-error {
          background: linear-gradient(135deg, #fef2f2, #fecaca);
          border: 2px solid #fca5a5;
          color: #991b1b;
        }
        .fc-feedback-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .fc-feedback-emoji {
          font-size: 1.5rem;
        }
        .fc-feedback-title {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        .fc-feedback-sub {
          font-size: 0.85rem;
          opacity: 0.85;
          margin: 0;
          font-weight: 500;
        }
        @media (min-width: 640px) {
          .fc-feedback-msg {
            padding: 18px 24px;
          }
          .fc-feedback-title {
            font-size: 1.35rem;
          }
          .fc-feedback-sub {
            font-size: 1rem;
          }
        }

        /* ── Action Buttons ── */
        .fc-action-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-top: 16px;
          padding-bottom: 8px;
        }
        .fc-flip-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 28px;
          font-size: 1rem;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .fc-flip-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
        }
        .fc-flip-btn:active {
          transform: scale(0.97);
        }
        @media (min-width: 640px) {
          .fc-flip-btn {
            padding: 14px 36px;
            font-size: 1.1rem;
            border-radius: 14px;
          }
        }

        /* ── Rating Buttons ── */
        .fc-rating-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          width: 100%;
          margin-top: 20px;
          padding-bottom: 8px;
        }
        @media (min-width: 640px) {
          .fc-rating-buttons {
            gap: 12px;
            margin-top: 24px;
            max-width: 480px;
            margin-left: auto;
            margin-right: auto;
          }
        }
        .fc-rate-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 12px 8px;
          border-radius: 12px;
          border: 2px solid;
          background: white;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .fc-rate-btn:active {
          transform: scale(0.95);
        }
        @media (min-width: 640px) {
          .fc-rate-btn {
            flex-direction: row;
            gap: 8px;
            padding: 14px 16px;
            font-size: 0.95rem;
          }
        }
        .fc-rate-hard {
          color: #b91c1c;
          border-color: #fca5a5;
        }
        .fc-rate-hard:hover {
          background: #fef2f2;
          border-color: #ef4444;
        }
        .fc-rate-medium {
          color: #a16207;
          border-color: #fde68a;
        }
        .fc-rate-medium:hover {
          background: #fffbeb;
          border-color: #f59e0b;
        }
        .fc-rate-easy {
          color: #15803d;
          border-color: #86efac;
        }
        .fc-rate-easy:hover {
          background: #f0fdf4;
          border-color: #22c55e;
        }

        /* ── Hint ── */
        .fc-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
          padding-bottom: 4px;
          font-size: 0.75rem;
          color: #9ca3af;
          user-select: none;
        }
        .fc-hint-back {
          color: #6b7280;
        }

        /* ── Animations ── */
        @keyframes fc-fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fc-popIn {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fc-inner {
            transition: none;
          }
          .fc-face,
          .fc-feedback-msg {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default FlashcardCard;
