import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { courseService, Course } from '@/services/teacherCourses';
import { careerService, subjectService, Career, Subject } from '@/services/academicService';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { uploadCourseMedia } from '@/services/storageService';
import {
  IconX,
  IconZoomIn,
  IconZoomOut,
  IconMaximize,
  IconMinimize,
  IconSparkles,
} from '@/components/Common/Icons';
import AICourseWizard from '@/components/Features/course-wizard/AICourseWizard';

const CreateCoursePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [loadingCourse, setLoadingCourse] = useState(isEditing);
  const [careers, setCareers] = useState<Career[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    status: 'draft' as 'draft' | 'active',
    // Campos académicos (opcionales)
    career_id: '',
    subject_id: '',
    academic_period: '',
    start_date: '',
    end_date: '',
    max_students: '',
  });
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailUploadInfo, setThumbnailUploadInfo] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(100);
  const [imageExpanded, setImageExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    loadAcademicData();
    if (isEditing && id && user?.id) {
      loadCourse(parseInt(id));
    }

    // Si viene desde SubjectsPage con un subjectId, precargarlo
    const subjectIdParam = searchParams.get('subjectId');
    if (subjectIdParam && !isEditing) {
      const subjectId = parseInt(subjectIdParam);
      // Cargar la materia para obtener su carrera
      subjectService
        .getSubject(subjectId)
        .then((subject) => {
          if (subject) {
            setFormData((prev) => ({
              ...prev,
              subject_id: subjectId.toString(),
              career_id: subject.career_id?.toString() || '',
            }));
          }
        })
        .catch((err) => console.error('Error loading subject:', err));
    }
  }, [id, isEditing, searchParams, user?.id]);

  useEffect(() => {
    return () => {
      uploadAbortController.current?.abort();
    };
  }, []);

  const loadAcademicData = async () => {
    try {
      const [careersData, subjectsData] = await Promise.all([
        careerService.getActiveCareers(),
        subjectService.getAllSubjects(),
      ]);
      setCareers(careersData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading academic data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadCourse = async (courseId: number) => {
    try {
      setLoadingCourse(true);
      let course: Course | null = null;

      try {
        course = await courseService.getCourse(courseId);
      } catch (error: any) {
        console.error('Error loading course:', error);
        const isAdmin =
          user?.role?.name === 'admin' ||
          user?.role?.name === 'coordinator' ||
          user?.role?.name === 'admin-campus';
        if (isAdmin) {
          try {
            const { data, error: supabaseError } = await supabase
              .from('courses')
              .select('*')
              .eq('id', courseId)
              .maybeSingle();

            if (!supabaseError && data) {
              course = data as Course;
            }
          } catch (e) {}
        }
      }

      if (course) {
        setFormData({
          title: course.title,
          code: course.code || '',
          description: course.description || '',
          status: course.status as 'active' | 'draft',
          career_id: '',
          subject_id: course.subject_id?.toString() || '',
          academic_period: course.academic_period || '',
          start_date: course.start_date || '',
          end_date: course.end_date || '',
          max_students: course.max_students?.toString() || '',
        });
        setThumbnailUrl((course as any).thumbnail_url || '');

        if (course.subject_id) {
          try {
            const subject = await subjectService.getSubject(course.subject_id);
            if (subject?.career_id) {
              setFormData((prev) => ({ ...prev, career_id: subject.career_id.toString() }));
            }
          } catch (err) {
            console.error('Error loading subject:', err);
          }
        }
      } else {
        alert('Curso no encontrado.');
        navigate('/teacher/courses');
      }
    } catch (error) {
      console.error('Error loading course:', error);
      navigate('/teacher/courses');
    } finally {
      setLoadingCourse(false);
    }
  };

  const filteredSubjects = formData.career_id
    ? subjects.filter((s) => s.career_id === parseInt(formData.career_id))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setLoading(true);
      let institutionId: number | undefined = undefined;

      if (formData.subject_id) {
        const subject = await subjectService.getSubject(parseInt(formData.subject_id));
        if (subject?.institution_id) institutionId = subject.institution_id;
      }

      if (!institutionId && formData.career_id) {
        const career = await careerService.getCareer(parseInt(formData.career_id));
        if (career?.institution_id) institutionId = career.institution_id;
      }

      const courseData = {
        title: formData.title,
        code: formData.code || undefined,
        description: formData.description || undefined,
        teacher_id: user.id,
        status: formData.status,
        subject_id: formData.subject_id ? parseInt(formData.subject_id) : undefined,
        academic_period: formData.academic_period || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        max_students: formData.max_students ? parseInt(formData.max_students) : undefined,
        institution_id: institutionId,
        thumbnail_url: thumbnailUrl || null,
      };

      if (isEditing && id) {
        await courseService.updateCourse(parseInt(id), courseData);
        alert('Curso actualizado exitosamente');
        navigate(`/teacher/courses/${id}`);
      } else {
        const newCourse = await courseService.createCourse(courseData);
        alert('Curso creado exitosamente');
        navigate(`/teacher/courses/${newCourse.id}`);
      }
    } catch (error: any) {
      console.error('Error saving course:', error);
      alert('Error al guardar el curso.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectThumbnailFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen.');
      return;
    }

    try {
      uploadAbortController.current?.abort();
      const controller = new AbortController();
      uploadAbortController.current = controller;

      setUploadingThumbnail(true);
      setThumbnailUploadInfo('Optimizando y subiendo imagen...');

      const result = await uploadCourseMedia(
        isEditing && id ? id : 'temp',
        file,
        'course-thumbnails',
        {
          maxWidth: 2000,
          maxHeight: 2000,
          quality: 0.85,
          format: 'image/webp',
          signal: controller.signal,
        }
      );

      if (!result.success || !result.url) {
        throw new Error(result.error || 'No se pudo subir la imagen.');
      }

      setThumbnailUrl(result.url);
      setThumbnailUploadInfo(result.optimization ?? 'Imagen subida correctamente');
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      alert('Error al subir la imagen.');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  if (loadingCourse) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">
            {isEditing ? 'Editar Curso' : 'Crear Nuevo Curso'}
          </h1>
          <p className="text-text-light">
            {isEditing
              ? 'Modifica la información del curso'
              : 'Completa la información básica para crear tu curso'}
          </p>
        </div>
        {!isEditing && (
          <Button
            variant={showAIWizard ? 'secondary' : 'primary'}
            onClick={() => setShowAIWizard(!showAIWizard)}
            className="shadow-lg shadow-indigo-100"
          >
            {showAIWizard ? 'Volver a Manual' : 'Crear con IA ✨'}
          </Button>
        )}
      </div>

      {showAIWizard && !isEditing ? (
        <AICourseWizard />
      ) : (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Título del Curso *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Código del Curso
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">Descripción</label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Estado del Curso
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input-field"
              >
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
              </select>
            </div>

            <div className="pt-6 border-t border-border">
              <h3 className="text-lg font-semibold text-text-dark mb-4">
                Información Académica (Opcional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">Carrera</label>
                  <select
                    name="career_id"
                    value={formData.career_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        career_id: e.target.value,
                        subject_id: '',
                      }))
                    }
                    className="input-field"
                  >
                    <option value="">Seleccionar carrera</option>
                    {careers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">Materia</label>
                  <select
                    name="subject_id"
                    value={formData.subject_id}
                    onChange={handleChange}
                    className="input-field"
                    disabled={!formData.career_id}
                  >
                    <option value="">Seleccionar materia</option>
                    {filteredSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Período Académico
                  </label>
                  <input
                    type="text"
                    name="academic_period"
                    value={formData.academic_period}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Máximo de Estudiantes
                  </label>
                  <input
                    type="number"
                    name="max_students"
                    value={formData.max_students}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <h3 className="text-lg font-semibold text-text-dark mb-4">Imagen del Curso</h3>
              {thumbnailUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setImageZoom(Math.max(imageZoom - 25, 50))}
                    >
                      <IconZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">{imageZoom}%</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setImageZoom(Math.min(imageZoom + 25, 300))}
                    >
                      <IconZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setImageExpanded(!imageExpanded)}
                    >
                      {imageExpanded ? (
                        <IconMinimize className="w-4 h-4" />
                      ) : (
                        <IconMaximize className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div
                    className={`border rounded-lg bg-gray-50 flex justify-center items-center overflow-auto ${imageExpanded ? 'h-96' : 'h-48'}`}
                  >
                    <img
                      src={thumbnailUrl}
                      alt="Preview"
                      style={{ transform: `scale(${imageZoom / 100})`, maxWidth: '100%' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSelectThumbnailFile}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingThumbnail}
                    >
                      Cambiar Imagen
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setThumbnailUrl('')}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSelectThumbnailFile}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-600">Haz clic para subir una imagen de portada</p>
                </div>
              )}
              {thumbnailUploadInfo && (
                <p className="text-xs text-blue-600 mt-2">{thumbnailUploadInfo}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/teacher/courses')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !formData.title.trim()}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default CreateCoursePage;
