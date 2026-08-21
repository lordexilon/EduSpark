import React from 'react';

/**
 * Skeleton loader para prevenir saltos de layout (Layout Shift).
 * Mantiene un estilo unificado para todos los estados de carga.
 */
interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700/40 rounded ${className}`}
      aria-hidden="true"
    />
  );
};
