
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { authAPI } from '../services/api';
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initCompleteRef = React.useRef(false);

  const isAuthenticated = !!user;

  // Verificar si hay token almacenado al cargar
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔍 Auth: Iniciando verificación...');
        
        // Timeout de seguridad: máximo 5 segundos para cargar
        const authTimeout = setTimeout(() => {
          console.warn('⚠️ Auth: Timeout alcanzado, forzando carga');
          setLoading(false);
        }, 5000);

        // Intentar obtener sesión con timeout manual
        let session: any = null;
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 4000)
          );
          
          const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
          session = result?.data?.session || null;
          
          clearTimeout(authTimeout);
          console.log('🔍 Auth: Sesión obtenida:', !!session);
        } catch (timeoutError) {
          console.warn('⚠️ Auth: getSession timeout, continuando sin sesión');
          clearTimeout(authTimeout);
          session = null;
        }
        
        if (session?.user) {
          try {
            // Obtener datos completos del usuario desde la base de datos
            const { data: userData, error } = await supabase
              .from('users')
              .select(`
                id,
                email,
                first_name,
                last_name,
                created_at,
                updated_at,
                role:roles(id, name)
              `)
              .eq('id', session.user.id)
              .single();

            if (userData && !error) {
              setUser({
                id: userData.id,
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name,
                role: {
                  id: userData.role.id,
                  name: userData.role.name
                },
                created_at: userData.created_at || session.user.created_at,
                updated_at: userData.updated_at || session.user.created_at
              });
            } else {
              console.warn('Usuario no encontrado en BD, usando datos básicos:', error);
              // Fallback: crear usuario básico si no se encuentra en la BD
              const basicUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                first_name: session.user.user_metadata?.first_name || '',
                last_name: session.user.user_metadata?.last_name || '',
                role: {
                  id: 3, // Default: estudiante
                  name: 'student'
                },
                created_at: session.user.created_at,
                updated_at: session.user.updated_at || session.user.created_at
              };
              setUser(basicUser);
            }
          } catch (dbError) {
            console.warn('Error consultando BD, usando datos básicos:', dbError);
            // Fallback: crear usuario básico si hay error en la consulta
            const basicUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              first_name: session.user.user_metadata?.first_name || '',
              last_name: session.user.user_metadata?.last_name || '',
              role: {
                id: 3, // Default: estudiante
                name: 'student'
              },
              created_at: session.user.created_at,
              updated_at: session.user.updated_at || session.user.created_at
            };
            setUser(basicUser);
          }
        }
      } catch (error) {
        console.error('❌ Auth: Error al inicializar:', error);
      } finally {
        console.log('✅ Auth: Carga completada');
        setLoading(false);
        initCompleteRef.current = true;
      }
    };

    initAuth();

    // Configurar listener pero hacerlo efectivo después del init
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, 'initComplete:', initCompleteRef.current);
      
      // CRÍTICO: Ignorar completamente el listener hasta que init termine
      if (!initCompleteRef.current) {
        console.log('⏸️ Auth: Inicialización en curso, IGNORANDO TODO state change');
        return;
      }
      
      if (session?.user) {
        try {
          // Obtener datos completos del usuario desde la base de datos
          const { data: userData, error } = await supabase
            .from('users')
            .select(`
              id,
              email,
              first_name,
              last_name,
              created_at,
              updated_at,
              role:roles(id, name)
            `)
            .eq('id', session.user.id)
            .single();

          if (userData && !error) {
            setUser({
              id: userData.id,
              email: userData.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
              role: {
                id: userData.role.id,
                name: userData.role.name
              },
              created_at: userData.created_at || session.user.created_at,
              updated_at: userData.updated_at || session.user.created_at
            });
          } else {
            console.warn('Usuario no encontrado en BD, usando datos básicos:', error);
            // Fallback: crear usuario básico si no se encuentra en la BD
            const basicUser: User = {
              id: session.user.id,
              email: session.user.email || '',
              first_name: session.user.user_metadata?.first_name || '',
              last_name: session.user.user_metadata?.last_name || '',
              role: {
                id: 3, // Default: estudiante
                name: 'student'
              },
              created_at: session.user.created_at,
              updated_at: session.user.updated_at || session.user.created_at
            };
            setUser(basicUser);
          }
        } catch (dbError) {
          console.warn('Error consultando BD, usando datos básicos:', dbError);
          // Fallback: crear usuario básico si hay error en la consulta
          const basicUser: User = {
            id: session.user.id,
            email: session.user.email || '',
            first_name: session.user.user_metadata?.first_name || '',
            last_name: session.user.user_metadata?.last_name || '',
            role: {
              id: 3, // Default: estudiante
              name: 'student'
            },
            created_at: session.user.created_at,
            updated_at: session.user.updated_at || session.user.created_at
          };
          setUser(basicUser);
        }
      } else {
        console.log('👤 Auth: No sesión, limpiando usuario');
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await authAPI.login(email, password);
      
      if (result.success && result.user) {
        setUser(result.user);
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
    } catch (error) {
      console.error('Error en logout:', error);
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
      const result = await authAPI.register(userData);
      
      if (result.success && result.data) {
        setUser(result.data);
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
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error al refrescar usuario:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
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