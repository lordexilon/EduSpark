

import React, { useState } from 'react';
import Card from '../components/Card.tsx';
import Button from '../components/Button.tsx';
import { IconClipboardList, IconPlusCircle, IconX, IconUpload, IconFileText, IconCheckCircle, IconClock } from '../components/Icons.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import { ASSIGNMENTS_DATA } from '../constants.ts';
import { Assignment, Submission } from '../types.ts';

const AssignmentDetailModal: React.FC<{ assignment: Assignment, onClose: () => void }> = ({ assignment, onClose }) => {
  const formatDate = (isoString: string) => new Date(isoString).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

  const getStatusChip = (status: Submission['status']) => {
    switch (status) {
      case 'graded':
        return <span className="flex items-center text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full"><IconCheckCircle className="w-3 h-3 mr-1" /> Calificado</span>;
      case 'pending':
        return <span className="flex items-center text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><IconClock className="w-3 h-3 mr-1" /> Pendiente</span>;
      case 'late':
        return <span className="flex items-center text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full"><IconClock className="w-3 h-3 mr-1" /> Tarde</span>;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-border flex justify-between items-center">
          <h2 id="assignment-title" className="text-xl font-bold text-text-dark">{assignment.title}</h2>
          <Button variant="ghost" size="sm" className="!p-2 text-text-light" onClick={onClose} aria-label="Cerrar modal">
            <IconX className="w-5 h-5" />
          </Button>
        </header>

        <main className="p-6 overflow-y-auto space-y-6">
          <div className="flex justify-between items-baseline">
              <div>
                <p className="text-sm text-text-light">Fecha de Entrega</p>
                <p className="font-semibold text-text-dark">{assignment.dueDate}</p>
              </div>
              <p className={`text-sm font-medium ${assignment.status === 'Pendiente' ? 'text-amber-600' : 'text-slate-600'}`}>
                Estado: {assignment.status}
              </p>
          </div>
          
          <div className="space-y-1">
            <h3 className="font-semibold text-text-dark">Descripción</h3>
            <p className="text-sm text-text-light whitespace-pre-wrap">{assignment.description}</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-text-dark">Historial de Entregas</h3>
            {assignment.submissions.length > 0 ? (
              <ul className="border border-border rounded-lg divide-y divide-border">
                {assignment.submissions.map(sub => (
                  <li key={sub.id} className="p-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <IconFileText className="w-6 h-6 text-primary flex-shrink-0" />
                          <div>
                             <a href={sub.fileUrl} className="text-sm font-medium text-primary hover:underline">{sub.fileName}</a>
                             <p className="text-xs text-text-light">Entregado: {formatDate(sub.submittedAt)}</p>
                          </div>
                        </div>
                        {getStatusChip(sub.status)}
                    </div>
                    {sub.feedback && (
                      <div className="mt-3 ml-9 pl-3 border-l-2 border-primary/20">
                        <p className="text-xs font-semibold text-text-dark">Feedback del Profesor:</p>
                        <blockquote className="text-xs text-text-light italic">"{sub.feedback}"</blockquote>
                        {sub.grade && <p className="text-xs mt-1"><span className="font-semibold">Calificación:</span> {sub.grade}</p>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4 px-3 bg-background rounded-lg">
                <p className="text-sm text-text-light">Aún no has realizado ninguna entrega para esta tarea.</p>
              </div>
            )}
          </div>
        </main>

        <footer className="p-4 border-t border-border flex justify-end items-center gap-3 bg-background/50 rounded-b-lg">
           <Button variant="secondary" onClick={onClose}>Cerrar</Button>
           <Button variant="primary" leftIcon={<IconUpload className="w-5 h-5"/>}>Entregar Tarea</Button>
        </footer>
      </div>
    </div>
  );
};


const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Tareas</h1>
        <div>
          {user?.role === 'teacher' && (
            <Button variant="primary" leftIcon={<IconPlusCircle className="w-5 h-5"/>} onClick={() => alert('Funcionalidad para crear nueva tarea (próximamente).')}>
              Crear Nueva Tarea
            </Button>
          )}
        </div>
      </div>

      {ASSIGNMENTS_DATA.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {ASSIGNMENTS_DATA.map(assign => (
            <Card 
              key={assign.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedAssignment(assign)}
            >
              <div className="flex items-center mb-3">
                <IconClipboardList className="w-6 h-6 text-sky-600 mr-3" />
                <h2 className="text-xl font-semibold text-slate-700">{assign.title}</h2>
              </div>
              <p className="text-sm text-slate-500">Fecha de Entrega: {assign.dueDate}</p>
              <p className={`text-sm font-medium mt-1 ${assign.status === 'Pendiente' ? 'text-amber-600' : 'text-slate-600'}`}>
                Estado: {assign.status}
              </p>
              <div className="mt-4 text-primary font-medium text-sm">
                Ver Detalles &rarr;
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
            <p className="text-slate-600 text-center py-4">No hay tareas publicadas aún.</p>
        </Card>
       )}
       {selectedAssignment && (
        <AssignmentDetailModal 
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
       )}
    </div>
  );
};

export default AssignmentsPage;