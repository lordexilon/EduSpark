import { useState, useEffect } from 'react';
import { institutionService, Institution } from '@/services/institutionService';
import { useAuth } from './useAuth';

interface UseUserInstitutionReturn {
  institution: Institution | null;
  loading: boolean;
  error: string | null;
  refreshInstitution: () => Promise<void>;
}

export const useUserInstitution = (): UseUserInstitutionReturn => {
  const { user } = useAuth();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInstitution = async () => {
    if (!user?.id) {
      console.log('🏛️ [useUserInstitution] No hay usuario, omitiendo carga de institución');
      setInstitution(null);
      setLoading(false);
      return;
    }

    try {
      console.log(`🏛️ [useUserInstitution] Cargando institución para usuario: ${user.id}`);
      setLoading(true);
      setError(null);
      const inst = await institutionService.getUserInstitution(user.id);
      if (inst) {
        console.log(`✅ [useUserInstitution] Institución cargada: ${inst.name} (ID: ${inst.id})`);
      } else {
        console.log(`⚠️ [useUserInstitution] Usuario ${user.id} no tiene institución asignada`);
      }
      setInstitution(inst);
    } catch (err: any) {
      console.error('❌ [useUserInstitution] Error loading user institution:', err);
      setError(err.message || 'Error al cargar institución');
      setInstitution(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstitution();
  }, [user?.id]);

  return { institution, loading, error, refreshInstitution: loadInstitution };
};
