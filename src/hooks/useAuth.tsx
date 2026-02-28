
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { authAPI } from '@/services/api';
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
  menuFeatures: import('../services/menuFeatureService').MenuFeature[];
  refreshMenuFeatures: () => Promise<void>;
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

// Funciones de cache
const cacheUser = (user: User): void => {
  try {
    const cacheData: CachedUserData = {
      user,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
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

    if (cacheAge > CACHE_TTL) {
      invalidateCache();
      return null;
    }

    return cacheData.user;
  } catch (error) {
    invalidateCache();
    return null;
  }
};

let isInvalidatingCache = false;

const invalidateCache = (): void => {
  try {
    isInvalidatingCache = true;
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    setTimeout(() => {
      isInvalidatingCache = false;
    }, 100);
  } catch (error) {
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

// Helper function para crear usuario básico desde session
const createBasicUser = (sessionUser: any): User => {
  const cachedUser = getCachedUser();
  const role = cachedUser?.role || {
    id: 3,
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [menuFeatures, setMenuFeatures] = useState<import('../services/menuFeatureService').MenuFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const initCompleteRef = React.useRef(false);
  const pendingSessionRef = React.useRef<any>(null);
  const userRef = React.useRef<User | null>(null);

  const isAuthenticated = !!user;

  const refreshMenuFeatures = async () => {
    const { fetchMenuFeatures } = await import('../services/menuFeatureService');
    const features = await fetchMenuFeatures();
    setMenuFeatures(features);
  };

  useEffect(() => {
    userRef.current = user;
    if (user) {
      refreshMenuFeatures();
    } else {
      setMenuFeatures([]);
    }
  }, [user]);

  const validateAndUpdateUser = async (userId: string): Promise<void> => {
    try {
      let userData: any = null;
      let error: any = null;

      const { data, error: queryError } = await supabase
        .from('users')
        .select(`
          id, email, first_name, last_name, identity_document, identity_document_type,
          avatar_url, created_at, updated_at, role_id,
          role:roles(id, name)
        `)
        .eq('id', userId)
        .single();

      userData = data;
      error = queryError;

      if (error || !userData) {
        const userResponse = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (userResponse.data) {
          const roleResponse = await supabase
            .from('roles')
            .select('id, name')
            .eq('id', userResponse.data.role_id)
            .single();

          userData = {
            ...userResponse.data,
            role: roleResponse.data
          };
          error = null;
        }
      }

      if (userData && !error) {
        // Fetch primary institution
        const { data: instData } = await supabase
          .from('user_institutions')
          .select('institution_id')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .maybeSingle();

        const roleData = userData.role || userData.roles || { id: 3, name: 'student' };

        const updatedUser: User = {
          id: userData.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          identity_document: userData.identity_document || null,
          identity_document_type: userData.identity_document_type || null,
          avatar_url: userData.avatar_url || null,
          role: Array.isArray(roleData) ? roleData[0] : roleData,
          institution_id: instData?.institution_id,
          created_at: userData.created_at,
          updated_at: userData.updated_at
        };

        setUser(updatedUser);
        cacheUser(updatedUser);
      }
    } catch (e) {
      console.warn('⚠️ Auth check failed:', e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const cachedUser = getCachedUser();
        if (cachedUser && isCacheValid()) {
          setUser(cachedUser);
          setLoading(false);
          initCompleteRef.current = true;
          validateAndUpdateUser(cachedUser.id).catch(() => { });
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          initCompleteRef.current = true;
          return;
        }

        await validateAndUpdateUser(session.user.id);
      } catch (e) {
        console.error('❌ Init error:', e);
      } finally {
        setLoading(false);
        initCompleteRef.current = true;
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!initCompleteRef.current) {
        pendingSessionRef.current = session;
        return;
      }

      if (session?.user) {
        if (userRef.current?.id !== session.user.id) {
          validateAndUpdateUser(session.user.id);
        }
      } else {
        setUser(null);
        invalidateCache();
      }
    });

    const handleStorageChange = (e: StorageEvent) => {
      if (isInvalidatingCache) return;
      if (e.key === CACHE_KEY) {
        if (!e.newValue) {
          if (userRef.current) setUser(null);
        } else {
          try {
            const cacheData: CachedUserData = JSON.parse(e.newValue);
            if (cacheData.user && isCacheValid()) {
              if (userRef.current?.id !== cacheData.user.id) {
                setUser(cacheData.user);
              }
            }
          } catch { }
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
      const result = await authAPI.login(email, password);
      if (result.success && result.user) {
        await validateAndUpdateUser(result.user.id);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authAPI.logout();
      setUser(null);
      invalidateCache();
    } finally {
      setLoading(false);
    }
  };

  const register = async (regData: any) => {
    try {
      setLoading(true);
      return await authAPI.register(regData);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (user) await validateAndUpdateUser(user.id);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    cacheUser(userData);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      logout,
      register,
      refreshUser,
      updateUser,
      menuFeatures,
      refreshMenuFeatures
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth error');
  return context;
};