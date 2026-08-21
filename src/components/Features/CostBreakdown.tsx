// components/CostBreakdown.tsx
// Componente para mostrar el desglose de costos

import React from 'react';
import type { CostEstimate } from '@/types/fileProcessing';
import { formatCost } from '@/services/costEstimator';

interface CostBreakdownProps {
  costs: CostEstimate['estimatedCosts'];
  pdfType: 'text' | 'scanned' | 'unknown';
}

export const CostBreakdown: React.FC<CostBreakdownProps> = ({ costs, pdfType }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
      <h4 className="font-semibold text-gray-700 mb-3">Desglose de Costos Estimados</h4>

      {pdfType === 'scanned' && costs.ocr > 0 && (
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600">OCR (Reconocimiento de texto):</span>
          <span className="font-medium text-gray-900">{formatCost(costs.ocr)}</span>
        </div>
      )}

      <div className="flex justify-between items-center py-2 border-b border-gray-200">
        <span className="text-gray-600">Embeddings (Gemini API):</span>
        <span className="font-medium text-gray-900">{formatCost(costs.embeddings)}</span>
      </div>

      <div className="flex justify-between items-center py-2 border-b border-gray-200">
        <span className="text-gray-600">Cloud Run (Procesamiento):</span>
        <span className="font-medium text-gray-900">{formatCost(costs.cloudRun)}</span>
      </div>

      <div className="flex justify-between items-center py-2 border-b border-gray-200">
        <span className="text-gray-600">Firestore (Base de datos):</span>
        <span className="font-medium text-gray-900">{formatCost(costs.firestore)}</span>
      </div>

      <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-gray-300">
        <span className="font-semibold text-lg text-gray-800">Total Estimado:</span>
        <span className="font-bold text-xl text-blue-600">{formatCost(costs.total)}</span>
      </div>
    </div>
  );
};
