/**
 * MenuItemComponent - Componente compartido para renderizar items del sidebar.
 * Extraído para eliminar duplicación entre Sidebar.tsx y TeacherSidebar.tsx.
 * Soporta items con/sin hijos, badges de notificación y modo colapsado.
 */
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconChevronDown, IconChevronUp } from '../Icons.tsx';

export interface MenuItemDef {
    name: string;
    path?: string;
    icon: React.FC<any>;
    children?: MenuItemDef[];
    allowedRoles?: string[];
    featureKey?: string;
    /** Etiqueta visual para separar secciones (ej: 'ADMINISTRACIÓN') */
    sectionLabel?: string;
}

interface MenuItemComponentProps {
    item: MenuItemDef;
    collapsed: boolean;
    expanded: boolean;
    onToggle: () => void;
    onClose?: () => void;
    activeClassName: string;
    inactiveClassName: string;
    unreadMessagesCount: number;
    unreadAnnouncementsCount: number;
    /** Prefijo para las rutas de mensajería ('' para student, '/teacher' para teacher) */
    messagingPrefix?: string;
}

const MenuItemComponent: React.FC<MenuItemComponentProps> = ({
    item,
    collapsed,
    expanded,
    onToggle,
    onClose,
    activeClassName,
    inactiveClassName,
    unreadMessagesCount,
    unreadAnnouncementsCount,
    messagingPrefix = '',
}) => {
    const location = useLocation();
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.path ? location.pathname === item.path : false;
    const hasActiveChild = hasChildren && item.children!.some(child => {
        if (!child.path) return false;
        return location.pathname === child.path || location.pathname.startsWith(child.path);
    });

    const messagesPath = `${messagingPrefix}/messages`;
    const announcementsPath = `${messagingPrefix}/announcements`;

    const isMessages = item.path === messagesPath || item.children?.some(c => c.path === messagesPath);
    const isAnnouncements = item.path === announcementsPath || item.children?.some(c => c.path === announcementsPath);

    // Si el item es "Comunicación" (tiene hijos con avisos y mensajes), sumar ambos contadores
    const isCommunication = item.name === 'Comunicación' && item.children?.some(c =>
        c.path === announcementsPath || c.path === messagesPath
    );

    let hasUnread: boolean;
    let unreadCount: number;

    if (isCommunication) {
        const totalUnread = unreadMessagesCount + unreadAnnouncementsCount;
        hasUnread = totalUnread > 0;
        unreadCount = totalUnread;
    } else {
        hasUnread = (isMessages && unreadMessagesCount > 0) || (isAnnouncements && unreadAnnouncementsCount > 0);
        unreadCount = isMessages ? unreadMessagesCount : isAnnouncements ? unreadAnnouncementsCount : 0;
    }

    // --- MODO COLAPSADO ---
    if (collapsed) {
        if (hasChildren) {
            return (
                <div className="relative group">
                    <button
                        onClick={onToggle}
                        className={`w-full flex items-center justify-center p-3 rounded-lg transition-all duration-200 text-sm font-medium relative ${hasActiveChild ? activeClassName : inactiveClassName}`}
                        title={item.name}
                    >
                        <div className="relative">
                            <item.icon className={`w-5 h-5 flex-shrink-0 ${hasUnread ? 'animate-pulse' : ''}`} />
                            {hasUnread && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            )}
                        </div>
                    </button>
                </div>
            );
        }

        return (
            <NavLink
                to={item.path!}
                onClick={onClose}
                className={({ isActive }) =>
                    `flex items-center justify-center p-3 rounded-lg transition-all duration-200 text-sm font-medium relative ${isActive ? activeClassName : inactiveClassName}`}
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

    // --- MODO EXPANDIDO CON HIJOS ---
    if (hasChildren) {
        return (
            <div>
                <button
                    onClick={onToggle}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 text-sm font-medium ${hasActiveChild ? activeClassName : inactiveClassName}`}
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
                    <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                        {item.children!.map((child) => {
                            const childIsMessages = child.path === messagesPath;
                            const childIsAnnouncements = child.path === announcementsPath;
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
                                            `flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 text-xs font-medium ${isActive ? activeClassName : inactiveClassName}`
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

    // --- MODO EXPANDIDO SIN HIJOS ---
    return (
        <NavLink
            to={item.path!}
            onClick={(e) => {
                if (onClose && window.innerWidth < 1024) {
                    onClose();
                }
            }}
            className={({ isActive }) =>
                `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-sm font-medium relative ${isActive ? activeClassName : inactiveClassName}`
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

export default MenuItemComponent;
