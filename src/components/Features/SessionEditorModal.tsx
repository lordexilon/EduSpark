// components/SessionEditorModal.tsx
// Modal para crear/editar sesiones con contenido rico

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Session, CourseUnit } from '@/services/teacherCourses';
import { RichTextEditor } from '@/components/RichTextEditor';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { googleCalendarService, CreateMeetingParams } from '@/services/googleCalendarService';
import { googleOAuthService } from '@/services/googleOAuthService';
import { useAuth } from '@/hooks/useAuth';
import { uploadCourseMedia } from '@/services/storageService';
import { materialService, Material } from '@/services/teacherCourses';
import { VideoTranscriptService } from '@/services/videoTranscriptService';
import { VideoPlayer } from './VideoPlayer';

interface SessionEditorModalProps {
  session: Session | null;
  courseId: number;
  units: CourseUnit[];
  onClose: () => void;
  onSave: (session: Omit<Session, 'id' | 'created_at'>) => Promise<void>;
}

export const SessionEditorModal: React.FC<SessionEditorModalProps> = ({
  session,
  courseId,
  units,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [unitId, setUnitId] = useState<string | undefined>();
  const [contentHtml, setContentHtml] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>();
  const [sessionType, setSessionType] = useState<
    'lecture' | 'practice' | 'lab' | 'exam' | 'discussion' | 'workshop' | 'other'
  >('lecture');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [orderIndex, setOrderIndex] = useState<number | undefined>();
  const [newObjective, setNewObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoCreateMeet, setAutoCreateMeet] = useState(false);
  const [googleMeetLink, setGoogleMeetLink] = useState('');
  const [googleCalendarEventId, setGoogleCalendarEventId] = useState<string | undefined>();
  const [creatingMeet, setCreatingMeet] = useState(false);
  const [hasConnectedGoogle, setHasConnectedGoogle] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [contentUploadMessage, setContentUploadMessage] = useState<string | null>(null);
  const contentUploadAbortController = useRef<AbortController | null>(null);
  const [sessionMaterials, setSessionMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);
  const [transcriptionStatuses, setTranscriptionStatuses] = useState<Record<string, string>>({});
  const { user } = useAuth();

  // Helper para convertir fecha ISO (UTC) a formato datetime-local (hora local)
  const toLocalDatetimeString = (isoString: string | undefined): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      // Obtener componentes en hora local
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      console.error('Error convirtiendo fecha:', e);
      return '';
    }
  };

  // Helper para convertir datetime-local (hora local) a ISO string (UTC) preservando la hora exacta
  const localDatetimeToISO = (localDatetimeString: string | undefined): string | undefined => {
    if (!localDatetimeString) return undefined;
    try {
      // El input datetime-local devuelve un string en formato YYYY-MM-DDTHH:mm sin zona horaria
      // Queremos guardar exactamente esa hora sin conversión de zona horaria
      // Para esto, creamos el ISO string directamente usando UTC pero con la hora ingresada
      const [datePart, timePart] = localDatetimeString.split('T');
      if (!datePart || !timePart) return undefined;

      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);

      // Crear ISO string directamente con la hora ingresada (interpretándola como UTC)
      // Esto preserva la hora exacta que el usuario ingresó
      const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;

      return isoString;
    } catch (e) {
      console.error('Error convirtiendo fecha local a ISO:', e);
      return undefined;
    }
  };

  useEffect(() => {
    if (session) {
      setTitle(session.title);
      setDescription(session.description || '');
      setUnitId(session.unit_id);
      setContentHtml(session.content_html || '');
      setContentMarkdown(session.content_markdown || '');
      setLearningObjectives(session.learning_objectives || []);
      setDurationMinutes(session.duration_minutes);
      setSessionType(session.session_type || 'lecture');
      setStartsAt(toLocalDatetimeString(session.starts_at));
      setEndsAt(toLocalDatetimeString(session.ends_at));
      setOrderIndex(session.order_index);
      setAutoCreateMeet(session.auto_create_meet || false);
      setGoogleMeetLink(session.google_meet_link || '');
      setGoogleCalendarEventId(session.google_calendar_event_id);

      // Cargar materiales de la sesión
      loadSessionMaterials();
    } else {
      setSessionMaterials([]);
    }
  }, [session]);

  const loadSessionMaterials = async () => {
    if (!session?.id) return;

    try {
      setLoadingMaterials(true);
      const allMaterials = await materialService.getCourseMaterials(courseId);
      const sessionMats = allMaterials.filter((m) => m.session_id === session.id);
      setSessionMaterials(sessionMats);

      // Inicializar estados de transcripción
      const statuses: Record<string, string> = {};
      sessionMats.forEach((m) => {
        if (m.kind === 'video' && m.transcription_status) {
          statuses[m.id] = m.transcription_status;
        }
      });
      setTranscriptionStatuses(statuses);
    } catch (error) {
      console.error('Error cargando materiales de sesión:', error);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim() || !newVideoTitle.trim()) {
      alert('Por favor ingresa un título y URL válidos');
      return;
    }

    if (!session?.id) {
      alert('Por favor guarda la sesión primero antes de agregar videos');
      return;
    }

    const transcriptService = new VideoTranscriptService();
    const platform = transcriptService.detectPlatform(newVideoUrl);

    if (!platform) {
      alert('URL de video no válida. Solo se soportan YouTube y Vimeo.');
      return;
    }

    try {
      setAddingVideo(true);

      // Crear el material de video
      const newMaterial = await materialService.createMaterial({
        course_id: courseId,
        session_id: session.id,
        unit_id: session.unit_id,
        title: newVideoTitle.trim(),
        kind: 'video',
        url: newVideoUrl.trim(),
        metadata: {
          platform: platform.name,
        },
      });

      // Actualizar estado local
      setSessionMaterials([...sessionMaterials, newMaterial]);
      setNewVideoUrl('');
      setNewVideoTitle('');
      setTranscriptionStatuses({ ...transcriptionStatuses, [newMaterial.id]: 'pending' });

      // Extraer transcripción automáticamente
      try {
        setTranscriptionStatuses({ ...transcriptionStatuses, [newMaterial.id]: 'processing' });
        const result = await transcriptService.extractTranscript(newMaterial.id, newVideoUrl);
        if (result.success) {
          setTranscriptionStatuses({ ...transcriptionStatuses, [newMaterial.id]: 'completed' });
        } else {
          setTranscriptionStatuses({ ...transcriptionStatuses, [newMaterial.id]: 'failed' });
        }

        // Recargar materiales para obtener datos actualizados
        await loadSessionMaterials();
      } catch (error: any) {
        console.error('Error extrayendo transcripción:', error);
        setTranscriptionStatuses({ ...transcriptionStatuses, [newMaterial.id]: 'failed' });
      }
    } catch (error: any) {
      console.error('Error agregando video:', error);
      alert(error?.message || 'Error al agregar el video');
    } finally {
      setAddingVideo(false);
    }
  };

  const handleDeleteVideo = async (materialId: string) => {
    if (!confirm('¿Estás seguro de eliminar este video?')) return;

    try {
      await materialService.deleteMaterial(materialId);
      setSessionMaterials(sessionMaterials.filter((m) => m.id !== materialId));
      const newStatuses = { ...transcriptionStatuses };
      delete newStatuses[materialId];
      setTranscriptionStatuses(newStatuses);
    } catch (error: any) {
      console.error('Error eliminando video:', error);
      alert(error?.message || 'Error al eliminar el video');
    }
  };

  // Verificar si el usuario tiene Google Calendar conectado
  useEffect(() => {
    const checkGoogleConnection = async () => {
      if (!user?.id) {
        setCheckingConnection(false);
        return;
      }

      try {
        const hasToken = await googleOAuthService.hasValidToken(user.id);
        setHasConnectedGoogle(hasToken);
      } catch (error) {
        console.error('Error verificando conexión de Google:', error);
        setHasConnectedGoogle(false);
      } finally {
        setCheckingConnection(false);
      }
    };

    checkGoogleConnection();
  }, [user?.id]);

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setLearningObjectives([...learningObjectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const handleRemoveObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const handleConnectGoogle = () => {
    if (!user?.id) {
      alert('Debes estar autenticado para conectar tu cuenta de Google.');
      return;
    }

    // Guardar el estado para redirigir después de la autenticación
    const state = JSON.stringify({
      path: window.location.pathname,
      courseId: courseId,
      sessionId: session?.id || null,
    });

    // Redirigir a la página de autorización de Google
    window.location.href = googleOAuthService.getAuthorizationUrl(state);
  };

  const handleCreateMeet = async () => {
    if (!startsAt || !endsAt) {
      alert(
        'Por favor, establece la fecha y hora de inicio y fin de la sesión antes de crear la videollamada.'
      );
      return;
    }

    if (!user?.email || !user?.id) {
      alert('No se pudo obtener el email del usuario. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (!hasConnectedGoogle) {
      const confirmConnect = confirm(
        'Debes conectar tu cuenta de Google Calendar primero para crear videollamadas. ¿Deseas conectarla ahora?'
      );
      if (confirmConnect) {
        handleConnectGoogle();
      }
      return;
    }

    setCreatingMeet(true);

    try {
      // Obtener el token de acceso de Google Calendar del usuario
      const accessToken = await googleOAuthService.getAccessToken(user.id);

      if (!accessToken) {
        alert(
          'No se pudo obtener el token de acceso. Por favor, reconecta tu cuenta de Google Calendar.'
        );
        setHasConnectedGoogle(false);
        return;
      }

      const params: CreateMeetingParams = {
        title: title || 'Sesión de clase',
        description: description || '',
        startTime: new Date(startsAt),
        endTime: new Date(endsAt),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima',
        teacherEmail: user.email,
        // TODO: Obtener emails de estudiantes inscritos en el curso
        attendees: [],
      };

      let result;
      if (googleCalendarEventId) {
        // Actualizar evento existente
        result = await googleCalendarService.updateMeeting(
          accessToken,
          googleCalendarEventId,
          params
        );
      } else {
        // Crear nuevo evento
        result = await googleCalendarService.createMeeting(accessToken, params);
      }

      setGoogleMeetLink(result.meetLink);
      setGoogleCalendarEventId(result.eventId);
      alert('Videollamada creada exitosamente. El enlace se guardará cuando guardes la sesión.');
    } catch (error: any) {
      console.error('Error creando videollamada:', error);
      alert(`Error al crear la videollamada: ${error.message || 'Error desconocido'}`);

      // Si el error es de autenticación, marcar como desconectado
      if (error.message?.includes('401') || error.message?.includes('token')) {
        setHasConnectedGoogle(false);
      }
    } finally {
      setCreatingMeet(false);
    }
  };

  useEffect(() => {
    return () => {
      contentUploadAbortController.current?.abort();
    };
  }, []);

  const handleUploadEditorImage = useCallback(
    async (file: File) => {
      try {
        contentUploadAbortController.current?.abort();
        const controller = new AbortController();
        contentUploadAbortController.current = controller;
        setContentUploadMessage('Optimizando imagen...');

        const result = await uploadCourseMedia(String(courseId), file, 'session-content', {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.8,
          format: 'image/webp',
          signal: controller.signal,
        });

        if (!result.success || !result.url) {
          throw new Error(result.error || 'No se pudo subir la imagen.');
        }

        setContentUploadMessage(result.optimization ?? 'Imagen subida correctamente');
        return result.url;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          setContentUploadMessage('Subida de imagen cancelada.');
          throw error;
        }
        console.error('[SessionEditorModal] Error subiendo imagen del contenido:', error);
        setContentUploadMessage(error?.message || 'Error al subir la imagen.');
        throw error;
      }
    },
    [courseId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Por favor ingresa un título');
      return;
    }

    // Validar tamaño del contenido HTML
    const maxHtmlLength = 1000000; // 1MB
    if (contentHtml && contentHtml.length > maxHtmlLength) {
      alert(
        `El contenido HTML es demasiado grande (${(contentHtml.length / 1024).toFixed(0)}KB). Máximo permitido: ${(maxHtmlLength / 1024).toFixed(0)}KB`
      );
      return;
    }

    setLoading(true);

    try {
      const sessionData = {
        course_id: courseId,
        unit_id: unitId || undefined,
        title: title.trim(),
        description: description?.trim() || undefined,
        content_html: contentHtml?.trim() || undefined,
        content_markdown: contentMarkdown?.trim() || undefined,
        learning_objectives: learningObjectives.length > 0 ? learningObjectives : undefined,
        duration_minutes: durationMinutes,
        session_type: sessionType,
        starts_at: localDatetimeToISO(startsAt),
        ends_at: localDatetimeToISO(endsAt),
        order_index: orderIndex || undefined,
        google_meet_link: googleMeetLink || undefined,
        google_calendar_event_id: googleCalendarEventId || undefined,
        auto_create_meet: autoCreateMeet || undefined,
      };

      console.log('Guardando sesión:', {
        ...sessionData,
        content_html_length: sessionData.content_html?.length || 0,
      });

      // Timeout de 30 segundos
      const savePromise = onSave(sessionData);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout: La operación tomó demasiado tiempo (30s)')),
          30000
        )
      );

      await Promise.race([savePromise, timeoutPromise]);
      console.log('Sesión guardada exitosamente');
      // El modal se cierra desde handleSaveSession después de actualizar el estado
    } catch (error: any) {
      console.error('❌ Error saving session (catch):', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error stack:', error?.stack);

      let errorMessage = 'Error desconocido al guardar';

      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      } else if (error?.supabaseError) {
        errorMessage = error.supabaseError.message || 'Error de Supabase';
      }

      alert(`Error al guardar la sesión: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{session ? 'Editar Sesión' : 'Nueva Sesión'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título de la Sesión *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Sesión 1: Introducción a..."
              />
            </div>

            {/* Unidad y Tipo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidad (opcional)
                </label>
                <select
                  value={unitId || ''}
                  onChange={(e) => setUnitId(e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin unidad</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      Unidad {unit.number}: {unit.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Sesión
                </label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lecture">Clase teórica</option>
                  <option value="practice">Práctica</option>
                  <option value="lab">Laboratorio</option>
                  <option value="exam">Examen</option>
                  <option value="discussion">Discusión</option>
                  <option value="workshop">Taller</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha/Hora de Inicio
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha/Hora de Fin
                </label>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Descripción breve */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción breve
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Resumen corto de la sesión..."
              />
            </div>

            {/* Contenido rico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenido Didáctico
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Puedes agregar imágenes, videos, formato, listas, etc.
              </p>
              <div
                className="border border-gray-300 rounded-md overflow-hidden"
                style={{ minHeight: '500px' }}
              >
                <RichTextEditor
                  value={contentHtml}
                  onChange={setContentHtml}
                  placeholder="Escribe el contenido didáctico de la sesión aquí..."
                  onUploadImage={handleUploadEditorImage}
                />
              </div>
              {contentUploadMessage && (
                <p className="text-xs text-gray-500 mt-1">{contentUploadMessage}</p>
              )}
            </div>

            {/* Objetivos de aprendizaje */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objetivos de Aprendizaje
              </label>
              <div className="space-y-2 mb-2">
                {learningObjectives.map((obj, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <span className="flex-1">{obj}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveObjective(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), handleAddObjective())
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Agregar objetivo..."
                />
                <Button type="button" onClick={handleAddObjective} variant="secondary">
                  Agregar
                </Button>
              </div>
            </div>

            {/* Duración y Orden */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={durationMinutes || ''}
                  onChange={(e) =>
                    setDurationMinutes(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                <input
                  type="number"
                  min="1"
                  value={orderIndex || ''}
                  onChange={(e) =>
                    setOrderIndex(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Videos de la Sesión */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Videos de la Sesión</h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">
                  📺 Agregar Video a la Sesión
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Título del Video *
                    </label>
                    <input
                      type="text"
                      value={newVideoTitle}
                      onChange={(e) => setNewVideoTitle(e.target.value)}
                      placeholder="Ej: Introducción a React"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      URL del Video (YouTube o Vimeo) *
                    </label>
                    <input
                      type="url"
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Soporta videos de YouTube y Vimeo. La transcripción se extraerá
                      automáticamente.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddVideo}
                    disabled={
                      addingVideo || !newVideoUrl.trim() || !newVideoTitle.trim() || !session
                    }
                    size="sm"
                  >
                    {addingVideo ? 'Agregando...' : '📺 Agregar Video'}
                  </Button>
                </div>
              </div>

              {/* Lista de videos existentes */}
              {loadingMaterials ? (
                <div className="text-center py-4 text-sm text-gray-500">Cargando videos...</div>
              ) : sessionMaterials.filter((m) => m.kind === 'video').length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
                  No hay videos agregados a esta sesión
                </div>
              ) : (
                <div className="space-y-3">
                  {sessionMaterials
                    .filter((m) => m.kind === 'video')
                    .map((material) => {
                      const transcriptService = new VideoTranscriptService();
                      const platform =
                        material.video_platform ||
                        transcriptService.detectPlatform(material.url || '')?.name ||
                        'other';
                      const videoId =
                        material.video_id ||
                        transcriptService
                          .detectPlatform(material.url || '')
                          ?.extractId(material.url || '') ||
                        undefined;
                      const status =
                        transcriptionStatuses[material.id] ||
                        material.transcription_status ||
                        'pending';

                      return (
                        <div
                          key={material.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800">{material.title}</h4>
                              {material.url && (
                                <p className="text-xs text-blue-600 mt-1 break-all">
                                  {material.url}
                                </p>
                              )}
                              <div className="mt-2">
                                {status === 'completed' && (
                                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                    ✓ Transcripción disponible
                                  </span>
                                )}
                                {status === 'processing' && (
                                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                    ⏳ Extrayendo transcripción...
                                  </span>
                                )}
                                {status === 'failed' && (
                                  <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                    ✗ Transcripción no disponible
                                  </span>
                                )}
                                {status === 'pending' && (
                                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                                    ⏸ Sin transcripción
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteVideo(material.id)}
                            >
                              Eliminar
                            </Button>
                          </div>

                          {/* Preview del video */}
                          {material.url && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <h5 className="text-xs font-semibold text-gray-700 mb-2">
                                Vista Previa:
                              </h5>
                              <VideoPlayer
                                materialId={material.id}
                                url={material.url}
                                platform={platform as 'youtube' | 'vimeo' | 'other'}
                                videoId={videoId}
                                title={material.title}
                                showProgress={false}
                                transcription={material.transcription}
                                transcriptionStatus={material.transcription_status}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Videollamada Google Meet */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Videollamada Sincrónica (Google Meet)
              </h3>

              <div className="space-y-4">
                {/* Estado de conexión de Google */}
                {checkingConnection ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Verificando conexión con Google...
                  </div>
                ) : !hasConnectedGoogle ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      ⚠️ Cuenta de Google Calendar no conectada
                    </p>
                    <p className="text-xs text-yellow-700 mb-3">
                      Necesitas conectar tu cuenta de Google Calendar para crear videollamadas
                      automáticamente.
                    </p>
                    <Button type="button" variant="secondary" onClick={handleConnectGoogle}>
                      Conectar con Google Calendar
                    </Button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm font-medium text-green-800">
                          Cuenta de Google Calendar conectada
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (user?.id && confirm('¿Desconectar tu cuenta de Google Calendar?')) {
                            try {
                              await googleOAuthService.disconnectAccount(user.id);
                              setHasConnectedGoogle(false);
                              setGoogleMeetLink('');
                              setGoogleCalendarEventId(undefined);
                            } catch (error) {
                              alert('Error al desconectar la cuenta');
                            }
                          }
                        }}
                      >
                        Desconectar
                      </Button>
                    </div>
                  </div>
                )}

                {hasConnectedGoogle && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoCreateMeet"
                      checked={autoCreateMeet}
                      onChange={(e) => setAutoCreateMeet(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoCreateMeet" className="ml-2 block text-sm text-gray-700">
                      Crear videollamada automáticamente al guardar (requiere fecha/hora
                      configuradas)
                    </label>
                  </div>
                )}

                {googleMeetLink && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800 mb-2">
                      ✓ Videollamada configurada
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={googleMeetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        {googleMeetLink}
                      </a>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(googleMeetLink);
                          alert('Enlace copiado al portapapeles');
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCreateMeet}
                    disabled={creatingMeet || !startsAt || !endsAt}
                  >
                    {creatingMeet
                      ? 'Creando...'
                      : googleCalendarEventId
                        ? 'Actualizar Videollamada'
                        : 'Crear Videollamada'}
                  </Button>
                  {googleMeetLink && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setGoogleMeetLink('');
                        setGoogleCalendarEventId(undefined);
                      }}
                    >
                      Eliminar Videollamada
                    </Button>
                  )}
                </div>

                {(!startsAt || !endsAt) && (
                  <p className="text-xs text-gray-500">
                    ⚠️ Para crear una videollamada, necesitas configurar la fecha y hora de inicio y
                    fin de la sesión.
                  </p>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" onClick={onClose} variant="secondary" disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !title}>
                {loading ? 'Guardando...' : 'Guardar Sesión'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};
