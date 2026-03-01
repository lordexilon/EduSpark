
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/Common/Card';
import { useAuth } from '@/hooks/useAuth';
import { useUserInstitution } from '@/hooks/useUserInstitution';
import { IconUserCircle, IconMail, IconBriefcase, IconUpload, IconX, IconEdit, IconSave, IconXCircle } from '@/components/Common/Icons';
import Button from '@/components/Common/Button';
import { careerEnrollmentService } from '@/services/academicService';
import { careerService } from '@/services/academicService';
import { googleOAuthService } from '@/services/googleOAuthService';
import { googleDriveService } from '@/services/googleDriveService';
import { uploadAvatar, updateAvatarUrl, deleteAvatar } from '@/services/storageService';
import { usersAPI } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { IconTrash2, IconShield, IconAlertTriangle } from '@/components/Common/Icons';
import { auditService } from '@/services/auditService';

const ProfilePage: React.FC = () => {
  const { user, logout, refreshUser, updateUser } = useAuth();
  const { institution } = useUserInstitution();
  const navigate = useNavigate();
  const [careerName, setCareerName] = useState<string | null>(null);
  const [loadingCareer, setLoadingCareer] = useState(true);
  const [hasGoogleCalendarConnected, setHasGoogleCalendarConnected] = useState(false);
  const [hasGoogleDriveConnected, setHasGoogleDriveConnected] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(true);
  const [driveFolderInfo, setDriveFolderInfo] = useState<{ id: string; name: string; url: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState({
    first_name: '',
    last_name: '',
    identity_document: '',
    identity_document_type: null as 'DNI' | 'CEDULA' | 'PASAPORTE' | 'LICENCIA' | 'OTRO' | null
  });
  const [saving, setSaving] = useState(false);

  // Verificar conexión de Google Calendar y Drive
  useEffect(() => {
    const checkGoogleConnections = async () => {
      if (!user?.id) {
        setCheckingGoogle(false);
        return;
      }

      try {
        setCheckingGoogle(true);

        // Verificar Calendar
        const hasCalendarToken = await googleOAuthService.hasValidToken(user.id, 'calendar');
        setHasGoogleCalendarConnected(hasCalendarToken);

        // Verificar Drive
        const hasDriveToken = await googleOAuthService.hasValidToken(user.id, 'drive');
        setHasGoogleDriveConnected(hasDriveToken);

        // Si tiene Drive, obtener información de la carpeta
        if (hasDriveToken) {
          const folder = await googleDriveService.getUserFolder(user.id);
          setDriveFolderInfo(folder);
        }
      } catch (error) {
        console.error('Error verificando conexión de Google:', error);
        setHasGoogleCalendarConnected(false);
        setHasGoogleDriveConnected(false);
      } finally {
        setCheckingGoogle(false);
      }
    };

    checkGoogleConnections();
  }, [user?.id]);

  useEffect(() => {
    const loadCareer = async () => {
      if (!user?.id) {
        setLoadingCareer(false);
        return;
      }

      try {
        setLoadingCareer(true);
        // Obtener inscripciones activas en carreras
        const enrollments = await careerEnrollmentService.getStudentEnrollments(user.id);
        const activeEnrollment = enrollments.find(e => e.status === 'active');

        if (activeEnrollment) {
          const career = await careerService.getCareer(activeEnrollment.career_id);
          if (career) {
            setCareerName(career.name);
          }
        }
      } catch (error) {
        console.error('Error al cargar carrera del estudiante:', error);
      } finally {
        setLoadingCareer(false);
      }
    };

    loadCareer();
  }, [user?.id]);

  // Inicializar formulario de edición cuando se activa
  useEffect(() => {
    if (isEditing && user) {
      setEditingProfile({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        identity_document: user.identity_document || '',
        identity_document_type: (user as any).identity_document_type || null
      });
    }
  }, [isEditing, user]);

  if (!user) {
    return <p>Cargando perfil...</p>;
  }

  const displayRole = (role: any) => {
    // Si role es un objeto, usar la propiedad name
    const roleName = typeof role === 'object' && role?.name ? role.name : role;

    if (roleName === 'student') return 'Estudiante';
    if (roleName === 'teacher') return 'Profesor';
    if (roleName === 'admin') return 'Administrador';
    return roleName;
  }

  const isTeacher = user?.role?.name === 'teacher' || user?.role?.name === 'admin';

  const handleConnectGoogleCalendar = () => {
    if (!user?.id) {
      alert('Debes estar autenticado para conectar tu cuenta de Google.');
      return;
    }

    const state = JSON.stringify({
      path: '/profile',
      service: 'calendar'
    });

    window.location.href = googleOAuthService.getAuthorizationUrl(state, ['calendar']);
  };

  const handleConnectGoogleDrive = () => {
    if (!user?.id) {
      alert('Debes estar autenticado para conectar tu cuenta de Google.');
      return;
    }

    const state = JSON.stringify({
      path: '/profile',
      service: 'drive'
    });

    window.location.href = googleOAuthService.getAuthorizationUrl(state, ['drive']);
  };

  const handleConnectBoth = () => {
    if (!user?.id) {
      alert('Debes estar autenticado para conectar tu cuenta de Google.');
      return;
    }

    const state = JSON.stringify({
      path: '/profile',
      service: 'both'
    });

    window.location.href = googleOAuthService.getAuthorizationUrl(state, ['calendar', 'drive']);
  };

  const handleDisconnectGoogleCalendar = async () => {
    if (!user?.id) return;

    if (!confirm('¿Estás seguro de que deseas desconectar tu cuenta de Google Calendar?')) {
      return;
    }

    try {
      await googleOAuthService.disconnectAccount(user.id, 'calendar');
      setHasGoogleCalendarConnected(false);
      alert('Cuenta de Google Calendar desconectada exitosamente.');
    } catch (error: any) {
      console.error('Error desconectando Google Calendar:', error);
      alert(`Error al desconectar: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    if (!user?.id) return;

    if (!confirm('¿Estás seguro de que deseas desconectar tu cuenta de Google Drive? Esto eliminará la vinculación de tu carpeta.')) {
      return;
    }

    try {
      await googleOAuthService.disconnectAccount(user.id, 'drive');
      await googleDriveService.unlinkDrive(user.id);
      setHasGoogleDriveConnected(false);
      setDriveFolderInfo(null);
      alert('Cuenta de Google Drive desconectada exitosamente.');
    } catch (error: any) {
      console.error('Error desconectando Google Drive:', error);
      alert(`Error al desconectar: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen es demasiado grande. El tamaño máximo es 5MB.');
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleUploadAvatar = async () => {
    if (!user?.id || !fileInputRef.current?.files?.[0]) {
      setError('Por favor, selecciona una imagen primero.');
      return;
    }

    const file = fileInputRef.current.files[0];
    setUploadingAvatar(true);
    setError(null);

    try {
      // Si hay un avatar anterior, eliminarlo (opcional, para ahorrar espacio)
      if (user.avatar_url) {
        await deleteAvatar(user.id, user.avatar_url);
      }

      // Subir nueva imagen
      const uploadResult = await uploadAvatar(user.id, file);

      if (!uploadResult.success || !uploadResult.url) {
        setError(uploadResult.error || 'Error al subir la imagen.');
        setUploadingAvatar(false);
        return;
      }

      // Actualizar avatar_url en la base de datos
      const updateResult = await updateAvatarUrl(user.id, uploadResult.url);

      if (!updateResult.success) {
        setError(updateResult.error || 'Error al actualizar el perfil.');
        setUploadingAvatar(false);
        return;
      }

      // Actualizar el usuario en el contexto
      await refreshUser();

      // Limpiar preview y input
      setAvatarPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      alert('Imagen de perfil actualizada exitosamente.');
    } catch (error: any) {
      console.error('Error subiendo avatar:', error);
      setError(error.message || 'Error inesperado al subir la imagen.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancelUpload = () => {
    setAvatarPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingProfile({
      first_name: '',
      last_name: '',
      identity_document: '',
      identity_document_type: null
    });
    setError(null);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    // Validaciones
    if (!editingProfile.first_name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!editingProfile.last_name.trim()) {
      setError('El apellido es requerido');
      return;
    }

    // Validar documento de identidad si se proporciona
    if (editingProfile.identity_document && editingProfile.identity_document.trim()) {
      // Validar que no tenga espacios y tenga al menos 4 caracteres
      const doc = editingProfile.identity_document.trim();
      if (doc.length < 4) {
        setError('El documento de identidad debe tener al menos 4 caracteres');
        return;
      }
      if (/\s/.test(doc)) {
        setError('El documento de identidad no puede contener espacios');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      // Preparar los datos a enviar
      const updateData: any = {
        first_name: editingProfile.first_name.trim(),
        last_name: editingProfile.last_name.trim()
      };

      // Manejar identity_document: si está vacío o solo espacios, enviar null, sino enviar el valor trimmeado
      const trimmedDoc = editingProfile.identity_document?.trim() || '';
      updateData.identity_document = trimmedDoc.length > 0 ? trimmedDoc : null;

      // Agregar tipo de documento si se proporciona
      if (editingProfile.identity_document_type) {
        updateData.identity_document_type = editingProfile.identity_document_type;
      } else if (trimmedDoc.length === 0) {
        // Si no hay documento, tampoco debe haber tipo
        updateData.identity_document_type = null;
      }

      console.log('📤 ProfilePage: Enviando datos de actualización', updateData);

      const result = await usersAPI.updateUser(user.id, updateData);

      if (result.success && result.data) {
        // Actualizar el usuario directamente con los datos devueltos
        updateUser(result.data);
        // También refrescar para asegurar que todo esté sincronizado
        setTimeout(() => {
          refreshUser().catch(err => console.error('Error al refrescar después de actualizar:', err));
        }, 500);
        setIsEditing(false);
        alert('Perfil actualizado exitosamente');
      } else {
        setError(result.error || 'Error al actualizar el perfil');
      }
    } catch (error: any) {
      console.error('Error actualizando perfil:', error);
      setError(error.message || 'Error inesperado al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccountRequest = async () => {
    if (!user?.id) return;

    if (!confirm('ADVERTENCIA: ¿Estás seguro de que deseas solicitar la eliminación de tu cuenta?\n\nEsta acción es irreversible después del periodo de gracia de 30 días. Perderás permanentemente acceso a todos tus cursos, certificados y progreso.')) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ deleted_requested_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      // Log audit
      await auditService.logAction(user.id, 'DELETE_REQUEST', 'user', user.id, { reason: 'user_requested' });

      alert('Solicitud de eliminación enviada exitosamente.\n\nTu cuenta ha sido programada para eliminación en 30 días. Durante este periodo, puedes cancelar la solicitud contactando a soporte.');
    } catch (err: any) {
      console.error('Error solicitando eliminación:', err);
      alert(`Error al procesar la solicitud: ${err.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 text-center">Mi Perfil</h1>

      {/* Información Personal */}
      <Card>
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="relative mb-4">
            {user.avatar_url || avatarPreview ? (
              <img
                src={avatarPreview || user.avatar_url || ''}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-200"
              />
            ) : (
              <IconUserCircle className="w-24 h-24 text-slate-400" />
            )}
          </div>

          {/* Botón para cambiar avatar */}
          <div className="mb-4 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <IconUpload className="w-4 h-4" />
              {user.avatar_url ? 'Cambiar foto' : 'Subir foto'}
            </label>

            {avatarPreview && (
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleUploadAvatar}
                  disabled={uploadingAvatar}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  {uploadingAvatar ? 'Subiendo...' : 'Guardar'}
                </Button>
                <Button
                  onClick={handleCancelUpload}
                  disabled={uploadingAvatar}
                  variant="secondary"
                  size="sm"
                >
                  <IconX className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          {!isEditing ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-slate-800">
                  {user.first_name} {user.last_name}
                </h2>
                <button
                  onClick={handleEditProfile}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar perfil"
                >
                  <IconEdit className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-600 mb-4">{displayRole(user.role)}</p>

              <div className="w-full space-y-4 mt-6">
                <div className="flex items-center gap-3">
                  <IconMail className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-700">{user.email}</span>
                </div>

                {user.identity_document && (
                  <div className="flex items-center gap-3">
                    <IconBriefcase className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-700">
                      {(user as any).identity_document_type ? `${(user as any).identity_document_type}: ` : ''}
                      {user.identity_document}
                    </span>
                  </div>
                )}

                {careerName && (
                  <div className="flex items-center gap-3">
                    <IconBriefcase className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-700">Carrera: {careerName}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="w-full space-y-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={editingProfile.first_name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  value={editingProfile.last_name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Apellido"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo de Documento
                </label>
                <select
                  value={editingProfile.identity_document_type || ''}
                  onChange={(e) => setEditingProfile({
                    ...editingProfile,
                    identity_document_type: e.target.value || null as any
                  })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="DNI">DNI</option>
                  <option value="CEDULA">Cédula</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="LICENCIA">Licencia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Número de Documento
                </label>
                <input
                  type="text"
                  value={editingProfile.identity_document}
                  onChange={(e) => setEditingProfile({ ...editingProfile, identity_document: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Número de documento"
                  disabled={saving}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Documento único e irrepetible. Mínimo 4 caracteres, sin espacios.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <IconMail className="w-5 h-5 text-slate-500" />
                <span className="text-slate-700">{user.email}</span>
                <span className="text-xs text-slate-500">(No editable)</span>
              </div>

              {careerName && (
                <div className="flex items-center gap-3">
                  <IconBriefcase className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-700">Carrera: {careerName}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  variant="primary"
                  className="flex-1"
                  leftIcon={<IconSave className="w-4 h-4" />}
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  variant="secondary"
                  leftIcon={<IconXCircle className="w-4 h-4" />}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Integraciones */}
      <Card>
        <h3 className="text-xl font-bold text-slate-800 mb-4">Integraciones</h3>

        {/* Google Calendar */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-semibold text-slate-800">Google Calendar</h4>
              <p className="text-sm text-slate-600">
                {isTeacher
                  ? 'Conecta tu cuenta para crear videollamadas automáticamente en las sesiones'
                  : 'Conecta tu cuenta para sincronizar eventos y recordatorios'}
              </p>
            </div>
          </div>

          {checkingGoogle ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Verificando conexión...
            </div>
          ) : hasGoogleCalendarConnected ? (
            <div className="mt-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    Cuenta de Google Calendar conectada
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDisconnectGoogleCalendar}
                >
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnectGoogleCalendar}
              >
                Conectar con Google Calendar
              </Button>
            </div>
          )}
        </div>

        {/* Google Drive */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-semibold text-slate-800">Google Drive</h4>
              <p className="text-sm text-slate-600">
                Conecta tu cuenta para crear una carpeta personal donde se guardarán tus archivos y documentos
              </p>
            </div>
          </div>

          {checkingGoogle ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Verificando conexión...
            </div>
          ) : hasGoogleDriveConnected ? (
            <div className="mt-3 space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">
                      Cuenta de Google Drive conectada
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDisconnectGoogleDrive}
                  >
                    Desconectar
                  </Button>
                </div>
                {driveFolderInfo && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-gray-600 mb-1">Carpeta vinculada:</p>
                    <a
                      href={driveFolderInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
                    >
                      {driveFolderInfo.name}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnectGoogleDrive}
              >
                Conectar con Google Drive
              </Button>
            </div>
          )}
        </div>

        {/* Opción para conectar ambos */}
        {(!hasGoogleCalendarConnected || !hasGoogleDriveConnected) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleConnectBoth}
              className="w-full"
            >
              Conectar Calendar y Drive juntos
            </Button>
          </div>
        )}
      </Card>

      {/* Privacidad y Datos (Zona de Peligro) */}
      <Card className="border-red-100 bg-red-50/30">
        <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
          <IconShield className="w-6 h-6" />
          Privacidad y Datos
        </h3>

        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-red-100">
            <h4 className="font-semibold text-slate-800 mb-2">Derecho al Olvido</h4>
            <p className="text-sm text-slate-600 mb-4">
              De acuerdo con la Ley No. 7593/2025 de Protección de Datos Personales, tienes derecho a solicitar la eliminación completa de tus datos personales de nuestros sistemas.
            </p>

            <div className="flex items-start gap-3 p-3 bg-red-50 rounded text-sm text-red-800 mb-4">
              <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Advertencia:</span> Esta acción es irreversible después del periodo de gracia de 30 días.
                Perderás acceso a todos tus cursos, certificados y progreso.
              </div>
            </div>

            <Button
              variant="danger"
              onClick={handleDeleteAccountRequest}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <IconTrash2 className="w-4 h-4 mr-2" />
              Solicitar Eliminación de Cuenta
            </Button>
          </div>
        </div>
      </Card>

      {/* Botón de Cerrar Sesión */}
      <Card>
        <Button
          variant="danger"
          onClick={async () => {
            await auditService.logAction(user.id, 'LOGOUT', 'system');
            await logout();
            // Siempre redirigir a / después del logout
            navigate('/');
          }}
          className="w-full"
        >
          Cerrar Sesión
        </Button>
      </Card>
    </div>
  );
};


export default ProfilePage;