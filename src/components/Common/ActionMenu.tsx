// components/Common/ActionMenu.tsx
// Menú desplegable reutilizable para acciones

import React, { useState, useRef, useEffect } from 'react';

export interface ActionMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
    dividerBefore?: boolean;
}

interface ActionMenuProps {
    items: ActionMenuItem[];
    triggerLabel?: string;
    triggerIcon?: React.ReactNode;
    className?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
    items,
    triggerLabel = 'Más opciones',
    triggerIcon,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Cerrar menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Cerrar con Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    return (
        <div ref={menuRef} className={`relative inline-block ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-background hover:bg-background/80 text-text-dark rounded-lg text-sm font-medium transition-colors border border-border"
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {triggerIcon || (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                )}
                {triggerLabel && <span>{triggerLabel}</span>}
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-1 w-56 bg-surface rounded-lg shadow-lg border border-border py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                    role="menu"
                >
                    {items.map((item, index) => (
                        <React.Fragment key={index}>
                            {item.dividerBefore && (
                                <div className="my-1 border-t border-border" />
                            )}
                            <button
                                onClick={() => {
                                    item.onClick();
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${item.variant === 'danger'
                                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                                    : 'text-text-dark hover:bg-background'
                                    }`}
                                role="menuitem"
                            >
                                {item.icon && <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>}
                                <span>{item.label}</span>
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActionMenu;
