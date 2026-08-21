import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from './ThemeContext';

export interface Institution {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
}

interface TenantContextType {
  tenant: Institution | null;
  loading: boolean;
  setTenantId: (id: number) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenant, setTenant] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantIdState] = useState<number>(1); // Default a 1 para MVP

  const { setTheme, setPrimaryColor, setSecondaryColor } = useTheme();

  useEffect(() => {
    const fetchTenant = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('institutions')
          .select('*')
          .eq('id', tenantId)
          .single();

        if (error) throw error;

        if (data) {
          setTenant(data as Institution);
          // Si es PyInvest o similar, forzar el tema oscuro/corporativo
          if (
            data.name.toLowerCase().includes('pyinvest') ||
            data.name.toLowerCase().includes('invest')
          ) {
            setTheme('dark');
            setPrimaryColor('#c49a45'); // Dorado PyInvest
            setSecondaryColor('#1e293b'); // Dark Slate
          }
        }
      } catch (err) {
        console.error('Error fetching tenant:', err);
        // Fallback fake data para mostrar el MVP si la BD falla
        setTenant({
          id: 999,
          name: 'Py Invest (Preview)',
          description: 'Conectando Oportunidades en Paraguay',
          logo_url: 'https://pyinvest.com.py/wp-content/uploads/2025/09/logo2.png',
          website: 'https://pyinvest.com.py',
        });
        setTheme('dark');
        setPrimaryColor('#c49a45');
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, [tenantId]);

  return (
    <TenantContext.Provider value={{ tenant, loading, setTenantId: setTenantIdState }}>
      {children}
    </TenantContext.Provider>
  );
};
