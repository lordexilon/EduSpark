/**
 * Componente de Tutorial Interactivo
 * Muestra un overlay con pasos guiados que resaltan elementos de la interfaz
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, SkipForward } from 'lucide-react';
import type { TutorialConfig, TutorialStep } from '@/services/tutorialService';
import { saveTutorialProgress, clearTutorialProgress } from '@/services/tutorialService';

interface InteractiveTutorialProps {
  config: TutorialConfig;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (dontShowAgain?: boolean) => void;
  startStep?: number;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  config,
  isOpen,
  onClose,
  onComplete,
  startStep = 0
}) => {
  const [currentStep, setCurrentStep] = useState(startStep);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const steps = config.steps;
  const currentStepData = steps[currentStep];

  // Buscar y resaltar el elemento objetivo
  const updateHighlight = useCallback(() => {
    if (!currentStepData) return;

    try {
      // Intentar múltiples veces si el elemento no está disponible
      let attempts = 0;
      const maxAttempts = 5;
      
      const findElement = () => {
        const element = document.querySelector(currentStepData.target) as HTMLElement;
        
        if (element) {
          setHighlightedElement(element);
          const rect = element.getBoundingClientRect();
          setHighlightRect(rect);
          
          // Scroll suave al elemento si está fuera de la vista
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          }, 100);
          
          // Observar cambios de tamaño/posición
          if (observerRef.current) {
            observerRef.current.disconnect();
          }
          
          observerRef.current = new ResizeObserver(() => {
            const newRect = element.getBoundingClientRect();
            setHighlightRect(newRect);
          });
          
          observerRef.current.observe(element);
        } else if (attempts < maxAttempts) {
          attempts++;
          // Reintentar después de un breve delay
          setTimeout(findElement, 200);
        } else {
          console.warn('No se encontró el elemento:', currentStepData.target);
          setHighlightedElement(null);
          setHighlightRect(null);
        }
      };
      
      findElement();
    } catch (error) {
      console.error('Error buscando elemento:', error);
      setHighlightedElement(null);
      setHighlightRect(null);
    }
  }, [currentStepData]);

  // Actualizar highlight cuando cambia el paso
  useEffect(() => {
    if (isOpen && currentStepData) {
      // Delay más largo para asegurar que el DOM esté completamente renderizado
      const timer = setTimeout(() => {
        updateHighlight();
      }, 800);

      return () => {
        clearTimeout(timer);
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    } else {
      // Limpiar cuando se cierra
      setHighlightedElement(null);
      setHighlightRect(null);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    }
  }, [isOpen, currentStep, currentStepData, updateHighlight]);

  // Actualizar highlight en scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => updateHighlight();
    const handleResize = () => updateHighlight();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateHighlight]);

  // Ejecutar acción del paso si existe
  useEffect(() => {
    if (!isOpen || !currentStepData?.action) return;

    const executeAction = async () => {
      if (currentStepData.actionDelay) {
        await new Promise(resolve => setTimeout(resolve, currentStepData.actionDelay));
      }

      switch (currentStepData.action) {
        case 'click':
          if (currentStepData.actionTarget) {
            const target = document.querySelector(currentStepData.actionTarget) as HTMLElement;
            if (target) {
              target.click();
              // Esperar un momento para que la acción se complete
              setTimeout(() => updateHighlight(), 300);
            }
          }
          break;
        case 'scroll':
          if (highlightedElement) {
            highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          break;
        case 'wait':
          // Solo esperar, no hacer nada
          break;
      }
    };

    executeAction();
  }, [isOpen, currentStep, currentStepData, highlightedElement, updateHighlight]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveTutorialProgress(config.id, nextStep);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveTutorialProgress(config.id, prevStep);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    clearTutorialProgress(config.id);
    onComplete(dontShowAgain);
  };

  const handleClose = () => {
    // Guardar progreso antes de cerrar
    saveTutorialProgress(config.id, currentStep);
    onClose();
  };

  if (!isOpen || !currentStepData) return null;

  // Calcular posición del tooltip
  const getTooltipPosition = () => {
    // Si el target es 'body' o no hay highlightRect, centrar en pantalla
    if (!highlightRect || currentStepData.target === 'body') {
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const,
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto'
      };
    }

    const position = currentStepData.position || 'bottom';
    const spacing = 20;
    const tooltipWidth = Math.min(400, window.innerWidth - 40); // Responsive width
    const tooltipHeight = 400; // Altura estimada más generosa para incluir controles
    const margin = 20;

    let top = 0;
    let left = 0;
    let useFallback = false;

    // Intentar posición preferida
    switch (position) {
      case 'top':
        top = highlightRect.top - tooltipHeight - spacing;
        left = highlightRect.left + (highlightRect.width / 2) - (tooltipWidth / 2);
        // Verificar si cabe
        if (top < margin) useFallback = true;
        break;
      case 'bottom':
        top = highlightRect.bottom + spacing;
        left = highlightRect.left + (highlightRect.width / 2) - (tooltipWidth / 2);
        // Verificar si cabe
        if (top + tooltipHeight > window.innerHeight - margin) useFallback = true;
        break;
      case 'left':
        top = highlightRect.top + (highlightRect.height / 2) - (tooltipHeight / 2);
        left = highlightRect.left - tooltipWidth - spacing;
        // Verificar si cabe
        if (left < margin || top < margin || top + tooltipHeight > window.innerHeight - margin) useFallback = true;
        break;
      case 'right':
        top = highlightRect.top + (highlightRect.height / 2) - (tooltipHeight / 2);
        left = highlightRect.right + spacing;
        // Verificar si cabe
        if (left + tooltipWidth > window.innerWidth - margin || top < margin || top + tooltipHeight > window.innerHeight - margin) useFallback = true;
        break;
      case 'center':
        top = window.innerHeight / 2 - tooltipHeight / 2;
        left = window.innerWidth / 2 - tooltipWidth / 2;
        break;
    }

    // Si la posición preferida no cabe, usar fallback inteligente
    if (useFallback) {
      // Intentar posición alternativa: centrar verticalmente a la derecha o izquierda
      if (highlightRect.right + tooltipWidth + spacing < window.innerWidth) {
        // Cabe a la derecha
        left = highlightRect.right + spacing;
        top = Math.max(margin, Math.min(highlightRect.top, window.innerHeight - tooltipHeight - margin));
      } else if (highlightRect.left - tooltipWidth - spacing > margin) {
        // Cabe a la izquierda
        left = highlightRect.left - tooltipWidth - spacing;
        top = Math.max(margin, Math.min(highlightRect.top, window.innerHeight - tooltipHeight - margin));
      } else {
        // Si no cabe en ningún lado, centrar en pantalla (mejor que quede fuera)
        top = Math.max(margin, Math.min((window.innerHeight - tooltipHeight) / 2, window.innerHeight - tooltipHeight - margin));
        left = Math.max(margin, Math.min((window.innerWidth - tooltipWidth) / 2, window.innerWidth - tooltipWidth - margin));
      }
    }

    // Asegurar que el tooltip esté completamente dentro de la ventana
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));

    return {
      top: `${top}px`,
      left: `${left}px`,
      position: 'fixed' as const,
      maxWidth: `${tooltipWidth}px`,
      maxHeight: '80vh',
      overflowY: 'auto' as const
    };
  };

  if (!isOpen || !currentStepData) return null;

  const tooltipStyle = getTooltipPosition();

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none" style={{ isolation: 'isolate' }}>
      {/* Overlay oscuro - solo si hay un elemento destacado, sino mostrar overlay completo */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 transition-opacity pointer-events-auto"
        style={{
          clipPath: highlightRect && currentStepData.target !== 'body'
            ? `polygon(
                0% 0%, 
                0% 100%, 
                ${highlightRect.left}px 100%, 
                ${highlightRect.left}px ${highlightRect.top}px, 
                ${highlightRect.right}px ${highlightRect.top}px, 
                ${highlightRect.right}px ${highlightRect.bottom}px, 
                ${highlightRect.left}px ${highlightRect.bottom}px, 
                ${highlightRect.left}px 100%, 
                100% 100%, 
                100% 0%
              )`
            : undefined
        }}
        onClick={handleClose}
      />

      {/* Highlight del elemento - solo si no es el body */}
      {highlightRect && currentStepData.target !== 'body' && (
        <div
          className="fixed z-[9999] border-4 border-blue-500 rounded-lg shadow-2xl pointer-events-none transition-all"
          style={{
            top: `${highlightRect.top - 4}px`,
            left: `${highlightRect.left - 4}px`,
            width: `${highlightRect.width + 8}px`,
            height: `${highlightRect.height + 8}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.5)'
          }}
        />
      )}

      {/* Tooltip con información del paso */}
      <div
        ref={stepRef}
        className="fixed z-[10000] bg-white rounded-lg shadow-2xl flex flex-col pointer-events-auto"
        style={{
          ...tooltipStyle,
          width: 'min(400px, calc(90vw - 40px))',
          maxWidth: 'min(400px, calc(90vw - 40px))',
          maxHeight: 'min(500px, 80vh)',
          minHeight: '200px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          // Asegurar que esté dentro de la ventana con márgenes
          top: tooltipStyle.top,
          left: tooltipStyle.left,
          right: 'auto',
          bottom: 'auto',
          // Asegurar visibilidad
          visibility: 'visible',
          opacity: 1
        }}
        onClick={(e) => e.stopPropagation()} // Prevenir que se cierre al hacer clic en el tooltip
        onMouseDown={(e) => e.stopPropagation()} // Prevenir que se cierre al hacer clic
      >
        <div className="p-6 flex-shrink-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {currentStepData.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Paso {currentStep + 1} de {steps.length}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="Cerrar tutorial"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido - scrollable si es necesario, con espacio para los botones */}
        <div className="mb-2 flex-1 overflow-y-auto min-h-0 pr-2 max-h-[calc(80vh-200px)]">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
            {currentStepData.content}
          </p>
        </div>
        </div>

        {/* Footer con controles - siempre visible en la parte inferior, sticky */}
        <div className="p-4 pt-3 space-y-3 flex-shrink-0 border-t-2 border-gray-200 bg-white rounded-b-lg sticky bottom-0">
          {/* Checkbox "No volver a mostrar" - solo en el último paso */}
          {currentStep === steps.length - 1 && (
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <input
                type="checkbox"
                id="dont-show-again"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="dont-show-again"
                className="text-sm text-gray-700 cursor-pointer select-none"
              >
                No volver a mostrar este tutorial
              </label>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors whitespace-nowrap min-w-[80px] justify-center"
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip();
                }}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors whitespace-nowrap"
              >
                <SkipForward size={16} />
                Omitir
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap shadow-md min-w-[100px] justify-center"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Siguiente
                    <ChevronRight size={16} />
                  </>
                ) : (
                  <>
                    Finalizar
                    <Play size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Indicadores de progreso */}
        <div className="mt-4 flex items-center gap-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-blue-600'
                  : index < currentStep
                  ? 'bg-blue-400'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

