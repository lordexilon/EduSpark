/**
 * TeacherSidebar.tsx - Sidebar para roles de TEACHER, ADMIN, ADMIN-CAMPUS, COORDINATOR, SUPERVISOR.
 * Usa el MenuItemComponent compartido y la configuración centralizada de MenuConfig.ts.
 */
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconEduSparkLogo, IconChevronLeft, IconChevronRight, IconX } from './Icons.tsx';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUnreadAnnouncements } from '@/hooks/useUnreadAnnouncements';
import { useUserInstitution } from '@/hooks/useUserInstitution';
import { getBaseItems, getAdminItems } from './Sidebar/MenuConfig';
import type { MenuItem } from './Sidebar/MenuConfig';
import MenuItemComponent from './Sidebar/MenuItemComponent';

interface TeacherSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

const TeacherSidebar: React.FC<TeacherSidebarProps> = ({
  collapsed = false,
  onToggle,
  onClose,
}) => {
  const { user, menuFeatures } = useAuth();
  const location = useLocation();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();
  const { unreadCount: unreadAnnouncementsCount } = useUnreadAnnouncements();
  const { institution } = useUserInstitution();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const activeClassName = 'bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20';
  const inactiveClassName =
    'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700';

  const userRole = user?.role?.name || '';
  const isAdmin = ['admin', 'coordinator', 'admin-campus', 'supervisor'].includes(userRole);

  // Función para filtrar items por feature flags
  const isVisible = (item: MenuItem): boolean => {
    if (item.featureKey) {
      const flag = menuFeatures?.find((f) => f.key === item.featureKey);
      if (flag && !flag.enabled) return false;

      if (flag && flag.allowed_roles && flag.allowed_roles.length > 0 && userRole) {
        if (!flag.allowed_roles.includes(userRole)) return false;
      }
    }
    return true;
  };

  // Función para filtrar items y sus hijos recursivamente
  const filterItems = (items: MenuItem[]): MenuItem[] => {
    return items
      .filter(isVisible)
      .map((item) => {
        if (item.children) {
          return { ...item, children: item.children.filter(isVisible) };
        }
        return item;
      })
      .filter((item) => !item.children || item.children.length > 0);
  };

  // Obtener items filtrados
  const baseItems = filterItems(getBaseItems(userRole));
  const adminItems = filterItems(getAdminItems(userRole));

  // Auto-expandir menús si la ruta actual está dentro de un submenú
  useEffect(() => {
    const newExpanded = new Set<string>();
    const allItems = [...baseItems, ...adminItems];

    allItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => {
          if (!child.path) return false;
          return location.pathname === child.path || location.pathname.startsWith(child.path);
        });
        if (hasActiveChild) {
          newExpanded.add(item.name);
        }
      }
    });

    setExpandedMenus(newExpanded);
  }, [location.pathname, userRole]);

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) => {
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
    <aside
      className={`${collapsed ? 'w-20' : 'w-64'} h-full bg-surface text-text-dark flex flex-col p-4 border-r border-border transition-all duration-300 relative`}
    >
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
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed ? (
            <IconChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <IconChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      )}

      {/* Tarjeta de Institución - Arriba (Desktop) */}
      {institution && !collapsed && (
        <div className="hidden lg:block px-4 py-3 mb-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-blue-200 dark:border-gray-600 shadow-sm">
          <div className="flex items-center space-x-3">
            {institution.logo_url ? (
              <img
                src={institution.logo_url}
                alt={institution.name}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white font-bold text-lg">
                  {institution.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                {institution.name}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                Institución Educativa
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {/* Items principales */}
          {baseItems.map((item) => (
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
                messagingPrefix="/teacher"
              />
            </li>
          ))}

          {/* Separador de administración */}
          {isAdmin && adminItems.length > 0 && (
            <>
              {!collapsed ? (
                <li className="pt-4 pb-1">
                  <div className="px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-600"></div>
                      <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
                        Administración
                      </h3>
                      <div className="flex-1 h-px bg-gradient-to-l from-gray-300 to-transparent dark:from-gray-600"></div>
                    </div>
                  </div>
                </li>
              ) : (
                <li className="pt-2 pb-1">
                  <div className="mx-2 h-px bg-gray-300 dark:bg-gray-600"></div>
                </li>
              )}
              {adminItems.map((item) => (
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
                    messagingPrefix="/teacher"
                  />
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      <div className="border-t border-border mt-auto">
        <NavLink
          to="/profile"
          onClick={onClose}
          className={`group flex items-center gap-3 p-4 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Mi Perfil' : ''}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:shadow-md transition-all">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>
                  {user?.first_name?.[0]?.toUpperCase()}
                  {user?.last_name?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                  {user?.first_name} {user?.last_name}
                </span>

                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      user?.role?.name === 'admin'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : user?.role?.name === 'admin-campus'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : user?.role?.name === 'coordinator'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : user?.role?.name === 'supervisor'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {user?.role?.name === 'admin-campus'
                      ? 'Admin Campus'
                      : user?.role?.name === 'admin'
                        ? 'Admin'
                        : user?.role?.name === 'coordinator'
                          ? 'Coord'
                          : user?.role?.name === 'supervisor'
                            ? 'Supervisor'
                            : 'Docente'}
                  </span>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                  {user?.email}
                </p>
              </div>
            </div>
          )}
        </NavLink>

        {/* Branding Sutil */}
        {!collapsed && (
          <div className="px-4 pb-3 pt-0 flex items-center justify-center">
            <div className="flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity cursor-default group/brand">
              <IconEduSparkLogo className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover/brand:text-primary transition-colors" />
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-tight">
                Powered by{' '}
                <span className="text-gray-900 dark:text-white group-hover/brand:text-primary transition-colors">
                  EduSpark
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default TeacherSidebar;
