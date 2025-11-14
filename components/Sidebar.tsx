
import React from 'react';
import { NavLink } from 'react-router-dom';
import { IconDashboard, IconBookOpen, IconClipboardList, IconCog, IconChartBar, IconUserGroup, IconRobot, IconEduSparkLogo, IconX, IconChevronLeft, IconChevronRight, IconMessage, IconBell } from './Icons.tsx';
import { useAuth } from '../hooks/useAuth';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useUnreadAnnouncements } from '../hooks/useUnreadAnnouncements';

const navItems = [
  { name: 'Panel', path: '/dashboard', icon: IconDashboard },
  { name: 'Mis Clases', path: '/sessions', icon: IconBookOpen },
  { name: 'Tutor IA', path: '/tutor', icon: IconRobot },
  { name: 'Mis Tareas', path: '/assignments', icon: IconClipboardList },
  { name: 'Calificaciones', path: '/grades', icon: IconChartBar },
  { name: 'Avisos', path: '/announcements', icon: IconBell },
  { name: 'Foros', path: '/forums', icon: IconUserGroup },
  { name: 'Mensajería', path: '/messages', icon: IconMessage },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle, onClose }) => {
  const { user } = useAuth();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();
  const { unreadCount: unreadAnnouncementsCount } = useUnreadAnnouncements();
  const activeClassName = "bg-primary/10 text-primary font-semibold";
  const inactiveClassName = "text-text-light hover:bg-gray-100 hover:text-text-dark";


  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} h-full bg-surface text-text-dark flex flex-col p-4 border-r border-border transition-all duration-300 relative`}>
      {/* Botón de cerrar para móvil */}
      <div className="flex items-center justify-between mb-4 lg:hidden">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-2'}`}>
          <IconEduSparkLogo className="w-8 h-8 flex-shrink-0" />
          {!collapsed && <h2 className="text-xl font-bold text-text-dark">EduSpark</h2>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Cerrar menú"
          >
            <IconX className="w-6 h-6 text-text-light" />
          </button>
        )}
      </div>
      
      {/* Logo para desktop */}
      <div className={`hidden lg:flex ${collapsed ? 'justify-center px-0' : 'px-4'} py-2 mb-8 items-center space-x-2 relative z-0 mt-2`}>
        <IconEduSparkLogo className="w-8 h-8 flex-shrink-0" style={{ display: 'block' }} />
        {!collapsed && <h2 className="text-xl font-bold text-text-dark">EduSpark</h2>}
      </div>
      
      {/* Botón para colapsar/expandir - solo en desktop */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="hidden lg:flex absolute -right-3 top-4 z-20 bg-white border border-gray-300 rounded-full p-1.5 shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {collapsed ? (
            <IconChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <IconChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      )}
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isMessages = item.path === '/messages';
            const isAnnouncements = item.path === '/announcements';
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
                    }`
                  }
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
            }`
          }
          title={collapsed ? "Configuración" : ''}
        >
          <IconCog className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;