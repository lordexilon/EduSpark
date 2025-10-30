// =====================================================
// Configuración compartida de Supabase
// Re-exporta la instancia principal para evitar duplicaciones
// =====================================================

export { supabase } from '../../lib/supabase';
export type { User, AuthUser, Role } from '../../lib/supabase';
