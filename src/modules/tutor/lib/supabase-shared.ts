// =====================================================
// Configuración compartida de Supabase
// Re-exporta la instancia principal para evitar duplicaciones
// =====================================================

export { supabase } from '../../../lib/supabase-shared';
export type { User, AuthUser, Role } from '../../../lib/supabase-shared';
