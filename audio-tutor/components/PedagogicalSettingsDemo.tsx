// =====================================================
// Componente de Demostración del Panel de Configuración Pedagógica
// Muestra cómo integrar y usar el panel de configuración
// =====================================================

import React, { useState, useEffect } from 'react';
import { PedagogicalSettings } from './PedagogicalSettings';
import { PedagogicalSummary } from './PedagogicalSummary';
import { usePedagogicalSettings } from '../hooks/usePedagogicalSettings';
import type { Course } from '../types/pedagogical';

interface PedagogicalSettingsDemoProps {
  courseId: string;
  teacherId: string;
  className?: string;
}

export const PedagogicalSettingsDemo: React.FC<PedagogicalSettingsDemoProps> = ({
  courseId,
  teacherId,
  className = ''
}) => {
  const [showSummary, setShowSummary] = useState(true);
  const [demoCourse, setDemoCourse] = useState<Course | null>(null);

  // Hook para gestión de configuración
  const {
    settings,
    gradingScale,
    isLoading,
    isSaving,
    error,
    updateSettings,
    updateGradingScale,
    refreshSettings,
    refreshGradingScale,
    hasChanges,
    canSave,
    getSettingsSummary
  } = usePedagogicalSettings({
    courseId,
    teacherId,
    initialSettings: null,
    initialGradingScale: null
  });

  // Cargar datos del curso de demostración
  useEffect(() => {
    // Simular carga de curso
    setDemoCourse({
      id: courseId,
      name: 'Biología General',
      description: 'Curso introductorio de biología para estudiantes de primer año',
      teacherId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }, [courseId, teacherId]);

  // Manejar guardado de configuración
  const handleSaveSettings = async (updates: any): Promise<boolean> => {
    console.log('Guardando configuración pedagógica:', updates);
    
    // Simular delay de guardado
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // En una implementación real, aquí se llamaría a la API
    return true;
  };

  // Manejar guardado de escala de calificación
  const handleSaveGradingScale = async (updates: any): Promise<boolean> => {
    console.log('Guardando escala de calificación:', updates);
    
    // Simular delay de guardado
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // En una implementación real, aquí se llamaría a la API
    return true;
  };

  // Manejar subida de imagen
  const handleImageUpload = async (file: File): Promise<string | null> => {
    console.log('Subiendo imagen:', file.name);
    
    // Simular delay de subida
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // En una implementación real, aquí se subiría la imagen
    return `https://example.com/images/${file.name}`;
  };

  if (isLoading) {
    return (
      <div className={`bg-slate-800 rounded-lg p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controles */}
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Panel de Configuración Pedagógica</h2>
            <p className="text-slate-400">Personaliza el comportamiento del tutor virtual para tu curso</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="px-4 py-2 bg-slate-600 text-slate-300 rounded hover:bg-slate-500 transition-colors"
            >
              {showSummary ? 'Ocultar Resumen' : 'Mostrar Resumen'}
            </button>
            <button
              onClick={refreshSettings}
              className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-500 transition-colors"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Estado de la configuración */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="font-medium text-white mb-2">Estado</h3>
            <div className="flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${hasChanges ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
              <span className="text-slate-300 text-sm">
                {hasChanges ? 'Cambios pendientes' : 'Guardado'}
              </span>
            </div>
          </div>

          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="font-medium text-white mb-2">Configuración</h3>
            <p className="text-slate-300 text-sm">{getSettingsSummary()}</p>
          </div>

          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="font-medium text-white mb-2">Escala de Calificación</h3>
            <p className="text-slate-300 text-sm">
              {gradingScale ? `${gradingScale.scale?.length || 0} grados` : 'No configurada'}
            </p>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Resumen de configuración */}
      {showSummary && settings && (
        <PedagogicalSummary
          settings={settings}
          gradingScale={gradingScale}
          courseName={demoCourse?.name}
        />
      )}

      {/* Panel de configuración principal */}
      <PedagogicalSettings
        courseId={courseId}
        course={demoCourse}
        initialSettings={settings}
        initialGradingScale={gradingScale}
        onSave={handleSaveSettings}
        onSaveGradingScale={handleSaveGradingScale}
        onUploadImage={handleImageUpload}
        isLoading={isSaving}
        isTeacher={true}
      />

      {/* Información de demostración */}
      <div className="bg-blue-900 border border-blue-700 text-blue-300 px-4 py-3 rounded">
        <div className="flex items-start">
          <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-medium mb-1">Modo Demostración</h4>
            <p className="text-sm">
              Este es un panel de demostración. En una implementación real, los cambios se guardarían 
              automáticamente en la base de datos y se aplicarían inmediatamente al tutor virtual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
