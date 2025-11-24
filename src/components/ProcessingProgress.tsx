// components/ProcessingProgress.tsx
// Componente para mostrar el progreso de procesamiento

import React from 'react';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { ProcessingTimer } from './ProcessingTimer';
import type { FileProcessingJob } from '../types/fileProcessing';

interface ProcessingProgressProps {
  jobs: FileProcessingJob[];
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ jobs }) => {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay trabajos de procesamiento
      </div>
    );
  }

  // Agrupar por archivo
  const jobsByFile = jobs.reduce((acc, job) => {
    if (!acc[job.sourceFileId]) {
      acc[job.sourceFileId] = [];
    }
    acc[job.sourceFileId].push(job);
    return acc;
  }, {} as Record<string, FileProcessingJob[]>);

  const getStatusIcon = (status: FileProcessingJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="text-green-500" size={20} />;
      case 'failed':
        return <XCircle className="text-red-500" size={20} />;
      case 'cancelled':
        return <XCircle className="text-gray-500" size={20} />;
      case 'processing':
        return <Loader2 className="text-blue-500 animate-spin" size={20} />;
      default:
        return <Clock className="text-gray-400" size={20} />;
    }
  };

  const getStatusText = (status: FileProcessingJob['status']) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'failed':
        return 'Error';
      case 'cancelled':
        return 'Cancelado';
      case 'processing':
        return 'Procesando';
      default:
        return 'Pendiente';
    }
  };

  const calculateProgress = (fileJobs: FileProcessingJob[]) => {
    const total = fileJobs.length;
    const completed = fileJobs.filter(j => j.status === 'completed').length;
    const processing = fileJobs.filter(j => j.status === 'processing').length;
    const failed = fileJobs.filter(j => j.status === 'failed').length;
    
    return {
      total,
      completed,
      processing,
      failed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  return (
    <div className="space-y-4">
      {Object.entries(jobsByFile).map(([fileId, fileJobs]) => {
        const firstJob = fileJobs[0];
        const progress = calculateProgress(fileJobs);
        const processingJob = fileJobs.find(j => j.status === 'processing');
        
        return (
          <div key={fileId} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStatusIcon(firstJob.status)}
                <div>
                  <h4 className="font-semibold text-gray-800">{firstJob.sourceFileName}</h4>
                  <p className="text-sm text-gray-500">
                    {firstJob.totalPages ? `${firstJob.totalPages} páginas` : 'Analizando...'}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                firstJob.status === 'completed' ? 'bg-green-100 text-green-700' :
                firstJob.status === 'failed' ? 'bg-red-100 text-red-700' :
                firstJob.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {getStatusText(firstJob.status)}
              </span>
            </div>

            {/* Barra de progreso mejorada */}
            {firstJob.chunksTotal !== undefined && firstJob.chunksTotal > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-medium ${
                    firstJob.status === 'processing' ? 'text-blue-700' : 
                    firstJob.status === 'completed' ? 'text-green-700' : 
                    'text-gray-600'
                  }`}>
                    {firstJob.chunksProcessed || 0} de {firstJob.chunksTotal} chunks completados
                  </span>
                  <span className={`font-semibold ${
                    firstJob.status === 'processing' ? 'text-blue-700' : 
                    firstJob.status === 'completed' ? 'text-green-700' : 
                    'text-gray-600'
                  }`}>
                    {Math.round(((firstJob.chunksProcessed || 0) / firstJob.chunksTotal) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                      firstJob.status === 'processing' 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                        : firstJob.status === 'completed'
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${Math.round(((firstJob.chunksProcessed || 0) / firstJob.chunksTotal) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Barra de progreso antigua (para compatibilidad) */}
            {firstJob.jobType === 'split' && firstJob.chunksCreated && !firstJob.chunksTotal && (
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progreso: {progress.completed} de {progress.total} trozos</span>
                  <span>{progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Información de procesamiento actual */}
            {processingJob && processingJob.pageStart && processingJob.pageEnd && (
              <div className="text-sm text-blue-600 bg-blue-50 rounded p-2">
                Procesando páginas {processingJob.pageStart} - {processingJob.pageEnd}
              </div>
            )}
            
            {/* Temporizador */}
            {firstJob.status === 'processing' && (
              <div className="mt-2">
                <ProcessingTimer 
                  startTime={firstJob.startedAt || firstJob.createdAt} 
                  isProcessing={true}
                  estimatedMinutes={firstJob.metadata?.estimatedCosts?.processingTime?.estimatedMinutes}
                  chunksProcessed={firstJob.chunksProcessed}
                  chunksTotal={firstJob.chunksTotal}
                />
              </div>
            )}

            {/* Errores */}
            {progress.failed > 0 && (
              <div className="mt-2 space-y-1">
                {fileJobs
                  .filter(j => j.status === 'failed')
                  .map(job => (
                    <div key={job.id} id={`error-${job.id}`} className="text-sm text-red-600 bg-red-50 rounded p-2 flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <strong>Error:</strong> {job.errorMessage || 'Error desconocido'}
                      </div>
                      <button
                        onClick={() => {
                          // Ocultar este error específico
                          const element = document.getElementById(`error-${job.id}`);
                          if (element) {
                            element.style.display = 'none';
                          }
                        }}
                        className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                        title="Cerrar error"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Costos si están disponibles */}
            {firstJob.metadata?.estimatedCosts && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <span>Costo estimado: </span>
                  <span className="font-semibold text-gray-900">
                    ${firstJob.metadata.estimatedCosts.total.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

