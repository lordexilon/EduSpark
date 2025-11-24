// =====================================================
// Configuración compartida de Supabase
// Re-exporta la instancia principal para evitar duplicaciones
// =====================================================

export { supabase } from '../../src/lib/supabase';
export type { User, AuthUser, Role } from '../../src/lib/supabase';
