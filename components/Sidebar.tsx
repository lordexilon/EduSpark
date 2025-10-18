
import React from 'react';
import { NavLink } from 'react-router-dom';
import { IconDashboard, IconBookOpen, IconClipboardList, IconCog, IconTrophy, IconUserGroup } from './Icons.tsx';

const navItems = [
  { name: 'Panel', path: '/dashboard', icon: IconDashboard },
  { name: 'Mis Clases', path: '/sessions', icon: IconBookOpen },
  { name: 'Mis Tareas', path: '/assignments', icon: IconClipboardList },
  { name: 'Calificaciones', path: '/grades', icon: IconTrophy },
  { name: 'Foros', path: '/forums', icon: IconUserGroup },
];

const Sidebar: React.FC = () => {
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
        <h2 className="text-xl font-bold text-text-dark">EthosPro</h2>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => (
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
      <div>
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

export default Sidebar;