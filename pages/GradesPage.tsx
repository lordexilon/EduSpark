
import React from 'react';
import Card from '../components/Card.tsx';
import { IconChartBar, IconCheckCircle } from '../components/Icons.tsx';

const GradesPage: React.FC = () => {
  const grades = [
    { id: 'grade1', title: 'Participación Clase 1', score: 'A', date: '23/06/25' },
    { id: 'grade2', title: 'Debate Dilemas Éticos', score: 'B+', date: '24/06/25' },
    { id: 'grade3', title: 'Examen Parcial', score: '-', date: '30/06/25 (Pendiente)' },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Mis Calificaciones</h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tarea/Examen</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Puntaje</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha de Calificación</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {grades.map((grade) => (
                <tr key={grade.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{grade.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${grade.score !== '-' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {grade.score}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{grade.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
         {grades.length === 0 && (
            <p className="text-slate-600 text-center py-8">No hay calificaciones disponibles aún.</p>
         )}
      </Card>
    </div>
  );
};

export default GradesPage;