import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IconCards, IconMessage, IconBookOpen } from '@/components/Common/Icons';

const MobileDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Tutor IA',
      description: 'Resuelve tus dudas al instante',
      icon: <IconMessage className="w-8 h-8 text-white" />,
      color: 'bg-indigo-500',
      path: '/mobile/chat',
    },
    {
      title: 'Flashcards',
      description: 'Repaso rápido',
      icon: <IconCards className="w-8 h-8 text-white" />,
      color: 'bg-emerald-500',
      path: '/mobile/flashcards',
    },
    {
      title: 'Mis Cursos',
      description: 'Continúa aprendiendo',
      icon: <IconBookOpen className="w-8 h-8 text-white" />,
      color: 'bg-blue-500',
      path: '/mobile/courses', // Intentionally pointing to mobile version if we make one, or simplified list
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-gray-900">Hola, {user?.first_name}</h1>
        <p className="text-gray-500">¿Qué quieres aprender hoy?</p>
      </header>

      <div className="grid gap-4">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => navigate(item.path)}
            className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-transform"
          >
            <div className={`p-3 rounded-lg ${item.color} mr-4`}>{item.icon}</div>
            <div className="text-left">
              <h3 className="font-bold text-gray-900">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Tu Progreso Semanal</h2>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Completado</span>
            <span className="text-sm font-bold text-indigo-600">75%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboardPage;
