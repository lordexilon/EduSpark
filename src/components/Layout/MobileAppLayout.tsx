import React, { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const MobileAppLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Set mobile viewport meta tag
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content =
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    document.head.appendChild(meta);

    // Add mobile-app class to body
    document.body.classList.add('mobile-app-view');

    return () => {
      // Cleanup
      document.head.removeChild(meta);
      document.body.classList.remove('mobile-app-view');
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    // En ambiente móvil, damos un tiempo de gracia para que el bridge de Flutter inyecte el token
    // Si después de 2 segundos (tiempo de carga razonable) sigue sin haber usuario, entonces redirigimos.
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-8 text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Sincronizando sesión...</h2>
        <p className="text-gray-500 text-sm italic">
          Estamos preparando tu espacio de aprendizaje móvil.
        </p>
        {/* Fallback por si el bridge falla: mostrar botón de login manual tras un tiempo */}
        <button
          onClick={() => (window.location.href = '/login')}
          className="mt-8 text-xs text-blue-600 underline"
        >
          Si no avanzas, presiona aquí para entrar manualmente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>

      {/* 
              Global Style Overrides for Mobile View 
              We use a style tag here to force certain overrides without modifying global css 
            */}
      <style>{`
                .mobile-app-view ::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }
                .mobile-app-view ::-webkit-scrollbar-track {
                    background: transparent;
                }
                .mobile-app-view ::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 2px;
                }
            `}</style>
    </div>
  );
};

export default MobileAppLayout;
