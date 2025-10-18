import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SESSIONS_DATA, MODULE_INFO } from '../constants.ts';
import Card from '../components/Card.tsx';
import Button from '../components/Button.tsx';
import { IconChevronRight, IconCalendar, IconBookOpen, IconPlusCircle, IconPencil } from '../components/Icons.tsx';
import { useAuth } from '../hooks/useAuth.tsx'; 

const SessionsListPage: React.FC = () => {
  const { user } = useAuth(); 
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Sesiones del Curso</h1>
        <div>
          {user?.role === 'teacher' && (
           <Button 
            variant="primary" 
            leftIcon={<IconPlusCircle className="w-5 h-5"/>} 
            onClick={() => navigate('/session/nueva')}
           >
            Añadir Nueva Sesión
          </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-500">{MODULE_INFO.sessionsCount} sesiones en total</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SESSIONS_DATA.map((session) => (
          <Card 
            key={session.id} 
            className="h-full flex flex-col justify-between hover:border-sky-500 border-2 border-transparent transition-all group relative"
          >
            <Link to={`/session/${session.id}`} className="flex flex-col h-full">
              <div>
                <div className="flex items-center text-sky-600 mb-2">
                  <IconBookOpen className="w-5 h-5 mr-2" />
                  <h2 className="text-xl font-semibold line-clamp-1">{session.title}</h2>
                </div>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2 flex-grow">{session.objective}</p>
                <div className="flex items-center text-xs text-slate-500 mb-4">
                  <IconCalendar className="w-4 h-4 mr-1.5" />
                  <span>{session.date}</span>
                </div>
              </div>
              <div className="mt-auto text-right">
                 <span className="inline-flex items-center text-sky-600 font-medium">
                    Ver Detalles <IconChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
              </div>
            </Link>
            {user?.role === 'teacher' && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 !p-1 text-slate-400 hover:text-sky-600"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card link navigation
                  navigate(`/session/editar/${session.id}`);
                }}
                aria-label="Editar Sesión"
              >
                <IconPencil className="w-5 h-5" />
              </Button>
            )}
          </Card>
        ))}
      </div>
       {SESSIONS_DATA.length === 0 && (
        <Card>
            <p className="text-slate-600 text-center py-4">No hay sesiones publicadas aún.</p>
        </Card>
       )}
    </div>
  );
};

export default SessionsListPage;