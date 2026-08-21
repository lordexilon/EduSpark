import { supabase } from '@/lib/supabase';

export type MenuFeature = {
  key: string;
  enabled: boolean;
  allowed_roles: string[];
};

/**
 * Obtiene todos los flags de menú visibles para el usuario actual.
 * La llamada se hace una sola vez después de la autenticación.
 */
export const fetchMenuFeatures = async (): Promise<MenuFeature[]> => {
  const { data, error } = await supabase
    .from('menu_features')
    .select('key, enabled, allowed_roles');

  if (error) {
    console.warn('⚠️  Error al cargar menu_features:', error);
    return [];
  }

  return data as MenuFeature[];
};
