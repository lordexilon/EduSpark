import React, { useState } from 'react';
import Button from '@/components/Common/Button';
import { IconXCircle, IconRefreshCw, IconLoader, IconSparkles } from '@/components/Common/Icons';
import { Flashcard } from '@/services/flashcardService';
import { AiService } from '@/services/aiService';

interface GeneratorFlashcard extends Flashcard {
  image_prompt?: string;
}

interface EditFlashcardModalProps {
  card: GeneratorFlashcard;
  onClose: () => void;
  onSave: (updatedCard: GeneratorFlashcard) => void;
}

const EditFlashcardModal: React.FC<EditFlashcardModalProps> = ({ card, onClose, onSave }) => {
  // Local state for the form, avoids re-rendering the parent
  const [editedCard, setEditedCard] = useState<GeneratorFlashcard>({ ...card });
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const handleSave = () => {
    onSave(editedCard);
  };

  const handleRefinePrompt = async () => {
    const textToRefine = editedCard.image_prompt || editedCard.front_text;
    if (!textToRefine) return;

    setIsRefining(true);
    try {
      const refined = await AiService.refinePrompt(textToRefine);
      setEditedCard((prev) => ({ ...prev, image_prompt: refined }));
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateImage = async () => {
    const promptToUse = editedCard.image_prompt || editedCard.front_text;

    if (!promptToUse) {
      alert('Por favor ingresa una descripción o asegúrate que la pregunta tenga texto.');
      return;
    }

    setIsImageLoading(true);
    setImageError(false);

    try {
      console.log('Solicitando imagen al servicio de IA...');
      const newUrl = await AiService.generateImage(promptToUse);
      setEditedCard((prev) => ({ ...prev, front_image_url: newUrl }));
    } catch (err: any) {
      console.error('Error al solicitar imagen:', err);
      setIsImageLoading(false);
      setImageError(true);

      // Mostrar mensaje amigable según el tipo de error
      const msg = err?.message || '';
      if (msg.includes('429') || msg.includes('quota')) {
        alert(
          '⚠️ Cuota de generación de imágenes agotada.\n\nTu plan actual no tiene cuota disponible para generación de imágenes con IA.\n\nOpciones:\n• Habilita la facturación en Google AI Studio\n• Espera a que se renueve la cuota\n• Usa una URL de imagen externa'
        );
      } else if (msg.includes('Timeout')) {
        alert('⏱️ La generación tardó demasiado. Intenta con un prompt más simple.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-800">Editar Flashcard</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <IconXCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pregunta (Frente)
            </label>
            <textarea
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              rows={3}
              value={editedCard.front_text}
              onChange={(e) => setEditedCard({ ...editedCard, front_text: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Respuesta (Dorso)
            </label>
            <textarea
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              rows={3}
              value={editedCard.back_text}
              onChange={(e) => setEditedCard({ ...editedCard, back_text: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción de la Imagen (Prompt){' '}
              <span className="text-gray-400 font-normal">- Opcional (en Inglés)</span>
            </label>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <textarea
                  className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                  rows={2}
                  placeholder="Ej: 'Brain anatomy illustration, white background'..."
                  value={editedCard.image_prompt || ''}
                  onChange={(e) => setEditedCard({ ...editedCard, image_prompt: e.target.value })}
                />
                <button
                  onClick={handleRefinePrompt}
                  disabled={isRefining || (!editedCard.image_prompt && !editedCard.front_text)}
                  className="absolute right-2 top-2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-30"
                  title="Optimizar con IA (Traducir y mejorar)"
                >
                  {isRefining ? (
                    <IconLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <IconSparkles className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={isImageLoading}
                  onClick={handleGenerateImage}
                  className={`px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap ${isImageLoading ? 'opacity-75 cursor-wait' : ''}`}
                >
                  <IconRefreshCw className={`w-4 h-4 ${isImageLoading ? 'animate-spin' : ''}`} />
                  {isImageLoading ? 'Generando...' : 'Generar Imagen'}
                </button>
                <input
                  type="text"
                  className="flex-1 p-2 border rounded-lg bg-gray-50 text-xs text-gray-500 font-mono"
                  value={editedCard.front_image_url || ''}
                  readOnly
                  placeholder="URL de la imagen generada..."
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 pl-1">
                * Si dejas la descripción vacía, usaremos el texto de la pregunta.
              </p>

              {/* Preview de la Imagen */}
              {editedCard.front_image_url && (
                <div
                  className={`mt-3 relative rounded-lg overflow-hidden border transition-colors h-48 w-full flex items-center justify-center group ${imageError ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                >
                  <img
                    key={editedCard.front_image_url}
                    src={editedCard.front_image_url}
                    alt="Vista previa de la carta"
                    className={`h-full w-full object-contain transition-opacity duration-300 ${isImageLoading ? 'opacity-50 blur-sm' : 'opacity-100'} ${imageError ? 'hidden' : 'block'}`}
                    onLoad={() => {
                      console.log('Imagen cargada con éxito');
                      setIsImageLoading(false);
                      setImageError(false);
                    }}
                    onError={() => {
                      console.error('Error cargando imagen en el preview');
                      setIsImageLoading(false);
                      setImageError(true);
                    }}
                  />

                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-20">
                      <div className="bg-white/90 p-3 rounded-full shadow-lg flex items-center gap-2">
                        <IconLoader className="w-6 h-6 animate-spin text-indigo-600" />
                        <span className="text-xs font-medium text-indigo-600">Procesando...</span>
                      </div>
                    </div>
                  )}

                  {imageError && !isImageLoading && (
                    <div className="flex flex-col items-center gap-2 text-red-500 p-4 text-center">
                      <IconXCircle className="w-8 h-8" />
                      <p className="text-sm font-medium">No se pudo cargar la imagen</p>
                      <p className="text-[10px] opacity-70">
                        Intenta con un prompt diferente o haz clic en Generar de nuevo
                      </p>
                    </div>
                  )}

                  {!isImageLoading && !imageError && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      Vista Previa
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditFlashcardModal;
