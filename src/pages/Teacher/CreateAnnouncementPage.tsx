// pages/CreateAnnouncementPage.tsx
// Página para crear y editar avisos

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { announcementService, CreateAnnouncementData } from '@/services/announcementService';
import { courseService, Course } from '@/services/teacherCourses';
import { careerService } from '@/services/academicService';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import Breadcrumbs from '@/components/Common/Breadcrumbs';
import {
  IconArrowLeft,
  IconSave,
  IconAlertTriangle,
  IconBookOpen,
  IconGraduationCap,
  IconUsers,
  IconUser,
} from '@/components/Common/Icons';

const CreateAnnouncementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<'all' | 'course' | 'career' | 'role'>('all');
  const [targetCourseId, setTargetCourseId] = useState<number | undefined>();
  const [targetCareerId, setTargetCareerId] = useState<number | undefined>();
  const [targetRoleId, setTargetRoleId] = useState<number | undefined>();
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  // Options
  const [courses, setCourses] = useState<Course[]>([]);
  const [careers, setCareers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadOptions();
      if (isEditing && id) {
        loadAnnouncement(id);
      }
    }
  }, [user?.id, id, isEditing]);

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);

      // Cargar cursos del profesor
      if (user?.role?.name === 'teacher') {
        const myCourses = await courseService.getMyCourses(user.id);
        setCourses(myCourses);
      } else {
        // Para admins, cargar todos los cursos
        const { data } = await supabase.from('courses').select('id, title').order('title');
        setCourses((data as Course[]) || []);
      }

      // Cargar carreras
      try {
        const careersData = await careerService.getActiveCareers();
        setCareers(careersData.map((c) => ({ id: c.id, name: c.name })));
      } catch (err) {
        console.error('Error loading careers:', err);
        // Fallback a consulta directa
        const { data: careersData } = await supabase
          .from('careers')
          .select('id, name')
          .order('name');
        setCareers(careersData || []);
      }

      // Cargar roles
      const { data: rolesData } = await supabase.from('roles').select('id, name').order('id');
      setRoles(rolesData || []);
    } catch (err) {
      console.error('Error loading options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const loadAnnouncement = async (announcementId: string) => {
    try {
      setLoading(true);
      const myAnnouncements = await announcementService.getMyAnnouncements(user!.id);
      const announcement = myAnnouncements.find((a) => a.id === announcementId);

      if (!announcement) {
        setError('Aviso no encontrado');
        return;
      }

      setTitle(announcement.title);
      setContent(announcement.content);
      setScope(announcement.scope);
      setTargetCourseId(announcement.target_course_id);
      setTargetCareerId(announcement.target_career_id);
      setTargetRoleId(announcement.target_role_id);
      setPriority(announcement.priority);
      setIsPinned(announcement.is_pinned);
      setPublishedAt(
        announcement.published_at
          ? new Date(announcement.published_at).toISOString().slice(0, 16)
          : ''
      );
      setExpiresAt(
        announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : ''
      );
    } catch (err: any) {
      setError('Error al cargar el aviso');
      console.error('Error loading announcement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError('El título y el contenido son obligatorios');
      return;
    }

    if (scope === 'course' && !targetCourseId) {
      setError('Debes seleccionar un curso');
      return;
    }

    if (scope === 'career' && !targetCareerId) {
      setError('Debes seleccionar una carrera');
      return;
    }

    if (scope === 'role' && !targetRoleId) {
      setError('Debes seleccionar un rol');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const data: CreateAnnouncementData = {
        title: title.trim(),
        content: content.trim(),
        scope,
        target_course_id: scope === 'course' ? targetCourseId : undefined,
        target_career_id: scope === 'career' ? targetCareerId : undefined,
        target_role_id: scope === 'role' ? targetRoleId : undefined,
        priority,
        is_pinned: isPinned,
        published_at: publishedAt || new Date().toISOString(),
        expires_at: expiresAt || undefined,
      };

      if (isEditing && id) {
        await announcementService.updateAnnouncement(id, data, user!.id);
      } else {
        await announcementService.createAnnouncement(data, user!.id);
      }

      navigate(user?.role?.name === 'teacher' ? '/teacher/announcements' : '/announcements');
    } catch (err: any) {
      setError(err.message || 'Error al guardar el aviso');
      console.error('Error saving announcement:', err);
    } finally {
      setSaving(false);
    }
  };

  const getScopeLabel = () => {
    switch (scope) {
      case 'all':
        return 'Todos los usuarios';
      case 'course':
        return 'Curso específico';
      case 'career':
        return 'Carrera específica';
      case 'role':
        return 'Rol específico';
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
      <Breadcrumbs
        items={[
          {
            label: 'Dashboard',
            path: user?.role?.name === 'teacher' ? '/teacher/dashboard' : '/dashboard',
          },
          {
            label: 'Avisos',
            path: user?.role?.name === 'teacher' ? '/teacher/announcements' : '/announcements',
          },
          { label: isEditing ? 'Editar Aviso' : 'Crear Aviso' },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
          {isEditing ? 'Editar Aviso' : 'Crear Nuevo Aviso'}
        </h1>
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
          leftIcon={<IconArrowLeft className="w-5 h-5" />}
        >
          Volver
        </Button>
      </div>

      {error && (
        <Card>
          <div className="flex items-center gap-3 text-red-600">
            <IconAlertTriangle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="space-y-6">
            {/* Título */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                placeholder="Ej: Importante: Cambio de horario de clases"
                required
              />
            </div>

            {/* Contenido */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Contenido <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                placeholder="Escribe el contenido del aviso aquí..."
                required
              />
            </div>

            {/* Alcance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alcance <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setScope('all');
                    setTargetCourseId(undefined);
                    setTargetCareerId(undefined);
                    setTargetRoleId(undefined);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    scope === 'all'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <IconUsers className="w-6 h-6 mb-2 text-gray-600" />
                  <div className="font-semibold">Todos</div>
                  <div className="text-xs text-gray-600">Todos los usuarios</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScope('course');
                    setTargetCareerId(undefined);
                    setTargetRoleId(undefined);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    scope === 'course'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <IconBookOpen className="w-6 h-6 mb-2 text-gray-600" />
                  <div className="font-semibold">Curso</div>
                  <div className="text-xs text-gray-600">Curso específico</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScope('career');
                    setTargetCourseId(undefined);
                    setTargetRoleId(undefined);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    scope === 'career'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <IconGraduationCap className="w-6 h-6 mb-2 text-gray-600" />
                  <div className="font-semibold">Carrera</div>
                  <div className="text-xs text-gray-600">Carrera específica</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScope('role');
                    setTargetCourseId(undefined);
                    setTargetCareerId(undefined);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    scope === 'role'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <IconUser className="w-6 h-6 mb-2 text-gray-600" />
                  <div className="font-semibold">Rol</div>
                  <div className="text-xs text-gray-600">Rol específico</div>
                </button>
              </div>

              {/* Selector según el alcance */}
              {scope === 'course' && (
                <div className="mt-4">
                  <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Curso <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="course"
                    value={targetCourseId || ''}
                    onChange={(e) =>
                      setTargetCourseId(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                    required={scope === 'course'}
                  >
                    <option value="">Selecciona un curso</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scope === 'career' && (
                <div className="mt-4">
                  <label htmlFor="career" className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Carrera <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="career"
                    value={targetCareerId || ''}
                    onChange={(e) =>
                      setTargetCareerId(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                    required={scope === 'career'}
                  >
                    <option value="">Selecciona una carrera</option>
                    {careers.map((career) => (
                      <option key={career.id} value={career.id}>
                        {career.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scope === 'role' && (
                <div className="mt-4">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="role"
                    value={targetRoleId || ''}
                    onChange={(e) =>
                      setTargetRoleId(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                    required={scope === 'role'}
                  >
                    <option value="">Selecciona un rol</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Prioridad y opciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                >
                  <option value="low">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div className="flex items-center pt-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Fijar aviso</span>
                </label>
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="published_at"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Fecha de Publicación
                </label>
                <input
                  type="datetime-local"
                  id="published_at"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Dejar vacío para publicar ahora</p>
              </div>

              <div>
                <label
                  htmlFor="expires_at"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Fecha de Expiración
                </label>
                <input
                  type="datetime-local"
                  id="expires_at"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Opcional: el aviso dejará de mostrarse después de esta fecha
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} leftIcon={<IconSave className="w-5 h-5" />}>
                {saving ? 'Guardando...' : isEditing ? 'Actualizar Aviso' : 'Crear Aviso'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default CreateAnnouncementPage;
