import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { IconDashboard, IconBookOpen, IconClipboardList, IconCog, IconTrophy, IconUserGroup, IconUsers, IconGraduationCap, IconRobot, IconStudent, IconEduSparkLogo, IconChevronLeft, IconChevronRight, IconClipboardCheck, IconX, IconMessage, IconBell } from './Icons.tsx';
import { useAuth } from '../hooks/useAuth';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useUnreadAnnouncements } from '../hooks/useUnreadAnnouncements';

interface TeacherSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

const getNavItems = (userRole: string) => {
  const baseItems = [
    { name: 'Panel', path: '/teacher/dashboard', icon: IconDashboard },
    { name: 'Mis Cursos', path: '/teacher/courses', icon: IconBookOpen },
    { name: 'Quizzes', path: '/teacher/quizzes', icon: IconClipboardCheck },
    { name: 'Tutor IA', path: '/teacher/tutor', icon: IconRobot },
    { name: 'Mis Tareas', path: '/teacher/assignments', icon: IconClipboardList },
    { name: 'Calificaciones', path: '/teacher/grades', icon: IconTrophy },
    { name: 'Avisos', path: '/teacher/announcements', icon: IconBell },
    { name: 'Foros', path: '/teacher/forums', icon: IconUserGroup },
    { name: 'Mensajería', path: '/teacher/messages', icon: IconMessage },
  ];

  return baseItems;
};

const getAdminItems = (userRole: string) => {
  if (userRole !== 'admin' && userRole !== 'coordinator') {
    return [];
  }

  return [
    { name: 'Crear Curso', path: '/teacher/courses/new', icon: IconGraduationCap },
    { name: 'Estudiantes', path: '/teacher/students', icon: IconStudent },
    { name: 'Gestión de Usuarios', path: '/admin/users', icon: IconUsers },
    { name: 'Módulos (Admin)', path: '/admin/modules', icon: IconBookOpen },
    // { name: 'Todos los Cursos', path: '/admin/all-courses', icon: IconBookOpen }, // Ocultado: En desarrollo, sin funcionalidad útil
  ];
};

const TeacherSidebar: React.FC<TeacherSidebarProps> = ({ collapsed = false, onToggle, onClose }) => {
  const { user } = useAuth();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();
  const { unreadCount: unreadAnnouncementsCount } = useUnreadAnnouncements();
  const [configExpanded, setConfigExpanded] = useState(false);
  const activeClassName = "bg-primary/10 text-primary font-semibold";
  const inactiveClassName = "text-text-light hover:bg-gray-100 hover:text-text-dark";
  
  const userRole = user?.role?.name || '';
  const isAdmin = userRole === 'admin' || userRole === 'coordinator';
  const baseItems = getNavItems(userRole);
  const adminItems = getAdminItems(userRole);

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} h-full bg-surface text-text-dark flex flex-col p-4 border-r border-border transition-all duration-300 relative`}>
      {/* Botón de cerrar para móvil */}
      {onClose && (
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-2'}`}>
            <IconEduSparkLogo className="w-8 h-8 flex-shrink-0" />
            {!collapsed && <h2 className="text-xl font-bold text-text-dark">EduSpark</h2>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Cerrar menú"
          >
            <IconX className="w-6 h-6 text-text-light" />
          </button>
        </div>
      )}
      {/* Botón para colapsar/expandir - solo en desktop */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="hidden lg:flex absolute -right-3 top-6 z-10 bg-white border border-gray-300 rounded-full p-1.5 shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {collapsed ? (
            <IconChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <IconChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      )}

      {/* Logo para desktop */}
      <div className={`hidden lg:flex ${collapsed ? 'justify-center' : ''} px-4 py-2 mb-8 items-center space-x-2 relative z-0 mt-2`}>
        <IconEduSparkLogo className="w-8 h-8 flex-shrink-0" style={{ display: 'block' }} />
        {!collapsed && (
          <>
            <h2 className="text-xl font-bold text-text-dark">EduSpark</h2>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              user?.role?.name === 'admin' 
                ? 'bg-red-100 text-red-700' 
                : user?.role?.name === 'coordinator'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-primary/20 text-primary'
            }`}>
              {user?.role?.name === 'admin' ? 'Admin' : user?.role?.name === 'coordinator' ? 'Coord' : 'Docente'}
            </span>
          </>
        )}
      </div>
      
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {/* Items principales */}
          {baseItems.map((item) => {
            const isMessages = item.path === '/teacher/messages';
            const isAnnouncements = item.path === '/teacher/announcements';
            const hasUnread = (isMessages && unreadMessagesCount > 0) || (isAnnouncements && unreadAnnouncementsCount > 0);
            const unreadCount = isMessages ? unreadMessagesCount : isAnnouncements ? unreadAnnouncementsCount : 0;
            
            return (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  onClick={(e) => {
                    // Solo cerrar el sidebar en móvil, no interferir con la navegación
                    if (onClose && window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                  className={({ isActive }) =>
                    `flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-lg transition-all duration-200 text-sm font-medium relative ${
                      isActive ? activeClassName : inactiveClassName
                    }`}
                  title={collapsed ? item.name : ''}
                >
                  <div className="relative">
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${hasUnread ? 'animate-pulse' : ''}`} />
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span>{item.name}</span>
                      {hasUnread && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}

          {/* Separador de administración */}
          {isAdmin && adminItems.length > 0 && (
            <>
              {!collapsed && (
                <li className="pt-4">
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Administración
                    </h3>
                  </div>
                </li>
              )}
              {adminItems.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                        isActive ? activeClassName : inactiveClassName
                      }`}
                    title={collapsed ? item.name : ''}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </NavLink>
                </li>
              ))}
            </>
          )}

          {/* Sección de Configuración */}
          {isAdmin && !collapsed && (
            <>
              <li className="pt-4">
                <div className="px-3 py-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Configuración
                  </h3>
                </div>
              </li>
              <li>
                <button
                  onClick={() => setConfigExpanded(!configExpanded)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                    inactiveClassName
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <IconCog className="w-5 h-5" />
                    <span>Configuración</span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${configExpanded ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {configExpanded && (
                  <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
                    <li>
                      <NavLink
                        to="/admin/settings"
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                            isActive ? activeClassName : inactiveClassName
                          }`
                        }
                      >
                        <IconCog className="w-4 h-4" />
                        <span>Configuración General</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/careers"
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                            isActive ? activeClassName : inactiveClassName
                          }`
                        }
                      >
                        <IconGraduationCap className="w-4 h-4" />
                        <span>Carreras</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/subjects"
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                            isActive ? activeClassName : inactiveClassName
                          }`
                        }
                      >
                        <IconBookOpen className="w-4 h-4" />
                        <span>Materias</span>
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/admin/users"
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 text-xs font-medium ${
                            isActive ? activeClassName : inactiveClassName
                          }`
                        }
                      >
                        <IconUsers className="w-4 h-4" />
                        <span>Usuarios</span>
                      </NavLink>
                    </li>
                  </ul>
                )}
              </li>
            </>
          )}
          
          {/* Cuando está colapsado, mostrar solo los iconos de configuración */}
          {isAdmin && collapsed && (
            <>
              <li>
                <NavLink
                  to="/admin/settings"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-center p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive ? activeClassName : inactiveClassName
                    }`}
                  title="Configuración"
                >
                  <IconCog className="w-5 h-5" />
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/careers"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-center p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive ? activeClassName : inactiveClassName
                    }`}
                  title="Carreras"
                >
                  <IconGraduationCap className="w-5 h-5" />
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/subjects"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-center p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive ? activeClassName : inactiveClassName
                    }`}
                  title="Materias"
                >
                  <IconBookOpen className="w-5 h-5" />
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin/users"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-center p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                      isActive ? activeClassName : inactiveClassName
                    }`}
                  title="Usuarios"
                >
                  <IconUsers className="w-5 h-5" />
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </nav>
      
      <div className="border-t border-border pt-4">
        {!collapsed && (
          <div className="px-4 py-2 text-xs text-text-light">
            <p className="font-medium">{user?.first_name} {user?.last_name}</p>
            <p>{user?.email}</p>
          </div>
        )}
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
              isActive ? activeClassName : inactiveClassName
            }`}
          title={collapsed ? "Mi Perfil" : ''}
        >
          <IconUsers className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Mi Perfil</span>}
        </NavLink>
      </div>
    </aside>
  );
};

export default TeacherSidebar;
