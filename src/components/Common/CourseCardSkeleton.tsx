import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Esqueleto estandarizado para visualizaciones pre-carga de tarjetas (cursos, progreso).
 */
interface CourseCardSkeletonProps {
  className?: string;
  type?: 'card' | 'progressRow';
}

export const CourseCardSkeleton: React.FC<CourseCardSkeletonProps> = ({
  className = '',
  type = 'card',
}) => {
  if (type === 'progressRow') {
    return (
      <div
        className={`rounded-xl border border-border p-3 bg-background/40 flex flex-col gap-2 ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <div className="flex items-center justify-between text-xs mt-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-2 w-full rounded-full mt-1" />
        <Skeleton className="h-3 w-1/2 mt-2" />
      </div>
    );
  }

  return (
    <div
      className={`bg-surface rounded-2xl p-5 border-2 border-border flex flex-col h-full opacity-80 pointer-events-none ${className}`}
    >
      <Skeleton className="h-32 w-full rounded-xl mb-4" />
      <Skeleton className="h-5 w-3/4 mb-3" />
      <Skeleton className="h-3 w-full mb-1 sm" />
      <Skeleton className="h-3 w-5/6 mb-5 sm" />
      <div className="mt-auto pt-4 flex justify-between items-center border-t border-border">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
};
