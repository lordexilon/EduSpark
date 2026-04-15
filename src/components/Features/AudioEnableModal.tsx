// components/AudioEnableModal.tsx
// Modal para avisar al usuario sobre la habilitación de audio

import React from 'react';
import { IconX } from "@/components/Common/Icons";

interface AudioEnableModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AudioEnableModal: React.FC<AudioEnableModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Botón cerrar */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <IconX className="w-5 h-5" />
        </button>

        {/* Contenido */}
        <div className="text-center">
          <div className="mb-4">
            <div className="text-5xl mb-2">🎤</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Habilitar Audio
            </h2>
          </div>

          <div className="text-left space-y-3 mb-6">
            <p className="text-gray-700">
              Al habilitar el audio, podrás:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 ml-2">
              <li>Escuchar las respuestas del tutor en voz</li>
              <li>Usar comandos de voz para interactuar</li>
              <li>Obtener respuestas más rápidas</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> El navegador te pedirá permiso para acceder al micrófono. 
                Puedes desactivar el audio en cualquier momento.
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Habilitar Audio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

