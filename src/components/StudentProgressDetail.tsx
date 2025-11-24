// components/StudentProgressDetail.tsx
// Componente para mostrar el progreso detallado de un estudiante en un curso

import React from 'react';
import { IconBookOpen, IconClipboardCheck, IconCheckCircle, IconClock } from './Icons';
import ProgressBar from './ProgressBar';

interface StudentProgressDetailProps {
  studentId: string;
  studentName: string;
  courseId: number;
  totalUnits: number;
  completedUnits: number;
  totalSessions: number;
  completedSessions: number;
  totalQuizzes: number;
  completedQuizzes: number;
  overallProgress: number;
  timeSpentMinutes: number;
  className?: string;
  showDetails?: boolean;
}

/**
 * Componente que muestra el progreso detallado de un estudiante
 * Similar a GamificationScore pero para visualización por docentes
 */
const StudentProgressDetail: React.FC<StudentProgressDetailProps> = ({
  studentName,
  totalUnits,
  completedUnits,
  totalSessions,
  completedSessions,
  totalQuizzes,
  completedQuizzes,
  overallProgress,
  timeSpentMinutes,
  className = '',
  showDetails = true
}) => {
  const pendingUnits = totalUnits - completedUnits;
  const pendingSessions = totalSessions - completedSessions;
  const pendingQuizzes = totalQuizzes - completedQuizzes;
  const hasPendingItems = pendingUnits > 0 || pendingSessions > 0 || pendingQuizzes > 0;

  const hours = Math.floor(timeSpentMinutes / 60);
  const minutes = timeSpentMinutes % 60;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{studentName}</h3>
          <p className="text-sm text-gray-600">Progreso del Curso</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{Math.round(overallProgress)}%</div>
          <div className="text-xs text-gray-500">Completado</div>
        </div>
      </div>

      {/* Barra de Progreso */}
      <div className="mb-4">
        <ProgressBar 
          value={overallProgress} 
          color="var(--primary)"
          height="h-3"
        />
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <IconBookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-gray-700">Unidades</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">{completedUnits}</span>
            <span className="text-sm text-gray-500">/ {totalUnits}</span>
          </div>
          {pendingUnits > 0 && (
            <div className="mt-1 text-xs text-orange-600">
              {pendingUnits} pendiente{pendingUnits > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <IconBookOpen className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-gray-700">Sesiones</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">{completedSessions}</span>
            <span className="text-sm text-gray-500">/ {totalSessions}</span>
          </div>
          {pendingSessions > 0 && (
            <div className="mt-1 text-xs text-orange-600">
              {pendingSessions} pendiente{pendingSessions > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <IconClipboardCheck className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-gray-700">Quizzes</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">{completedQuizzes}</span>
            <span className="text-sm text-gray-500">/ {totalQuizzes}</span>
          </div>
          {pendingQuizzes > 0 && (
            <div className="mt-1 text-xs text-orange-600">
              {pendingQuizzes} pendiente{pendingQuizzes > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Tiempo invertido */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <IconClock className="w-4 h-4" />
        <span>
          Tiempo invertido: {hours > 0 ? `${hours}h ` : ''}{minutes}m
        </span>
      </div>

      {/* Advertencias o mensaje de completitud */}
      {showDetails && (
        <>
          {hasPendingItems ? (
            <div className="bg-orange-50 border-l-4 border-orange-400 rounded-r-lg p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-orange-900 mb-1">
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
                  </ul>
                </div>
              </div>
            </div>
          ) : overallProgress >= 100 ? (
            <div className="bg-green-50 border-l-4 border-green-400 rounded-r-lg p-3">
              <div className="flex items-start gap-2">
                <IconCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-green-900 mb-1">
                    ¡Curso Completado! 🎉
                  </h4>
                  <p className="text-xs text-green-800">
                    El estudiante ha completado todos los elementos del curso.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default StudentProgressDetail;

