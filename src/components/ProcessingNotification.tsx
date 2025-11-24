// components/ProcessingNotification.tsx
// Componente para mostrar notificaciones de procesamiento

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, X } from 'lucide-react';
import type { FileProcessingJob } from '../types/fileProcessing';

interface ProcessingNotificationProps {
  job: FileProcessingJob;
  onDismiss: () => void;
}

export const ProcessingNotification: React.FC<ProcessingNotificationProps> = ({ job, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss después de 10 segundos si está completado, fallido o cancelado
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Esperar animación
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [job.status, onDismiss]);

  if (!isVisible) return null;

  const getStatusConfig = () => {
    switch (job.status) {
      case 'completed':
        return {
          icon: <CheckCircle size={24} className="text-green-600" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Procesamiento Completado',
          message: `El material "${job.sourceFileName}" está disponible en el Tutor RAG del curso.`,
        };
      case 'failed':
        return {
          icon: <XCircle size={24} className="text-red-600" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Error en Procesamiento',
          message: job.errorMessage || 'Ocurrió un error al procesar el archivo.',
        };
      case 'cancelled':
        return {
          icon: <XCircle size={24} className="text-gray-600" />,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Procesamiento Cancelado',
          message: `El procesamiento de "${job.sourceFileName}" fue cancelado.`,
        };
      case 'processing':
        return {
          icon: <Clock size={24} className="text-yellow-600 animate-pulse" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'Procesando...',
          message: `Procesando "${job.sourceFileName}". Esto puede tardar varios minutos.`,
        };
      default:
        return {
          icon: <AlertCircle size={24} className="text-blue-600" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'En Cola',
          message: `"${job.sourceFileName}" está en cola para procesamiento.`,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 mb-4 shadow-lg animate-slide-in`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {config.icon}
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-1">{config.title}</h4>
            <p className="text-sm text-gray-700">{config.message}</p>
            {job.status === 'processing' && job.totalPages && job.pageEnd && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((job.pageEnd / job.totalPages) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Página {job.pageEnd} de {job.totalPages}
                </p>
              </div>
            )}
            {job.metadata?.estimatedCosts && (
              <p className="text-xs text-gray-600 mt-1">
                Costo estimado: ${job.metadata.estimatedCosts.total.toFixed(4)} USD
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

