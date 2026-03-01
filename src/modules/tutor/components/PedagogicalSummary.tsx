// =====================================================
// Componente de Resumen de Configuración Pedagógica
// Muestra un resumen visual de la configuración actual
// =====================================================

import React from 'react';
import type { PedagogicalSettings, GradingScale } from '../types/pedagogical';

interface PedagogicalSummaryProps {
  settings: PedagogicalSettings;
  gradingScale?: GradingScale | null;
  courseName?: string;
  className?: string;
}

export const PedagogicalSummary: React.FC<PedagogicalSummaryProps> = ({
  settings,
  gradingScale,
  courseName,
  className = ''
}) => {
  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'socratico': return '🤔';
      case 'directo': return '📚';
      case 'colaborativo': return '👥';
      case 'constructivista': return '🏗️';
      default: return '🎓';
    }
  };

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case 'amigable': return '😊';
      case 'formal': return '🎩';
      case 'motivador': return '💪';
      case 'neutro': return '😐';
      default: return '🎭';
    }
  };

  const getDetailIcon = (detail: string) => {
    switch (detail) {
      case 'basico': return '📖';
      case 'medio': return '📚';
      case 'avanzado': return '📖';
      default: return '📄';
    }
  };

  const getVoiceIcon = (voice: string) => {
    switch (voice) {
      case 'Kore': return '👩';
      case 'Charon': return '👨';
      case 'Fenrir': return '👨';
      case 'Aoede': return '👩';
      case 'Puck': return '🤖';
      default: return '🎤';
    }
  };

  return (
    <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Resumen de Configuración</h3>
        {courseName && (
          <span className="text-slate-400 text-sm">Curso: {courseName}</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estilo de Enseñanza */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">{getStyleIcon(settings.teachingStyle)}</span>
            <h4 className="font-medium text-white">Estilo</h4>
          </div>
          <p className="text-slate-300 text-sm capitalize">{settings.teachingStyle}</p>
          <p className="text-slate-400 text-xs mt-1">
            {settings.teachingStyle === 'socratico' && 'Preguntas guiadas'}
            {settings.teachingStyle === 'directo' && 'Explicaciones claras'}
            {settings.teachingStyle === 'colaborativo' && 'Trabajo en equipo'}
            {settings.teachingStyle === 'constructivista' && 'Construcción del conocimiento'}
          </p>
        </div>

        {/* Tono */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">{getToneIcon(settings.tonePreference)}</span>
            <h4 className="font-medium text-white">Tono</h4>
          </div>
          <p className="text-slate-300 text-sm capitalize">{settings.tonePreference}</p>
          <p className="text-slate-400 text-xs mt-1">
            {settings.tonePreference === 'amigable' && 'Cercano y casual'}
            {settings.tonePreference === 'formal' && 'Académico y profesional'}
            {settings.tonePreference === 'motivador' && 'Alentador y positivo'}
            {settings.tonePreference === 'neutro' && 'Equilibrado y objetivo'}
          </p>
        </div>

        {/* Nivel de Detalle */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">{getDetailIcon(settings.detailLevel)}</span>
            <h4 className="font-medium text-white">Detalle</h4>
          </div>
          <p className="text-slate-300 text-sm capitalize">{settings.detailLevel}</p>
          <p className="text-slate-400 text-xs mt-1">
            {settings.detailLevel === 'basico' && 'Explicaciones simples'}
            {settings.detailLevel === 'medio' && 'Explicaciones balanceadas'}
            {settings.detailLevel === 'avanzado' && 'Explicaciones técnicas'}
          </p>
        </div>

        {/* Voz */}
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">{getVoiceIcon(settings.voiceName)}</span>
            <h4 className="font-medium text-white">Voz</h4>
          </div>
          <p className="text-slate-300 text-sm">{settings.voiceName}</p>
          <p className="text-slate-400 text-xs mt-1">
            {settings.voiceSpeed}x velocidad
          </p>
        </div>
      </div>

      {/* Opciones Adicionales */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-700 p-4 rounded-lg">
          <h4 className="font-medium text-white mb-3">Características</h4>
          <div className="space-y-2">
            <div className="flex items-center">
              <span className={`w-2 h-2 rounded-full mr-3 ${settings.useExamples ? 'bg-green-500' : 'bg-slate-500'}`}></span>
              <span className="text-slate-300 text-sm">
                {settings.useExamples ? 'Incluye ejemplos' : 'Sin ejemplos'}
              </span>
            </div>
            <div className="flex items-center">
              <span className={`w-2 h-2 rounded-full mr-3 ${settings.encourageQuestions ? 'bg-green-500' : 'bg-slate-500'}`}></span>
              <span className="text-slate-300 text-sm">
                {settings.encourageQuestions ? 'Fomenta preguntas' : 'No fomenta preguntas'}
              </span>
            </div>
          </div>
        </div>

        {/* Escala de Calificación */}
        {gradingScale && (
          <div className="bg-slate-700 p-4 rounded-lg">
            <h4 className="font-medium text-white mb-3">Escala de Calificación</h4>
            <p className="text-slate-300 text-sm mb-2">{gradingScale.name}</p>
            <div className="space-y-1">
              {gradingScale.scale?.slice(0, 3).map((grade, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-slate-400">{grade.grade}</span>
                  <span className="text-slate-300">{grade.minScore}-{grade.maxScore}</span>
                </div>
              ))}
              {gradingScale.scale && gradingScale.scale.length > 3 && (
                <div className="text-xs text-slate-400">
                  +{gradingScale.scale.length - 3} grados más
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Prompt Personalizado */}
      {settings.systemPromptOverride && (
        <div className="mt-6 bg-slate-700 p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Prompt Personalizado</h4>
          <p className="text-slate-400 text-sm">
            Configuración personalizada activa
          </p>
          <div className="mt-2 bg-slate-900 p-3 rounded text-xs text-slate-300 max-h-20 overflow-y-auto">
            {settings.systemPromptOverride.substring(0, 200)}
            {settings.systemPromptOverride.length > 200 && '...'}
          </div>
        </div>
      )}
    </div>
  );
};
