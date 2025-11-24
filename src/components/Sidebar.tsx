import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconDashboard, IconBookOpen, IconClipboardList, IconCog, IconChartBar, IconUserGroup, IconRobot, IconEduSparkLogo, IconX, IconChevronLeft, IconChevronRight, IconMessage, IconBell, IconCards, IconChevronDown, IconChevronUp, IconDevices } from './Icons.tsx';
import { useAuth } from '../hooks/useAuth';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { useUnreadAnnouncements } from '../hooks/useUnreadAnnouncements';
import { useUserInstitution } from '../hooks/useUserInstitution';

interface MenuItem {
  name: string;
  path?: string;
  icon: React.FC<any>;
  children?: MenuItem[];
}

const navItems: MenuItem[] = [
  { name: 'Panel', path: '/dashboard', icon: IconDashboard },
  {
    name: 'Aprendizaje',
    icon: IconBookOpen,
    children: [
      { name: 'Mis Clases', path: '/sessions', icon: IconBookOpen },
      { name: 'Tutor IA', path: '/tutor', icon: IconRobot },
      { name: 'Flashcards', path: '/flashcards', icon: IconCards },
    ]
  },
  {
    name: 'Evaluaciones',
    icon: IconClipboardList,
    children: [
      { name: 'Mis Tareas', path: '/assignments', icon: IconClipboardList },
      { name: 'Calificaciones', path: '/grades', icon: IconChartBar },
    ]
  },
  {
    name: 'Comunicación',
    icon: IconMessage,
    children: [
      { name: 'Avisos', path: '/announcements', icon: IconBell },
      { name: 'Foros', path: '/forums', icon: IconUserGroup },
      { name: 'Mensajería', path: '/messages', icon: IconMessage },
    ]
  },
  { name: 'Mis Dispositivos', path: '/devices', icon: IconDevices },
  // Nuevo enlace para reporte de dispositivos (solo admin)
  { name: 'Reporte Dispositivos', path: '/admin/devices-report', icon: IconDevices },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

const MenuItemComponent: React.FC<{
  item: MenuItem;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  onClose?: () => void;
  activeClassName: string;
  inactiveClassName: string;
  unreadMessagesCount: number;
  unreadAnnouncementsCount: number;
}> = ({ item, collapsed, expanded, onToggle, onClose, activeClassName, inactiveClassName, unreadMessagesCount, unreadAnnouncementsCount }) => {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.path ? location.pathname === item.path : false;
  const hasActiveChild = hasChildren && item.children!.some(child => child.path && location.pathname.startsWith(child.path));

  const isMessages = item.path === '/messages' || item.children?.some(c => c.path === '/messages');
  const isAnnouncements = item.path === '/announcements' || item.children?.some(c => c.path === '/announcements');
  const hasUnread = (isMessages && unreadMessagesCount > 0) || (isAnnouncements && unreadAnnouncementsCount > 0);
  const unreadCount = isMessages ? unreadMessagesCount : isAnnouncements ? unreadAnnouncementsCount : 0;

  if (collapsed) {
    // Cuando está colapsado, mostrar solo el icono
    if (hasChildren) {
      return (
        <div className="relative group">
          <button
            onClick={onToggle}
            className={`w-full flex items-center justify-center p-3 rounded-lg transition-all duration-200 text-sm font-medium relative ${hasActiveChild ? activeClassName : inactiveClassName
              }`}
            title={item.name}
          >
            <div className="relative">
              <item.icon className={`w-5 h-5 flex-shrink-0 ${hasUnread ? 'animate-pulse' : ''}`} />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </div>
          </button>
          {/* Tooltip para submenú cuando está colapsado */}
          {expanded && !collapsed && (
            <div className="absolute left-full ml-2 top-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px]">
              {item.children!.map((child) => (
                <NavLink
                  key={child.name}
                  to={child.path!}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-4 py-2 text-sm hover:bg-gray-100 ${isActive ? 'text-primary font-semibold' : 'text-gray-700'
                    }`
                  }
                >
                  <child.icon className="w-4 h-4" />
                  <span>{child.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        to={item.path!}
        onClick={onClose}
        className={({ isActive }) =>
          `flex items-center justify-center p-3 rounded-lg transition-all duration-200 text-sm font-medium relative ${isActive ? activeClassName : inactiveClassName
          }`}
        title={item.name}
      >
        <div className="relative">
          <item.icon className={`w-5 h-5 flex-shrink-0 ${hasUnread ? 'animate-pulse' : ''}`} />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </div>
      </NavLink>
    );
  }

  // Cuando no está colapsado
  if (hasChildren) {
    return (
      <div>
        <button
          onClick={onToggle}
          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 text-sm font-medium ${hasActiveChild ? activeClassName : inactiveClassName
            }`}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <item.icon className={`w-5 h-5 flex-shrink-0 ${hasUnread ? 'animate-pulse' : ''}`} />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </div>
            <span>{item.name}</span>
            {hasUnread && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {expanded ? (
            <IconChevronUp className="w-4 h-4" />
          ) : (
            <IconChevronDown className="w-4 h-4" />
          )}
        </button>
        {expanded && (
          <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
            {item.children!.map((child) => {
              const childIsMessages = child.path === '/messages';
              const childIsAnnouncements = child.path === '/announcements';
              const childHasUnread = (childIsMessages && unreadMessagesCount > 0) || (childIsAnnouncements && unreadAnnouncementsCount > 0);
              const childUnreadCount = childIsMessages ? unreadMessagesCount : childIsAnnouncements ? unreadAnnouncementsCount : 0;

              return (
                <li key={child.name}>
                  <NavLink
                    to={child.path!}
                    onClick={(e) => {
                      if (onClose && window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                    className={({ isActive }) =>
                      `flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 text-xs font-medium ${isActive ? activeClassName : inactiveClassName
                      }`
                    }
                  >
                    <div className="relative">
                      <child.icon className={`w-4 h-4 ${childHasUnread ? 'animate-pulse' : ''}`} />
                      {childHasUnread && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                      )}
                    </div>
                    <span className="flex-1">{child.name}</span>
                    {childHasUnread && (
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {childUnreadCount > 9 ? '9+' : childUnreadCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path!}
      onClick={(e) => {
        if (onClose && window.innerWidth < 1024) {
          onClose();
        }
      }}
      className={({ isActive }) =>
        `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-sm font-medium relative ${isActive ? activeClassName : inactiveClassName
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
  );
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();
  const { unreadCount: unreadAnnouncementsCount } = useUnreadAnnouncements();
  const { institution } = useUserInstitution();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const activeClassName = "bg-primary/10 text-primary font-semibold";
  const inactiveClassName = "text-text-light hover:bg-gray-100 hover:text-text-dark";

  // Auto-expandir menús si la ruta actual está dentro de un submenú
  useEffect(() => {
    const newExpanded = new Set<string>();

    navItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => child.path && location.pathname.startsWith(child.path));
        if (hasActiveChild) {
          newExpanded.add(item.name);
        }
      }
    });

    setExpandedMenus(newExpanded);
  }, [location.pathname]);

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuName)) {
        newSet.delete(menuName);
      } else {
        newSet.add(menuName);
      }
      return newSet;
    });
  };

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
          {navItems.map((item) => (
            <li key={item.name}>
              <MenuItemComponent
                item={item}
                collapsed={collapsed}
                expanded={expandedMenus.has(item.name)}
                onToggle={() => toggleMenu(item.name)}
                onClose={onClose}
                activeClassName={activeClassName}
                inactiveClassName={inactiveClassName}
                unreadMessagesCount={unreadMessagesCount}
                unreadAnnouncementsCount={unreadAnnouncementsCount}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border pt-4">
        {/* Información de la institución */}
        {institution && !collapsed && (
          <div className="px-3 py-2 mb-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              {institution.logo_url ? (
                <img
                  src={institution.logo_url}
                  alt={institution.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">
                    {institution.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                  {institution.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Institución
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Información del usuario */}
        {!collapsed && (
          <div className="px-3 py-2 text-xs text-text-light">
            <p className="font-medium">{user?.first_name} {user?.last_name}</p>
            <p>{user?.email}</p>
          </div>
        )}
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-lg transition-all duration-200 text-sm font-medium ${isActive ? activeClassName : inactiveClassName
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
