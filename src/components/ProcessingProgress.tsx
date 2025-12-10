// components/ProcessingProgress.tsx
// Componente para mostrar el progreso de procesamiento

import React from 'react';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { ProcessingTimer } from './ProcessingTimer';
import type { FileProcessingJob } from '../types/fileProcessing';

interface ProcessingProgressProps {
  jobs: FileProcessingJob[];
  onHideFile?: (fileId: string) => void;
  hiddenFileIds?: Set<string>;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  jobs,
  onHideFile,
  hiddenFileIds = new Set()
}) => {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay trabajos de procesamiento
      </div>
    );
  }

  // Agrupar por archivo
  const jobsByFile = jobs.reduce((acc, job) => {
    // Si el archivo está oculto, no lo incluimos
    if (hiddenFileIds.has(job.sourceFileId)) {
      return acc;
    }

    if (!acc[job.sourceFileId]) {
      acc[job.sourceFileId] = [];
    }
    acc[job.sourceFileId].push(job);
    return acc;
  }, {} as Record<string, FileProcessingJob[]>);

  if (Object.keys(jobsByFile).length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay trabajos visibles (algunos pueden estar ocultos)
      </div>
    );
  }

  const getStatusIcon = (status: FileProcessingJob['status'], isStuck: boolean = false) => {
    if (isStuck) return <XCircle className="text-orange-500" size={20} />;

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

  const getStatusText = (status: FileProcessingJob['status'], isStuck: boolean = false) => {
    if (isStuck) return 'Tiempo Excedido';

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

  // Obtener texto de la fase actual basado en metadata.phase
  const getPhaseText = (job: FileProcessingJob): string | null => {
    if (job.status !== 'processing') return null;

    const phase = job.metadata?.phase;
    switch (phase) {
      case 'splitting':
        return '✂️ Dividiendo PDF...';
      case 'extracting_chunks':
      case 'extracting':
        return '📄 Extrayendo texto...';
      case 'embedding':
        return '🤖 Generando embeddings...';
      case 'completed':
        return '✅ Finalizando...';
      default:
        return '🔄 Iniciando procesamiento...';
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

  // Verificar si un job está "colgado" (más de 2 horas sin actualizar)
  const isJobStuck = (job: FileProcessingJob): boolean => {
    if (job.status !== 'processing') return false;

    const updatedAt = job.updatedAt ? new Date(job.updatedAt) : new Date(job.createdAt);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceUpdate > 2;
  };

  return (
    <div className="space-y-4">
      {Object.entries(jobsByFile).map(([fileId, fileJobs]) => {
        const firstJob = fileJobs[0];
        const progress = calculateProgress(fileJobs);
        const processingJob = fileJobs.find(j => j.status === 'processing');
        const isStuck = processingJob ? isJobStuck(processingJob) : false;

        // Si está colgado, tratamos visualmente como fallido/advertencia
        const displayStatus = isStuck ? 'failed' : firstJob.status;

        return (
          <div key={fileId} className="bg-white border border-gray-200 rounded-lg p-4 relative group">
            {/* Botón de ocultar en la esquina */}
            {onHideFile && (
              <button
                onClick={() => onHideFile(fileId)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                title="Ocultar de la lista"
              >
                <XCircle size={18} />
              </button>
            )}

            <div className="flex items-center justify-between mb-3 pr-6">
              <div className="flex items-center space-x-3">
                {getStatusIcon(firstJob.status, isStuck)}
                <div>
                  <h4 className="font-semibold text-gray-800 truncate max-w-[200px]" title={firstJob.sourceFileName}>
                    {firstJob.sourceFileName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {firstJob.totalPages ? `${firstJob.totalPages} páginas` : 'Analizando...'}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${isStuck ? 'bg-orange-100 text-orange-800' :
                firstJob.status === 'completed' ? 'bg-green-100 text-green-700' :
                  firstJob.status === 'failed' ? 'bg-red-100 text-red-700' :
                    firstJob.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                }`}>
                {getStatusText(firstJob.status, isStuck)}
              </span>
            </div>

            {/* Barra de progreso mejorada */}
            {firstJob.chunksTotal !== undefined && firstJob.chunksTotal > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-medium ${isStuck ? 'text-orange-700' :
                    firstJob.status === 'processing' ? 'text-blue-700' :
                      firstJob.status === 'completed' ? 'text-green-700' :
                        'text-gray-600'
                    }`}>
                    {firstJob.chunksProcessed || 0} de {firstJob.chunksTotal} chunks completados
                  </span>
                  <span className={`font-semibold ${isStuck ? 'text-orange-700' :
                    firstJob.status === 'processing' ? 'text-blue-700' :
                      firstJob.status === 'completed' ? 'text-green-700' :
                        'text-gray-600'
                    }`}>
                    {Math.round(((firstJob.chunksProcessed || 0) / firstJob.chunksTotal) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ease-out ${isStuck
                      ? 'bg-orange-500'
                      : firstJob.status === 'processing'
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

            {/* Indicador de fase actual */}
            {processingJob && !isStuck && (
              <div className="text-sm text-blue-600 bg-blue-50 rounded p-2 flex items-center gap-2">
                <span>{getPhaseText(processingJob)}</span>
                {processingJob.pageStart && processingJob.pageEnd && (
                  <span className="text-blue-500">
                    (páginas {processingJob.pageStart} - {processingJob.pageEnd})
                  </span>
                )}
              </div>
            )}

            {/* Temporizador */}
            {firstJob.status === 'processing' && (
              <div className="mt-2">
                {isStuck ? (
                  <div className="text-sm text-orange-600 bg-orange-50 rounded p-2 flex items-center gap-2">
                    <Clock size={16} />
                    <span>El proceso parece haberse detenido. Puedes ocultarlo.</span>
                  </div>
                ) : (
                  <ProcessingTimer
                    startTime={firstJob.startedAt || firstJob.createdAt}
                    isProcessing={true}
                    estimatedMinutes={firstJob.metadata?.estimatedCosts?.processingTime?.estimatedMinutes}
                    chunksProcessed={firstJob.chunksProcessed}
                    chunksTotal={firstJob.chunksTotal}
                  />
                )}
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

