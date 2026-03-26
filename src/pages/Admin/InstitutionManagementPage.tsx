// pages/InstitutionManagementPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { institutionService, Institution } from '@/services/institutionService';
import { uploadInstitutionLogo } from '@/services/storageService';
import { studentService, Student } from '@/services/studentService';
import { careerService, Career } from '@/services/academicService';
import { subjectService, Subject } from '@/services/academicService';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconPlus, IconEdit, IconCheck, IconX, IconUserGroup, IconUpload, IconSearch, IconUsers, IconTrash, IconStar, IconGraduationCap, IconBookOpen, IconSettings } from '@/components/Common/Icons';

const InstitutionManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    website: '',
    email: '',
    address: '',
    slug: ''
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para gestión de usuarios
  const [selectedInstitutionForUsers, setSelectedInstitutionForUsers] = useState<Institution | null>(null);
  const [institutionUsers, setInstitutionUsers] = useState<Array<{
    user_id: string;
    is_primary: boolean;
    position?: string;
    joined_at: string;
    user?: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role?: { id: number; name: string };
    };
  }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role?: { id: number; name: string };
  }>>([]);
  const [searching, setSearching] = useState(false);
  const [assigningUser, setAssigningUser] = useState<string | null>(null);
  const [positionInput, setPositionInput] = useState<Record<string, string>>({});

  // Estados para gestión de estudiantes
  const [institutionStudents, setInstitutionStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showStudentsTab, setShowStudentsTab] = useState(false);

  // Estados para gestión de recursos
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [selectedInstitutionForResources, setSelectedInstitutionForResources] = useState<Institution | null>(null);
  const [availableCareers, setAvailableCareers] = useState<Career[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [assignedCareers, setAssignedCareers] = useState<number[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<number[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    loadInstitutions();
  }, [user]);

  const loadInstitutions = async () => {
    try {
      setLoading(true);

      // Si es admin-campus, coordinator o supervisor, solo cargar su institución
      if (user?.role?.name === 'admin-campus' || user?.role?.name === 'coordinator' || user?.role?.name === 'supervisor') {
        if (user?.id) {
          const userInstitution = await institutionService.getUserInstitution(user.id);
          if (userInstitution) {
            setInstitutions([userInstitution]);
          } else {
            setInstitutions([]);
            alert('No tienes una institución asignada. Contacta al administrador.');
          }
        } else {
          setInstitutions([]);
        }
      } else {
        // Admin global ve todas las instituciones
        const data = await institutionService.getAllInstitutions();
        setInstitutions(data);
      }
    } catch (error: any) {
      console.error('Error cargando instituciones:', error);
      alert('Error al cargar instituciones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. El tamaño máximo es 5MB.');
      return;
    }

    // Si estamos editando una institución existente, subir inmediatamente
    if (selectedInstitution?.id) {
      setUploadingLogo(true);
      try {
        const result = await uploadInstitutionLogo(selectedInstitution.id, file);
        if (result.success && result.url) {
          setFormData({ ...formData, logo_url: result.url });
          setLogoPreview(result.url);
          setPendingLogoFile(null);
          alert('Logo subido exitosamente');
        } else {
          alert(result.error || 'Error al subir el logo');
        }
      } catch (error: any) {
        console.error('Error subiendo logo:', error);
        alert('Error al subir el logo: ' + (error.message || 'Error desconocido'));
      } finally {
        setUploadingLogo(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } else {
      // Si estamos creando una nueva institución, guardar el archivo para subirlo después
      setPendingLogoFile(file);
      // Crear preview local
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      // Prevenir que coordinator o supervisor creen nuevas instituciones
      // Admin-campus puede editar su institución pero no crear nuevas
      if (!selectedInstitution && (user?.role?.name === 'coordinator' || user?.role?.name === 'supervisor')) {
        alert('No tienes permisos para crear nuevas instituciones. Solo puedes editar tu institución.');
        return;
      }

      if (selectedInstitution) {
        // Verificar que coordinator o supervisor solo editen su propia institución
        // Admin-campus puede editar su institución
        if ((user?.role?.name === 'coordinator' || user?.role?.name === 'supervisor') && user?.id) {
          const userInstitution = await institutionService.getUserInstitution(user.id);
          if (!userInstitution || userInstitution.id !== selectedInstitution.id) {
            alert('No tienes permisos para editar esta institución. Solo puedes editar tu propia institución.');
            return;
          }
        }
        // Admin-campus puede editar su institución
        if (user?.role?.name === 'admin-campus' && user?.id) {
          const userInstitution = await institutionService.getUserInstitution(user.id);
          if (!userInstitution || userInstitution.id !== selectedInstitution.id) {
            alert('No tienes permisos para editar esta institución. Solo puedes editar tu propia institución.');
            return;
          }
        }

        await institutionService.updateInstitution(selectedInstitution.id, formData);
        alert('Institución actualizada exitosamente');
      } else {
        // Solo admin puede crear instituciones
        if (user?.role?.name !== 'admin') {
          alert('Solo los administradores globales pueden crear nuevas instituciones.');
          return;
        }

        const newInstitution = await institutionService.createInstitution({
          ...formData,
          is_active: true
        });

        // Si hay un logo pendiente, subirlo ahora con el ID real
        if (pendingLogoFile) {
          setUploadingLogo(true);
          try {
            const result = await uploadInstitutionLogo(newInstitution.id, pendingLogoFile);
            if (result.success && result.url) {
              await institutionService.updateInstitution(newInstitution.id, { logo_url: result.url });
            } else {
              console.warn('No se pudo subir el logo después de crear la institución:', result.error);
            }
          } catch (error: any) {
            console.error('Error subiendo logo después de crear institución:', error);
          } finally {
            setUploadingLogo(false);
            setPendingLogoFile(null);
          }
        }

        alert('Institución creada exitosamente');
      }
      setShowForm(false);
      setSelectedInstitution(null);
      setFormData({
        name: '',
        description: '',
        logo_url: '',
        website: '',
        email: '',
        address: '',
        slug: ''
      });
      setLogoPreview(null);
      setPendingLogoFile(null);
      loadInstitutions();
    } catch (error: any) {
      console.error('Error guardando institución:', error);
      alert('Error al guardar institución: ' + error.message);
    }
  };

  const handleEdit = (institution: Institution) => {
    setSelectedInstitution(institution);
    setFormData({
      name: institution.name,
      description: institution.description || '',
      logo_url: institution.logo_url || '',
      website: institution.website || '',
      email: institution.email || '',
      address: institution.address || '',
      slug: institution.slug || ''
    });
    setLogoPreview(institution.logo_url || null);
    setShowForm(true);
  };

  const handleManageUsers = async (institution: Institution) => {
    setSelectedInstitutionForUsers(institution);
    setShowUserModal(true);
    setShowStudentsTab(false);
    await loadInstitutionUsers(institution.id);
    await loadInstitutionStudents(institution.id);
    // Cargar usuarios iniciales cuando se abre el modal
    setTimeout(() => {
      handleSearchUsers('');
    }, 100);
  };

  const loadInstitutionStudents = async (institutionId: number) => {
    try {
      setLoadingStudents(true);
      // Obtener todos los estudiantes (RLS filtrará por institución)
      const allStudents = await studentService.getAllStudents();
      // Filtrar estudiantes que están asignados a esta institución
      const institutionUserIds = institutionUsers.map(u => u.user_id);
      const students = allStudents.filter(s => institutionUserIds.includes(s.id));
      setInstitutionStudents(students);
    } catch (error: any) {
      console.error('Error cargando estudiantes de la institución:', error);
      // Si falla, intentar obtener directamente
      try {
        const allStudents = await studentService.getAllStudents();
        setInstitutionStudents(allStudents);
      } catch (err) {
        console.error('Error alternativo cargando estudiantes:', err);
        setInstitutionStudents([]);
      }
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleManageResources = async (institution: Institution) => {
    setSelectedInstitutionForResources(institution);
    setShowResourcesModal(true);
    await loadResourcesForInstitution(institution.id);
  };

  const loadResourcesForInstitution = async (institutionId: number) => {
    try {
      setLoadingResources(true);
      // Cargar todas las carreras y materias (admin puede ver todas)
      const [careersData, subjectsData] = await Promise.all([
        careerService.getAllCareers().catch(() => []),
        subjectService.getAllSubjects().catch(() => [])
      ]);

      setAvailableCareers(careersData);
      setAvailableSubjects(subjectsData);

      // Obtener recursos asignados a la institución usando RPC
      try {
        const { data: careersAssigned, error: careersError } = await supabase
          .rpc('get_careers_for_institution', { p_institution_id: institutionId });

        if (!careersError && careersAssigned) {
          const assigned = careersAssigned
            .filter((c: any) => c.is_assigned)
            .map((c: any) => c.career_id);
          setAssignedCareers(assigned);
        }

        const { data: subjectsAssigned, error: subjectsError } = await supabase
          .rpc('get_subjects_for_institution', { p_institution_id: institutionId });

        if (!subjectsError && subjectsAssigned) {
          const assigned = subjectsAssigned
            .filter((s: any) => s.is_assigned)
            .map((s: any) => s.subject_id);
          setAssignedSubjects(assigned);
        }
      } catch (rpcError) {
        console.warn('Error obteniendo recursos asignados (RPC no disponible):', rpcError);
        // Si RPC no está disponible, usar institution_id directo
        const careersWithInstitution = careersData.filter(c => (c as any).institution_id === institutionId);
        const subjectsWithInstitution = subjectsData.filter(s => (s as any).institution_id === institutionId);
        setAssignedCareers(careersWithInstitution.map(c => c.id));
        setAssignedSubjects(subjectsWithInstitution.map(s => s.id));
      }
    } catch (error: any) {
      console.error('Error cargando recursos:', error);
      alert('Error al cargar recursos: ' + error.message);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleAssignCareer = async (careerId: number) => {
    if (!selectedInstitutionForResources) return;

    try {
      const { error } = await supabase
        .rpc('assign_career_to_institution', {
          p_career_id: careerId,
          p_institution_id: selectedInstitutionForResources.id
        });

      if (error) throw error;

      setAssignedCareers([...assignedCareers, careerId]);
      alert('Carrera asignada exitosamente');
    } catch (error: any) {
      console.error('Error asignando carrera:', error);
      alert('Error al asignar carrera: ' + error.message);
    }
  };

  const handleAssignSubject = async (subjectId: number) => {
    if (!selectedInstitutionForResources) return;

    try {
      const { error } = await supabase
        .rpc('assign_subject_to_institution', {
          p_subject_id: subjectId,
          p_institution_id: selectedInstitutionForResources.id
        });

      if (error) throw error;

      setAssignedSubjects([...assignedSubjects, subjectId]);
      alert('Materia asignada exitosamente');
    } catch (error: any) {
      console.error('Error asignando materia:', error);
      alert('Error al asignar materia: ' + error.message);
    }
  };

  const loadInstitutionUsers = async (institutionId: number) => {
    try {
      setLoadingUsers(true);
      const users = await institutionService.getInstitutionUsers(institutionId);
      setInstitutionUsers(users);
    } catch (error: any) {
      console.error('Error cargando usuarios de la institución:', error);
      alert('Error al cargar usuarios: ' + error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearchUsers = async (query: string) => {
    // Si la búsqueda está vacía, mostrar lista inicial de usuarios (últimos 20)
    if (query.length === 0) {
      try {
        setSearching(true);
        const results = await institutionService.searchUsers('', 20);
        // Filtrar usuarios que ya están asignados
        const assignedUserIds = new Set(institutionUsers.map(u => u.user_id));
        const filteredResults = results.filter(u => !assignedUserIds.has(u.id));
        setSearchResults(filteredResults);
      } catch (error: any) {
        console.error('Error cargando usuarios:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
      return;
    }

    // Si tiene menos de 2 caracteres, no buscar
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await institutionService.searchUsers(query);
      // Filtrar usuarios que ya están asignados
      const assignedUserIds = new Set(institutionUsers.map(u => u.user_id));
      const filteredResults = results.filter(u => !assignedUserIds.has(u.id));
      setSearchResults(filteredResults);
    } catch (error: any) {
      console.error('Error buscando usuarios:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAssignUser = async (userId: string, isPrimary: boolean = false) => {
    if (!selectedInstitutionForUsers) return;

    try {
      setAssigningUser(userId);
      const position = positionInput[userId] || undefined;
      await institutionService.assignUserToInstitution(
        userId,
        selectedInstitutionForUsers.id,
        isPrimary,
        position
      );

      // Recargar la lista de usuarios asignados
      await loadInstitutionUsers(selectedInstitutionForUsers.id);

      // Limpiar la búsqueda y resultados para reflejar el cambio
      setSearchQuery('');
      setSearchResults([]);
      setPositionInput({ ...positionInput, [userId]: '' });

      // Opcional: Mostrar mensaje de éxito
      // alert('Usuario asignado exitosamente'); 
    } catch (error: any) {
      console.error('Error asignando usuario:', error);
      alert('Error al asignar usuario: ' + error.message);
    } finally {
      setAssigningUser(null);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedInstitutionForUsers) return;
    if (!confirm('¿Estás seguro de que quieres remover este usuario de la institución?')) return;

    try {
      await institutionService.removeUserFromInstitution(userId, selectedInstitutionForUsers.id);
      await loadInstitutionUsers(selectedInstitutionForUsers.id);
      alert('Usuario removido exitosamente');
    } catch (error: any) {
      console.error('Error removiendo usuario:', error);
      alert('Error al remover usuario: ' + error.message);
    }
  };

  const handleSetPrimary = async (userId: string) => {
    if (!selectedInstitutionForUsers) return;

    try {
      await institutionService.assignUserToInstitution(
        userId,
        selectedInstitutionForUsers.id,
        true
      );
      await loadInstitutionUsers(selectedInstitutionForUsers.id);
      alert('Institución marcada como primaria');
    } catch (error: any) {
      console.error('Error marcando institución como primaria:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleToggleActive = async (institution: Institution) => {
    const action = institution.is_active ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de que quieres ${action} la institución "${institution.name}"?\n\n${!institution.is_active ? 'Al activarla, aparecerá en la landing page pública.' : 'Al desactivarla, dejará de aparecer en la landing page pública.'}`)) {
      return;
    }

    try {
      await institutionService.updateInstitution(institution.id, {
        is_active: !institution.is_active
      });

      // Actualizar localmente
      setInstitutions(prev => prev.map(inst =>
        inst.id === institution.id
          ? { ...inst, is_active: !inst.is_active }
          : inst
      ));

      alert(`Institución ${action === 'activar' ? 'activada' : 'desactivada'} exitosamente`);
    } catch (error: any) {
      console.error('Error al cambiar estado de institución:', error);
      alert('Error al cambiar estado: ' + error.message);
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
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Instituciones</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Administra instituciones y asigna usuarios</p>
          </div>
          {/* Solo admin global puede crear nuevas instituciones */}
          {user?.role?.name === 'admin' && (
            <Button
              onClick={() => {
                setSelectedInstitution(null);
                setFormData({
                  name: '',
                  description: '',
                  logo_url: '',
                  website: '',
                  email: '',
                  address: ''
                });
                setLogoPreview(null);
                setPendingLogoFile(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2"
            >
              <IconPlus className="w-5 h-5" />
              Nueva Institución
            </Button>
          )}
        </div>

        {/* Formulario de creación/edición */}
        {showForm && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {selectedInstitution ? 'Editar Institución' : 'Nueva Institución'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la Institución *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL Slug (Identificador único)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                    /
                  </span>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-r-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="cec"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Usado para la landing page: eduspark.com/{formData.slug || 'slug'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logo de la Institución
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className={`flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                      <IconUpload className="w-4 h-4" />
                      {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                    </label>
                    {formData.logo_url && (
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Logo cargado
                      </span>
                    )}
                  </div>
                  {(logoPreview || formData.logo_url) && (
                    <div className="mt-2">
                      <img
                        src={logoPreview || formData.logo_url}
                        alt="Preview"
                        className="h-24 w-auto object-contain border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 p-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    También puedes ingresar una URL manualmente:
                  </p>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => {
                      setFormData({ ...formData, logo_url: e.target.value });
                      setLogoPreview(e.target.value);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="https://ejemplo.com/logo.png"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sitio Web
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email de Contacto
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dirección
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateOrUpdate}
                  disabled={!formData.name}
                  className="flex items-center gap-2"
                >
                  <IconCheck className="w-5 h-5" />
                  {selectedInstitution ? 'Actualizar' : 'Crear'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedInstitution(null);
                  }}
                  className="flex items-center gap-2"
                >
                  <IconX className="w-5 h-5" />
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Lista de instituciones */}
        {institutions.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <IconUserGroup className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No hay instituciones</h3>
              <p className="mt-2 text-sm text-gray-500">Comienza creando la primera institución.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map((institution) => (
              <Card key={institution.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {institution.logo_url ? (
                      <img
                        src={institution.logo_url}
                        alt={institution.name}
                        className="h-12 w-auto max-w-[150px] object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <IconUserGroup className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {user?.role?.name === 'admin' && (
                      <button
                        onClick={() => handleManageResources(institution)}
                        className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                        title="Gestionar Recursos"
                      >
                        <IconSettings className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleManageUsers(institution)}
                      className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Gestionar Usuarios"
                    >
                      <IconUserGroup className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(institution)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <IconEdit className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  {institution.name}
                  {institution.slug && (
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                      /{institution.slug}
                    </span>
                  )}
                </h3>
                {institution.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {institution.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {institution.website && (
                    <a
                      href={institution.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600"
                    >
                      Sitio Web
                    </a>
                  )}
                  {institution.email && (
                    <a
                      href={`mailto:${institution.email}`}
                      className="hover:text-blue-600"
                    >
                      {institution.email}
                    </a>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${institution.is_active
                      ? 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/40'
                      : 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
                      }`}>
                      {institution.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                    {/* Solo admin puede activar/desactivar */}
                    {user?.role?.name === 'admin' && (
                      <button
                        onClick={() => handleToggleActive(institution)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${institution.is_active
                          ? 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20 dark:hover:bg-orange-900/40'
                          : 'text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40'
                          }`}
                        title={institution.is_active ? 'Desactivar institución' : 'Activar institución'}
                      >
                        {institution.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {institution.is_active
                      ? '✓ Visible en la landing page'
                      : '✗ Oculta en la landing page'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Gestión de Usuarios */}
        {showUserModal && selectedInstitutionForUsers && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-border/50 shadow-2xl">
              <div className="flex items-center justify-between mb-6 border-b dark:border-gray-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Usuarios de {selectedInstitutionForUsers.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Gestiona los usuarios asignados a esta institución
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedInstitutionForUsers(null);
                    setInstitutionUsers([]);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <IconX className="w-6 h-6" />
                </button>
              </div>

              {/* Buscar y asignar usuarios */}
              {/* Buscar y asignar usuarios */}
              <div className="mb-6 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-1">
                  Buscar Usuario para Asignar
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleSearchUsers(e.target.value);
                      }}
                      placeholder="Buscar por email, nombre o apellido..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                    />
                  </div>
                </div>

                {/* Resultados de búsqueda */}
                <div className="mt-4">
                  {searching ? (
                    <div className="text-center py-4 text-gray-500">Buscando...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchQuery.length === 0 && (
                        <div className="text-xs text-gray-500 mb-2 px-2">
                          Mostrando últimos usuarios registrados. Escribe para buscar específicamente.
                        </div>
                      )}
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                            {user.role && (
                              <span className="text-xs text-gray-400 capitalize">
                                {user.role.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Cargo (opcional)"
                              value={positionInput[user.id] || ''}
                              onChange={(e) => {
                                setPositionInput({ ...positionInput, [user.id]: e.target.value });
                              }}
                              className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 w-32 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <button
                              onClick={() => handleAssignUser(user.id, false)}
                              disabled={assigningUser === user.id}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {assigningUser === user.id ? 'Asignando...' : 'Asignar'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="text-center py-4 text-gray-500">
                      No se encontraron usuarios con "{searchQuery}"
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Tabs: Usuarios y Estudiantes */}
              <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowStudentsTab(false)}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-all duration-200 ${!showStudentsTab
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                  >
                    <IconUsers className="w-4 h-4 inline mr-2" />
                    Usuarios ({institutionUsers.length})
                  </button>
                  <button
                    onClick={() => {
                      setShowStudentsTab(true);
                      if (selectedInstitutionForUsers) {
                        loadInstitutionStudents(selectedInstitutionForUsers.id);
                      }
                    }}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-all duration-200 ${showStudentsTab
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                  >
                    <IconGraduationCap className="w-4 h-4 inline mr-2" />
                    Estudiantes ({institutionStudents.length})
                  </button>
                </div>
              </div>

              {/* Contenido según tab seleccionado */}
              {!showStudentsTab ? (
                /* Lista de usuarios asignados */
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Usuarios Asignados ({institutionUsers.length})
                  </h3>
                  {loadingUsers ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : institutionUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No hay usuarios asignados a esta institución
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {institutionUsers.map((item) => (
                        <div
                          key={item.user_id}
                          className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {item.user?.first_name} {item.user?.last_name}
                              </div>
                              {item.is_primary && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 rounded-full flex items-center gap-1">
                                  <IconStar className="w-3 h-3" />
                                  Primaria
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.user?.email}</div>
                            {item.user?.role && (
                              <span className="text-xs text-gray-400 capitalize">
                                {item.user.role.name}
                              </span>
                            )}
                            {item.position && (
                              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">
                                Cargo: {item.position}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!item.is_primary && (
                              <button
                                onClick={() => handleSetPrimary(item.user_id)}
                                className="px-3 py-1.5 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
                                title="Marcar como institución primaria"
                              >
                                <IconStar className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveUser(item.user_id)}
                              className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                              title="Remover de la institución"
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Lista de estudiantes */
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Estudiantes de la Institución ({institutionStudents.length})
                  </h3>
                  {loadingStudents ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : institutionStudents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                      <IconGraduationCap className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                      <p className="font-medium">No hay estudiantes asignados</p>
                      <p className="text-xs mt-1 max-w-xs mx-auto">Asigna usuarios con rol "student" a esta institución para que aparezcan aquí</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {institutionStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{student.email}</div>
                            <div className="flex items-center gap-2 mt-2">
                              {student.is_active ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded">
                                  Activo
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 rounded">
                                  Inactivo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Modal de Gestión de Recursos */}
        {showResourcesModal && selectedInstitutionForResources && user?.role?.name === 'admin' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-border/50 shadow-2xl">
              <div className="flex items-center justify-between mb-6 border-b dark:border-gray-800 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Recursos de {selectedInstitutionForResources.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Asigna carreras y materias a esta institución
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowResourcesModal(false);
                    setSelectedInstitutionForResources(null);
                    setAvailableCareers([]);
                    setAvailableSubjects([]);
                    setAssignedCareers([]);
                    setAssignedSubjects([]);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <IconX className="w-6 h-6" />
                </button>
              </div>

              {loadingResources ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Carreras */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <IconGraduationCap className="w-5 h-5 text-primary" />
                      Carreras ({assignedCareers.length} asignadas)
                    </h3>
                    {availableCareers.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No hay carreras disponibles. Crea carreras primero en la sección de administración.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availableCareers.map((career) => {
                          const isAssigned = assignedCareers.includes(career.id);
                          return (
                            <div
                              key={career.id}
                              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isAssigned
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                }`}
                            >
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {career.name} {career.code ? `(${career.code})` : ''}
                                </div>
                                {career.description && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                                    {career.description}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isAssigned ? (
                                  <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full">
                                    ✓ Asignada
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleAssignCareer(career.id)}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Asignar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Materias */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <IconBookOpen className="w-5 h-5 text-primary" />
                      Materias ({assignedSubjects.length} asignadas)
                    </h3>
                    {availableSubjects.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No hay materias disponibles. Crea materias primero en la sección de administración.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availableSubjects.map((subject) => {
                          const isAssigned = assignedSubjects.includes(subject.id);
                          return (
                            <div
                              key={subject.id}
                              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isAssigned
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                }`}
                            >
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {subject.name} {subject.code ? `(${subject.code})` : ''}
                                </div>
                                {subject.description && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                                    {subject.description}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isAssigned ? (
                                  <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 rounded-full">
                                    ✓ Asignada
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleAssignSubject(subject.id)}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Asignar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstitutionManagementPage;

