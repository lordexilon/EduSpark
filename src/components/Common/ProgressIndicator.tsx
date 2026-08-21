import React from 'react';
import ProgressBar from './ProgressBar';
import { IconCheckCircle, IconClock, IconTrendingUp } from '@/components/Common/Icons';

interface ProgressIndicatorProps {
  value: number; // 0 to 100
  label?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
  color?: string;
}

/**
 * Componente reutilizable para mostrar indicadores de progreso
 * con barra, porcentaje y opcionalmente ícono
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  label,
  showIcon = false,
  size = 'md',
  showPercentage = true,
  className = '',
  color,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const isComplete = clampedValue >= 100;
  const inProgress = clampedValue > 0 && clampedValue < 100;

  const sizeClasses = {
    sm: {
      text: 'text-xs',
      bar: 'h-1.5',
      icon: 'w-4 h-4',
    },
    md: {
      text: 'text-sm',
      bar: 'h-2',
      icon: 'w-5 h-5',
    },
    lg: {
      text: 'text-base',
      bar: 'h-3',
      icon: 'w-6 h-6',
    },
  };

  const sizeConfig = sizeClasses[size];

  const getProgressColor = () => {
    if (color) return color;
    if (isComplete) return 'var(--primary)';
    if (inProgress) return 'var(--primary)';
    return 'var(--border)';
  };

  const getIcon = () => {
    if (!showIcon) return null;
    if (isComplete) {
      return <IconCheckCircle className={`${sizeConfig.icon} text-green-600`} />;
    }
    if (inProgress) {
      return <IconTrendingUp className={`${sizeConfig.icon} text-primary`} />;
    }
    return <IconClock className={`${sizeConfig.icon} text-gray-400`} />;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            {label && (
              <span className={`${sizeConfig.text} font-medium text-text-dark`}>{label}</span>
            )}
          </div>
          {showPercentage && (
            <span className={`${sizeConfig.text} font-semibold text-text-dark`}>
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <ProgressBar value={clampedValue} color={getProgressColor()} height={sizeConfig.bar} />
    </div>
  );
};

export default ProgressIndicator;
