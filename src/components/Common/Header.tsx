import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePageReload } from '@/hooks/usePageReload';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUnreadAnnouncements } from '@/hooks/useUnreadAnnouncements';
import { IconUserCircle, IconBell, IconSearch, IconRefreshCw, IconMenu } from './Icons.tsx';

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { forceReload } = usePageReload();
  const navigate = useNavigate();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();
  const { unreadCount: unreadAnnouncementsCount } = useUnreadAnnouncements();
  const totalUnread = unreadMessagesCount + unreadAnnouncementsCount;

  return (
    <header className="bg-surface p-4 lg:px-8 flex justify-between items-center gap-4 sticky top-0 z-30 border-b border-border">
      {/* Botón de menú para móvil */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Abrir menú"
        >
          <IconMenu className="w-6 h-6 text-text-dark" />
        </button>
      )}

      {/* Búsqueda - oculta en móviles pequeños, visible en tablets y desktop */}
      <div className="relative flex-1 max-w-xs hidden sm:block">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <IconSearch className="w-5 h-5 text-text-light" />
        </div>
        <input
          type="text"
          placeholder="Buscar curso..."
          className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-4 text-sm text-text-dark focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition"
        />
      </div>

      <div className="flex items-center space-x-3 sm:space-x-5 flex-shrink-0">
        <button
          onClick={forceReload}
          className="text-text-light hover:text-text-dark transition p-1 rounded hover:bg-background hidden sm:block"
          title="Recargar página (F5)"
        >
          <IconRefreshCw className="w-6 h-6" />
        </button>
        <button
          onClick={() => {
            const isTeacher = [
              'teacher',
              'admin',
              'admin-campus',
              'coordinator',
              'supervisor',
            ].includes(user?.role?.name || '');
            navigate(isTeacher ? '/teacher/messages' : '/messages');
          }}
          className={`relative text-text-light hover:text-text-dark transition p-1 rounded hover:bg-background ${totalUnread > 0 ? 'animate-pulse' : ''}`}
          title={
            totalUnread > 0
              ? `${unreadMessagesCount} mensaje${unreadMessagesCount !== 1 ? 's' : ''} no leído${unreadMessagesCount !== 1 ? 's' : ''}, ${unreadAnnouncementsCount} aviso${unreadAnnouncementsCount !== 1 ? 's' : ''} no leído${unreadAnnouncementsCount !== 1 ? 's' : ''}`
              : 'Notificaciones'
          }
        >
          <IconBell className="w-5 h-5 sm:w-6 sm:h-6" />
          {totalUnread > 0 && (
            <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-xs font-bold rounded-full transform translate-x-1/2 -translate-y-1/2">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
        <div className="flex items-center">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={`${user.first_name} ${user.last_name}`}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <IconUserCircle className="w-8 h-8 sm:w-10 sm:h-10 text-text-light" />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
