// pages/CourseEditorPage.tsx
// Editor de curso con unidades, sesiones y materiales

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseService, unitService, sessionService, materialService, Course, CourseUnit, Session, Material } from '../services/teacherCourses';
import Card from '../components/Card';
import Button from '../components/Button';

export const CourseEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'units' | 'sessions' | 'materials'>('units');

  useEffect(() => {
    if (id) {
      loadCourseData();
    }
  }, [id]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const courseId = parseInt(id!);
      
      const [courseData, unitsData, sessionsData, materialsData] = await Promise.all([
        courseService.getCourse(courseId),
        unitService.getCourseUnits(courseId),
        sessionService.getCourseSessions(courseId),
        materialService.getCourseMaterials(courseId)
      ]);

      setCourse(courseData);
      setUnits(unitsData);
      setSessions(sessionsData);
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = async () => {
    if (!course) return;

    const unitNumber = units.length + 1;
    const title = prompt('Título de la unidad:');
    if (!title) return;

    try {
      const newUnit = await unitService.createUnit({
        course_id: course.id,
        number: unitNumber,
        title,
        description: ''
      });
      setUnits([...units, newUnit]);
    } catch (error) {
      console.error('Error creating unit:', error);
    }
  };

  const handleCreateSession = async () => {
    if (!course) return;

    const title = prompt('Título de la sesión:');
    if (!title) return;

    try {
      const newSession = await sessionService.createSession({
        course_id: course.id,
        title,
        description: ''
      });
      setSessions([...sessions, newSession]);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleCreateMaterial = async () => {
    if (!course) return;

    const title = prompt('Título del material:');
    if (!title) return;

    const kind = prompt('Tipo de material (markdown/pdf/link/video/other):') as Material['kind'] || 'other';

    try {
      const newMaterial = await materialService.createMaterial({
        course_id: course.id,
        title,
        kind,
        metadata: {}
      });
      setMaterials([...materials, newMaterial]);
    } catch (error) {
      console.error('Error creating material:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900">Curso no encontrado</h2>
        <Button onClick={() => navigate('/teacher/courses')} className="mt-4">
          Volver a Cursos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-gray-600">Editor de curso</p>
        </div>
        <Button onClick={() => navigate('/teacher/courses')}>
          Volver a Cursos
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('units')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'units'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Unidades ({units.length})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sessions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sesiones ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'materials'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Materiales ({materials.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'units' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Unidades del Curso</h2>
            <Button onClick={handleCreateUnit}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Unidad
            </Button>
          </div>

          {units.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500">No hay unidades creadas</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {units.map((unit) => (
                <Card key={unit.id}>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Unidad {unit.number}: {unit.title}</h3>
                        {unit.description && (
                          <p className="text-gray-600 text-sm mt-1">{unit.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">Editar</Button>
                        <Button size="sm" variant="outline" className="text-red-600">Eliminar</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Sesiones del Curso</h2>
            <Button onClick={handleCreateSession}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Sesión
            </Button>
          </div>

          {sessions.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500">No hay sesiones creadas</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{session.title}</h3>
                        {session.description && (
                          <p className="text-gray-600 text-sm mt-1">{session.description}</p>
                        )}
                        {session.starts_at && (
                          <p className="text-gray-500 text-sm mt-1">
                            {new Date(session.starts_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">Editar</Button>
                        <Button size="sm" variant="outline" className="text-red-600">Eliminar</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Materiales del Curso</h2>
            <Button onClick={handleCreateMaterial}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Material
            </Button>
          </div>

          {materials.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-gray-500">No hay materiales creados</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <Card key={material.id}>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{material.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">Tipo: {material.kind}</p>
                        {material.url && (
                          <p className="text-blue-600 text-sm mt-1">{material.url}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">Editar</Button>
                        <Button size="sm" variant="outline" className="text-red-600">Eliminar</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
