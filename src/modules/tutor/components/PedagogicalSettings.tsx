// =====================================================
// Componente de Configuración Pedagógica Avanzada
// Panel completo para que los docentes configuren el comportamiento del tutor
// Incluye: estilos de enseñanza, tonos, voces, escalas de calificación, y más
// =====================================================

import React, { useState, useEffect } from 'react';
import type {
  PedagogicalSettings,
  TeachingStyle,
  TonePreference,
  DetailLevel,
  VoiceName,
  GradingScale,
  Course
} from '../types/pedagogical';

interface PedagogicalSettingsProps {
  courseId: string;
  course?: Course | null;
  initialSettings?: PedagogicalSettings | null;
  initialGradingScale?: GradingScale | null;
  onSave: (settings: Partial<PedagogicalSettings>) => Promise<boolean>;
  onSaveGradingScale?: (gradingScale: Partial<GradingScale>) => Promise<boolean>;
  onUploadImage?: (file: File) => Promise<string | null>;
  isLoading?: boolean;
  isTeacher?: boolean;
}

export const PedagogicalSettings: React.FC<PedagogicalSettingsProps> = ({
  courseId,
  course,
  initialSettings,
  initialGradingScale,
  onSave,
  onSaveGradingScale,
  onUploadImage,
  isLoading = false,
  isTeacher = true
}) => {
  // Estados del formulario
  const [settings, setSettings] = useState<Partial<PedagogicalSettings>>({
    teachingStyle: 'constructivista',
    tonePreference: 'amigable',
    detailLevel: 'medio',
    useExamples: true,
    encourageQuestions: true,
    voiceName: 'Kore',
    voiceSpeed: 1.0,
    enableAudioResponse: true,
    systemPromptOverride: ''
  });

  // Estados para escala de calificación
  const [gradingScale, setGradingScale] = useState<Partial<GradingScale>>({
    name: 'Escala Estándar',
    scale: [
      { grade: 'A+', minScore: 95, maxScore: 100, description: 'Excelente' },
      { grade: 'A', minScore: 90, maxScore: 94, description: 'Muy bueno' },
      { grade: 'B+', minScore: 85, maxScore: 89, description: 'Bueno' },
      { grade: 'B', minScore: 80, maxScore: 84, description: 'Satisfactorio' },
      { grade: 'C', minScore: 70, maxScore: 79, description: 'Aceptable' },
      { grade: 'F', minScore: 0, maxScore: 69, description: 'Reprobado' }
    ]
  });

  // Estados de UI
  const [isDirty, setIsDirty] = useState(false);
  const [isGradingDirty, setIsGradingDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [gradingSaveStatus, setGradingSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'pedagogical' | 'grading' | 'images' | 'advanced'>('pedagogical');
  const [previewMode, setPreviewMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Cargar configuración inicial
  useEffect(() => {
    if (initialSettings) {
      setSettings({
        teachingStyle: initialSettings.teachingStyle,
        tonePreference: initialSettings.tonePreference,
        detailLevel: initialSettings.detailLevel,
        useExamples: initialSettings.useExamples,
        encourageQuestions: initialSettings.encourageQuestions,
        voiceName: initialSettings.voiceName,
        voiceSpeed: initialSettings.voiceSpeed,
        enableAudioResponse: initialSettings.enableAudioResponse ?? true,
        systemPromptOverride: initialSettings.systemPromptOverride || ''
      });
      setIsDirty(false);
    }
  }, [initialSettings]);

  // Cargar escala de calificación inicial
  useEffect(() => {
    if (initialGradingScale) {
      setGradingScale({
        name: initialGradingScale.name,
        scale: initialGradingScale.scale
      });
      setIsGradingDirty(false);
    }
  }, [initialGradingScale]);

  // Manejar cambios en el formulario
  const handleChange = (field: keyof PedagogicalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  // Manejar cambios en la escala de calificación
  const handleGradingChange = (field: keyof GradingScale, value: any) => {
    setGradingScale(prev => ({ ...prev, [field]: value }));
    setIsGradingDirty(true);
    setGradingSaveStatus('idle');
  };

  // Agregar nuevo grado a la escala
  const addGrade = () => {
    const newGrade = {
      grade: '',
      minScore: 0,
      maxScore: 0,
      description: ''
    };
    setGradingScale(prev => ({
      ...prev,
      scale: [...(prev.scale || []), newGrade]
    }));
    setIsGradingDirty(true);
  };

  // Eliminar grado de la escala
  const removeGrade = (index: number) => {
    setGradingScale(prev => ({
      ...prev,
      scale: prev.scale?.filter((_, i) => i !== index) || []
    }));
    setIsGradingDirty(true);
  };

  // Actualizar grado específico
  const updateGrade = (index: number, field: keyof GradingScale['scale'][0], value: any) => {
    setGradingScale(prev => ({
      ...prev,
      scale: prev.scale?.map((grade, i) =>
        i === index ? { ...grade, [field]: value } : grade
      ) || []
    }));
    setIsGradingDirty(true);
  };

  // Guardar configuración
  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      const success = await onSave(settings);

      if (success) {
        setSaveStatus('success');
        setIsDirty(false);
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving pedagogical settings:', error);
      setSaveStatus('error');
    }
  };

  // Guardar escala de calificación
  const handleSaveGrading = async () => {
    if (!onSaveGradingScale) return;

    try {
      setGradingSaveStatus('saving');
      const success = await onSaveGradingScale(gradingScale);

      if (success) {
        setGradingSaveStatus('success');
        setIsGradingDirty(false);
        setTimeout(() => setGradingSaveStatus('idle'), 2000);
      } else {
        setGradingSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving grading scale:', error);
      setGradingSaveStatus('error');
    }
  };

  // Manejar subida de imagen
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onUploadImage || !event.target.files?.[0]) return;

    const file = event.target.files[0];
    setUploadingImage(true);

    try {
      const imageUrl = await onUploadImage(file);
      if (imageUrl) {
        // Aquí podrías actualizar el estado con la nueva imagen
        console.log('Imagen subida:', imageUrl);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  // Generar preview del prompt
  const generatePromptPreview = () => {
    const style = teachingStyleOptions.find(opt => opt.value === settings.teachingStyle);
    const tone = toneOptions.find(opt => opt.value === settings.tonePreference);
    const detail = detailLevelOptions.find(opt => opt.value === settings.detailLevel);

    return `Eres EduSpark, un tutor de IA especializado en educación personalizada.

ESTILO PEDAGÓGICO:
- Metodología: ${style?.label} - ${style?.description}
- Tono: ${tone?.label} - ${tone?.description}
- Nivel de detalle: ${detail?.label} - ${detail?.description}
- Incluir ejemplos: ${settings.useExamples ? 'Sí' : 'No'}
- Fomentar preguntas: ${settings.encourageQuestions ? 'Sí' : 'No'}

CONFIGURACIÓN DE VOZ:
- Voz: ${settings.voiceName}
- Velocidad: ${settings.voiceSpeed}x

${settings.systemPromptOverride ? `INSTRUCCIONES PERSONALIZADAS:\n${settings.systemPromptOverride}` : ''}`;
  };

  // Opciones para los selects
  const teachingStyleOptions: { value: TeachingStyle; label: string; description: string }[] = [
    { value: 'socratico', label: 'Socrático', description: 'Preguntas guiadas para que el estudiante llegue a sus propias conclusiones' },
    { value: 'directo', label: 'Directo', description: 'Explicaciones claras y estructuradas' },
    { value: 'colaborativo', label: 'Colaborativo', description: 'Fomenta el trabajo en equipo y la discusión' },
    { value: 'constructivista', label: 'Constructivista', description: 'Ayuda al estudiante a construir su propio conocimiento' }
  ];

  const toneOptions: { value: TonePreference; label: string; description: string }[] = [
    { value: 'amigable', label: 'Amigable', description: 'Tono casual y cercano' },
    { value: 'formal', label: 'Formal', description: 'Tono académico y profesional' },
    { value: 'motivador', label: 'Motivador', description: 'Tono alentador y positivo' },
    { value: 'neutro', label: 'Neutro', description: 'Tono equilibrado y objetivo' }
  ];

  const detailLevelOptions: { value: DetailLevel; label: string; description: string }[] = [
    { value: 'basico', label: 'Básico', description: 'Explicaciones simples y directas' },
    { value: 'medio', label: 'Medio', description: 'Explicaciones balanceadas' },
    { value: 'avanzado', label: 'Avanzado', description: 'Explicaciones detalladas y técnicas' }
  ];

  const voiceOptions: { value: VoiceName; label: string; description: string }[] = [
    { value: 'Kore', label: 'Kore', description: 'Voz femenina, clara y profesional' },
    { value: 'Charon', label: 'Charon', description: 'Voz masculina, profunda y autoritaria' },
    { value: 'Fenrir', label: 'Fenrir', description: 'Voz masculina, energética y motivadora' },
    { value: 'Aoede', label: 'Aoede', description: 'Voz femenina, cálida y expresiva' },
    { value: 'Puck', label: 'Puck', description: 'Voz neutra, versátil y amigable' }
  ];

  if (!isTeacher) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 text-center">
        <div className="text-slate-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Acceso Restringido</h3>
        <p className="text-slate-400">Solo los docentes pueden configurar las preferencias pedagógicas del curso.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700 px-6 py-4 border-b border-slate-600">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Configuración Pedagógica</h3>
            {course && (
              <p className="text-slate-400 text-sm">Curso: {course.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(isDirty || isGradingDirty) && (
              <span className="text-yellow-400 text-sm">* Cambios sin guardar</span>
            )}
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-3 py-1 text-sm bg-slate-600 text-slate-300 rounded hover:bg-slate-500 transition-colors"
            >
              {previewMode ? 'Ocultar Preview' : 'Ver Preview'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-600">
        {[
          { id: 'pedagogical', label: 'Pedagógico', icon: '🎓' },
          { id: 'grading', label: 'Calificaciones', icon: '📊' },
          { id: 'images', label: 'Imágenes', icon: '🖼️' },
          { id: 'advanced', label: 'Avanzado', icon: '⚙️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'text-sky-400 border-b-2 border-sky-400 bg-slate-700'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700'
              }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'pedagogical' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estilo de Enseñanza */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Estilo de Enseñanza
              </label>
              <select
                value={settings.teachingStyle || 'constructivista'}
                onChange={(e) => handleChange('teachingStyle', e.target.value as TeachingStyle)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {teachingStyleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                {teachingStyleOptions.find(opt => opt.value === settings.teachingStyle)?.description}
              </p>
            </div>

            {/* Tono de Respuestas */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Tono de Respuestas
              </label>
              <select
                value={settings.tonePreference || 'amigable'}
                onChange={(e) => handleChange('tonePreference', e.target.value as TonePreference)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {toneOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                {toneOptions.find(opt => opt.value === settings.tonePreference)?.description}
              </p>
            </div>

            {/* Nivel de Detalle */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Nivel de Detalle
              </label>
              <select
                value={settings.detailLevel || 'medio'}
                onChange={(e) => handleChange('detailLevel', e.target.value as DetailLevel)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {detailLevelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                {detailLevelOptions.find(opt => opt.value === settings.detailLevel)?.description}
              </p>
            </div>

            {/* Voz del Tutor */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Voz del Tutor
              </label>
              <select
                value={settings.voiceName || 'Kore'}
                onChange={(e) => handleChange('voiceName', e.target.value as VoiceName)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {voiceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">
                {voiceOptions.find(opt => opt.value === settings.voiceName)?.description}
              </p>
            </div>
          </div>

          {/* Velocidad de Voz */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Velocidad de Voz: {settings.voiceSpeed}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.voiceSpeed || 1.0}
              onChange={(e) => handleChange('voiceSpeed', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0.5x (Lento)</span>
              <span>1.0x (Normal)</span>
              <span>2.0x (Rápido)</span>
            </div>
          </div>

          {/* Opciones Adicionales */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-white">Opciones Adicionales</h4>

            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.useExamples || false}
                  onChange={(e) => handleChange('useExamples', e.target.checked)}
                  className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-600 rounded focus:ring-sky-500"
                />
                <span className="text-slate-300">Incluir ejemplos prácticos en las respuestas</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.encourageQuestions || false}
                  onChange={(e) => handleChange('encourageQuestions', e.target.checked)}
                  className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-600 rounded focus:ring-sky-500"
                />
                <span className="text-slate-300">Fomentar que los estudiantes hagan preguntas</span>
              </label>

              <div className="pt-4 border-t border-slate-700">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.enableAudioResponse ?? true}
                    onChange={(e) => handleChange('enableAudioResponse', e.target.checked)}
                    className="w-4 h-4 text-sky-600 bg-slate-700 border-slate-600 rounded focus:ring-sky-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-slate-300 font-medium">Habilitar Respuesta por Audio</span>
                    <span className="text-xs text-slate-400">Permite que el tutor responda con voz automáticamente o bajo petición.</span>
                  </div>
                </label>

                {settings.enableAudioResponse && (
                  <div className="mt-4 p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg">
                    <div className="flex gap-3">
                      <span className="text-amber-400">⚠️</span>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-200">Aviso de Compatibilidad</p>
                        <p className="text-xs text-amber-300/80 leading-relaxed">
                          Las funciones de voz y reconocimiento de audio pueden no funcionar correctamente en navegadores con bloqueadores estrictos como <strong>Brave</strong> o en navegadores móviles antiguos. Se recomienda usar <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong> para la mejor experiencia.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botón de Guardar */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={!isDirty || isLoading || saveStatus === 'saving'}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${saveStatus === 'saving' || isLoading
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : saveStatus === 'success'
                    ? 'bg-green-600 text-white'
                    : saveStatus === 'error'
                      ? 'bg-red-600 text-white'
                      : isDirty
                        ? 'bg-sky-600 text-white hover:bg-sky-500'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
            >
              {saveStatus === 'saving' ? 'Guardando...' :
                saveStatus === 'success' ? '✓ Guardado' :
                  saveStatus === 'error' ? '✗ Error' : 'Guardar Configuración'}
            </button>
          </div>
        </div>
      )}

      {/* Tab de Calificaciones */}
      {activeTab === 'grading' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre de la Escala
              </label>
              <input
                type="text"
                value={gradingScale.name || ''}
                onChange={(e) => handleGradingChange('name', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Ej: Escala de Biología"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-white">Grados de Calificación</h4>
                <button
                  onClick={addGrade}
                  className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors"
                >
                  + Agregar Grado
                </button>
              </div>

              <div className="space-y-3">
                {gradingScale.scale?.map((grade, index) => (
                  <div key={index} className="bg-slate-700 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Grado</label>
                        <input
                          type="text"
                          value={grade.grade}
                          onChange={(e) => updateGrade(index, 'grade', e.target.value)}
                          className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                          placeholder="A+"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Puntaje Mín.</label>
                        <input
                          type="number"
                          value={grade.minScore}
                          onChange={(e) => updateGrade(index, 'minScore', parseInt(e.target.value))}
                          className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Puntaje Máx.</label>
                        <input
                          type="number"
                          value={grade.maxScore}
                          onChange={(e) => updateGrade(index, 'maxScore', parseInt(e.target.value))}
                          className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => removeGrade(index)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-slate-400 mb-1">Descripción</label>
                      <input
                        type="text"
                        value={grade.description}
                        onChange={(e) => updateGrade(index, 'description', e.target.value)}
                        className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                        placeholder="Excelente desempeño"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Botón de Guardar Escala */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveGrading}
              disabled={!isGradingDirty || !onSaveGradingScale || gradingSaveStatus === 'saving'}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${gradingSaveStatus === 'saving'
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : gradingSaveStatus === 'success'
                    ? 'bg-green-600 text-white'
                    : gradingSaveStatus === 'error'
                      ? 'bg-red-600 text-white'
                      : isGradingDirty
                        ? 'bg-sky-600 text-white hover:bg-sky-500'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
            >
              {gradingSaveStatus === 'saving' ? 'Guardando...' :
                gradingSaveStatus === 'success' ? '✓ Guardado' :
                  gradingSaveStatus === 'error' ? '✗ Error' : 'Guardar Escala'}
            </button>
          </div>
        </div>
      )}

      {/* Tab de Imágenes */}
      {activeTab === 'images' && (
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="text-slate-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-white mb-2">Gestión de Imágenes</h4>
            <p className="text-slate-400 mb-4">Sube imágenes para enriquecer el contenido del curso</p>

            <label className="inline-flex items-center px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-500 transition-colors cursor-pointer">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {uploadingImage ? 'Subiendo...' : 'Subir Imagen'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage || !onUploadImage}
              />
            </label>
          </div>
        </div>
      )}

      {/* Tab Avanzado */}
      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-white">Prompt Personalizado</h4>
            <p className="text-slate-400 text-sm">
              Personaliza completamente el comportamiento del tutor con instrucciones específicas.
              Esto sobrescribirá la configuración automática.
            </p>

            <textarea
              value={settings.systemPromptOverride || ''}
              onChange={(e) => handleChange('systemPromptOverride', e.target.value)}
              placeholder="Eres EduSpark, un tutor especializado en [tu materia]. Tu objetivo es..."
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 h-32 resize-none"
            />
          </div>

          {/* Preview del Prompt */}
          {previewMode && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Preview del Prompt</h4>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">
                  {generatePromptPreview()}
                </pre>
              </div>
            </div>
          )}

          {/* Botón de Guardar */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={!isDirty || isLoading || saveStatus === 'saving'}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${saveStatus === 'saving' || isLoading
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : saveStatus === 'success'
                    ? 'bg-green-600 text-white'
                    : saveStatus === 'error'
                      ? 'bg-red-600 text-white'
                      : isDirty
                        ? 'bg-sky-600 text-white hover:bg-sky-500'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }`}
            >
              {saveStatus === 'saving' ? 'Guardando...' :
                saveStatus === 'success' ? '✓ Guardado' :
                  saveStatus === 'error' ? '✗ Error' : 'Guardar Configuración'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
