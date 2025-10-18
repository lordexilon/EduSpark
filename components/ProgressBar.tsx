import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: string;
  height?: string;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, color = 'var(--progress-fill-color)', height = '10px', className="" }) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div 
      className={`w-full bg-border rounded-full ${className}`}
      style={{ height: height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${clampedValue}%`, backgroundColor: color }}
      ></div>
    </div>
  );
};

export default ProgressBar;