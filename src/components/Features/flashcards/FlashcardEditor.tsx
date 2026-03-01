// components/flashcards/FlashcardEditor.tsx
// Editor para crear/editar flashcards

import React, { useState, useRef } from 'react';
import { Flashcard, AnswerOption } from '@/services/flashcardService';
import { uploadFlashcardImage } from '@/services/flashcardService';
import { CourseUnit, Session } from '@/services/teacherCourses';
import Button from '@/components/Common/Button';
import Card from '@/components/Common/Card';
import { IconUpload, IconX, IconImage, IconPlus, IconTrash, IconSparkles, IconLoader, IconRefreshCw } from '@/components/Common/Icons';
import { AiService } from '@/services/aiService';
import { getAiImageQuota } from '@/services/tutorLimitsService';
import { useAuth } from '@/hooks/useAuth';

interface FlashcardEditorProps {
  flashcard?: Flashcard;
  courseId: number;
  unitId?: string;
  sessionId?: string;
  units?: CourseUnit[];
  sessions?: Session[];
  onSave: (flashcard: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

const FlashcardEditor: React.FC<FlashcardEditorProps> = ({
  flashcard,
  courseId,
  unitId: initialUnitId,
  sessionId: initialSessionId,
  units = [],
  sessions = [],
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState(flashcard?.title || '');
  const [frontText, setFrontText] = useState(flashcard?.front_text || '');
  const [backText, setBackText] = useState(flashcard?.back_text || '');
  const [frontImageUrl, setFrontImageUrl] = useState(flashcard?.front_image_url || '');
  const [backImageUrl, setBackImageUrl] = useState(flashcard?.back_image_url || '');
  const [tags, setTags] = useState(flashcard?.tags?.join(', ') || '');
  const [difficultyLevel, setDifficultyLevel] = useState(flashcard?.difficulty_level || 1);
  const [pointsValue, setPointsValue] = useState(flashcard?.points_value || 0);
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(initialUnitId || flashcard?.unit_id);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(initialSessionId || flashcard?.session_id);
  const [uploading, setUploading] = useState(false);
  const [uploadingField, setUploadingField] = useState<'front' | 'back' | null>(null);
  const [isMultipleChoice, setIsMultipleChoice] = useState(flashcard?.is_multiple_choice || false);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>(
    flashcard?.answer_options || [
      { label: 'A', text: '' },
      { label: 'B', text: '' },
      { label: 'C', text: '' },
      { label: 'D', text: '' },
    ]
  );
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | undefined>(
    flashcard?.correct_answer_index
  );

  // AI State
  const { user } = useAuth();
  const [imageQuota, setImageQuota] = useState<number | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatingField, setGeneratingField] = useState<'front' | 'back' | null>(null);

  // Load Quota
  React.useEffect(() => {
    if (user) {
      getAiImageQuota(user.id).then(setImageQuota);
    }
  }, [user]);

  const handleGenerateAiImage = async (type: 'front' | 'back') => {
    if (imageQuota !== null && imageQuota <= 0) {
      alert('⚠️ Has alcanzado tu límite diario de generación de imágenes.');
      return;
    }

    const baseText = type === 'front' ? frontText : backText;
    const prompt = window.prompt(
      `Describe la imagen para el ${type === 'front' ? 'frente' : 'reverso'} (en Inglés o Español):`,
      baseText || 'Professional educational illustration representing...'
    );

    if (!prompt) return;

    setIsGeneratingImage(true);
    setGeneratingField(type);

    try {
      // 1. Refine prompt (optional but recommended for better results)
      // const refinedPrompt = await AiService.refinePrompt(prompt);

      // 2. Generate Image
      const imageUrl = await AiService.generateImage(prompt);

      if (type === 'front') {
        setFrontImageUrl(imageUrl);
      } else {
        setBackImageUrl(imageUrl);
      }

      // 3. Update Quota locally
      setImageQuota(prev => (prev !== null ? Math.max(0, prev - 1) : null));

    } catch (error: any) {
      console.error('Error generating image:', error);
      alert(error.message || 'Error al generar la imagen');
    } finally {
      setIsGeneratingImage(false);
      setGeneratingField(null);
    }
  };

  // Filtrar sesiones por unidad seleccionada
  const availableSessions = selectedUnitId
    ? sessions.filter((s) => s.unit_id === selectedUnitId)
    : sessions;

  const frontImageInputRef = useRef<HTMLInputElement>(null);
  const backImageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File, type: 'front' | 'back') => {
    if (!file) return;

    setUploading(true);
    setUploadingField(type);

    try {
      const url = await uploadFlashcardImage(file, courseId, flashcard?.id);
      if (type === 'front') {
        setFrontImageUrl(url);
      } else {
        setBackImageUrl(url);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Por favor, intenta de nuevo.');
    } finally {
      setUploading(false);
      setUploadingField(null);
    }
  };

  const handleRemoveImage = (type: 'front' | 'back') => {
    if (type === 'front') {
      setFrontImageUrl('');
      if (frontImageInputRef.current) frontImageInputRef.current.value = '';
    } else {
      setBackImageUrl('');
      if (backImageInputRef.current) backImageInputRef.current.value = '';
    }
  };

  const handleAddOption = () => {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const nextLabel = labels[answerOptions.length] || String.fromCharCode(65 + answerOptions.length);
    setAnswerOptions([...answerOptions, { label: nextLabel, text: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = answerOptions.filter((_, i) => i !== index);
    setAnswerOptions(newOptions);
    if (correctAnswerIndex === index) {
      setCorrectAnswerIndex(undefined);
    } else if (correctAnswerIndex !== undefined && correctAnswerIndex > index) {
      setCorrectAnswerIndex(correctAnswerIndex - 1);
    }
  };

  const handleUpdateOption = (index: number, text: string) => {
    const newOptions = [...answerOptions];
    newOptions[index].text = text;
    setAnswerOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMultipleChoice) {
      // Validar opciones múltiples
      if (answerOptions.length < 2) {
        alert('Debes agregar al menos 2 opciones de respuesta');
        return;
      }
      if (answerOptions.some((opt) => !opt.text.trim())) {
        alert('Todas las opciones deben tener texto');
        return;
      }
      if (correctAnswerIndex === undefined || correctAnswerIndex < 0 || correctAnswerIndex >= answerOptions.length) {
        alert('Debes seleccionar la respuesta correcta');
        return;
      }
    } else {
      // Validar texto tradicional
      if (!backText.trim()) {
        alert('El texto del reverso es obligatorio');
        return;
      }
    }

    const flashcardData: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'> = {
      course_id: courseId,
      unit_id: selectedUnitId || undefined,
      session_id: selectedSessionId || undefined,
      title: title.trim() || undefined,
      front_text: frontText.trim() || undefined,
      back_text: isMultipleChoice
        ? `Respuesta correcta: ${answerOptions[correctAnswerIndex!].label}. ${answerOptions[correctAnswerIndex!].text}`
        : backText.trim(),
      front_image_url: frontImageUrl || undefined,
      back_image_url: backImageUrl || undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      difficulty_level: difficultyLevel,
      points_value: pointsValue,
      created_by: '', // Se llenará en el servicio
      is_active: true,
      is_public: false,
      is_multiple_choice: isMultipleChoice,
      answer_options: isMultipleChoice ? answerOptions : undefined,
      correct_answer_index: isMultipleChoice ? correctAnswerIndex : undefined,
    };

    await onSave(flashcardData);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-text-dark mb-4">
            {flashcard ? 'Editar Flashcard' : 'Nueva Flashcard'}
          </h2>
        </div>

        {/* Título (opcional) */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Título (opcional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Ej: Conceptos de Álgebra"
          />
        </div>

        {/* Selectores de Unidad y Sesión */}
        {(units.length > 0 || sessions.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {units.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Unidad (opcional)
                </label>
                <select
                  value={selectedUnitId || ''}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value || undefined);
                    // Si se cambia la unidad, limpiar la sesión si no pertenece a la nueva unidad
                    if (e.target.value) {
                      const newUnitSessions = sessions.filter((s) => s.unit_id === e.target.value);
                      if (selectedSessionId && !newUnitSessions.find((s) => s.id === selectedSessionId)) {
                        setSelectedSessionId(undefined);
                      }
                    } else {
                      setSelectedSessionId(undefined);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sin unidad específica</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      Unidad {unit.number}: {unit.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {sessions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Sesión (opcional)
                </label>
                <select
                  value={selectedSessionId || ''}
                  onChange={(e) => setSelectedSessionId(e.target.value || undefined)}
                  disabled={selectedUnitId && availableSessions.length === 0}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Sin sesión específica</option>
                  {availableSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))}
                </select>
                {selectedUnitId && availableSessions.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No hay sesiones en esta unidad
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Frente */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-dark">Frente de la Tarjeta</h3>

          {/* Imagen del frente */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Imagen del Frente (opcional)
            </label>
            {frontImageUrl ? (
              <div className="relative">
                <img
                  src={frontImageUrl}
                  alt="Front preview"
                  className="max-w-full max-h-48 object-contain rounded-lg border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage('front')}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <IconX className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={frontImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'front');
                  }}
                  className="hidden"
                />
                <IconImage className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => frontImageInputRef.current?.click()}
                  disabled={uploading && uploadingField === 'front'}
                >
                  {uploading && uploadingField === 'front' ? (
                    'Subiendo...'
                  ) : (
                    <>
                      <IconUpload className="w-4 h-4 mr-2" />
                      Subir Imagen
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* AI Generation Button */}
            <div className="mt-2 text-right">
              {imageQuota !== null && (
                <span className="text-xs text-gray-500 mr-2">
                  {imageQuota > 0
                    ? `✨ ${imageQuota} imágenes disponibles hoy`
                    : '⚠️ Límite diario alcanzado'}
                </span>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleGenerateAiImage('front')}
                disabled={isGeneratingImage || (imageQuota !== null && imageQuota <= 0)}
                title="Generar imagen con Inteligencia Artificial"
                className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-200"
              >
                {isGeneratingImage && generatingField === 'front' ? (
                  <IconLoader className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <IconSparkles className="w-4 h-4 mr-2" />
                )}
                Generar con IA
              </Button>
            </div>
          </div>

          {/* Texto del frente */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Texto del Frente (opcional)
            </label>
            <textarea
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Pregunta o concepto..."
            />
          </div>
        </div>

        {/* Tipo de flashcard */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isMultipleChoice}
              onChange={(e) => {
                setIsMultipleChoice(e.target.checked);
                if (!e.target.checked) {
                  setAnswerOptions([
                    { label: 'A', text: '' },
                    { label: 'B', text: '' },
                    { label: 'C', text: '' },
                    { label: 'D', text: '' },
                  ]);
                  setCorrectAnswerIndex(undefined);
                }
              }}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm font-medium text-text-dark">
              Flashcard con opciones múltiples
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Si está marcado, el estudiante seleccionará una opción en lugar de solo ver la respuesta
          </p>
        </div>

        {/* Opciones múltiples */}
        {isMultipleChoice && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-text-dark">Opciones de Respuesta</h3>

            {answerOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={correctAnswerIndex === index}
                      onChange={() => setCorrectAnswerIndex(index)}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="font-semibold text-primary w-8">{option.label}</span>
                  </label>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    placeholder={`Texto de la opción ${option.label}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                {answerOptions.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <IconTrash className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            {answerOptions.length < 8 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddOption}
                className="w-full"
              >
                <IconPlus className="w-4 h-4 mr-2" />
                Agregar Opción
              </Button>
            )}

            {correctAnswerIndex === undefined && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Debes seleccionar la respuesta correcta
              </p>
            )}
          </div>
        )}

        {/* Reverso (solo si no es opción múltiple) */}
        {!isMultipleChoice && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-dark">Reverso de la Tarjeta</h3>

            {/* Imagen del reverso */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Imagen del Reverso (opcional)
              </label>
              {backImageUrl ? (
                <div className="relative">
                  <img
                    src={backImageUrl}
                    alt="Back preview"
                    className="max-w-full max-h-48 object-contain rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage('back')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <IconX className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={backImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, 'back');
                    }}
                    className="hidden"
                  />
                  <IconImage className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => backImageInputRef.current?.click()}
                    disabled={uploading && uploadingField === 'back'}
                  >
                    {uploading && uploadingField === 'back' ? (
                      'Subiendo...'
                    ) : (
                      <>
                        <IconUpload className="w-4 h-4 mr-2" />
                        Subir Imagen
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* AI Generation Button Back */}
              <div className="mt-2 text-right">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleGenerateAiImage('back')}
                  disabled={isGeneratingImage || (imageQuota !== null && imageQuota <= 0)}
                  title="Generar imagen con Inteligencia Artificial"
                  className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-200"
                >
                  {isGeneratingImage && generatingField === 'back' ? (
                    <IconLoader className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <IconSparkles className="w-4 h-4 mr-2" />
                  )}
                  Generar con IA
                </Button>
              </div>
            </div>

            {/* Texto del reverso (obligatorio) */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Texto del Reverso <span className="text-red-500">*</span>
              </label>
              <textarea
                value={backText}
                onChange={(e) => setBackText(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Respuesta o explicación..."
              />
            </div>
          </div>
        )}

        {/* Configuración adicional */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Nivel de Dificultad
            </label>
            <select
              value={difficultyLevel}
              onChange={(e) => setDifficultyLevel(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value={1}>Muy Fácil</option>
              <option value={2}>Fácil</option>
              <option value={3}>Regular</option>
              <option value={4}>Difícil</option>
              <option value={5}>Muy Difícil</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Puntos (para calificaciones)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={pointsValue}
              onChange={(e) => setPointsValue(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Puntos que vale dominar esta flashcard
            </p>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Tags (separados por comas)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="álgebra, fórmulas, matemáticas"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={uploading}>
            {flashcard ? 'Guardar Cambios' : 'Crear Flashcard'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default FlashcardEditor;

