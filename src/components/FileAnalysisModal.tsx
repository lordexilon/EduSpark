// components/FileAnalysisModal.tsx
// Modal para mostrar análisis de archivo y estimación de costos

import React from 'react';
import { X } from 'lucide-react';
import type { FileAnalysis } from '../types/fileProcessing';
import { CostBreakdown } from './CostBreakdown';

interface FileAnalysisModalProps {
  analysis: FileAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
  onProcess: (ragProcessingType: 'full' | 'readonly') => void;
  isProcessing?: boolean;
}

export const FileAnalysisModal: React.FC<FileAnalysisModalProps> = ({
  analysis,
  isOpen,
  onClose,
  onProcess,
  isProcessing = false,
}) => {
  const [ragProcessingType, setRagProcessingType] = React.useState<'full' | 'readonly'>('full');
  
  if (!isOpen || !analysis) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Análisis de Archivo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isProcessing}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información del archivo */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Información del Archivo</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-medium text-gray-900">{analysis.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tamaño:</span>
                <span className="font-medium text-gray-900">{formatFileSize(analysis.fileSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total de páginas:</span>
                <span className="font-medium text-gray-900">{analysis.totalPages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo de PDF:</span>
                <span className="font-medium text-gray-900">
                  {analysis.pdfType === 'text' && '📄 Texto nativo'}
                  {analysis.pdfType === 'scanned' && '🖼️ Escaneado (requiere OCR)'}
                  {analysis.pdfType === 'unknown' && '❓ Desconocido'}
                </span>
              </div>
            </div>
          </div>

          {/* Desglose de costos */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Estimación de Costos</h3>
            <CostBreakdown costs={analysis.estimatedCosts.estimatedCosts} pdfType={analysis.pdfType} />
          </div>

          {/* Tiempo estimado */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Tiempo Estimado de Procesamiento</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">Aproximadamente:</span>
                <span className="font-semibold text-blue-700">
                  {analysis.estimatedCosts.processingTime.estimatedHours >= 1
                    ? `${analysis.estimatedCosts.processingTime.estimatedHours} horas`
                    : `${analysis.estimatedCosts.processingTime.estimatedMinutes} minutos`}
                </span>
              </div>
            </div>
          </div>

          {/* Advertencia si requiere OCR */}
          {analysis.requiresOCR && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ Este archivo es un PDF escaneado y requerirá OCR (Reconocimiento Óptico de Caracteres), 
                lo que aumentará el costo y tiempo de procesamiento.
              </p>
            </div>
          )}

          {/* Opción de tipo de procesamiento */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Tipo de Procesamiento</h3>
            <div className="space-y-2">
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="ragProcessingType"
                  value="full"
                  checked={ragProcessingType === 'full'}
                  onChange={(e) => setRagProcessingType(e.target.value as 'full' | 'readonly')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Procesamiento Completo (RAG)</div>
                  <div className="text-sm text-gray-600">
                    El archivo se procesará para búsqueda semántica. El material estará disponible para el tutor IA.
                  </div>
                </div>
              </label>
              <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="ragProcessingType"
                  value="readonly"
                  checked={ragProcessingType === 'readonly'}
                  onChange={(e) => setRagProcessingType(e.target.value as 'full' | 'readonly')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Solo Lectura</div>
                  <div className="text-sm text-gray-600">
                    El material se agregará al curso pero no se procesará para RAG. Útil para materiales de referencia que no necesitan búsqueda semántica.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            onClick={() => onProcess(ragProcessingType)}
            disabled={isProcessing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing 
              ? 'Procesando...' 
              : ragProcessingType === 'full' 
                ? 'Procesar para RAG' 
                : 'Agregar como Solo Lectura'}
          </button>
        </div>
      </div>
    </div>
  );
};

