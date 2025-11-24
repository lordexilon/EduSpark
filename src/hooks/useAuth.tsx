
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { authAPI } from '../services/api';
import { deviceService } from '../services/deviceService';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: number;
  }) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Cache keys
const CACHE_KEY = 'eduspark_user_cache';
const CACHE_TIMESTAMP_KEY = 'eduspark_user_cache_timestamp';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos en milisegundos

interface CachedUserData {
  user: User;
  timestamp: number;
}

// Helper function para crear usuario básico desde session
// IMPORTANTE: Esta función solo debe usarse como último recurso cuando no se puede obtener el rol real
const createBasicUser = (sessionUser: any): User => {
  // Intentar obtener el rol desde el cache si existe
  const cachedUser = getCachedUser();
  const role = cachedUser?.role || {
    id: 3, // Default: estudiante solo si no hay cache
    name: 'student'
  };

  return {
    id: sessionUser.id,
    email: sessionUser.email || '',
    first_name: sessionUser.user_metadata?.first_name || '',
    last_name: sessionUser.user_metadata?.last_name || '',
    identity_document: sessionUser.user_metadata?.identity_document || null,
    identity_document_type: sessionUser.user_metadata?.identity_document_type || null,
    avatar_url: sessionUser.user_metadata?.avatar_url || null,
    role: role,
    created_at: sessionUser.created_at,
    updated_at: sessionUser.updated_at || sessionUser.created_at
  };
};

// Funciones de cache
const cacheUser = (user: User): void => {
  try {
    const cacheData: CachedUserData = {
      user,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

    // No necesitamos disparar evento manualmente - localStorage.setItem
    // automáticamente dispara el evento 'storage' en otras pestañas
    // Disparar manualmente causaría que el listener se active también en esta pestaña
  } catch (error) {
    console.warn('⚠️ Auth: Error guardando cache:', error);
  }
};

const getCachedUser = (): User | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (!cached || !timestamp) return null;

    const cacheData: CachedUserData = JSON.parse(cached);
    const cacheAge = Date.now() - parseInt(timestamp, 10);

    // Si el cache es muy antiguo (> TTL), no usarlo
    if (cacheAge > CACHE_TTL) {
      console.log('⚠️ Auth: Cache expirado, ignorando');
      invalidateCache();
      return null;
    }

    return cacheData.user;
  } catch (error) {
    console.warn('⚠️ Auth: Error leyendo cache:', error);
    invalidateCache();
    return null;
  }
};

// Bandera para evitar que el listener reaccione a eventos de la misma pestaña
let isInvalidatingCache = false;

const invalidateCache = (): void => {
  try {
    isInvalidatingCache = true;
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);

    // Notificar a otras pestañas usando postMessage en lugar de dispatchEvent
    // dispatchEvent se dispara también en la misma pestaña, causando loops
    // En su lugar, usamos el evento storage nativo que solo se dispara en otras pestañas
    // Para la misma pestaña, simplemente limpiamos sin notificar

    // Resetear la bandera después de un pequeño delay
    setTimeout(() => {
      isInvalidatingCache = false;
    }, 100);
  } catch (error) {
    console.warn('⚠️ Auth: Error limpiando cache:', error);
    isInvalidatingCache = false;
  }
};

const isCacheValid = (): boolean => {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;

    const cacheAge = Date.now() - parseInt(timestamp, 10);
    return cacheAge < CACHE_TTL;
  } catch {
    return false;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initCompleteRef = React.useRef(false);
  const pendingSessionRef = React.useRef<any>(null);
  const userRef = React.useRef<User | null>(null);

  const isAuthenticated = !!user;

  // Mantener ref sincronizado con el estado
  React.useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Función para validar y actualizar usuario desde BD
  const validateAndUpdateUser = async (userId: string): Promise<void> => {
    try {
      // Aumentar timeout a 10 segundos para dar más tiempo a la consulta
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Auth: Timeout en validación, abortando...');
        controller.abort();
      }, 10000); // 10 segundos en lugar de 3

      // Primero intentar obtener usuario con el rol usando join
      let userData: any = null;
      let error: any = null;
      let wasAborted = false;

      try {
        let response;
        try {
          response = await supabase
            .from('users')
            .select(`
              id,
              email,
              first_name,
              last_name,
              identity_document,
              identity_document_type,
              avatar_url,
              created_at,
              updated_at,
              role_id,
              role:roles(id, name)
            `)
            .eq('id', userId)
            .single();

          userData = response.data;
          error = response.error;

          // Si hay error 406 o 400, forzar el fallback (sin mostrar en consola, es esperado)
          if (error && ((error as any).code === 'PGRST116' || (error as any).status === 406 || (error as any).status === 400)) {
            // Error esperado, el fallback lo manejará silenciosamente
            throw error; // Forzar que entre al catch para usar el fallback
          }
        } catch (queryError: any) {
          // Si es un error de aborto, manejarlo por separado
          if (queryError.name === 'AbortError') {
            wasAborted = true;
            console.warn('⚠️ Error con join de roles (abortado), intentando consulta alternativa');
          } else {
            // Para otros errores (406, 400, etc.), usar el fallback silenciosamente
            // No mostrar en consola si es un error 406 esperado
            if ((queryError as any)?.status !== 406 && (queryError as any)?.code !== 'PGRST116') {
              // Solo mostrar si no es un error 406 esperado
            }
            error = queryError;
            userData = null;
          }
        }
      } catch (abortError: any) {
        if (abortError.name === 'AbortError') {
          wasAborted = true;
          console.warn('⚠️ Error con join de roles (abortado), intentando consulta alternativa');
        } else {
          throw abortError;
        }
      }

      // Si hay error o fue abortado, intentar sin el join (sin abortSignal para dar más tiempo)
      if (error || !userData || wasAborted) {
        // Solo mostrar warning si no es un error 406 esperado (el fallback lo maneja silenciosamente)
        if (!wasAborted && error && (error as any)?.status !== 406 && (error as any)?.code !== 'PGRST116') {
          console.warn('⚠️ Error con join de roles, intentando consulta alternativa:', error?.message || 'Sin datos');
        }

        // Crear un nuevo controller para la consulta alternativa
        const altController = new AbortController();
        const altTimeoutId = setTimeout(() => altController.abort(), 8000);

        try {
          const userResponse = await supabase
            .from('users')
            .select('id, email, first_name, last_name, identity_document, identity_document_type, avatar_url, created_at, updated_at, role_id')
            .eq('id', userId)
            .maybeSingle();

          if (userResponse.data && !userResponse.error) {
            // Obtener el rol por separado (sin timeout para esta consulta simple)
            if (userResponse.data.role_id) {
              const roleResponse = await supabase
                .from('roles')
                .select('id, name')
                .eq('id', userResponse.data.role_id)
                .single();

              userData = {
                ...userResponse.data,
                roles: roleResponse.data || null
              };
              error = null; // Limpiar el error anterior
            } else {
              userData = userResponse.data;
              error = null; // Limpiar el error anterior
            }
          } else {
            error = userResponse.error || error;
          }
          clearTimeout(altTimeoutId);
        } catch (altError: any) {
          clearTimeout(altTimeoutId);
          if (altError.name !== 'AbortError') {
            throw altError;
          }
        }
      }

      clearTimeout(timeoutId);

      if (userData && !error) {
        // Extraer el rol de la respuesta (puede venir como roles o role según la sintaxis)
        const roleData = userData.roles || (userData as any).role || null;

        const updatedUser: User = {
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          identity_document: userData.identity_document || null,
          identity_document_type: userData.identity_document_type || null,
          avatar_url: userData.avatar_url || null,
          role: roleData ? {
            id: roleData.id,
            name: roleData.name
          } : {
            id: userData.role_id || 1,
            name: 'student' // Default si no se puede obtener el rol
          },
          created_at: userData.created_at,
          updated_at: userData.updated_at
        };

        // Actualizar estado y cache
        setUser(updatedUser);
        cacheUser(updatedUser);
        console.log('✅ Auth: Usuario validado y actualizado', {
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          identity_document: updatedUser.identity_document
        });
      } else {
        console.warn('⚠️ Auth: No se pudo validar usuario', error);
        // NO invalidar cache aquí - puede ser un problema temporal de red
        // El cache existente se mantendrá hasta que se pueda validar correctamente
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('⚠️ Auth: Timeout validando usuario - manteniendo cache existente');
      } else {
        console.warn('⚠️ Auth: Error validando usuario:', error);
      }
      // CRÍTICO: No invalidar cache si es timeout o error de red - puede ser temporal
      // Solo invalidar si es un error de autenticación real (401, 403)
    }
  };

  // Verificar si hay token almacenado al cargar
  useEffect(() => {
    const initAuth = async () => {
      // Declarar variables fuera del try para que estén disponibles en catch/finally
      let authTimeout: NodeJS.Timeout | null = null;
      let timeoutFired = false;

      try {
        console.log('🔍 Auth: Iniciando verificación...');

        // ESTRATEGIA: Cargar cache primero si existe y es válido
        const cachedUser = getCachedUser();
        const shouldValidateCache = cachedUser && isCacheValid();

        if (cachedUser && shouldValidateCache) {
          console.log('⚡ Auth: Cache encontrado, mostrando inmediatamente');
          // CRÍTICO: Validar que el cache tenga un rol válido antes de usarlo
          // Si el rol es 'student' con id 3, podría ser el default, así que validar primero
          const isDefaultStudentRole = cachedUser.role?.name === 'student' && cachedUser.role?.id === 3;

          if (!isDefaultStudentRole && cachedUser.role?.name) {
            // Si el rol no es el default de student, usar cache inmediatamente
            setUser(cachedUser);
            setLoading(false);
            initCompleteRef.current = true;

            // Validar en background (no bloqueante) para asegurar datos actualizados
            validateAndUpdateUser(cachedUser.id).catch(() => {
              // Si falla la validación, mantener cache temporalmente
              console.warn('⚠️ Auth: Validación falló, manteniendo cache');
            });

            return; // Salir temprano con cache
          } else {
            // Si el cache tiene rol default (student), validar primero antes de usar
            // para asegurar que realmente es estudiante y no un admin/teacher con cache corrupto
            console.log('⚠️ Auth: Cache con rol default, validando antes de usar');
            // Continuar con validación normal
          }
        }

        // Si no hay cache válido, proceder con validación normal
        console.log('🔄 Auth: Sin cache válido, validando sesión...');

        // Timeout global de seguridad - solo como fallback

        const cleanupTimeout = () => {
          if (authTimeout) {
            clearTimeout(authTimeout);
            authTimeout = null;
          }
        };

        // Obtener sesión de forma directa y rápida
        let session: any = null;
        try {
          // Timeout de 8 segundos
          authTimeout = setTimeout(() => {
            if (!timeoutFired) {
              timeoutFired = true;
              console.warn('⚠️ Auth: Timeout global alcanzado - finalizando');
              setLoading(false);
              initCompleteRef.current = true;
            }
          }, 8000);

          const { data, error } = await supabase.auth.getSession();

          // Limpiar timeout inmediatamente después de obtener respuesta
          cleanupTimeout();

          if (error) {
            console.warn('⚠️ Auth: Error obteniendo sesión:', error);
          } else {
            session = data?.session || null;
          }

          // Si no hay sesión, completar inmediatamente
          if (!session) {
            invalidateCache(); // Limpiar cache si no hay sesión
            setLoading(false);
            initCompleteRef.current = true;
            return;
          }
        } catch (e) {
          // Limpiar timeout si hay error
          cleanupTimeout();
          console.warn('⚠️ Auth: Error obteniendo sesión:', e);
          session = null;
          invalidateCache();
          setLoading(false);
          initCompleteRef.current = true;
          return;
        }

        if (session?.user) {
          try {
            // Obtener datos completos del usuario desde la base de datos con timeout más largo
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout de 10 segundos

            // Intentar obtener usuario con join de roles
            let userData: any = null;
            let error: any = null;
            let wasAborted = false;

            try {
              const response = await supabase
                .from('users')
                .select(`
                  id,
                  email,
                  first_name,
                  last_name,
                  avatar_url,
                  created_at,
                  updated_at,
                  role_id,
                  roles(id, name)
                `)
                .eq('id', session.user.id)
                .single();

              userData = response.data;
              error = response.error;
            } catch (abortError: any) {
              if (abortError.name === 'AbortError') {
                wasAborted = true;
                console.warn('⚠️ Error con join de roles (abortado), intentando consulta alternativa');
              } else {
                throw abortError;
              }
            }

            // Si hay error o fue abortado, intentar sin el join
            if (error || !userData || wasAborted) {
              if (!wasAborted) {
                console.warn('⚠️ Error con join de roles, intentando consulta alternativa:', error?.message || 'Sin datos');
              }

              // Crear un nuevo controller para la consulta alternativa
              const altController = new AbortController();
              const altTimeoutId = setTimeout(() => altController.abort(), 8000);

              try {
                const userResponse = await supabase
                  .from('users')
                  .select('id, email, first_name, last_name, identity_document, identity_document_type, avatar_url, created_at, updated_at, role_id')
                  .eq('id', session.user.id)
                  .maybeSingle();

                if (userResponse.data && !userResponse.error) {
                  // Obtener el rol por separado (sin timeout para esta consulta simple)
                  if (userResponse.data.role_id) {
                    const roleResponse = await supabase
                      .from('roles')
                      .select('id, name')
                      .eq('id', userResponse.data.role_id)
                      .single();

                    userData = {
                      ...userResponse.data,
                      roles: roleResponse.data || null
                    };
                    error = null; // Limpiar el error anterior
                  } else {
                    userData = userResponse.data;
                    error = null; // Limpiar el error anterior
                  }
                } else {
                  error = userResponse.error || error;
                }
                clearTimeout(altTimeoutId);
              } catch (altError: any) {
                clearTimeout(altTimeoutId);
                if (altError.name !== 'AbortError') {
                  throw altError;
                }
              }
            }

            clearTimeout(timeoutId);

            if (userData && !error) {
              // Extraer el rol de la respuesta (puede venir como roles o role según la sintaxis)
              const roleData = userData.roles || (userData as any).role || null;

              const newUser: User = {
                id: userData.id,
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name,
                identity_document: userData.identity_document || null,
                identity_document_type: userData.identity_document_type || null,
                avatar_url: userData.avatar_url || null,
                role: roleData ? {
                  id: roleData.id,
                  name: roleData.name
                } : {
                  id: userData.role_id || 1,
                  name: 'student' // Default si no se puede obtener el rol
                },
                created_at: userData.created_at || session.user.created_at,
                updated_at: userData.updated_at || session.user.created_at
              };
              setUser(newUser);
              cacheUser(newUser); // Guardar en cache
            } else {
              // Fallback: usar datos básicos del session
              const basicUser = createBasicUser(session.user);
              setUser(basicUser);
              // No cachear datos básicos - esperar a tener datos completos
            }
          } catch (dbError: any) {
            // Si es timeout o cualquier error, usar datos básicos inmediatamente
            if (dbError.name === 'AbortError' || dbError.message === 'Timeout') {
              console.warn('⚠️ Auth: Timeout consultando BD, usando datos básicos');
            } else {
              console.warn('⚠️ Auth: Error consultando BD, usando datos básicos:', dbError);
            }
            const basicUser = createBasicUser(session.user);
            setUser(basicUser);
            // CRÍTICO: Intentar validar el usuario en background para obtener el rol correcto
            validateAndUpdateUser(session.user.id).catch(() => {
              console.warn('⚠️ Auth: No se pudo validar usuario después del fallback');
            });
          }
        } else {
          // No hay sesión, asegurar que loading se desactive
          setLoading(false);
          initCompleteRef.current = true;
        }
      } catch (error) {
        console.error('❌ Auth: Error al inicializar:', error);
        // Limpiar timeout si existe
        if (authTimeout) {
          clearTimeout(authTimeout);
        }
        setLoading(false);
        initCompleteRef.current = true;
      } finally {
        // Limpiar timeout final
        if (authTimeout && !timeoutFired) {
          clearTimeout(authTimeout);
        }

        // Si durante init llegó un SIGNED_IN pero no se procesó, usar datos básicos
        if (!userRef.current && pendingSessionRef.current?.user) {
          console.log('⚠️ Auth: Usando sesión pendiente con datos básicos');
          const basicUser = createBasicUser(pendingSessionRef.current.user);
          setUser(basicUser);
          // CRÍTICO: Intentar validar el usuario en background para obtener el rol correcto
          validateAndUpdateUser(pendingSessionRef.current.user.id).catch(() => {
            console.warn('⚠️ Auth: No se pudo validar usuario pendiente después del fallback');
          });
        }

        console.log('✅ Auth: Carga completada');

        // Asegurar que loading esté desactivado
        if (!timeoutFired) {
          setLoading(false);
          initCompleteRef.current = true;
        }
      }
    };

    initAuth();

    // Configurar listener pero hacerlo efectivo después del init
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, 'initComplete:', initCompleteRef.current);

      // CRÍTICO: Ignorar completamente el listener hasta que init termine
      if (!initCompleteRef.current) {
        console.log('⏸️ Auth: Inicialización en curso, bufferizando state change');
        pendingSessionRef.current = session;
        return;
      }

      if (session?.user) {
        // Si el usuario ya está establecido y es el mismo, no hacer nada
        if (userRef.current && userRef.current.id === session.user.id) {
          console.log('👤 Auth: Usuario ya establecido, omitiendo actualización');
          return;
        }

        try {
          // Intentar obtener datos completos con timeout más largo
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.warn('⚠️ Auth: Timeout en auth state change, abortando...');
            controller.abort();
          }, 10000); // 10 segundos en lugar de 2

          // Intentar obtener usuario con join de roles
          let userData: any = null;
          let error: any = null;
          let wasAborted = false;

          try {
            const response = await supabase
              .from('users')
              .select(`
                id,
                email,
                first_name,
                last_name,
                avatar_url,
                created_at,
                updated_at,
                role_id,
                roles(id, name)
              `)
              .eq('id', session.user.id)
              .single();

            userData = response.data;
            error = response.error;
          } catch (abortError: any) {
            if (abortError.name === 'AbortError') {
              wasAborted = true;
              console.warn('⚠️ Error con join de roles (abortado), intentando consulta alternativa');
            } else {
              throw abortError;
            }
          }

          // Si hay error o fue abortado, intentar sin el join
          if (error || !userData || wasAborted) {
            if (!wasAborted) {
              console.warn('⚠️ Error con join de roles, intentando consulta alternativa:', error?.message || 'Sin datos');
            }

            // Crear un nuevo controller para la consulta alternativa
            const altController = new AbortController();
            const altTimeoutId = setTimeout(() => altController.abort(), 8000);

            try {
              const userResponse = await supabase
                .from('users')
                .select('id, email, first_name, last_name, identity_document, identity_document_type, avatar_url, created_at, updated_at, role_id')
                .eq('id', session.user.id)
                .maybeSingle();

              if (userResponse.data && !userResponse.error) {
                // Obtener el rol por separado (sin timeout para esta consulta simple)
                if (userResponse.data.role_id) {
                  const roleResponse = await supabase
                    .from('roles')
                    .select('id, name')
                    .eq('id', userResponse.data.role_id)
                    .single();

                  userData = {
                    ...userResponse.data,
                    roles: roleResponse.data || null
                  };
                  error = null; // Limpiar el error anterior
                } else {
                  userData = userResponse.data;
                  error = null; // Limpiar el error anterior
                }
              } else {
                error = userResponse.error || error;
              }
              clearTimeout(altTimeoutId);
            } catch (altError: any) {
              clearTimeout(altTimeoutId);
              if (altError.name !== 'AbortError') {
                throw altError;
              }
            }
          }

          clearTimeout(timeoutId);

          if (userData && !error) {
            // Extraer el rol de la respuesta (puede venir como roles o role según la sintaxis)
            const roleData = userData.roles || (userData as any).role || null;

            const newUser: User = {
              id: userData.id,
              email: userData.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
              identity_document: userData.identity_document || null,
              avatar_url: userData.avatar_url || null,
              role: roleData ? {
                id: roleData.id,
                name: roleData.name
              } : {
                id: userData.role_id || 1,
                name: 'student' // Default si no se puede obtener el rol
              },
              created_at: userData.created_at || session.user.created_at,
              updated_at: userData.updated_at || session.user.created_at
            };
            setUser(newUser);
            cacheUser(newUser); // Guardar en cache
          } else {
            // Fallback: usar datos básicos
            const basicUser = createBasicUser(session.user);
            setUser(basicUser);
            // CRÍTICO: Intentar validar el usuario en background para obtener el rol correcto
            validateAndUpdateUser(session.user.id).catch(() => {
              console.warn('⚠️ Auth: No se pudo validar usuario después del fallback (sin datos)');
            });
          }
        } catch (dbError: any) {
          // Si es timeout o error, usar datos básicos inmediatamente
          const basicUser = createBasicUser(session.user);
          setUser(basicUser);
          // CRÍTICO: Intentar validar el usuario en background para obtener el rol correcto
          validateAndUpdateUser(session.user.id).catch(() => {
            console.warn('⚠️ Auth: No se pudo validar usuario después del fallback en auth state change');
          });
        }
      } else {
        console.log('👤 Auth: No sesión, limpiando usuario');
        setUser(null);
        invalidateCache(); // Limpiar cache en logout
      }
    });

    // Listener para sincronización entre pestañas
    const handleStorageChange = (e: StorageEvent) => {
      // CRÍTICO: Ignorar eventos que fueron disparados por esta misma pestaña
      if (isInvalidatingCache) {
        return;
      }

      if (e.key === CACHE_KEY) {
        if (e.newValue === null) {
          // Cache invalidado en otra pestaña
          // CRÍTICO: Solo invalidar si realmente no hay usuario actual
          // No invalidar si hay una validación en progreso o si el usuario está autenticado
          if (!userRef.current) {
            console.log('🔄 Auth: Cache invalidado en otra pestaña (sin usuario actual)');
            setUser(null);
          } else {
            console.log('🔄 Auth: Cache invalidado en otra pestaña pero hay usuario actual, manteniendo');
          }
        } else {
          // Cache actualizado en otra pestaña
          try {
            const cacheData: CachedUserData = JSON.parse(e.newValue);
            if (cacheData.user && isCacheValid()) {
              // Solo actualizar si el usuario es diferente o si no hay usuario actual
              if (!userRef.current || userRef.current.id !== cacheData.user.id) {
                console.log('🔄 Auth: Cache actualizado desde otra pestaña');
                setUser(cacheData.user);
              }
            }
          } catch (error) {
            console.warn('⚠️ Auth: Error parseando cache desde otra pestaña:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      invalidateCache(); // Limpiar cache antes de login
      const result = await authAPI.login(email, password);

      if (result.success && result.user) {
        setUser(result.user);
        cacheUser(result.user); // Guardar en cache después de login exitoso

        // ✨ NUEVO: Registrar dispositivo automáticamente
        try {
          const session = await supabase.auth.getSession();
          if (session.data.session) {
            console.log('📱 Registrando dispositivo...');
            const deviceResult = await deviceService.registerDevice(
              result.user.id,
              session.data.session.access_token
            );

            // Si se cerró sesión en otro dispositivo, notificar al usuario
            if (deviceResult.removedDeviceId) {
              console.warn(
                '⚠️ Límite de 3 dispositivos alcanzado. ' +
                `Sesión cerrada en: ${deviceResult.removedDeviceName}`
              );

              // TODO: Mostrar toast notification al usuario
              // Descomentar cuando se implemente sistema de notificaciones:
              // toast.warning(
              //   `Límite de 3 dispositivos alcanzado. Sesión cerrada en: ${deviceResult.removedDeviceName}`,
              //   { duration: 5000 }
              // );
            } else {
              console.log('✅ Dispositivo registrado correctamente');
            }
          }
        } catch (deviceError) {
          console.error('❌ Error registrando dispositivo:', deviceError);
          // No bloquear el login si falla el registro de dispositivo
          // El usuario puede continuar usando la aplicación
        }
      }

      return result;
    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, error: 'Error interno del servidor' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      invalidateCache(); // Limpiar cache en logout
    } catch (error) {
      console.error('Error en logout:', error);
      // Limpiar cache incluso si hay error
      setUser(null);
      invalidateCache();
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: number;
  }) => {
    try {
      setLoading(true);
      invalidateCache(); // Limpiar cache antes de registro
      const result = await authAPI.register(userData);

      if (result.success && result.data) {
        setUser(result.data);
        cacheUser(result.data); // Guardar en cache después de registro exitoso
      }

      return result;
    } catch (error) {
      console.error('Error en registro:', error);
      return { success: false, error: 'Error interno del servidor' };
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      // Invalidar cache primero para forzar la recarga
      invalidateCache();

      const userData = await authAPI.getCurrentUser();
      if (userData) {
        setUser(userData);
        cacheUser(userData); // Actualizar cache con datos frescos
      } else {
        console.warn('⚠️ Auth: refreshUser no obtuvo datos del usuario');
        // Si getCurrentUser falla, intentar validar desde la sesión
        const session = await supabase.auth.getSession();
        if (session.data.session?.user) {
          await validateAndUpdateUser(session.data.session.user.id);
        }
      }
    } catch (error) {
      console.error('Error al refrescar usuario:', error);
      // Intentar validar desde la sesión como fallback
      try {
        const session = await supabase.auth.getSession();
        if (session.data.session?.user) {
          await validateAndUpdateUser(session.data.session.user.id);
        }
      } catch (fallbackError) {
        console.error('Error en fallback de refreshUser:', fallbackError);
      }
    }
  };

  const updateUser = (userData: User) => {
    console.log('🔄 Auth: Actualizando usuario directamente', {
      first_name: userData.first_name,
      last_name: userData.last_name,
      identity_document: userData.identity_document
    });
    setUser(userData);
    // Actualizar cache con timestamp actual para forzar validación fresca en próxima carga
    cacheUser(userData);
    // Actualizar también el timestamp para que el cache se considere "fresco"
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      updateUser,
      isAuthenticated,
      login,
      logout,
      register,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};