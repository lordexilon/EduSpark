import React from 'react';
import { NavLink } from 'react-router-dom';
import { IconDashboard, IconBookOpen, IconClipboardList, IconCog, IconTrophy, IconUserGroup, IconUsers, IconGraduationCap, IconChatAlt2 } from './Icons.tsx';
import { useAuth } from '../hooks/useAuth';

const getNavItems = (userRole: string) => {
  const baseItems = [
    { name: 'Panel', path: '/teacher/dashboard', icon: IconDashboard },
    { name: 'Mis Cursos', path: '/teacher/courses', icon: IconBookOpen },
    { name: 'Crear Curso', path: '/teacher/courses/new', icon: IconGraduationCap },
    { name: 'Tutor IA', path: '/teacher/tutor', icon: IconChatAlt2 },
    { name: 'Mis Tareas', path: '/teacher/assignments', icon: IconClipboardList },
    { name: 'Calificaciones', path: '/teacher/grades', icon: IconTrophy },
    { name: 'Estudiantes', path: '/teacher/students', icon: IconUsers },
    { name: 'Foros', path: '/teacher/forums', icon: IconUserGroup },
  ];

  // Si es administrador, agregar opciones adicionales
  if (userRole === 'admin') {
    return [
      ...baseItems,
      { name: 'Módulos (Admin)', path: '/admin/modules', icon: IconBookOpen },
      { name: 'Todos los Cursos', path: '/admin/all-courses', icon: IconBookOpen },
      { name: 'Usuarios', path: '/admin/users', icon: IconUsers },
      { name: 'Configuración', path: '/admin/settings', icon: IconCog },
    ];
  }

  return baseItems;
};

const TeacherSidebar: React.FC = () => {
  const { user } = useAuth();
  const activeClassName = "bg-primary/10 text-primary font-semibold";
  const inactiveClassName = "text-text-light hover:bg-gray-100 hover:text-text-dark";

  return (
    <aside className="w-64 bg-surface text-text-dark flex flex-col p-4 border-r border-border">
      <div className="px-4 py-2 mb-8 flex items-center space-x-2">
        <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.5 12L3 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16.5 12L21 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 7.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16.5L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h2 className="text-xl font-bold text-text-dark">EduSpark</h2>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          user?.role?.name === 'admin' 
            ? 'bg-red-100 text-red-700' 
            : 'bg-primary/20 text-primary'
        }`}>
          {user?.role?.name === 'admin' ? 'Admin' : 'Docente'}
        </span>
      </div>
      
      <nav className="flex-1">
        <ul className="space-y-2">
          {getNavItems(user?.role?.name || '').map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                    isActive ? activeClassName : inactiveClassName
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="border-t border-border pt-4">
        <div className="px-4 py-2 text-xs text-text-light">
          <p className="font-medium">{user?.first_name} {user?.last_name}</p>
          <p>{user?.email}</p>
        </div>
        <NavLink
          to="/profile" 
          className={({ isActive }) =>
            `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
              isActive ? activeClassName : inactiveClassName
            }`
          }
        >
          <IconCog className="w-5 h-5" />
          <span>Configuración</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default TeacherSidebar;
