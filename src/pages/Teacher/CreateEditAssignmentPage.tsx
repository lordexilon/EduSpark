// pages/CreateEditAssignmentPage.tsx
// Página para crear y editar tareas

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { assignmentService, Assignment } from '@/services/assignments';
import {
  courseService,
  Course,
  unitService,
  sessionService,
  CourseUnit,
  Session,
} from '@/services/teacherCourses';
import { uploadCourseDocument } from '@/services/storageService';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { RichTextEditor } from '@/components/RichTextEditor';
import { IconUpload, IconX, IconFileText } from '@/components/Common/Icons';

export const CreateEditAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    course_id: '',
    unit_id: '',
    session_id: '',
    title: '',
    description: '',
    max_points: '100',
    due_at: '',
  });
  const [attachments, setAttachments] = useState<
    Array<{ name: string; url: string; size?: number; path?: string }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCourses();
    if (isEditing && id) {
      loadAssignment(id);
    } else {
      // Si viene desde TeacherAssignmentsPage con un courseId, precargarlo
      const courseIdParam = searchParams.get('course');
      if (courseIdParam) {
        setFormData((prev) => ({ ...prev, course_id: courseIdParam }));
        loadUnitsAndSessions(parseInt(courseIdParam));
      }
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (formData.course_id) {
      loadUnitsAndSessions(parseInt(formData.course_id));
    } else {
      setUnits([]);
      setSessions([]);
      setFormData((prev) => ({ ...prev, unit_id: '', session_id: '' }));
    }
  }, [formData.course_id]);

  const loadCourses = async () => {
    try {
      if (user?.id) {
        const data = await courseService.getMyCourses(user.id);
        setCourses(data);
      }
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Error al cargar los cursos');
    }
  };

  const loadUnitsAndSessions = async (courseId: number) => {
    try {
      const [unitsData, sessionsData] = await Promise.all([
        unitService.getCourseUnits(courseId),
        sessionService.getCourseSessions(courseId),
      ]);
      setUnits(unitsData);
      setSessions(sessionsData);
    } catch (err) {
      console.error('Error loading units and sessions:', err);
    }
  };

  const loadAssignment = async (assignmentId: string) => {
    try {
      setLoadingData(true);
      const assignment = await assignmentService.getAssignment(assignmentId);

      if (!assignment) {
        setError('Tarea no encontrada');
        return;
      }

      setFormData({
        course_id: assignment.course_id.toString(),
        unit_id: assignment.unit_id || '',
        session_id: assignment.session_id || '',
        title: assignment.title,
        description: assignment.description || '',
        max_points: assignment.max_points.toString(),
        due_at: assignment.due_at ? new Date(assignment.due_at).toISOString().slice(0, 16) : '',
      });

      // Cargar attachments si existen
      if (assignment.attachments && Array.isArray(assignment.attachments)) {
        setAttachments(
          assignment.attachments.map((att: any) => ({
            name: att.name || att.filename || 'Archivo',
            url: att.url || att.path || '',
            size: att.size,
            path: att.path,
          }))
        );
      }

      // Cargar unidades y sesiones del curso
      await loadUnitsAndSessions(assignment.course_id);
    } catch (err) {
      console.error('Error loading assignment:', err);
      setError('Error al cargar la tarea');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('📝 Creando/Actualizando tarea con datos:', formData);

      const assignmentData: Omit<Assignment, 'id' | 'created_at'> = {
        course_id: parseInt(formData.course_id),
        unit_id: formData.unit_id && formData.unit_id.trim() !== '' ? formData.unit_id : undefined,
        session_id:
          formData.session_id && formData.session_id.trim() !== ''
            ? formData.session_id
            : undefined,
        title: formData.title.trim(),
        description:
          formData.description && formData.description.trim() !== ''
            ? formData.description.trim()
            : undefined,
        max_points: parseInt(formData.max_points),
        due_at: formData.due_at && formData.due_at.trim() !== '' ? formData.due_at : undefined,
        attachments: attachments.length > 0 ? attachments : [],
      };

      console.log('📦 Datos de tarea a enviar:', assignmentData);

      let result;
      if (isEditing && id) {
        console.log('🔄 Actualizando tarea:', id);
        result = await assignmentService.updateAssignment(id, assignmentData);
        console.log('✅ Tarea actualizada:', result);
      } else {
        console.log('➕ Creando nueva tarea');
        result = await assignmentService.createAssignment(assignmentData);
        console.log('✅ Tarea creada:', result);
      }

      console.log('🚀 Navegando a /teacher/assignments');
      navigate('/teacher/assignments');
    } catch (err: any) {
      console.error('❌ Error saving assignment:', err);
      console.error('❌ Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint,
        fullError: err,
      });
      setError(
        err.message ||
          err.details ||
          'Error al guardar la tarea. Por favor, revisa los datos e inténtalo de nuevo.'
      );
    } finally {
      console.log('🏁 Finalizando handleSubmit, reseteando loading');
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !formData.course_id) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const file = files[0];
      const result = await uploadCourseDocument(formData.course_id, file, {
        folder: 'assignments',
      });

      if (result.success && result.url) {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: result.url!,
            size: file.size,
            path: result.path,
          },
        ]);
      } else {
        setError(result.error || 'Error al subir el archivo');
      }
    } catch (err: any) {
      setError(err.message || 'Error al subir el archivo');
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
      // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditing
              ? 'Modifica los detalles de la tarea'
              : 'Crea una nueva tarea para tus estudiantes'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Curso */}
          <div>
            <label htmlFor="course_id" className="block text-sm font-medium text-gray-700 mb-1">
              Curso <span className="text-red-500">*</span>
            </label>
            <select
              id="course_id"
              name="course_id"
              value={formData.course_id}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecciona un curso</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Unidad (Opcional) */}
          {formData.course_id && units.length > 0 && (
            <div>
              <label htmlFor="unit_id" className="block text-sm font-medium text-gray-700 mb-1">
                Unidad (Opcional)
              </label>
              <select
                id="unit_id"
                name="unit_id"
                value={formData.unit_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin unidad específica</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.number}. {unit.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sesión (Opcional) */}
          {formData.course_id && sessions.length > 0 && (
            <div>
              <label htmlFor="session_id" className="block text-sm font-medium text-gray-700 mb-1">
                Sesión (Opcional)
              </label>
              <select
                id="session_id"
                name="session_id"
                value={formData.session_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin sesión específica</option>
                {sessions
                  .filter((session) => !formData.unit_id || session.unit_id === formData.unit_id)
                  .map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Título */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Tarea 1 - Introducción al Álgebra"
            />
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
              placeholder="Describe los requisitos y objetivos de la tarea. Puedes agregar imágenes, formatear el texto, crear listas, etc."
            />
            <p className="mt-2 text-sm text-gray-500">
              Usa el editor para formatear el texto, agregar imágenes, crear listas y más.
            </p>
          </div>

          {/* Archivos Adjuntos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivos Adjuntos
            </label>
            <div className="space-y-3">
              {/* Input de archivo */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods"
                  onChange={handleFileSelect}
                  disabled={uploading || !formData.course_id}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    uploading || !formData.course_id
                      ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <IconUpload
                    className={`w-5 h-5 ${uploading || !formData.course_id ? 'text-gray-400' : 'text-gray-600'}`}
                  />
                  <span
                    className={`text-sm font-medium ${uploading || !formData.course_id ? 'text-gray-400' : 'text-gray-700'}`}
                  >
                    {uploading
                      ? 'Subiendo archivo...'
                      : formData.course_id
                        ? 'Seleccionar archivo para subir'
                        : 'Selecciona un curso primero'}
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Formatos permitidos: PDF, Word, Excel, PowerPoint, texto. Tamaño máximo: 35MB
                </p>
              </div>

              {/* Lista de archivos adjuntos */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <IconFileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {attachment.name}
                          </p>
                          {attachment.size && (
                            <p className="text-xs text-gray-500">
                              {(attachment.size / 1024).toFixed(2)} KB
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {attachment.url && (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Ver
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Eliminar archivo"
                        >
                          <IconX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Puntaje Máximo */}
          <div>
            <label htmlFor="max_points" className="block text-sm font-medium text-gray-700 mb-1">
              Puntaje Máximo <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="max_points"
              name="max_points"
              value={formData.max_points}
              onChange={handleChange}
              required
              min="1"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fecha de Entrega */}
          <div>
            <label htmlFor="due_at" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Entrega (Opcional)
            </label>
            <input
              type="datetime-local"
              id="due_at"
              name="due_at"
              value={formData.due_at}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Si no se especifica, la tarea no tendrá fecha límite
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/teacher/assignments')}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEditing ? 'Actualizar Tarea' : 'Crear Tarea'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
