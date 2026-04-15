// components/GamificationScore.tsx
// Componente de gamificación con score visual tipo videojuego

import React from 'react';
import { IconTrophy, IconBookOpen, IconClipboardCheck, IconAlertCircle, IconCheckCircle, IconCards } from '@/components/Common/Icons';

interface GamificationScoreProps {
  totalUnits: number;
  completedUnits: number;
  totalSessions: number;
  completedSessions: number;
  totalQuizzes: number;
  completedQuizzes: number;
  totalFlashcards?: number; // ⭐ NUEVO
  completedFlashcards?: number; // ⭐ NUEVO - flashcards dominadas (mastery_level >= 4)
  overallProgress: number; // 0-100
  className?: string;
}

/**
 * Componente de gamificación que muestra el progreso del estudiante
 * como un score de videojuego con estadísticas y advertencias
 */
const GamificationScore: React.FC<GamificationScoreProps> = ({
  totalUnits,
  completedUnits,
  totalSessions,
  completedSessions,
  totalQuizzes,
  completedQuizzes,
  totalFlashcards = 0,
  completedFlashcards = 0,
  overallProgress,
  className = ''
}) => {
  const pendingUnits = totalUnits - completedUnits;
  const pendingSessions = totalSessions - completedSessions;
  const pendingQuizzes = totalQuizzes - completedQuizzes;
  const pendingFlashcards = totalFlashcards - completedFlashcards;
  const hasPendingItems = pendingUnits > 0 || pendingSessions > 0 || pendingQuizzes > 0 || pendingFlashcards > 0;

  // Calcular score (puntos basados en completitud)
  // ⭐ ACTUALIZADO: Incluye flashcards dominadas
  const score = Math.round(
    (completedUnits * 10) +
    (completedSessions * 5) +
    (completedQuizzes * 15) +
    (completedFlashcards * 8) // ⭐ NUEVO: 8 puntos por flashcard dominada
  );

  // Determinar nivel basado en el progreso
  const getLevel = () => {
    if (overallProgress >= 100) return { level: 'Maestro', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (overallProgress >= 80) return { level: 'Avanzado', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (overallProgress >= 60) return { level: 'Intermedio', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (overallProgress >= 40) return { level: 'Principiante', color: 'text-green-600', bg: 'bg-green-100' };
    return { level: 'Novato', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const levelInfo = getLevel();

  // Color de la barra de progreso según el nivel
  const getProgressColor = () => {
    if (overallProgress >= 100) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (overallProgress >= 80) return 'bg-gradient-to-r from-purple-400 to-purple-600';
    if (overallProgress >= 60) return 'bg-gradient-to-r from-blue-400 to-blue-600';
    if (overallProgress >= 40) return 'bg-gradient-to-r from-green-400 to-green-600';
    return 'bg-gradient-to-r from-gray-300 to-gray-500';
  };

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg ${className}`}>
      {/* Header con Score y Nivel */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <IconTrophy className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
              {score}
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Score: {score} pts</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${levelInfo.bg} ${levelInfo.color}`}>
                Nivel: {levelInfo.level}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">{Math.round(overallProgress)}%</div>
          <div className="text-sm text-gray-600">Completado</div>
        </div>
      </div>

      {/* Barra de Progreso Principal */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500 ease-out rounded-full flex items-center justify-end pr-2`}
            style={{ width: `${Math.min(100, overallProgress)}%` }}
          >
            {overallProgress > 10 && (
              <span className="text-xs font-bold text-white drop-shadow">
                {Math.round(overallProgress)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className={`grid gap-4 mb-4 ${totalFlashcards > 0 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
        {/* Unidades */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <IconBookOpen className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-semibold text-gray-700">Unidades</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{completedUnits}</span>
            <span className="text-sm text-gray-500">/ {totalUnits}</span>
          </div>
          {pendingUnits > 0 && (
            <div className="mt-1 text-xs text-orange-600 font-medium">
              {pendingUnits} pendiente{pendingUnits > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Sesiones */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <IconBookOpen className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-semibold text-gray-700">Sesiones</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{completedSessions}</span>
            <span className="text-sm text-gray-500">/ {totalSessions}</span>
          </div>
          {pendingSessions > 0 && (
            <div className="mt-1 text-xs text-orange-600 font-medium">
              {pendingSessions} pendiente{pendingSessions > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Quizzes */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <IconClipboardCheck className="w-5 h-5 text-green-600" />
            <span className="text-xs font-semibold text-gray-700">Quizzes</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{completedQuizzes}</span>
            <span className="text-sm text-gray-500">/ {totalQuizzes}</span>
          </div>
          {pendingQuizzes > 0 && (
            <div className="mt-1 text-xs text-orange-600 font-medium">
              {pendingQuizzes} pendiente{pendingQuizzes > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Flashcards ⭐ NUEVO */}
        {totalFlashcards > 0 && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <IconCards className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-semibold text-gray-700">Flashcards</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{completedFlashcards}</span>
              <span className="text-sm text-gray-500">/ {totalFlashcards}</span>
            </div>
            {pendingFlashcards > 0 && (
              <div className="mt-1 text-xs text-orange-600 font-medium">
                {pendingFlashcards} pendiente{pendingFlashcards > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advertencias para elementos no completados */}
      {hasPendingItems && (
        <div className="bg-orange-50 border-l-4 border-orange-400 rounded-r-lg p-4">
          <div className="flex items-start gap-3">
            <IconAlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-orange-900 mb-2">
                Elementos Pendientes
              </h4>
              <ul className="space-y-1 text-xs text-orange-800">
                {pendingUnits > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                    <strong>{pendingUnits}</strong> unidad{pendingUnits > 1 ? 'es' : ''} sin completar
                  </li>
                )}
                {pendingSessions > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                    <strong>{pendingSessions}</strong> sesión{pendingSessions > 1 ? 'es' : ''} sin completar
                  </li>
                )}
                {pendingQuizzes > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                    <strong>{pendingQuizzes}</strong> quiz{pendingQuizzes > 1 ? 'zes' : ''} sin completar
                  </li>
                )}
                {pendingFlashcards > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                    <strong>{pendingFlashcards}</strong> flashcard{pendingFlashcards > 1 ? 's' : ''} sin dominar
                  </li>
                )}
              </ul>
              <p className="text-xs text-orange-700 mt-2 italic">
                Completa estos elementos para aumentar tu score y avanzar de nivel
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de felicitación si está completo */}
      {!hasPendingItems && overallProgress >= 100 && (
        <div className="bg-green-50 border-l-4 border-green-400 rounded-r-lg p-4">
          <div className="flex items-start gap-3">
            <IconCheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-900 mb-1">
                ¡Felicidades! 🎉
              </h4>
              <p className="text-xs text-green-800">
                Has completado todos los elementos del curso. ¡Eres un {levelInfo.level}!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamificationScore;

