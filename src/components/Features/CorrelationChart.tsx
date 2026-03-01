// components/CorrelationChart.tsx
// Gráfico de correlación entre progreso académico y uso del tutor

import React from 'react';
import type { ComprehensiveStudentData } from '@/services/comprehensiveReportService';

interface CorrelationChartProps {
  students: ComprehensiveStudentData[];
  className?: string;
}

/**
 * Componente que muestra un scatter plot simple de correlación
 * entre progreso académico (eje Y) y uso del tutor (eje X)
 */
const CorrelationChart: React.FC<CorrelationChartProps> = ({
  students,
  className = ''
}) => {
  if (students.length === 0) {
    return (
      <div className={`p-8 bg-gray-50 rounded-lg border border-gray-200 text-center ${className}`}>
        <p className="text-sm text-gray-600">No hay datos suficientes para mostrar el gráfico</p>
      </div>
    );
  }

  // Dimensiones del gráfico - más grande y responsive
  const width = 1000;
  const height = 600;
  const padding = 80;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Encontrar máximos para escalar
  const maxProgress = Math.max(...students.map(s => s.academicProgress.completionPercentage), 100);
  const maxTutorUsage = Math.max(...students.map(s => s.tutorMetrics.totalInteractions), 1);

  // Función para convertir valores a coordenadas
  const getX = (tutorUsage: number) => {
    return padding + (tutorUsage / maxTutorUsage) * chartWidth;
  };

  const getY = (progress: number) => {
    return padding + chartHeight - (progress / maxProgress) * chartHeight;
  };

  // Calcular promedios para líneas de referencia
  const avgProgress = students.reduce((sum, s) => sum + s.academicProgress.completionPercentage, 0) / students.length;
  const avgTutorUsage = students.reduce((sum, s) => sum + s.tutorMetrics.totalInteractions, 0) / students.length;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Correlación: Progreso vs Uso del Tutor
      </h3>
      
      <div className="overflow-x-auto w-full">
        <svg 
          width={width} 
          height={height} 
          className="border border-gray-200 rounded shadow-sm"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Fondo con cuadrícula */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Líneas de referencia (promedios) */}
          <line
            x1={padding}
            y1={getY(avgProgress)}
            x2={width - padding}
            y2={getY(avgProgress)}
            stroke="#9ca3af"
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.5"
          />
          <line
            x1={getX(avgTutorUsage)}
            y1={padding}
            x2={getX(avgTutorUsage)}
            y2={height - padding}
            stroke="#9ca3af"
            strokeWidth="1"
            strokeDasharray="5,5"
            opacity="0.5"
          />

          {/* Ejes */}
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="#374151"
            strokeWidth="2"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#374151"
            strokeWidth="2"
          />

          {/* Etiquetas de ejes */}
          <text
            x={width / 2}
            y={height - 20}
            textAnchor="middle"
            className="text-sm font-semibold fill-gray-800"
          >
            Interacciones con Tutor
          </text>
          <text
            x={25}
            y={height / 2}
            textAnchor="middle"
            className="text-sm font-semibold fill-gray-800"
            transform={`rotate(-90, 25, ${height / 2})`}
          >
            Progreso Académico (%)
          </text>

          {/* Marcas en el eje X */}
          {Array.from({ length: Math.ceil(maxTutorUsage / 5) + 1 }, (_, i) => {
            const value = i * 5;
            if (value > maxTutorUsage) return null;
            const x = getX(value);
            return (
              <g key={`x-${value}`}>
                <line
                  x1={x}
                  y1={height - padding}
                  x2={x}
                  y2={height - padding + 5}
                  stroke="#374151"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - padding + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Marcas en el eje Y */}
          {Array.from({ length: 6 }, (_, i) => {
            const value = (i * maxProgress) / 5;
            const y = getY(value);
            return (
              <g key={`y-${value}`}>
                <line
                  x1={padding}
                  y1={y}
                  x2={padding - 5}
                  y2={y}
                  stroke="#374151"
                  strokeWidth="1"
                />
                <text
                  x={padding - 15}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {Math.round(value)}%
                </text>
              </g>
            );
          })}

          {/* Puntos de datos */}
          {students.map((student, index) => {
            const x = getX(student.tutorMetrics.totalInteractions);
            const y = getY(student.academicProgress.completionPercentage);
            
            // Color según tipo de correlación
            const getColor = () => {
              switch (student.insights.tutorUsageVsProgress) {
                case 'high-usage-high-progress':
                  return '#10b981'; // green
                case 'high-usage-low-progress':
                  return '#ef4444'; // red
                case 'low-usage-high-progress':
                  return '#3b82f6'; // blue
                default:
                  return '#f59e0b'; // orange
              }
            };

            return (
              <g key={student.studentId}>
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill={getColor()}
                  stroke="white"
                  strokeWidth="3"
                  className="cursor-pointer hover:r-12 transition-all"
                  opacity="0.8"
                >
                  <title>
                    {student.studentName}: {Math.round(student.academicProgress.completionPercentage)}% progreso, {student.tutorMetrics.totalInteractions} interacciones
                  </title>
                </circle>
                {/* Etiqueta con nombre del estudiante al hacer hover */}
                <text
                  x={x}
                  y={y - 15}
                  textAnchor="middle"
                  className="text-xs fill-gray-700 font-medium pointer-events-none opacity-0 hover:opacity-100"
                  style={{ display: 'none' }}
                >
                  {student.studentName.split(' ')[0]}
                </text>
              </g>
            );
          })}

          {/* Leyenda - Mejorada y más grande */}
          <g transform={`translate(${width - 220}, ${padding})`}>
            <rect width="200" height="140" fill="white" stroke="#e5e7eb" strokeWidth="2" rx="6" opacity="0.95" className="shadow-lg"/>
            <text x="15" y="25" className="text-sm font-bold fill-gray-900">Leyenda</text>
            <line x1="15" x2="185" y1="30" y2="30" stroke="#e5e7eb" strokeWidth="1"/>
            
            <circle cx="15" cy="50" r="6" fill="#10b981" stroke="white" strokeWidth="2"/>
            <text x="28" y="54" className="text-sm fill-gray-800 font-medium">Alto progreso + Alto uso</text>
            
            <circle cx="15" cy="75" r="6" fill="#ef4444" stroke="white" strokeWidth="2"/>
            <text x="28" y="79" className="text-sm fill-gray-800 font-medium">Bajo progreso + Alto uso</text>
            
            <circle cx="15" cy="100" r="6" fill="#3b82f6" stroke="white" strokeWidth="2"/>
            <text x="28" y="104" className="text-sm fill-gray-800 font-medium">Alto progreso + Bajo uso</text>
            
            <circle cx="15" cy="125" r="6" fill="#f59e0b" stroke="white" strokeWidth="2"/>
            <text x="28" y="129" className="text-sm fill-gray-800 font-medium">Bajo progreso + Bajo uso</text>
          </g>
        </svg>
      </div>

      {/* Estadísticas del gráfico */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-600">Promedio Progreso</p>
          <p className="text-lg font-bold text-gray-900">{avgProgress.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Promedio Tutor</p>
          <p className="text-lg font-bold text-gray-900">{avgTutorUsage.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Correlación Positiva</p>
          <p className="text-lg font-bold text-green-600">
            {students.filter(s => s.insights.tutorUsageVsProgress === 'high-usage-high-progress').length}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Necesitan Atención</p>
          <p className="text-lg font-bold text-red-600">
            {students.filter(s => s.insights.riskLevel === 'high' || s.insights.riskLevel === 'medium').length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CorrelationChart;

