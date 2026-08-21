/**
 * Sidebar.tsx - Sidebar para roles de ESTUDIANTE.
 * Usa el MenuItemComponent compartido y la configuración centralizada de MenuConfig.ts.
 */
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconCog, IconEduSparkLogo, IconX, IconChevronLeft, IconChevronRight } from './Icons.tsx';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUnreadAnnouncements } from '@/hooks/useUnreadAnnouncements';
import { useUserInstitution } from '@/hooks/useUserInstitution';
import { MENU_ITEMS } from './Sidebar/MenuConfig';
import type { MenuItem } from './Sidebar/MenuConfig';
import MenuItemComponent from './Sidebar/MenuItemComponent';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  'data-tutorial'?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggle,
  onClose,
  'data-tutorial': dataTutorial,
}) => {
  const { user, menuFeatures } = useAuth();
  const location = useLocation();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();
  const { unreadCount: unreadAnnouncementsCount } = useUnreadAnnouncements();
  const { institution } = useUserInstitution();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const activeClassName = 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20';
  const inactiveClassName =
    'text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700';

  // Función para filtrar items por rol y feature flags
  const isVisible = (item: MenuItem) => {
    // 1. Filtro por rol
    if (item.allowedRoles?.length && user?.role?.name) {
      if (!item.allowedRoles.includes(user.role.name)) return false;
    }

    // 2. Filtro por feature flag
    if (item.featureKey) {
      const flag = menuFeatures?.find((f) => f.key === item.featureKey);
      if (flag && !flag.enabled) return false;

      // 3. Filtro por roles dinámicos del flag
      if (flag && flag.allowed_roles && flag.allowed_roles.length > 0 && user?.role?.name) {
        if (!flag.allowed_roles.includes(user.role.name)) return false;
      }
    }

    return true;
  };

  const filteredItems = MENU_ITEMS.filter(isVisible)
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(isVisible),
        };
      }
      return item;
    })
    .filter((item) => !item.children || item.children.length > 0);

  // Auto-expandir menús si la ruta actual está dentro de un submenú
  useEffect(() => {
    const newExpanded = new Set<string>();

    filteredItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => child.path && location.pathname.startsWith(child.path)
        );
        if (hasActiveChild) {
          newExpanded.add(item.name);
        }
      }
    });

    setExpandedMenus(newExpanded);
  }, [location.pathname, menuFeatures]);

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
      data-tutorial={dataTutorial}
    >
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

      {/* Tarjeta de Institución */}
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

      {/* Botón para colapsar/expandir - solo en desktop */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="hidden lg:flex absolute -right-3 top-4 z-20 bg-white border border-gray-300 rounded-full p-1.5 shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed ? (
            <IconChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <IconChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      )}

      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {filteredItems.map((item) => (
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
                messagingPrefix=""
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border pt-4">
        {/* Logo EduSpark - Ahora abajo */}
        <div
          className={`hidden lg:flex ${collapsed ? 'justify-center px-0' : 'px-4'} py-2 mb-3 items-center space-x-2`}
        >
          <IconEduSparkLogo className="w-8 h-8 flex-shrink-0 block" />
          {!collapsed && <h2 className="text-xl font-bold text-text-dark">EduSpark</h2>}
        </div>

        {/* Información del usuario */}
        {!collapsed && (
          <div className="px-3 py-2 text-xs text-text-light">
            <p className="font-medium">
              {user?.first_name} {user?.last_name}
            </p>
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
          title={collapsed ? 'Configuración' : ''}
        >
          <IconCog className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
