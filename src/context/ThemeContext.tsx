import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'blue' | 'slate' | 'gray' | 'indigo' | 'corporate';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Intentar recuperar el tema guardado, o usar 'blue' por defecto
    const [theme, setThemeState] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('eduspark-theme');
        return (savedTheme as Theme) || 'blue';
    });

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('eduspark-theme', newTheme);
    };

    useEffect(() => {
        const root = document.documentElement;
        let color = '#eff6ff'; // Default blue

        switch (theme) {
            case 'blue':
                color = '#eff6ff'; // Blue-50
                break;
            case 'slate':
                color = '#f8fafc'; // Slate-50
                break;
            case 'gray':
                color = '#f3f4f6'; // Gray-100
                break;
            case 'indigo':
                color = '#eef2ff'; // Indigo-50
                break;
            case 'corporate':
                color = '#eef2f6'; // Slate-100/Blue-gray
                break;
        }

        // Actualizar la variable CSS global
        root.style.setProperty('--background', color);

        // También actualizar el body directamente por si acaso
        document.body.style.backgroundColor = color;

    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
