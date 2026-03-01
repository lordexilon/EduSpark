// pages/CareersPage.tsx
// Página de gestión de carreras (CRUD)

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { careerService, Career, subjectService, Subject } from '@/services/academicService';
import { institutionService, Institution } from '@/services/institutionService';
import { useUserInstitution } from '@/hooks/useUserInstitution';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import CurriculumGrid from '@/components/Academic/CurriculumGrid';

// Constantes de tipos de grado Paraguay
const DEGREE_TYPES = [
  { value: 'licenciatura', label: 'Licenciatura' },
  { value: 'medico_cirujano', label: 'Médico Cirujano (Medicina)' },
  { value: 'ingenieria', label: 'Ingeniería' },
  { value: 'tecnicatura', label: 'Tecnicatura' },
  { value: 'maestria', label: 'Maestría' },
  { value: 'doctorado', label: 'Doctorado' },
  { value: 'especializacion', label: 'Especialización' },
  { value: 'technical', label: 'Técnico (Legacy)' },
  { value: 'bachelor', label: 'Bachiller/Lic (Legacy)' },
];

const CareersPage: React.FC = () => {
  const { user } = useAuth();
  const { institution, loading: institutionLoading } = useUserInstitution();
  const isAdminCampus = user?.role?.name === 'admin-campus';
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCareer, setEditingCareer] = useState<Career | null>(null);

  // Estado para visualización de malla
  const [showCurriculum, setShowCurriculum] = useState<Career | null>(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState<Subject[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  useEffect(() => {
    // Si es admin-campus, esperar a que se cargue la institución
    if (isAdminCampus && institutionLoading) {
      return;
    }
    if (isAdminCampus && !institution) {
      setError('No tienes una institución asignada. Por favor, contacta al administrador.');
      setLoading(false);
      return;
    }
    loadCareers();
  }, [institution, institutionLoading, isAdminCampus]);

  const loadCareers = async () => {
    try {
      setLoading(true);
      setError(null);
      let data = await careerService.getAllCareers();

      // Si es admin-campus, filtrar por institución
      if (isAdminCampus && institution) {
        data = data.filter(career => (career as any).institution_id === institution.id);
      }

      setCareers(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las carreras');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurriculum = async (career: Career) => {
    try {
      setLoadingCurriculum(true);
      setShowCurriculum(career);
      // Cargar materias de la carrera
      const allSubjects = await subjectService.getAllSubjects();
      // Filtrar por carrera (idealmente el servicio debería tener getByCareer, pero filtramos aquí por ahora)
      const filtered = allSubjects.filter(s => s.career_id === career.id);
      setCurriculumSubjects(filtered);
    } catch (err) {
      console.error("Error cargando malla:", err);
      // Fallback
      setCurriculumSubjects([]);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  const handleDeleteCareer = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres desactivar esta carrera?')) return;

    try {
      await careerService.deleteCareer(id);
      await loadCareers();
    } catch (err: any) {
      setError(err.message || 'Error al desactivar la carrera');
      console.error(err);
    }
  };

  const handleToggleActive = async (career: Career) => {
    try {
      await careerService.updateCareer(career.id, { is_active: !career.is_active });
      await loadCareers();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la carrera');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Carreras</h1>
          <p className="text-gray-600">Administra los programas académicos</p>
        </div>
        <Button onClick={() => { setEditingCareer(null); setShowForm(true); }}>
          <span className="mr-2">+</span>
          Nueva Carrera
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={loadCareers} className="mt-2" size="sm">
            Reintentar
          </Button>
        </div>
      )}

      {/* Modal Formulario */}
      {showForm && (
        <CareerForm
          career={editingCareer}
          onClose={() => { setShowForm(false); setEditingCareer(null); }}
          onSuccess={() => { setShowForm(false); setEditingCareer(null); loadCareers(); }}
        />
      )}

      {/* Modal Visualizador de Malla */}
      {showCurriculum && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Malla Curricular</h2>
                <p className="text-sm text-gray-600 font-medium">{showCurriculum.name} ({showCurriculum.code})</p>
              </div>
              <button
                onClick={() => setShowCurriculum(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-gray-100/50">
              {loadingCurriculum ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <CurriculumGrid
                  subjects={curriculumSubjects}
                  readOnly={true}
                />
              )}
            </div>

            <div className="p-4 border-t bg-white rounded-b-xl flex justify-end">
              <Button onClick={() => setShowCurriculum(null)} variant="secondary">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {careers.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay carreras</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza creando la primera carrera.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {careers.map((career) => (
            <div key={career.id} className="flex flex-col h-full">
              <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{career.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">Código: {career.code}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${career.is_active
                        ? 'text-green-600 bg-green-100'
                        : 'text-gray-600 bg-gray-100'
                      }`}>
                      {career.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  {career.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{career.description}</p>
                  )}

                  <div className="text-xs text-gray-500 mb-4 space-y-1 flex-grow">
                    <div>Duración: {career.duration_months} meses</div>
                    <div>Créditos: {career.total_credits}</div>
                    <div>Tipo: {DEGREE_TYPES.find(d => d.value === career.degree_type)?.label || career.degree_type}</div>
                  </div>

                  <div className="mt-4 mb-4">
                    <Button
                      onClick={() => loadCurriculum(career)}
                      variant="ghost"
                      className="w-full text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-dashed border-indigo-200"
                      size="sm"
                    >
                      <span className="mr-2">🗺️</span> Ver Malla Curricular
                    </Button>
                  </div>

                  <div className="flex space-x-2 mt-auto">
                    <Button
                      onClick={() => { setEditingCareer(career); setShowForm(true); }}
                      className="flex-1"
                      size="sm"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleToggleActive(career)}
                      className={`flex-1 ${career.is_active
                          ? '' // Default primary looks fine, maybe warn color?
                          : ''
                        }`}
                      variant={career.is_active ? 'danger' : 'primary'} // Danger if active (to deactivate)
                      size="sm"
                    >
                      {career.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Componente de formulario para crear/editar carrera
interface CareerFormProps {
  career: Career | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CareerForm: React.FC<CareerFormProps> = ({ career, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { institution } = useUserInstitution();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [formData, setFormData] = useState({
    name: career?.name || '',
    code: career?.code || '',
    description: career?.description || '',
    coordinator_id: career?.coordinator_id || user?.id || '',
    institution_id: career?.institution_id || institution?.id || undefined,
    duration_months: career?.duration_months || 48,
    total_credits: career?.total_credits || 0,
    degree_type: career?.degree_type || 'licenciatura', // Default Paraguay
    is_active: career?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        setLoadingInstitutions(true);
        const data = await institutionService.getAllInstitutions();
        setInstitutions(data);
        // Si el usuario no es admin y tiene institución, pre-seleccionarla
        if (!career && user?.role?.name !== 'admin' && institution) {
          setFormData(prev => ({ ...prev, institution_id: institution.id }));
        }
      } catch (err) {
        console.error('Error cargando instituciones:', err);
      } finally {
        setLoadingInstitutions(false);
      }
    };
    loadInstitutions();
  }, [career, user, institution]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (career) {
        await careerService.updateCareer(career.id, formData);
      } else {
        await careerService.createCareer(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la carrera');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {career ? 'Editar Carrera' : 'Nueva Carrera'}
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {user?.role?.name === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institución *
              </label>
              <select
                required
                value={formData.institution_id ? String(formData.institution_id) : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    institution_id: value ? parseInt(value, 10) : undefined
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingInstitutions}
              >
                <option value="">Seleccionar institución</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
          )}

          {user?.role?.name !== 'admin' && institution && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institución
              </label>
              <input
                type="text"
                value={institution.name}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duración (meses) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.duration_months || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, duration_months: value ? parseInt(value, 10) : 0 });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Créditos Totales
              </label>
              <input
                type="number"
                min="0"
                value={formData.total_credits || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, total_credits: value ? parseInt(value, 10) : 0 });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Grado
            </label>
            <select
              value={formData.degree_type}
              onChange={(e) => setFormData({ ...formData, degree_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEGREE_TYPES.map(dt => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Carrera activa
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : career ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default CareersPage;

