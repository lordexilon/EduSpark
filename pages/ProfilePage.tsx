
import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/Card.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import { IconUserCircle, IconMail, IconBriefcase, IconUpload, IconX } from '../components/Icons.tsx'; 
import Button from '../components/Button.tsx';
import { careerEnrollmentService } from '../services/academicService';
import { careerService } from '../services/academicService';
import { googleOAuthService } from '../services/googleOAuthService';
import { googleDriveService } from '../services/googleDriveService';
import { uploadAvatar, updateAvatarUrl, deleteAvatar } from '../services/storageService';

const ProfilePage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
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

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {user.first_name} {user.last_name}
          </h2>
          <p className="text-slate-600 mb-4">{displayRole(user.role)}</p>
          
          <div className="w-full space-y-4 mt-6">
            <div className="flex items-center gap-3">
              <IconMail className="w-5 h-5 text-slate-500" />
              <span className="text-slate-700">{user.email}</span>
            </div>
            
            {careerName && (
              <div className="flex items-center gap-3">
                <IconBriefcase className="w-5 h-5 text-slate-500" />
                <span className="text-slate-700">Carrera: {careerName}</span>
              </div>
            )}
          </div>
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

      {/* Botón de Cerrar Sesión */}
      <Card>
        <Button
          variant="danger"
          onClick={logout}
          className="w-full"
        >
          Cerrar Sesión
        </Button>
      </Card>
    </div>
  );
};

export default ProfilePage;