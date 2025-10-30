// =====================================================
// Router Wrapper para manejar problemas de navegación
// Soluciona problemas de recarga y caché
// =====================================================

import React, { useEffect, useRef, useState } from 'react';
import { HashRouter, useLocation, useNavigate } from 'react-router-dom';

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
        setIsVisible(prev => !prev);
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
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
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
          fontWeight: 'bold'
        }}
      >
        🚨 FORCE RELOAD
      </button>
      <button
        onClick={() => {
          console.log('🔄 Recarga con limpieza de caché...');
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
              window.location.reload();
            });
          } else {
            window.location.reload();
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
          fontWeight: 'bold'
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
          location: window.location.href
        });

        // Si hay un elemento de carga pero no hay contenido de la app
        if (loadingElement && (!appElement || appElement.children.length === 0)) {
          console.warn('🚨 Detección de problema de carga inicial, recargando...');
          window.location.reload();
        }
      }, 1500); // Reducido a 1.5 segundos

      // Verificación adicional más agresiva
      const aggressiveCheck = setTimeout(() => {
        const appElement = document.querySelector('#root');
        if (!appElement || appElement.children.length === 0) {
          console.warn('🚨 Verificación agresiva: Sin contenido detectado, forzando recarga...');
          window.location.href = window.location.href;
        }
      }, 3000); // Reducido a 3 segundos

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

    // Limpiar LocalStorage de caché si existe
    try {
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.includes('vite') || key.includes('cache')
      );
      cacheKeys.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.warn('Error limpiando localStorage:', e);
    }

    // Forzar recarga si hay problemas de navegación
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Verificar si la página se cargó correctamente
        const currentPath = window.location.hash;
        if (currentPath && !currentPath.includes('#')) {
          // Si hay problemas con el hash, forzar navegación
          navigate(currentPath, { replace: true });
        }
      }
    };

    // Timeout para detectar si la página se cuelga en "Cargando"
    const detectHangTimeout = () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
      
      reloadTimeoutRef.current = setTimeout(() => {
        // Si después de 5 segundos aún estamos en estado de carga, recargar
        const loadingElement = document.querySelector('[data-loading="true"]');
        if (loadingElement) {
          console.warn('Página colgada en estado "Cargando", recargando...');
          location.reload();
        }
      }, 5000);
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
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(console.warn);
        });
      }).catch(console.warn);
    }

    // Limpiar caché de IndexedDB si existe
    if ('indexedDB' in window) {
      try {
        // indexedDB.databases() retorna una Promise
        if (typeof (indexedDB as any).databases === 'function') {
          (indexedDB as any).databases().then((dbs: Array<{ name: string }>) => {
            dbs.forEach((db) => {
              if (db.name) {
                try {
                  indexedDB.deleteDatabase(db.name);
                } catch (e) {
                  console.warn('Error eliminando BD:', db.name, e);
                }
              }
            });
          }).catch((e: any) => {
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
    (window as any).forceReload = () => {
      console.log('🔄 Forzando recarga completa...');
      // Limpiar localStorage
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
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
  }, []);

  return (
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <NavigationHandler />
      <DebugMonitor />
      {children}
    </HashRouter>
  );
};

export default RouterWrapper;
