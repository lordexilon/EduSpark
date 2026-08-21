import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'blue' | 'slate' | 'gray' | 'indigo' | 'corporate' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  resetPrimaryColor: () => void;
  secondaryColor: string;
  setSecondaryColor: (color: string) => void;
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

// Utilidad simple para oscurecer un color HEX (para el estado hover)
const adjustBrightness = (hex: string, percent: number) => {
  // Remover #
  let hashless = hex.replace(/^#/, '');
  if (hashless.length === 3) {
    hashless = hashless[0] + hashless[0] + hashless[1] + hashless[1] + hashless[2] + hashless[2];
  }
  const num = parseInt(hashless, 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Intentar recuperar el tema y color primario guardados
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('eduspark-theme');
    return (savedTheme as Theme) || 'blue';
  });

  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    return localStorage.getItem('eduspark-primary-color') || '#3b82f6'; // Tailwind blue-500 por defecto
  });

  const [secondaryColor, setSecondaryColorState] = useState<string>(() => {
    return localStorage.getItem('eduspark-secondary-color') || '#64748b'; // Tailwind slate-500 por defecto
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('eduspark-theme', newTheme);
  };

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    localStorage.setItem('eduspark-primary-color', color);
  };

  const setSecondaryColor = (color: string) => {
    setSecondaryColorState(color);
    localStorage.setItem('eduspark-secondary-color', color);
  };

  const resetPrimaryColor = () => {
    setPrimaryColorState('#3b82f6');
    localStorage.removeItem('eduspark-primary-color');
    setSecondaryColorState('#64748b');
    localStorage.removeItem('eduspark-secondary-color');
  };

  // Efecto para cambiar el fondo base y manejar dark mode
  useEffect(() => {
    const root = document.documentElement;
    let color = '#eff6ff'; // Default blue

    // Manejar dark mode: agregar/quitar clase 'dark' en <html>
    if (theme === 'dark') {
      root.classList.add('dark');
      color = '#0f172a';
    } else {
      root.classList.remove('dark');
      switch (theme) {
        case 'blue':
          color = '#eff6ff';
          break;
        case 'slate':
          color = '#f8fafc';
          break;
        case 'gray':
          color = '#f3f4f6';
          break;
        case 'indigo':
          color = '#eef2ff';
          break;
        case 'corporate':
          color = '#eef2f6';
          break;
      }
    }

    root.style.setProperty('--background', color);
    document.body.style.backgroundColor = color;
  }, [theme]);

  // Efecto para cambiar el color primario y secundario (CSS Variables)
  useEffect(() => {
    const root = document.documentElement;

    // Inject primary color
    root.style.setProperty('--primary', primaryColor);
    try {
      root.style.setProperty('--primary-hover', adjustBrightness(primaryColor, -10));
    } catch (e) {
      console.error(e);
    }

    // Inject secondary color
    root.style.setProperty('--secondary', secondaryColor);
    try {
      root.style.setProperty('--secondary-hover', adjustBrightness(secondaryColor, -10));
    } catch (e) {
      console.error(e);
    }
  }, [primaryColor, secondaryColor]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        primaryColor,
        setPrimaryColor,
        secondaryColor,
        setSecondaryColor,
        resetPrimaryColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
