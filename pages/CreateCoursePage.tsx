import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { courseService } from '../services/teacherCourses';
import Card from '../components/Card';
import Button from '../components/Button';

const CreateCoursePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    status: 'draft' as 'draft' | 'active'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const newCourse = await courseService.createCourse({
        title: formData.title,
        code: formData.code || undefined,
        description: formData.description || undefined,
        teacher_id: user.id,
        status: formData.status
      });
      
      // Redirigir al editor del curso recién creado
      navigate(`/teacher/courses/${newCourse.id}`);
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Error al crear el curso. Por favor, intenta de nuevo.');
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-dark">Crear Nuevo Curso</h1>
        <p className="text-text-light">Completa la información básica para crear tu curso</p>
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
                  Creando...
                </>
              ) : (
                'Crear Curso'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateCoursePage;
