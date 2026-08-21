import React, { useEffect, useState } from 'react';
import { comprehensiveReportService } from '@/services/comprehensiveReportService';
import { ComprehensiveStudentData } from '@/services/comprehensiveReportService';
import {
  IconAlertTriangle,
  IconTrendingUp,
  IconCheckCircle,
  IconHelpCircle,
} from '@/components/Common/Icons';

interface StudentsRiskTableProps {
  courseId: number;
}

export const StudentsRiskTable: React.FC<StudentsRiskTableProps> = ({ courseId }) => {
  const [students, setStudents] = useState<ComprehensiveStudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      loadRiskData();
    }
  }, [courseId]);

  const loadRiskData = async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await comprehensiveReportService.getCourseComprehensiveReport(courseId);
      if (report) {
        // Filter for high and medium risk
        const riskyStudents = report.students.filter(
          (s) => s.insights.riskLevel === 'high' || s.insights.riskLevel === 'medium'
        );
        // Sort: High risk first, then by lower progress
        riskyStudents.sort((a, b) => {
          if (a.insights.riskLevel === 'high' && b.insights.riskLevel !== 'high') return -1;
          if (b.insights.riskLevel === 'high' && a.insights.riskLevel !== 'high') return 1;
          return a.academicProgress.completionPercentage - b.academicProgress.completionPercentage;
        });
        setStudents(riskyStudents);
      } else {
        setStudents([]);
      }
    } catch (err: any) {
      console.error('Error loading risk data:', err);
      setError('No se pudo cargar el reporte de riesgo.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <IconAlertTriangle className="w-3 h-3 mr-1" /> ALTO
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            <IconHelpCircle className="w-3 h-3 mr-1" /> MEDIO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <IconCheckCircle className="w-3 h-3 mr-1" /> BAJO
          </span>
        );
    }
  };

  const calculateEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'text-green-600';
    if (efficiency >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading)
    return <div className="p-8 text-center text-slate-500">Analizando riesgo académico...</div>;

  if (error)
    return <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg">{error}</div>;

  if (students.length === 0) {
    return (
      <div className="p-8 text-center bg-green-50 rounded-lg border border-green-200">
        <IconCheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-green-900">¡Excelente!</h3>
        <p className="text-green-700">
          No se detectaron estudiantes en riesgo (Alto/Medio) en este curso.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-700">
          Estudiantes Detectados: {students.length}
        </h3>
        <span className="text-xs text-slate-500">Ordenado por Nivel de Riesgo</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Estudiante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Riesgo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Progreso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Interacciones IA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Eficiencia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Acción Recomendada
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {students.map((student) => (
              <tr key={student.studentId} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                      {student.studentName.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900">
                        {student.studentName}
                      </div>
                      <div className="text-xs text-slate-500">{student.studentEmail}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRiskBadge(student.insights.riskLevel)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm text-slate-900 mr-2">
                      {student.academicProgress.completionPercentage.toFixed(0)}%
                    </span>
                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${student.academicProgress.completionPercentage < 50 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${student.academicProgress.completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {student.academicProgress.completedUnits}/{student.academicProgress.totalUnits}{' '}
                    Unidades
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {student.tutorMetrics.totalInteractions} msgs
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`text-sm font-bold ${calculateEfficiencyColor(student.insights.efficiency)}`}
                  >
                    {student.insights.efficiency.toFixed(0)}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <ul className="list-disc list-inside text-xs text-slate-600">
                    {student.insights.recommendedActions.slice(0, 2).map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                    {student.insights.recommendedActions.length === 0 && (
                      <li>Revisar manualmente</li>
                    )}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
