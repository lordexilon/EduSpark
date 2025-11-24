// pages/SubjectsPage.tsx
// Página de gestión de materias (CRUD)

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { subjectService, Subject, careerService, Career } from '../services/academicService';
import { courseService } from '../services/teacherCourses';
import Card from '../components/Card';
import Button from '../components/Button';

const SubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [coursesCount, setCoursesCount] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<number | null>(null);
  const [highlightedSubjectId, setHighlightedSubjectId] = useState<number | null>(null);

  useEffect(() => {
    const subjectIdParam = searchParams.get('subjectId');
    if (subjectIdParam) {
      const subjectId = parseInt(subjectIdParam);
      setHighlightedSubjectId(subjectId);
    } else {
      setHighlightedSubjectId(null);
    }
    loadData();
  }, [searchParams]);

  // Scroll cuando los datos estén cargados y hay un subjectId destacado
  useEffect(() => {
    if (!loading && highlightedSubjectId) {
      setTimeout(() => {
        const element = document.getElementById(`subject-${highlightedSubjectId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [loading, highlightedSubjectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [subjectsData, careersData] = await Promise.all([
        subjectService.getAllSubjects(),
        careerService.getActiveCareers()
      ]);
      setSubjects(subjectsData);
      setCareers(careersData);

      // Cargar contador de cursos por materia
      const counts: Record<number, number> = {};
      await Promise.all(
        subjectsData.map(async (subject) => {
          try {
            const courses = await courseService.getCoursesBySubject(subject.id);
            counts[subject.id] = courses.length;
          } catch (err) {
            console.error(`Error loading courses for subject ${subject.id}:`, err);
            counts[subject.id] = 0;
          }
        })
      );
      setCoursesCount(counts);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta materia?')) return;

    try {
      await subjectService.deleteSubject(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la materia');
      console.error(err);
    }
  };

  const filteredSubjects = selectedCareer
    ? subjects.filter(s => s.career_id === selectedCareer)
    : subjects;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Materias</h1>
          <p className="text-gray-600">Administra las materias/disciplinas académicas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/teacher/courses')}>
            Ver Cursos
          </Button>
          <Button onClick={() => { setEditingSubject(null); setShowForm(true); }}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Materia
          </Button>
        </div>
      </div>

      {/* Sección explicativa */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">📖 ¿Cómo funciona?</h3>
          <div className="text-xs text-gray-700 space-y-2">
            <p>
              <strong>Materias</strong> son las disciplinas académicas (ej: "Base de Datos", "Programación I") 
              que pertenecen a una <strong>Carrera</strong> (ej: "Ingeniería en Sistemas").
            </p>
            <p>
              Desde aquí puedes <strong>crear materias</strong> y luego desde 
              <button onClick={() => navigate('/teacher/courses/new')} className="text-blue-600 hover:text-blue-800 underline mx-1">
                Crear Curso
              </button>
              puedes asociar un curso a una materia. El <strong>curso</strong> contiene el contenido 
              específico (unidades, sesiones, materiales) que los estudiantes verán.
            </p>
            <div className="mt-2 p-2 bg-white rounded border border-indigo-200">
              <p className="font-medium text-xs mb-1">Flujo recomendado:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
                <li>Crear/Gestionar Carreras (desde <button onClick={() => navigate('/admin/careers')} className="text-purple-600 hover:underline">Gestionar Carreras</button>)</li>
                <li>Crear Materias para cada carrera (esta página)</li>
                <li>Crear Cursos asociados a materias (desde <button onClick={() => navigate('/teacher/courses/new')} className="text-blue-600 hover:underline">Crear Curso</button>)</li>
                <li>Agregar contenido (unidades, sesiones, materiales) a cada curso</li>
              </ol>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={loadData} className="mt-2">
            Reintentar
          </Button>
        </div>
      )}

      <div className="flex gap-4 items-center">
        <label className="text-sm font-medium text-gray-700">Filtrar por carrera:</label>
        <select
          value={selectedCareer || ''}
          onChange={(e) => setSelectedCareer(e.target.value ? parseInt(e.target.value) : null)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las carreras</option>
          {careers.map(career => (
            <option key={career.id} value={career.id}>{career.name}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <SubjectForm
          subject={editingSubject}
          careers={careers}
          subjects={subjects}
          onClose={() => { setShowForm(false); setEditingSubject(null); }}
          onSuccess={() => { setShowForm(false); setEditingSubject(null); loadData(); }}
        />
      )}

      {filteredSubjects.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <h3 className="text-sm font-medium text-gray-900">No hay materias</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedCareer ? 'No hay materias en esta carrera.' : 'Comienza creando la primera materia.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => {
            const career = careers.find(c => c.id === subject.career_id);
            const coursesCountForSubject = coursesCount[subject.id] || 0;
            const isHighlighted = highlightedSubjectId === subject.id;
            return (
              <Card 
                key={subject.id} 
                id={`subject-${subject.id}`}
                className={`hover:shadow-lg transition-shadow ${
                  isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">Código: {subject.code}</p>
                      {career && (
                        <p className="text-xs text-gray-400 mt-1">{career.name}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      subject.is_core 
                        ? 'text-blue-600 bg-blue-100' 
                        : 'text-gray-600 bg-gray-100'
                    }`}>
                      {subject.is_core ? 'Troncal' : 'Electiva'}
                    </span>
                  </div>

                  {subject.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{subject.description}</p>
                  )}

                  <div className="text-xs text-gray-500 mb-4 space-y-1">
                    <div>Créditos: {subject.credits}</div>
                    <div>Horas/semana: {subject.hours_per_week}</div>
                    {subject.semester && <div>Semestre: {subject.semester}</div>}
                    <div>Nivel: {subject.difficulty_level}</div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="font-medium text-gray-700">
                        Cursos asociados: {coursesCountForSubject}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => { setEditingSubject(subject); setShowForm(true); }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDeleteSubject(subject.id)}
                        variant="danger"
                        className="flex-1"
                      >
                        Eliminar
                      </Button>
                    </div>
                    {coursesCountForSubject > 0 && (
                      <Button
                        onClick={() => navigate(`/teacher/courses?subjectId=${subject.id}`)}
                        variant="outline"
                        className="w-full text-sm"
                      >
                        Ver {coursesCountForSubject} {coursesCountForSubject === 1 ? 'curso' : 'cursos'}
                      </Button>
                    )}
                    <Button
                      onClick={() => navigate(`/teacher/courses/new?subjectId=${subject.id}`)}
                      variant="outline"
                      className="w-full text-sm bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                    >
                      + Crear curso para esta materia
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Componente de formulario para crear/editar materia
interface SubjectFormProps {
  subject: Subject | null;
  careers: Career[];
  subjects: Subject[];
  onClose: () => void;
  onSuccess: () => void;
}

const SubjectForm: React.FC<SubjectFormProps> = ({ subject, careers, subjects, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    career_id: subject?.career_id || null,
    name: subject?.name || '',
    code: subject?.code || '',
    description: subject?.description || '',
    credits: subject?.credits || 0,
    hours_per_week: subject?.hours_per_week || 0,
    semester: subject?.semester || null,
    prerequisite_subject_id: subject?.prerequisite_subject_id || null,
    is_core: subject?.is_core ?? true,
    difficulty_level: subject?.difficulty_level || 'intermediate',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availablePrerequisites = formData.career_id
    ? subjects.filter(s => s.career_id === formData.career_id && s.id !== subject?.id)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (subject) {
        await subjectService.updateSubject(subject.id, formData);
      } else {
        await subjectService.createSubject(formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la materia');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {subject ? 'Editar Materia' : 'Nueva Materia'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carrera *
            </label>
            <select
              required
              value={formData.career_id || ''}
              onChange={(e) => setFormData({ ...formData, career_id: parseInt(e.target.value), prerequisite_subject_id: null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar carrera</option>
              {careers.map(career => (
                <option key={career.id} value={career.id}>{career.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Créditos
              </label>
              <input
                type="number"
                min="0"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas/Semana
              </label>
              <input
                type="number"
                min="0"
                value={formData.hours_per_week}
                onChange={(e) => setFormData({ ...formData, hours_per_week: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semestre
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.semester || ''}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {formData.career_id && availablePrerequisites.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Materia Prerrequisito
              </label>
              <select
                value={formData.prerequisite_subject_id || ''}
                onChange={(e) => setFormData({ ...formData, prerequisite_subject_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ninguna</option>
                {availablePrerequisites.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nivel de Dificultad
              </label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="advanced">Avanzado</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="is_core"
                checked={formData.is_core}
                onChange={(e) => setFormData({ ...formData, is_core: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_core" className="ml-2 block text-sm text-gray-700">
                Materia troncal
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700">
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Guardando...' : subject ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};

export default SubjectsPage;

