// =====================================================
// Router Wrapper para manejar problemas de navegación
// Soluciona problemas de recarga y caché
// =====================================================

import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';

interface RouterWrapperProps {
  children: React.ReactNode;
}

// Componente de debug para monitorear estado de carga
const DebugMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [loadStatus, setLoadStatus] = useState('checking...');

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Presionar F12 + D para mostrar/ocultar debug
      if (event.key === 'F12') {
        event.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    const checkLoadStatus = () => {
      const rootElement = document.getElementById('root');
      const loadingElement = document.querySelector('[data-loading="true"]');
      const bodyChildren = document.body.children.length;

      if (loadingElement && rootElement?.children.length === 0) {
        setLoadStatus('🚨 HANG DETECTED');
      } else if (loadingElement) {
        setLoadStatus('⏳ Loading...');
      } else if (rootElement?.children.length > 0) {
        setLoadStatus('✅ Loaded');
      } else if (bodyChildren === 0) {
        setLoadStatus('❌ NO CONTENT');
      } else {
        setLoadStatus('❓ Unknown');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    const interval = setInterval(checkLoadStatus, 1000);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearInterval(interval);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999,
        fontFamily: 'monospace',
      }}
    >
      <div>🔍 Load Status: {loadStatus}</div>
      <div>📍 URL: {window.location.href}</div>
      <div>🕒 Time: {new Date().toLocaleTimeString()}</div>
      <div>📊 Root Children: {document.getElementById('root')?.children.length || 0}</div>
      <div>📊 Body Children: {document.body.children.length}</div>
      <div>💡 Press F12+D to toggle</div>
      <button
        onClick={() => {
          console.log('🔄 Forzando recarga de emergencia...');
          window.location.reload();
        }}
        style={{
          marginTop: '5px',
          padding: '5px 10px',
          fontSize: '11px',
          background: '#ff4444',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        🚨 FORCE RELOAD
      </button>
      <button
        onClick={() => {
          console.log('🔄 Recarga con limpieza de caché...');
          if ('caches' in window) {
            caches.keys().then((names) => {
              names.forEach((name) => caches.delete(name));
              (window as any).location.reload();
            });
          } else {
            (window as any).location.reload();
          }
        }}
        style={{
          marginTop: '5px',
          padding: '5px 10px',
          fontSize: '11px',
          background: '#ff8800',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        🧹 CLEAN RELOAD
      </button>
    </div>
  );
};

// Componente para manejar la navegación
const NavigationHandler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef<boolean>(true);

  // Manejar problemas de carga inicial
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;

      // Verificar si la página se cargó correctamente después de un tiempo
      const checkInitialLoad = setTimeout(() => {
        const appElement = document.querySelector('#root');
        const loadingElement = document.querySelector('[data-loading="true"]');
        const bodyChildren = document.body.children.length;

        console.log('🔍 Debug carga inicial:', {
          appElement: !!appElement,
          appChildren: appElement?.children.length || 0,
          loadingElement: !!loadingElement,
          bodyChildren,
          location: window.location.href,
        });

        // Si hay un elemento de carga pero no hay contenido de la app
        if (loadingElement && (!appElement || appElement.children.length === 0)) {
          console.warn('🚨 Detección de problema de carga inicial, recargando...');
          window.location.reload();
        }
      }, 5000); // Aumentado a 5 segundos para dar más tiempo a conexiones lentas

      // Verificación adicional más agresiva - RELAJADA
      const aggressiveCheck = setTimeout(() => {
        const appElement = document.querySelector('#root');
        // Solo recargar si no hay NINGUNA estructura en root después de 10 segundos
        if (!appElement || appElement.children.length === 0) {
          console.warn(
            '🚨 Verificación agresiva: Sin contenido detectado después de 10s, forzando recarga...'
          );
          // Evitar bucle infinito si la página está realmente vacía por diseño
          if (window.location.search.includes('no-retry')) return;
          const separator = window.location.href.includes('?') ? '&' : '?';
          window.location.href = window.location.href + separator + 'no-retry=1';
        }
      }, 10000); // Aumentado a 10 segundos para evitar bucles durante fallos de red o auth

      return () => {
        clearTimeout(checkInitialLoad);
        clearTimeout(aggressiveCheck);
      };
    }
  }, []);

  useEffect(() => {
    // Limpiar caché del navegador en cada navegación
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.includes('vite') || name.includes('eduspark')) {
            caches.delete(name).catch(console.warn);
          }
        });
      });
    }

    // Limpiar LocalStorage de caché si existe (solo Vite, NO auth)
    try {
      const cacheKeys = Object.keys(localStorage).filter((key) => key.includes('vite'));
      cacheKeys.forEach((key) => localStorage.removeItem(key));
    } catch (e) {
      console.warn('Error limpiando localStorage:', e);
    }

    // Forzar recarga si hay problemas de navegación
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Solo log, no forzar navegación - React Router maneja esto correctamente
        // Forzar navigate causaba bucles de redirección durante fallos de autenticación
        console.debug('📱 Tab visible, path:', window.location.pathname);
      }
    };

    // Timeout para detectar si la página se cuelga en "Cargando"
    const detectHangTimeout = () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }

      reloadTimeoutRef.current = setTimeout(() => {
        // Si después de 15 segundos aún estamos en estado de carga, recargar
        const loadingElement = document.querySelector('[data-loading="true"]');
        if (loadingElement) {
          console.warn('Página colgada en estado "Cargando" demasiado tiempo, recargando...');
          window.location.reload();
        }
      }, 15000); // Aumentado a 15 segundos
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Detectar hangs de página
    detectHangTimeout();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [navigate]);

  useEffect(() => {
    // Log de navegación para debugging
    console.log('Navegación:', location.pathname, location.hash);
  }, [location]);

  return null;
};

// Wrapper principal del router
const RouterWrapper: React.FC<RouterWrapperProps> = ({ children }) => {
  useEffect(() => {
    // Limpiar caché de Service Worker al cargar
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister().catch(console.warn);
          });
        })
        .catch(console.warn);
    }

    // Limpiar caché de IndexedDB si existe
    if ('indexedDB' in window) {
      try {
        // indexedDB.databases() retorna una Promise
        if (typeof (indexedDB as any).databases === 'function') {
          (indexedDB as any)
            .databases()
            .then((dbs: Array<{ name: string }>) => {
              dbs.forEach((db) => {
                if (db.name) {
                  try {
                    indexedDB.deleteDatabase(db.name);
                  } catch (e) {
                    console.warn('Error eliminando BD:', db.name, e);
                  }
                }
              });
            })
            .catch((e: any) => {
              console.warn('Error accediendo a bases de datos:', e);
            });
        }
      } catch (e) {
        console.warn('Error limpiando IndexedDB:', e);
      }
    }
  }, []);

  // Función global para forzar recarga
  useEffect(() => {
    // Silenciar errores comunes causados por extensiones del navegador
    const handleUnhandled = (e: PromiseRejectionEvent) => {
      const msg = String((e as any)?.reason || '');
      const errorMsg = msg.toLowerCase();

      // Detectar varios tipos de errores relacionados con extensiones
      const isExtensionError =
        errorMsg.includes('listener indicated an asynchronous response') ||
        errorMsg.includes('message channel closed') ||
        errorMsg.includes('runtime.lasterror') ||
        errorMsg.includes('extension context invalidated');

      if (isExtensionError) {
        e.preventDefault();
        // Solo mostrar en modo desarrollo para no contaminar logs en producción
        if (import.meta.env.DEV) {
          console.debug('🔕 Ignorando error de extensión del navegador:', msg.substring(0, 100));
        }
        return true;
      }
      return false;
    };

    // Manejar errores globales de JavaScript
    const handleError = (e: ErrorEvent) => {
      const msg = String(e.message || '').toLowerCase();

      // Detectar errores de extensiones en el mensaje
      if (
        msg.includes('listener indicated an asynchronous response') ||
        msg.includes('message channel closed') ||
        msg.includes('runtime.lasterror') ||
        msg.includes('extension context invalidated')
      ) {
        e.preventDefault();
        // Solo mostrar en modo desarrollo
        if (import.meta.env.DEV) {
          console.debug('🔕 Ignorando error de extensión del navegador:', e.message);
        }
        return true;
      }
      return false;
    };

    // Interceptar console.error para filtrar errores de extensiones
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorMsg = String(args[0] || '').toLowerCase();

      // Filtrar errores de extensiones
      if (
        errorMsg.includes('unchecked runtime.lasterror') ||
        errorMsg.includes('listener indicated an asynchronous response') ||
        errorMsg.includes('message channel closed')
      ) {
        // No mostrar estos errores en consola
        if (import.meta.env.DEV) {
          console.debug('🔕 Error de extensión filtrado:', args[0]);
        }
        return;
      }

      // Mostrar otros errores normalmente
      originalConsoleError.apply(console, args);
    };

    window.addEventListener('unhandledrejection', handleUnhandled);
    window.addEventListener('error', handleError as EventListener);

    (window as any).forceReload = () => {
      console.log('🔄 Forzando recarga completa...');
      // Limpiar localStorage
      try {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.includes('vite') || key.includes('cache')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Error limpiando localStorage:', e);
      }

      // Limpiar sessionStorage
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('Error limpiando sessionStorage:', e);
      }

      window.location.reload();
    };

    console.log('💡 Función global disponible: window.forceReload()');
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandled);
      window.removeEventListener('error', handleError as EventListener);
      console.error = originalConsoleError; // Restaurar console.error original
    };
  }, []);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <NavigationHandler />
      <DebugMonitor />
      {children}
    </BrowserRouter>
  );
};

export default RouterWrapper;
