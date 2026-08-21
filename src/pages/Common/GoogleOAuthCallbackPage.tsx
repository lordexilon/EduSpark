// pages/GoogleOAuthCallbackPage.tsx
// Página que maneja el callback de OAuth de Google

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { googleOAuthService } from '@/services/googleOAuthService';
import { googleDriveService } from '@/services/googleDriveService';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';

const GoogleOAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  // CRÍTICO: Leer parámetros directamente de window.location.search
  // porque useSearchParams() puede no estar sincronizado cuando Google redirige
  const getUrlParams = () => {
    if (typeof window === 'undefined') return new URLSearchParams();
    const params = new URLSearchParams(window.location.search);
    return params;
  };

  const urlParams = getUrlParams();

  console.log('🎯 GoogleOAuthCallbackPage: Componente montado', {
    authLoading,
    hasUser: !!user,
    userId: user?.id,
    windowSearch: window.location.search,
    urlParams: Object.fromEntries(urlParams.entries()),
    searchParamsFromHook: Object.fromEntries(searchParams.entries()),
  });

  useEffect(() => {
    console.log('🔄 GoogleOAuthCallbackPage: useEffect ejecutado', {
      authLoading,
      hasUser: !!user,
    });

    // Esperar a que la autenticación termine de cargar
    if (authLoading) {
      console.log('⏳ OAuth Callback: Esperando que termine la carga de autenticación...');
      return;
    }

    const handleCallback = async () => {
      try {
        // Verificar que el usuario esté autenticado
        if (!user?.id) {
          console.error('❌ OAuth Callback: Usuario no autenticado');
          setStatus('error');
          setMessage(
            'Debes estar autenticado para conectar tu cuenta de Google. Por favor, inicia sesión primero.'
          );
          return;
        }

        console.log('✅ OAuth Callback: Usuario autenticado, procesando código...');

        // CRÍTICO: Leer parámetros directamente de window.location.search
        // porque useSearchParams() puede no estar sincronizado cuando Google redirige
        const currentParams = getUrlParams();
        const code = currentParams.get('code');
        const error = currentParams.get('error');
        const state = currentParams.get('state');

        console.log('📋 OAuth Callback: Parámetros de URL:', {
          code: !!code,
          codeLength: code?.length,
          error,
          state,
          windowSearch: window.location.search,
        });

        if (error) {
          console.error('❌ OAuth Callback: Error en la URL:', error);
          setStatus('error');
          setMessage(`Error de autorización: ${error}`);
          return;
        }

        if (!code) {
          console.error('❌ OAuth Callback: No se encontró el código en la URL');
          setStatus('error');
          setMessage('No se recibió el código de autorización de Google.');
          return;
        }

        // Intercambiar código por tokens
        console.log('🔗 OAuth Callback: Intercambiando código por tokens...', {
          codeLength: code.length,
        });
        const tokens = await googleOAuthService.exchangeCodeForTokens(code);
        console.log('✅ OAuth Callback: Tokens obtenidos exitosamente', {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiresIn: tokens.expires_in,
        });

        // Determinar qué servicios se están autorizando
        const hasCalendar = tokens.scope.includes('calendar');
        const hasDrive = tokens.scope.includes('drive');
        let serviceType: 'calendar' | 'drive' | 'both' = 'calendar';

        if (hasCalendar && hasDrive) {
          serviceType = 'both';
        } else if (hasDrive) {
          serviceType = 'drive';
        }

        // Guardar tokens en la base de datos
        console.log('💾 OAuth Callback: Guardando tokens en la base de datos...', {
          serviceType,
          hasCalendar,
          hasDrive,
          scope: tokens.scope,
          userId: user.id,
        });
        const savedToken = await googleOAuthService.saveTokens(
          user.id,
          tokens.access_token,
          tokens.refresh_token || null,
          tokens.expires_in,
          tokens.scope,
          serviceType
        );
        console.log('✅ OAuth Callback: Tokens guardados exitosamente', {
          tokenId: savedToken.id,
          serviceType,
          expiresAt: savedToken.expires_at,
        });

        // Si se autorizó Drive, crear la carpeta del usuario
        if (hasDrive) {
          try {
            console.log('📁 OAuth Callback: Creando carpeta de Drive...');
            await googleDriveService.createOrGetUserFolder(user.id);
            console.log('✅ OAuth Callback: Carpeta de Drive creada/obtenida exitosamente');
          } catch (driveError: any) {
            console.error('⚠️ OAuth Callback: Error creando carpeta de Drive:', driveError);
            // No fallar todo el proceso si falla la creación de carpeta
          }
        }

        // Mensaje de éxito según los servicios conectados
        let successMessage = '';
        if (hasCalendar && hasDrive) {
          successMessage = '¡Cuentas de Google Calendar y Drive conectadas exitosamente!';
        } else if (hasDrive) {
          successMessage = '¡Cuenta de Google Drive conectada exitosamente!';
        } else {
          successMessage = '¡Cuenta de Google Calendar conectada exitosamente!';
        }

        setStatus('success');
        setMessage(successMessage);

        // Redirigir después de 2 segundos
        setTimeout(() => {
          // Si hay un estado (state), podría contener la URL de redirección
          if (state) {
            try {
              const redirectUrl = JSON.parse(decodeURIComponent(state));
              navigate(redirectUrl.path || '/profile');
            } catch {
              navigate('/profile');
            }
          } else {
            navigate('/profile');
          }
        }, 2000);
      } catch (err: any) {
        console.error('Error en callback OAuth:', err);
        setStatus('error');
        setMessage(err.message || 'Error al conectar la cuenta de Google.');
      }
    };

    handleCallback();
  }, [user, authLoading, searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="max-w-md w-full">
        <div className="text-center py-8">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Conectando cuenta de Google...
              </h2>
              <p className="text-gray-600">Por favor espera mientras completamos la conexión.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">¡Cuenta conectada!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500 mb-4">Serás redirigido automáticamente...</p>
              <Button
                onClick={() => {
                  // Navegar según el rol del usuario
                  if (!user) {
                    navigate('/login');
                  } else {
                    const userRole = user?.role?.name;
                    if (userRole === 'teacher' || userRole === 'admin') {
                      navigate('/teacher/courses');
                    } else {
                      navigate('/dashboard');
                    }
                  }
                }}
              >
                {user?.role?.name === 'teacher' || user?.role?.name === 'admin'
                  ? 'Ir a Cursos'
                  : 'Ir al Dashboard'}
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Error al conectar</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => {
                    // Navegar según el rol del usuario
                    if (!user) {
                      navigate('/login');
                    } else {
                      const userRole = user?.role?.name;
                      if (userRole === 'teacher' || userRole === 'admin') {
                        navigate('/teacher/courses');
                      } else {
                        navigate('/dashboard');
                      }
                    }
                  }}
                  variant="secondary"
                >
                  {user?.role?.name === 'teacher' || user?.role?.name === 'admin'
                    ? 'Volver a Cursos'
                    : 'Volver al Dashboard'}
                </Button>
                <Button
                  onClick={() => {
                    const state = JSON.stringify({ path: window.location.pathname });
                    window.location.href = googleOAuthService.getAuthorizationUrl(state);
                  }}
                >
                  Intentar de nuevo
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GoogleOAuthCallbackPage;
