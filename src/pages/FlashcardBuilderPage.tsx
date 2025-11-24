// pages/FlashcardBuilderPage.tsx
// Constructor de flashcards para docentes

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Flashcard,
  getFlashcardsByCourse,
  getFlashcardsByUnit,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
} from '../services/flashcardService';
import { courseService, Course } from '../services/teacherCourses';
import { unitService, sessionService, CourseUnit, Session } from '../services/teacherCourses';
import Button from '../components/Button';
import Card from '../components/Card';
import FlashcardEditor from '../components/flashcards/FlashcardEditor';
import { IconPlus, IconTrash, IconEdit, IconArrowLeft, IconBookOpen, IconEye } from '../components/Icons';

export const FlashcardBuilderPage: React.FC = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const finalCourseId = courseId || searchParams.get('courseId') || undefined;
  const unitIdFromUrl = searchParams.get('unitId') || undefined;
  const sessionIdFromUrl = searchParams.get('sessionId') || undefined;

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(unitIdFromUrl);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(sessionIdFromUrl);
  const [filterUnitId, setFilterUnitId] = useState<string | undefined>(unitIdFromUrl);

  useEffect(() => {
    if (finalCourseId) {
      loadData();
    }
  }, [finalCourseId]);

  // Actualizar selectedUnitId y selectedSessionId cuando cambian los query params
  useEffect(() => {
    if (unitIdFromUrl) {
      setSelectedUnitId(unitIdFromUrl);
      setFilterUnitId(unitIdFromUrl);
    }
    if (sessionIdFromUrl) {
      setSelectedSessionId(sessionIdFromUrl);
    }
  }, [unitIdFromUrl, sessionIdFromUrl]);

  const loadData = async () => {
    if (!finalCourseId) return;

    try {
      setLoading(true);
      const courseIdNum = parseInt(finalCourseId);

      // Cargar curso
      const courseData = await courseService.getCourse(courseIdNum);
      setCourse(courseData);

      // Cargar unidades y sesiones
      const [unitsData, sessionsData] = await Promise.all([
        unitService.getCourseUnits(courseIdNum),
        sessionService.getCourseSessions(courseIdNum),
      ]);
      setUnits(unitsData);
      setSessions(sessionsData);

      // Cargar flashcards - usar getFlashcardsByUnit si hay unitId en la URL
      let flashcardsData: Flashcard[];
      if (unitIdFromUrl) {
        flashcardsData = await getFlashcardsByUnit(unitIdFromUrl);
      } else {
        flashcardsData = await getFlashcardsByCourse(courseIdNum);
      }
      setFlashcards(flashcardsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlashcard = () => {
    setEditingFlashcard(null);
    // Mantener unitId y sessionId si vienen de la URL
    if (!unitIdFromUrl) {
      setSelectedUnitId(undefined);
    }
    if (!sessionIdFromUrl) {
      setSelectedSessionId(undefined);
    }
    setShowEditor(true);
  };

  const handleEditFlashcard = (flashcard: Flashcard) => {
    setEditingFlashcard(flashcard);
    setSelectedUnitId(flashcard.unit_id);
    setSelectedSessionId(flashcard.session_id);
    setShowEditor(true);
  };

  const handleSaveFlashcard = async (
    flashcardData: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>
  ) => {
    if (!finalCourseId || !user) return;

    try {
      const courseIdNum = parseInt(finalCourseId);
      // Usar los valores de unit_id y session_id que vienen del FlashcardEditor
      // en lugar de los del estado del componente padre
      const dataToSave = {
        ...flashcardData,
        course_id: courseIdNum,
        // El FlashcardEditor ya incluye unit_id y session_id en flashcardData
        // Solo asegurarnos de que course_id esté correcto
        unit_id: flashcardData.unit_id || undefined,
        session_id: flashcardData.session_id || undefined,
        created_by: user.id,
      };

      if (editingFlashcard) {
        await updateFlashcard(editingFlashcard.id, dataToSave);
      } else {
        await createFlashcard(dataToSave);
      }

      setShowEditor(false);
      setEditingFlashcard(null);
      // Actualizar los estados para reflejar los valores guardados
      setSelectedUnitId(flashcardData.unit_id);
      setSelectedSessionId(flashcardData.session_id);
      await loadData();
    } catch (error) {
      console.error('Error saving flashcard:', error);
      alert('Error al guardar la flashcard');
    }
  };

  const handleDeleteFlashcard = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta flashcard?')) return;

    try {
      await deleteFlashcard(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      alert('Error al eliminar la flashcard');
    }
  };

  const filteredFlashcards = filterUnitId
    ? flashcards.filter((f) => f.unit_id === filterUnitId)
    : flashcards;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <Card>
          <p className="text-center text-gray-600">Curso no encontrado</p>
          <Button onClick={() => navigate('/teacher/courses')} className="mt-4">
            Volver a Cursos
          </Button>
        </Card>
      </div>
    );
  }

  if (showEditor) {
    const selectedUnit = units.find((u) => u.id === selectedUnitId);
    const selectedSession = sessions.find((s) => s.id === selectedSessionId);

    return (
      <div className="p-6">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setShowEditor(false);
              setEditingFlashcard(null);
            }}
          >
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
        
        {/* Información de contexto */}
        {(selectedUnit || selectedSession) && (
          <Card className="mb-4 p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Creando flashcard para:</strong>
              {selectedUnit && (
                <span className="ml-2">Unidad {selectedUnit.number}: {selectedUnit.title}</span>
              )}
              {selectedSession && (
                <span className="ml-2">
                  {selectedUnit && ' • '}
                  Sesión: {selectedSession.title}
                </span>
              )}
            </p>
          </Card>
        )}

        <FlashcardEditor
          flashcard={editingFlashcard || undefined}
          courseId={parseInt(finalCourseId!)}
          unitId={selectedUnitId}
          sessionId={selectedSessionId}
          units={units}
          sessions={sessions}
          onSave={handleSaveFlashcard}
          onCancel={() => {
            setShowEditor(false);
            setEditingFlashcard(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-text-dark mb-2">Flashcards</h1>
            <p className="text-text-light">{course.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/teacher/courses/${finalCourseId}`)}>
              <IconArrowLeft className="w-4 h-4 mr-2" />
              Volver al Curso
            </Button>
            <Button variant="primary" onClick={handleCreateFlashcard}>
              <IconPlus className="w-4 h-4 mr-2" />
              Nueva Flashcard
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-text-dark">Filtrar por unidad:</label>
          <select
            value={filterUnitId || ''}
            onChange={(e) => setFilterUnitId(e.target.value || undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Todas las unidades</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.title}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Lista de flashcards */}
      {filteredFlashcards.length === 0 ? (
        <Card className="p-12 text-center">
          <IconBookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">
            {filterUnitId ? 'No hay flashcards en esta unidad' : 'No hay flashcards creadas aún'}
          </p>
          <Button variant="primary" onClick={handleCreateFlashcard}>
            <IconPlus className="w-4 h-4 mr-2" />
            Crear Primera Flashcard
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlashcards.map((flashcard) => {
            const unit = units.find((u) => u.id === flashcard.unit_id);
            const session = sessions.find((s) => s.id === flashcard.session_id);

            return (
              <Card key={flashcard.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-dark mb-1">
                      {flashcard.title || 'Sin título'}
                    </h3>
                    {unit && (
                      <p className="text-xs text-text-light mb-1">Unidad: {unit.title}</p>
                    )}
                    {session && (
                      <p className="text-xs text-text-light">Sesión: {session.title}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditFlashcard(flashcard)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <IconEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFlashcard(flashcard.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <IconTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-text-light">
                    <p className="font-medium mb-1">Frente:</p>
                    <p className="line-clamp-2">
                      {flashcard.front_text || flashcard.front_image_url ? (
                        flashcard.front_text || '[Imagen]'
                      ) : (
                        <span className="text-gray-400 italic">Vacío</span>
                      )}
                    </p>
                  </div>
                  <div className="text-sm text-text-light">
                    <p className="font-medium mb-1">Reverso:</p>
                    <p className="line-clamp-2">{flashcard.back_text}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-text-light">
                  <div className="flex gap-2">
                    {flashcard.tags && flashcard.tags.length > 0 && (
                      <div className="flex gap-1">
                        {flashcard.tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Dificultad: {flashcard.difficulty_level}/5</span>
                    {flashcard.points_value > 0 && (
                      <span className="text-xs">• {flashcard.points_value} pts</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Estadísticas */}
      <Card className="mt-6 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{flashcards.length}</p>
            <p className="text-sm text-text-light">Total Flashcards</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {flashcards.filter((f) => f.is_active).length}
            </p>
            <p className="text-sm text-text-light">Activas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {new Set(flashcards.map((f) => f.unit_id).filter(Boolean)).size}
            </p>
            <p className="text-sm text-text-light">Unidades con Flashcards</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {flashcards.reduce((sum, f) => sum + f.points_value, 0).toFixed(1)}
            </p>
            <p className="text-sm text-text-light">Puntos Totales</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

