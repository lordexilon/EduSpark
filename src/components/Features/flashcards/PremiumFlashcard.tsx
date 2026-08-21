import React, { useState, useRef, useCallback } from 'react';
import { Flashcard } from '@/services/flashcardService';
import { IconRefreshCw, IconCheck, IconX, IconInfo } from '@/components/Common/Icons';

interface PremiumFlashcardProps {
  flashcard: Flashcard;
  onFlip?: () => void;
  onAnswer?: (quality: number) => void;
  showAnswer?: boolean;
  studyMode?: boolean;
  onEdit?: (flashcard: Flashcard) => void;
}

const PremiumFlashcard: React.FC<PremiumFlashcardProps> = ({
  flashcard,
  onFlip,
  onAnswer,
  showAnswer = false,
  studyMode = false,
  onEdit,
}) => {
  const [isFlipped, setIsFlipped] = useState(showAnswer);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [imageError, setImageError] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleFlip = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped(!isFlipped);
    if (onFlip) onFlip();
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, isFlipped, onFlip]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        handleFlip();
      }
      touchStartRef.current = null;
    },
    [handleFlip]
  );

  const handleOptionSelect = (index: number) => {
    if (showFeedback) return;
    setSelectedOption(index);
    setShowFeedback(true);

    const isCorrect = index === flashcard.correct_answer_index;

    setTimeout(() => {
      if (onAnswer) {
        onAnswer(isCorrect ? 5 : 0);
        setTimeout(() => {
          setShowFeedback(false);
          setSelectedOption(null);
        }, 800);
      }
    }, 1500);
  };

  return (
    <div className="pfc-container">
      <div
        className={`pfc-perspective ${isAnimating ? 'pfc-no-events' : ''}`}
        onClick={studyMode && !flashcard.is_multiple_choice ? handleFlip : undefined}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`pfc-inner ${isFlipped ? 'pfc-flipped' : ''}`}>
          {/* ═══ Front ═══ */}
          <div className={`pfc-face pfc-front ${isFlipped ? 'pfc-hidden' : ''}`}>
            {/* Edit button */}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(flashcard);
                }}
                className="pfc-edit-btn"
                title="Editar tarjeta"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            )}

            {/* Decorative blobs */}
            <div className="pfc-blob pfc-blob-1" />
            <div className="pfc-blob pfc-blob-2" />

            <div className="pfc-content">
              {flashcard.front_image_url && !imageError && (
                <img
                  src={flashcard.front_image_url}
                  alt="Front"
                  className="pfc-image"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              )}

              <h3 className="pfc-text-front">{flashcard.front_text}</h3>

              {flashcard.is_multiple_choice && studyMode && flashcard.answer_options && (
                <div className="pfc-options">
                  {flashcard.answer_options.map((opt, idx) => {
                    let cls = 'pfc-option';
                    if (showFeedback && idx === flashcard.correct_answer_index)
                      cls += ' pfc-opt-correct';
                    else if (
                      showFeedback &&
                      idx === selectedOption &&
                      idx !== flashcard.correct_answer_index
                    )
                      cls += ' pfc-opt-wrong';

                    return (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOptionSelect(idx);
                        }}
                        disabled={showFeedback}
                        className={cls}
                      >
                        <span className="pfc-opt-label">{opt.label}.</span> {opt.text}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pfc-hint">
              <IconRefreshCw className="w-3.5 h-3.5" />
              {!flashcard.is_multiple_choice && <span>Toca para voltear</span>}
            </div>
          </div>

          {/* ═══ Back ═══ */}
          <div className={`pfc-face pfc-back ${!isFlipped ? 'pfc-hidden' : ''}`}>
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(flashcard);
                }}
                className="pfc-edit-btn pfc-edit-dark"
                title="Editar tarjeta"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            )}

            <div className="pfc-blob pfc-blob-dark" />

            <div className="pfc-content pfc-content-dark">
              <h4 className="pfc-answer-label">Respuesta</h4>
              <h3 className="pfc-text-back">{flashcard.back_text}</h3>
              {flashcard.back_image_url && (
                <img
                  src={flashcard.back_image_url}
                  alt="Back"
                  className="pfc-image pfc-image-dark"
                  loading="lazy"
                />
              )}
            </div>

            {studyMode && !flashcard.is_multiple_choice && (
              <div className="pfc-rate-buttons">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnswer?.(1);
                    handleFlip();
                  }}
                  className="pfc-rate pfc-rate-hard"
                >
                  Difícil
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnswer?.(3);
                    handleFlip();
                  }}
                  className="pfc-rate pfc-rate-good"
                >
                  Bien
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnswer?.(5);
                    handleFlip();
                  }}
                  className="pfc-rate pfc-rate-easy"
                >
                  Fácil
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
                .pfc-container {
                    position: relative;
                    width: 100%;
                    max-width: 640px;
                    margin: 0 auto;
                    padding: 8px 0;
                }

                .pfc-perspective {
                    perspective: 1500px;
                    width: 100%;
                    cursor: pointer;
                }
                .pfc-no-events {
                    pointer-events: none;
                }

                .pfc-inner {
                    position: relative;
                    width: 100%;
                    transform-style: preserve-3d;
                    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .pfc-flipped {
                    transform: rotateY(180deg);
                }

                .pfc-face {
                    width: 100%;
                    border-radius: 20px;
                    padding: 24px 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    backface-visibility: hidden;
                    position: relative;
                    overflow: hidden;
                    min-height: 280px;
                }
                @media (min-width: 640px) {
                    .pfc-face {
                        border-radius: 24px;
                        padding: 32px 28px;
                        min-height: 360px;
                    }
                }

                .pfc-front {
                    background: linear-gradient(135deg, rgba(238, 242, 255, 0.9), rgba(255, 255, 255, 0.95), rgba(224, 231, 255, 0.9));
                    border: 1px solid rgba(99, 102, 241, 0.15);
                    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1), 0 1px 4px rgba(0,0,0,0.03);
                    backdrop-filter: blur(10px);
                }
                .pfc-back {
                    background: linear-gradient(135deg, #1e1b4b, #312e81);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.25);
                    color: white;
                    position: absolute;
                    top: 0;
                    left: 0;
                    transform: rotateY(180deg);
                }
                .pfc-hidden {
                    visibility: hidden;
                    position: absolute;
                    top: 0;
                    left: 0;
                }

                /* Blobs */
                .pfc-blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(40px);
                    pointer-events: none;
                }
                .pfc-blob-1 {
                    top: -30px;
                    right: -30px;
                    width: 100px;
                    height: 100px;
                    background: rgba(99, 102, 241, 0.12);
                }
                .pfc-blob-2 {
                    bottom: -30px;
                    left: -30px;
                    width: 100px;
                    height: 100px;
                    background: rgba(168, 85, 247, 0.12);
                }
                .pfc-blob-dark {
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 200px;
                    height: 200px;
                    background: rgba(99, 102, 241, 0.15);
                    filter: blur(80px);
                }

                /* Edit button */
                .pfc-edit-btn {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    padding: 8px;
                    border-radius: 10px;
                    border: none;
                    background: rgba(255, 255, 255, 0.5);
                    color: #6366f1;
                    cursor: pointer;
                    z-index: 20;
                    transition: all 0.2s;
                    -webkit-tap-highlight-color: transparent;
                }
                .pfc-edit-btn:hover {
                    background: rgba(255, 255, 255, 0.8);
                }
                .pfc-edit-dark {
                    background: rgba(255, 255, 255, 0.1);
                    color: #a5b4fc;
                }
                .pfc-edit-dark:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                /* Content */
                .pfc-content {
                    position: relative;
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 14px;
                    width: 100%;
                    text-align: center;
                }
                .pfc-content-dark {
                    color: white;
                }

                .pfc-image {
                    max-height: 140px;
                    max-width: 100%;
                    border-radius: 12px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                    object-fit: contain;
                    transition: transform 0.3s;
                }
                .pfc-image:hover {
                    transform: scale(1.03);
                }
                .pfc-image-dark {
                    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                    ring: 2px solid rgba(255,255,255,0.1);
                }
                @media (min-width: 640px) {
                    .pfc-image {
                        max-height: 200px;
                    }
                }

                .pfc-text-front {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1e293b;
                    line-height: 1.4;
                    margin: 0;
                    word-break: break-word;
                }
                .pfc-text-back {
                    font-size: 1.15rem;
                    font-weight: 500;
                    line-height: 1.5;
                    margin: 0;
                    word-break: break-word;
                }
                @media (min-width: 640px) {
                    .pfc-text-front { font-size: 1.75rem; }
                    .pfc-text-back { font-size: 1.5rem; }
                }

                .pfc-answer-label {
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    color: #818cf8;
                    margin: 0 0 4px 0;
                }

                /* Options */
                .pfc-options {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 12px;
                }
                .pfc-option {
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1.5px solid rgba(255, 255, 255, 0.3);
                    background: rgba(255, 255, 255, 0.35);
                    backdrop-filter: blur(4px);
                    text-align: left;
                    font-size: 0.85rem;
                    color: #374151;
                    cursor: pointer;
                    transition: all 0.2s;
                    -webkit-tap-highlight-color: transparent;
                    touch-action: manipulation;
                }
                .pfc-option:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.6);
                    transform: scale(1.01);
                }
                .pfc-option:active:not(:disabled) {
                    transform: scale(0.98);
                }
                @media (min-width: 640px) {
                    .pfc-option {
                        padding: 14px 20px;
                        font-size: 0.95rem;
                    }
                }
                .pfc-opt-correct {
                    background: rgba(74, 222, 128, 0.25);
                    border-color: #4ade80;
                    box-shadow: 0 0 16px rgba(74, 222, 128, 0.3);
                    color: #166534;
                }
                .pfc-opt-wrong {
                    background: rgba(248, 113, 113, 0.2);
                    border-color: #f87171;
                    color: #991b1b;
                }
                .pfc-opt-label {
                    font-weight: 700;
                    color: #9ca3af;
                    margin-right: 4px;
                }

                /* Rating buttons */
                .pfc-rate-buttons {
                    display: flex;
                    gap: 8px;
                    width: 100%;
                    justify-content: center;
                    margin-top: 20px;
                    padding: 0 8px;
                }
                .pfc-rate {
                    flex: 1;
                    max-width: 120px;
                    padding: 10px 14px;
                    border-radius: 10px;
                    border: 1.5px solid;
                    background: transparent;
                    font-weight: 700;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    -webkit-tap-highlight-color: transparent;
                    touch-action: manipulation;
                }
                .pfc-rate:active {
                    transform: scale(0.95);
                }
                @media (min-width: 640px) {
                    .pfc-rate {
                        padding: 10px 20px;
                        font-size: 0.9rem;
                    }
                }
                .pfc-rate-hard {
                    color: #fca5a5;
                    border-color: rgba(252, 165, 165, 0.4);
                }
                .pfc-rate-hard:hover {
                    background: rgba(239, 68, 68, 0.15);
                }
                .pfc-rate-good {
                    color: #fde68a;
                    border-color: rgba(253, 230, 138, 0.4);
                }
                .pfc-rate-good:hover {
                    background: rgba(245, 158, 11, 0.15);
                }
                .pfc-rate-easy {
                    color: #86efac;
                    border-color: rgba(134, 239, 172, 0.4);
                }
                .pfc-rate-easy:hover {
                    background: rgba(34, 197, 94, 0.15);
                }

                /* Hint */
                .pfc-hint {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 16px;
                    font-size: 0.7rem;
                    color: #9ca3af;
                    user-select: none;
                }

                @media (prefers-reduced-motion: reduce) {
                    .pfc-inner { transition: none; }
                    .pfc-image:hover { transform: none; }
                }
            `}</style>
    </div>
  );
};

export default PremiumFlashcard;
