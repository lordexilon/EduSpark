import { useState, useEffect } from 'react';
import { institutionService, Institution } from '../services/institutionService';
import { useAuth } from './useAuth';

interface UseUserInstitutionReturn {
    institution: Institution | null;
    loading: boolean;
    error: string | null;
}

export const useUserInstitution = (): UseUserInstitutionReturn => {
    const { user } = useAuth();
    const [institution, setInstitution] = useState<Institution | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadInstitution = async () => {
            if (!user?.id) {
                setInstitution(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const inst = await institutionService.getUserInstitution(user.id);
                setInstitution(inst);
            } catch (err: any) {
                console.error('Error loading user institution:', err);
                setError(err.message || 'Error al cargar institución');
                setInstitution(null);
            } finally {
                setLoading(false);
            }
        };

        loadInstitution();
    }, [user?.id]);

    return { institution, loading, error };
};
