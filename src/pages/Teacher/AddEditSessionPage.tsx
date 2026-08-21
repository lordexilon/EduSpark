import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { CourseSession, SessionBlock, Activity, ActivityType } from '@/types';
import { getSessionById, createSession, updateSession } from '@/services/courseService';
import { SESSIONS_DATA } from '@/constants';
import { IconPlusCircle, IconTrash, IconPencil } from '@/components/Common/Icons';

const AddEditSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(sessionId);

  const [sessionNumber, setSessionNumber] = useState<number>(SESSIONS_DATA.length + 1);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [objective, setObjective] = useState('');
  const [googleMeetLink, setGoogleMeetLink] = useState('');
  const [blocks, setBlocks] = useState<SessionBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && sessionId) {
      setIsLoading(true);
      getSessionById(sessionId)
        .then((session) => {
          if (session) {
            setSessionNumber(session.number);
            setTitle(session.title);
            setDate(session.date);
            setObjective(session.objective);
            setGoogleMeetLink(session.googleMeetLink || '');
            setBlocks(session.blocks || []); // Initialize blocks
          } else {
            setError('Sesión no encontrada.');
          }
        })
        .catch(() => setError('Error al cargar la sesión.'))
        .finally(() => setIsLoading(false));
    } else {
      setSessionNumber(SESSIONS_DATA.length + 1); // For new session
      setBlocks([]); // Start with no blocks for a new session
    }
  }, [sessionId, isEditing]);

  // Block Handlers
  const handleAddBlock = () => {
    setBlocks([...blocks, { timeRange: '', title: '', activities: [] }]);
  };

  const handleBlockChange = (
    index: number,
    field: keyof SessionBlock,
    value: string | Activity[]
  ) => {
    const updatedBlocks = [...blocks];
    // Type assertion needed because field can be 'activities'
    (updatedBlocks[index] as any)[field] = value;
    setBlocks(updatedBlocks);
  };

  const handleDeleteBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  // Activity Handlers
  const handleAddActivity = (blockIndex: number) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].activities.push({
      type: ActivityType.NONE,
      title: '',
      description: '',
      details: [],
    });
    setBlocks(updatedBlocks);
  };

  const handleActivityChange = (
    blockIndex: number,
    activityIndex: number,
    field: keyof Activity,
    value: string | ActivityType | string[]
  ) => {
    const updatedBlocks = [...blocks];
    // Type assertion for specific fields
    if (field === 'details' && typeof value === 'string') {
      (updatedBlocks[blockIndex].activities[activityIndex] as any)[field] = value.split('\n');
    } else {
      (updatedBlocks[blockIndex].activities[activityIndex] as any)[field] = value;
    }
    setBlocks(updatedBlocks);
  };

  const handleDeleteActivity = (blockIndex: number, activityIndex: number) => {
    const updatedBlocks = [...blocks];
    updatedBlocks[blockIndex].activities = updatedBlocks[blockIndex].activities.filter(
      (_, i) => i !== activityIndex
    );
    setBlocks(updatedBlocks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const sessionData: Omit<CourseSession, 'id'> = {
      // Adjusted type for create/update
      number: Number(sessionNumber),
      title,
      date,
      objective,
      googleMeetLink: googleMeetLink || undefined,
      blocks, // Include blocks in the submission
    };

    try {
      if (isEditing && sessionId) {
        await updateSession(sessionId, sessionData); // updateSession takes Partial<CourseSession>
        // TODO: Obtener courseId de la sesión para navegar a /sessions?courseId=X
        navigate('/my/courses');
      } else {
        // createSession needs to be adapted if it doesn't expect full CourseSession minus id
        await createSession(sessionData as CourseSession); // Casting as full session, ensure createSession handles it
        // TODO: Obtener courseId del contexto para navegar a /sessions?courseId=X
        navigate('/my/courses');
      }
    } catch (err) {
      setError(isEditing ? 'Error al actualizar la sesión.' : 'Error al crear la sesión.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm';
  const smallButtonClass = 'p-1 text-slate-500 hover:text-slate-700';

  if (isLoading && isEditing)
    return <p className="text-center p-6">Cargando datos de la sesión...</p>;
  if (error && !isLoading) return <p className="text-center p-6 text-red-500">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <h1 className="text-3xl font-bold text-slate-800 mb-6">
          {isEditing ? 'Editar Sesión y Contenido' : 'Añadir Nueva Sesión y Contenido'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Metadata Fields */}
          <fieldset className="border border-slate-300 p-4 rounded-md">
            <legend className="text-lg font-semibold text-sky-700 px-2">
              Datos Generales de la Sesión
            </legend>
            <div className="space-y-4 mt-2">
              <div>
                <label htmlFor="sessionNumber" className="block text-sm font-medium text-slate-700">
                  Número de Sesión
                </label>
                <input
                  type="number"
                  id="sessionNumber"
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(parseInt(e.target.value, 10))}
                  required
                  className={inputClass}
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700">
                  Título
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-700">
                  Fecha (ej. Lunes, 23/06/25)
                </label>
                <input
                  type="text"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Ej: Lunes, 23/06/25"
                />
              </div>
              <div>
                <label htmlFor="objective" className="block text-sm font-medium text-slate-700">
                  Objetivo
                </label>
                <textarea
                  id="objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  required
                  rows={3}
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="googleMeetLink"
                  className="block text-sm font-medium text-slate-700"
                >
                  Enlace de Google Meet (Opcional)
                </label>
                <input
                  type="url"
                  id="googleMeetLink"
                  value={googleMeetLink}
                  onChange={(e) => setGoogleMeetLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          {/* Blocks and Activities Management */}
          <fieldset className="border border-slate-300 p-4 rounded-md">
            <legend className="text-lg font-semibold text-sky-700 px-2">
              Contenido de la Sesión (Bloques y Actividades)
            </legend>
            {blocks.map((block, blockIndex) => (
              <Card key={blockIndex} className="mb-6 bg-slate-50 p-4 relative group">
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(blockIndex)}
                  className={`absolute top-2 right-2 ${smallButtonClass} opacity-50 group-hover:opacity-100 transition-opacity`}
                  title="Eliminar Bloque"
                >
                  {' '}
                  <IconTrash className="w-5 h-5 text-red-500" />{' '}
                </button>
                <h3 className="text-md font-semibold text-slate-700 mb-1">
                  Bloque {blockIndex + 1}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label
                      htmlFor={`blockTimeRange-${blockIndex}`}
                      className="block text-xs font-medium text-slate-600"
                    >
                      Intervalo de Tiempo
                    </label>
                    <input
                      type="text"
                      id={`blockTimeRange-${blockIndex}`}
                      value={block.timeRange}
                      onChange={(e) => handleBlockChange(blockIndex, 'timeRange', e.target.value)}
                      className={inputClass + ' text-sm'}
                      placeholder="Ej: (0-20 min)"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`blockTitle-${blockIndex}`}
                      className="block text-xs font-medium text-slate-600"
                    >
                      Título del Bloque
                    </label>
                    <input
                      type="text"
                      id={`blockTitle-${blockIndex}`}
                      value={block.title}
                      onChange={(e) => handleBlockChange(blockIndex, 'title', e.target.value)}
                      className={inputClass + ' text-sm'}
                    />
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-slate-600 mb-2 mt-4">
                  Actividades del Bloque:
                </h4>
                {block.activities.map((activity, activityIndex) => (
                  <div
                    key={activityIndex}
                    className="border border-slate-200 p-3 rounded-md mb-3 bg-white relative group/activity"
                  >
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(blockIndex, activityIndex)}
                      className={`absolute top-1 right-1 ${smallButtonClass} opacity-30 group-hover/activity:opacity-100 transition-opacity`}
                      title="Eliminar Actividad"
                    >
                      {' '}
                      <IconTrash className="w-4 h-4 text-red-400" />{' '}
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <label
                          htmlFor={`actType-${blockIndex}-${activityIndex}`}
                          className="block text-xs font-medium text-slate-500"
                        >
                          Tipo
                        </label>
                        <select
                          id={`actType-${blockIndex}-${activityIndex}`}
                          value={activity.type}
                          onChange={(e) =>
                            handleActivityChange(
                              blockIndex,
                              activityIndex,
                              'type',
                              e.target.value as ActivityType
                            )
                          }
                          className={inputClass + ' text-xs py-1.5'}
                        >
                          {Object.values(ActivityType).map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={`actTitle-${blockIndex}-${activityIndex}`}
                          className="block text-xs font-medium text-slate-500"
                        >
                          Título Actividad
                        </label>
                        <input
                          type="text"
                          id={`actTitle-${blockIndex}-${activityIndex}`}
                          value={activity.title}
                          onChange={(e) =>
                            handleActivityChange(blockIndex, activityIndex, 'title', e.target.value)
                          }
                          className={inputClass + ' text-xs py-1.5'}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          htmlFor={`actDesc-${blockIndex}-${activityIndex}`}
                          className="block text-xs font-medium text-slate-500"
                        >
                          Descripción (Opcional)
                        </label>
                        <textarea
                          id={`actDesc-${blockIndex}-${activityIndex}`}
                          value={activity.description || ''}
                          onChange={(e) =>
                            handleActivityChange(
                              blockIndex,
                              activityIndex,
                              'description',
                              e.target.value
                            )
                          }
                          rows={2}
                          className={inputClass + ' text-xs py-1.5'}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          htmlFor={`actDetails-${blockIndex}-${activityIndex}`}
                          className="block text-xs font-medium text-slate-500"
                        >
                          Detalles (Opcional, 1 por línea)
                        </label>
                        <textarea
                          id={`actDetails-${blockIndex}-${activityIndex}`}
                          value={(activity.details || []).join('\n')}
                          onChange={(e) =>
                            handleActivityChange(
                              blockIndex,
                              activityIndex,
                              'details',
                              e.target.value
                            )
                          }
                          rows={2}
                          className={inputClass + ' text-xs py-1.5'}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddActivity(blockIndex)}
                  leftIcon={<IconPlusCircle className="w-4 h-4" />}
                  className="mt-2"
                >
                  Añadir Actividad
                </Button>
              </Card>
            ))}
            <Button
              type="button"
              variant="primary"
              onClick={handleAddBlock}
              leftIcon={<IconPlusCircle className="w-5 h-5" />}
              className="mt-4"
            >
              Añadir Nuevo Bloque
            </Button>
          </fieldset>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/my/courses')}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading
                ? isEditing
                  ? 'Actualizando...'
                  : 'Creando...'
                : isEditing
                  ? 'Guardar Cambios'
                  : 'Crear Sesión'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddEditSessionPage;
