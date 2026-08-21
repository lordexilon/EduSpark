/**
 * Componente de Formulario de Login Unificado
 * Funciona para estudiantes, docentes y administradores
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Mail, Lock, Loader2, UserPlus, AlertCircle } from 'lucide-react';

// Estilos CSS inline para animación de error
const errorStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // SOLUCIÓN: Usar sessionStorage para persistir el error entre re-montajes
  const [loginError, setLoginError] = useState<string>(() => {
    // Cargar error desde sessionStorage al montar
    try {
      const savedError = sessionStorage.getItem('loginError');
      if (savedError && savedError.trim().length > 0) {
        // Limpiar errores de red antiguos que no son relevantes para el usuario
        const networkErrors = [
          'Failed to fetch',
          'NetworkError',
          'Network request failed',
          'Error de conexión',
        ];
        const isNetworkError = networkErrors.some((err) => savedError.includes(err));

        if (isNetworkError) {
          // Los errores de red antiguos no son relevantes, limpiarlos
          console.log('📦 LoginForm: Error de red antiguo detectado, limpiando sessionStorage');
          sessionStorage.removeItem('loginError');
          return '';
        }

        console.log('📦 LoginForm: Error recuperado de sessionStorage al montar:', savedError);
        return savedError;
      }
    } catch (e) {
      console.warn('⚠️ LoginForm: Error accediendo a sessionStorage:', e);
    }
    return '';
  });

  // Log de montaje/desmontaje del componente y limpiar errores antiguos
  useEffect(() => {
    console.log('🔵 LoginForm: Componente MONTADO, loginError inicial:', loginError);

    // Limpiar errores de red antiguos al montar el componente
    try {
      const savedError = sessionStorage.getItem('loginError');
      if (savedError) {
        const networkErrors = ['Failed to fetch', 'NetworkError', 'Network request failed'];
        const isNetworkError = networkErrors.some((err) => savedError.includes(err));

        if (isNetworkError) {
          console.log('🧹 LoginForm: Limpiando error de red antiguo de sessionStorage');
          sessionStorage.removeItem('loginError');
          // Si el estado local también tiene este error, limpiarlo
          if (loginError === savedError) {
            setLoginError('');
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ LoginForm: Error accediendo a sessionStorage en useEffect:', e);
    }

    return () => {
      console.log('🔴 LoginForm: Componente DESMONTADO, loginError actual:', loginError);
    };
  }, []);

  // Guardar error en sessionStorage cuando el componente se desmonta
  useEffect(() => {
    return () => {
      // Este cleanup se ejecuta cuando el componente se desmonta o cuando loginError cambia
      if (loginError && loginError.trim().length > 0) {
        sessionStorage.setItem('loginError', loginError);
        console.log('💾 LoginForm: Error guardado en sessionStorage al desmontar:', loginError);
      }
    };
  }, [loginError]);

  // Sincronizar loginError con sessionStorage cuando cambia
  useEffect(() => {
    if (loginError && loginError.trim().length > 0) {
      // No guardar errores de red en sessionStorage (no son relevantes para el usuario)
      const networkErrors = ['Failed to fetch', 'NetworkError', 'Network request failed'];
      const isNetworkError = networkErrors.some((err) => loginError.includes(err));

      if (isNetworkError) {
        console.log('⚠️ LoginForm: Error de red detectado, no guardando en sessionStorage');
        sessionStorage.removeItem('loginError');
      } else {
        sessionStorage.setItem('loginError', loginError);
        console.log('💾 LoginForm: Error guardado en sessionStorage:', loginError);
      }
    } else {
      sessionStorage.removeItem('loginError');
    }
  }, [loginError]);

  // Debug: Log cuando cambia loginError
  useEffect(() => {
    console.log('🔄 LoginForm: useEffect de loginError ejecutado. LoginError =', loginError);
    if (loginError && loginError.trim().length > 0) {
      console.log('🔴 LoginForm: LoginError actualizado:', loginError);
      setTimeout(() => {
        const errorElement = document.querySelector('[data-error-message]');
        console.log('🔴 LoginForm: Error element encontrado:', !!errorElement);
        if (errorElement) {
          console.log('✅ LoginForm: Elemento encontrado, haciendo scroll');
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          console.error('❌ LoginForm: No se encontró el elemento de error');
        }
      }, 200);
    }
  }, [loginError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(''); // Limpiar error previo

    if (!formData.email || !formData.password) {
      setLoginError('Todos los campos son requeridos');
      return;
    }

    try {
      const result = await login(formData.email, formData.password);

      console.log('📋 LoginForm: Resultado del login:', {
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        // Limpiar cualquier error previo antes de éxito
        setLoginError('');
        sessionStorage.removeItem('loginError');
        onSuccess?.();
      } else {
        // Mostrar el mensaje de error específico que viene de la API
        const errorMessage =
          result.error || 'Error al iniciar sesión. Por favor, verifica tus credenciales.';
        console.log('❌ LoginForm: Estableciendo loginError:', errorMessage);

        // CRÍTICO: Guardar en sessionStorage INMEDIATAMENTE antes de setState
        // porque el componente se desmonta antes de que el useEffect se ejecute
        sessionStorage.setItem('loginError', errorMessage);
        console.log('💾 LoginForm: Error guardado en sessionStorage INMEDIATAMENTE:', errorMessage);

        setLoginError(errorMessage);
        console.log('❌ LoginForm: setLoginError llamado');
      }
    } catch (err: any) {
      // Capturar cualquier error inesperado
      const errorMessage =
        err?.message || 'Error inesperado al iniciar sesión. Por favor, intenta nuevamente.';
      console.log('❌ LoginForm: Error capturado en catch:', errorMessage);

      // CRÍTICO: Guardar en sessionStorage INMEDIATAMENTE
      sessionStorage.setItem('loginError', errorMessage);
      console.log('💾 LoginForm: Error guardado en sessionStorage (catch):', errorMessage);

      setLoginError(errorMessage);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <>
      <style>{errorStyles}</style>
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido de vuelta!</h2>
            <p className="text-gray-600">Inicia sesión en tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mensaje de error - usar loginError que persiste entre re-renders */}
            {(() => {
              console.log(
                '🖼️ LoginForm RENDER: loginError =',
                loginError,
                'length =',
                loginError?.length
              );
              return loginError && loginError.trim().length > 0;
            })() ? (
              <div
                data-error-message
                className={`border-l-4 px-4 py-3 rounded-lg shadow-md mb-4 ${
                  loginError.includes('conexión') || loginError.includes('servidor')
                    ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
                    : loginError.includes('deshabilitada') || loginError.includes('prohibido')
                      ? 'bg-orange-50 border-orange-500 text-orange-800'
                      : 'bg-red-50 border-red-500 text-red-700'
                }`}
                role="alert"
                aria-live="assertive"
                style={{
                  display: 'block',
                  opacity: 1,
                  visibility: 'visible',
                  minHeight: '50px',
                  zIndex: 1000,
                  position: 'relative',
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {loginError.includes('conexión') || loginError.includes('servidor') ? (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    ) : loginError.includes('deshabilitada') || loginError.includes('prohibido') ? (
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-semibold leading-relaxed">{loginError}</p>
                    {(loginError.includes('email no ha sido confirmado') ||
                      loginError.includes('deshabilitada')) && (
                      <p className="mt-2 text-xs opacity-80">
                        Si necesitas ayuda, contacta al administrador.
                      </p>
                    )}
                    {loginError.includes('conexión') && (
                      <p className="mt-2 text-xs opacity-80">
                        Verifica tu conexión a internet y vuelve a intentar.
                      </p>
                    )}
                    {loginError.includes('Demasiados intentos') && (
                      <p className="mt-2 text-xs opacity-80">
                        Por seguridad, espera unos minutos antes de volver a intentar.
                      </p>
                    )}
                    {(loginError.includes('incorrectos') ||
                      loginError.includes('no existe') ||
                      loginError.includes('contraseña') ||
                      loginError.includes('credenciales')) && (
                      <p className="mt-2 text-xs opacity-80">
                        Verifica que el email y la contraseña sean correctos. Si olvidaste tu
                        contraseña o necesitas ayuda, contacta al administrador.
                      </p>
                    )}
                    {loginError.includes('formato del email') && (
                      <p className="mt-2 text-xs opacity-80">
                        El email debe tener un formato válido, por ejemplo: usuario@ejemplo.com
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-3 pl-10 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-700/50 dark:text-white backdrop-blur-sm transition-all duration-200"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-3 pl-10 pr-10 border border-gray-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 dark:bg-slate-700/50 dark:text-white backdrop-blur-sm transition-all duration-200"
                  placeholder="Tu contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {onSwitchToRegister && (
            <div className="mt-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                    ¿Nuevo en EduSpark?
                  </span>
                </div>
              </div>
              <button
                onClick={onSwitchToRegister}
                className="mt-4 w-full bg-white dark:bg-transparent border-2 border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center"
              >
                Crear cuenta nueva
              </button>
            </div>
          )}

          <div className="mt-4 text-center">
            <button className="text-sm text-gray-500 hover:text-gray-700">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginForm;
