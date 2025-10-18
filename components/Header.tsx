

import React from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { IconUserCircle, IconBell, IconSearch } from './Icons.tsx';

const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="bg-surface p-4 lg:px-8 flex justify-between items-center sticky top-0 z-10 border-b border-border">
      <div className="relative w-full max-w-xs">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <IconSearch className="w-5 h-5 text-text-light" />
        </div>
        <input
            type="text"
            placeholder="Buscar curso..."
            className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition"
        />
      </div>
      <div className="flex items-center space-x-5">
        <button className="text-text-light hover:text-text-dark transition">
          <IconBell className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
          ) : (
            <IconUserCircle className="w-10 h-10 text-text-light" />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;