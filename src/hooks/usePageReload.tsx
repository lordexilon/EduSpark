// =====================================================
// Hook para manejar problemas de recarga de página
// Soluciona el problema de que F5 no carga la página
// =====================================================

import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export const usePageReload = () => {
  const location = useLocation();

  // Función para forzar recarga limpia
  const forceReload = useCallback(() => {
    // Limpiar caché del navegador
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.includes('vite') || name.includes('eduspark')) {
            caches.delete(name);
          }
        });
      });
    }

    // Limpiar localStorage de Vite
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('vite-') || key.startsWith('eduspark-')) {
        localStorage.removeItem(key);
      }
    });

    // Recargar la página
    window.location.reload();
  }, []);

  // Función para navegar con limpieza de caché
  const navigateWithCleanup = useCallback((path: string) => {
    // Limpiar caché antes de navegar
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.includes('vite') || name.includes('eduspark')) {
            caches.delete(name);
          }
        });
      });
    }

    // Navegar
    window.location.hash = path;
  }, []);

  // Manejar teclas de atajo para recarga
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl + F5 o Cmd + R para recarga forzada
      if ((event.ctrlKey || event.metaKey) && event.key === 'F5') {
        event.preventDefault();
        forceReload();
      }
      
      // F5 para recarga normal con limpieza
      if (event.key === 'F5') {
        event.preventDefault();
        forceReload();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [forceReload]);

  // Detectar problemas de carga
  useEffect(() => {
    const handleLoad = () => {
      // Verificar si la página se cargó correctamente
      const currentHash = window.location.hash;
      if (currentHash && !currentHash.includes('#')) {
        console.warn('Problema de navegación detectado, forzando recarga...');
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    window.addEventListener('load', handleLoad);
    
    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return {
    forceReload,
    navigateWithCleanup
  };
};
