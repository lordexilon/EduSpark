import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { courseService, Course } from '../services/teacherCourses';
import { careerService, subjectService, Career, Subject } from '../services/academicService';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Button from '../components/Button';

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
    max_students: ''
  });

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
      subjectService.getSubject(subjectId).then(subject => {
        if (subject) {
          setFormData(prev => ({
            ...prev,
            subject_id: subjectId.toString(),
            career_id: subject.career_id?.toString() || ''
          }));
        }
      }).catch(err => console.error('Error loading subject:', err));
    }
  }, [id, isEditing, searchParams, user?.id]);

  const loadAcademicData = async () => {
    try {
      const [careersData, subjectsData] = await Promise.all([
        careerService.getActiveCareers(),
        subjectService.getAllSubjects()
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
        // Si es admin/coordinator, intentar acceso directo
        const isAdmin = user?.role?.name === 'admin' || user?.role?.name === 'coordinator' || user?.role?.name === 'admin-campus';
        if (isAdmin) {
          console.warn('Error cargando curso con servicio, intentando acceso directo como admin...');
          try {
            const { data, error: supabaseError } = await supabase
              .from('courses')
              .select('id, title, code, description, teacher_id, status, subject_id, academic_period, start_date, end_date, schedule, max_students, created_at, updated_at')
              .eq('id', courseId)
              .maybeSingle();
            
            if (!supabaseError && data) {
              course = data as Course;
            } else {
              console.error('Error incluso con acceso directo:', supabaseError);
              alert('No se pudo cargar el curso. Puede ser un problema de permisos.');
              navigate('/teacher/courses');
              return;
            }
          } catch (directError: any) {
            console.error('Error en acceso directo:', directError);
            alert('Error al cargar el curso. Por favor, intenta de nuevo.');
            navigate('/teacher/courses');
            return;
          }
        } else {
          alert('Error al cargar el curso. No tienes permisos para ver este curso.');
          navigate('/teacher/courses');
          return;
        }
      }

      if (course) {
        setFormData({
          title: course.title,
          code: course.code || '',
          description: course.description || '',
          status: course.status,
          career_id: '',
          subject_id: course.subject_id?.toString() || '',
          academic_period: course.academic_period || '',
          start_date: course.start_date || '',
          end_date: course.end_date || '',
          max_students: course.max_students?.toString() || ''
        });

        // Cargar carrera basada en la materia
        if (course.subject_id) {
          try {
            const subject = await subjectService.getSubject(course.subject_id);
            if (subject?.career_id) {
              setFormData(prev => ({ ...prev, career_id: subject.career_id.toString() }));
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
      alert('Error al cargar el curso.');
      navigate('/teacher/courses');
    } finally {
      setLoadingCourse(false);
    }
  };

  const filteredSubjects = formData.career_id
    ? subjects.filter(s => s.career_id === parseInt(formData.career_id))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      alert('No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Iniciando guardado de curso...', { isEditing, id, formData });

      const courseData = {
        title: formData.title,
        code: formData.code || undefined,
        description: formData.description || undefined,
        teacher_id: user.id,
        status: formData.status,
        // Campos académicos (opcionales)
        subject_id: formData.subject_id ? parseInt(formData.subject_id) : undefined,
        academic_period: formData.academic_period || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        max_students: formData.max_students ? parseInt(formData.max_students) : undefined
      };

      console.log('📦 Datos del curso a guardar:', courseData);

      if (isEditing && id) {
        console.log('✏️ Actualizando curso existente:', id);
        const updatedCourse = await courseService.updateCourse(parseInt(id), courseData);
        console.log('✅ Curso actualizado exitosamente:', updatedCourse);
        alert('Curso actualizado exitosamente');
        navigate(`/teacher/courses/${id}`);
      } else {
        console.log('➕ Creando nuevo curso');
        const newCourse = await courseService.createCourse(courseData);
        console.log('✅ Curso creado exitosamente:', newCourse);
        alert('Curso creado exitosamente');
        navigate(`/teacher/courses/${newCourse.id}`);
      }
    } catch (error: any) {
      console.error('❌ Error saving course:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      const errorMessage = error?.message || error?.details || 'Error desconocido';
      alert(isEditing 
        ? `Error al actualizar el curso: ${errorMessage}` 
        : `Error al crear el curso: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-dark">
          {isEditing ? 'Editar Curso' : 'Crear Nuevo Curso'}
        </h1>
        <p className="text-text-light">
          {isEditing ? 'Modifica la información del curso' : 'Completa la información básica para crear tu curso'}
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-text-dark mb-2">
              Título del Curso *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="input-field"
              placeholder="Ej: Introducción a la Programación"
            />
          </div>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-text-dark mb-2">
              Código del Curso
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              className="input-field"
              placeholder="Ej: PROG101"
            />
            <p className="text-xs text-text-light mt-1">Código único para identificar el curso (opcional)</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-dark mb-2">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="input-field"
              placeholder="Describe brevemente el contenido y objetivos del curso..."
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-text-dark mb-2">
              Estado del Curso
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="input-field"
            >
              <option value="draft">Borrador</option>
              <option value="active">Activo</option>
            </select>
            <p className="text-xs text-text-light mt-1">
              Los cursos en borrador no son visibles para los estudiantes
            </p>
          </div>

          {/* Sección de Información Académica (Opcional) */}
          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-text-dark mb-4">Información Académica (Opcional)</h3>
            <p className="text-xs text-text-light mb-4">
              Asocia este curso con una materia para integrarlo con la estructura académica
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="career_id" className="block text-sm font-medium text-text-dark mb-2">
                  Carrera
                </label>
                <select
                  id="career_id"
                  name="career_id"
                  value={formData.career_id}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, career_id: e.target.value, subject_id: '' }));
                  }}
                  className="input-field"
                >
                  <option value="">Seleccionar carrera (opcional)</option>
                  {careers.map(career => (
                    <option key={career.id} value={career.id}>{career.name} ({career.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="subject_id" className="block text-sm font-medium text-text-dark mb-2">
                  Materia
                </label>
                <select
                  id="subject_id"
                  name="subject_id"
                  value={formData.subject_id}
                  onChange={handleChange}
                  className="input-field"
                  disabled={!formData.career_id || filteredSubjects.length === 0}
                >
                  <option value="">
                    {!formData.career_id
                      ? 'Primero selecciona una carrera'
                      : filteredSubjects.length === 0
                        ? 'No hay materias disponibles'
                        : 'Seleccionar materia (opcional)'}
                  </option>
                  {filteredSubjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="academic_period" className="block text-sm font-medium text-text-dark mb-2">
                  Período Académico
                </label>
                <input
                  type="text"
                  id="academic_period"
                  name="academic_period"
                  value={formData.academic_period}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Ej: 2025-1, 2025-2"
                />
              </div>

              <div>
                <label htmlFor="max_students" className="block text-sm font-medium text-text-dark mb-2">
                  Máximo de Estudiantes
                </label>
                <input
                  type="number"
                  id="max_students"
                  name="max_students"
                  min="1"
                  value={formData.max_students}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Sin límite"
                />
              </div>

              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-text-dark mb-2">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-text-dark mb-2">
                  Fecha de Fin
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="input-field"
                  min={formData.start_date || undefined}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/teacher/courses')}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title.trim()}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                isEditing ? 'Guardar Cambios' : 'Crear Curso'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateCoursePage;
