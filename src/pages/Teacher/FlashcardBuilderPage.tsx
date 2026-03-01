// pages/FlashcardBuilderPage.tsx
// Constructor de flashcards para docentes

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Flashcard,
  getFlashcardsByCourse,
  getFlashcardsByUnit,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
} from '@/services/flashcardService';
import { courseService, Course } from '@/services/teacherCourses';
import { unitService, sessionService, CourseUnit, Session } from '@/services/teacherCourses';
import Button from '@/components/Common/Button';
import Card from '@/components/Common/Card';
import FlashcardEditor from '@/components/Features/flashcards/FlashcardEditor';
import FlashcardGenerator from '@/components/Features/flashcards/FlashcardGenerator';
import { IconPlus, IconTrash, IconEdit, IconArrowLeft, IconBookOpen, IconEye, IconSparkles } from '@/components/Common/Icons';

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
  const [showGenerator, setShowGenerator] = useState(false);
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

  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  // ... (useEffect and loadData remain similar, just need to preserve them or assume they are there in previous blocks if I don't touch them)
  // Actually, I am replacing a large chunk so I need to include them if I replace the whole body, or just insert the new logic. 
  // Better to insert the logic and then update the UI.

  // Let's implement the handlers first.
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCards(filteredFlashcards.map(f => f.id));
    } else {
      setSelectedCards([]);
    }
  };

  const toggleSelectCard = (id: string) => {
    setSelectedCards(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedCards.length === 0) return;

    if (!confirm(`⚠️ ¿Estás seguro de que deseas eliminar ${selectedCards.length} flashcards seleccionadas?\n\nEsta acción eliminará permanentemente las tarjetas y su historial de progreso asociado.\n\nEsta acción NO se puede deshacer.`)) {
      return;
    }

    try {
      setLoading(true);
      // Ejecutar eliminaciones en paralelo
      await Promise.all(selectedCards.map(id => deleteFlashcard(id)));

      await loadData();
      setSelectedCards([]); // Limpiar selección
      alert(`${selectedCards.length} flashcards eliminadas correctamente.`);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Error al eliminar algunas flashcards. Por favor intente nuevamente.');
      // Recargar para asegurar estado consistente
      loadData();
    } finally {
      setLoading(false);
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

  // ... (Course not found check remains)

  // ... (handleSaveGeneratedFlashcards and showGenerator check remains)

  const handleSaveGeneratedFlashcards = async (generatedCards: Flashcard[]) => {
    if (!finalCourseId || !user) return;

    try {
      const courseIdNum = parseInt(finalCourseId);

      // Guardar todas las flashcards en paralelo
      await Promise.all(generatedCards.map(card => {
        // Asegurar que tengan los IDs correctos para la base de datos
        // Nota: 'card' viene de la IA con un ID temporal tipo 'gen-...'
        // createFlashcard ignorará el ID si lo pasamos, pero es mejor limpiar
        const { id, ...cardData } = card;

        return createFlashcard({
          ...cardData,
          course_id: courseIdNum,
          unit_id: selectedUnitId || undefined,
          session_id: selectedSessionId || undefined,
          created_by: user.id,
        });
      }));

      // Recargar datos y volver a la vista principal
      await loadData();
      setShowGenerator(false);
      alert(`${generatedCards.length} flashcards guardadas con éxito!`);

    } catch (error) {
      console.error('Error saving generated flashcards:', error);
      alert('Error al guardar las flashcards generadas');
    }
  };

  if (showGenerator) {
    // ... (existing content)
    return (
      <div className="p-6">
        <div className="mb-4">
          <Button
            variant="secondary"
            onClick={() => setShowGenerator(false)}
          >
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Volver a la lista
          </Button>
        </div>
        <FlashcardGenerator onSave={handleSaveGeneratedFlashcards} />
      </div>
    );
  }

  if (showEditor) {
    // ... (existing content)
    const selectedUnit = units.find((u) => u.id === selectedUnitId);
    const selectedSession = sessions.find((s) => s.id === selectedSessionId);

    return (
      <div className="p-6">
        <div className="mb-4">
          <Button
            variant="secondary"
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
            <p className="text-text-light">{course?.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(`/teacher/courses/${finalCourseId}`)}>
              <IconArrowLeft className="w-4 h-4 mr-2" />
              Volver al Curso
            </Button>
            <Button
              variant="secondary"
              className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-indigo-700 hover:from-indigo-100 hover:to-purple-100"
              onClick={() => setShowGenerator(true)}
            >
              <IconSparkles className="w-4 h-4 mr-2" />
              Generar con IA
            </Button>
            <Button variant="primary" onClick={handleCreateFlashcard}>
              <IconPlus className="w-4 h-4 mr-2" />
              Nueva Flashcard
            </Button>
          </div>
        </div>
      </div>

      {/* Barra de Acciones y Filtros */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Filtro Unidad */}
            <select
              value={filterUnitId || ''}
              onChange={(e) => setFilterUnitId(e.target.value || undefined)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">Todas las unidades</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.title}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-3">
            {selectedCards.length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 animate-fade-in">
                <span className="text-sm font-semibold">{selectedCards.length} seleccionadas</span>
                <button
                  onClick={handleBulkDelete}
                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <IconTrash className="w-3 h-3" /> Eliminar
                </button>
                <button
                  onClick={() => setSelectedCards([])}
                  className="text-xs text-red-500 hover:bg-red-100 px-2 py-1 rounded ml-1"
                >
                  Cancelar
                </button>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm font-medium text-text-dark cursor-pointer select-none bg-gray-50 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={filteredFlashcards.length > 0 && selectedCards.length === filteredFlashcards.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                disabled={filteredFlashcards.length === 0}
              />
              Seleccionar Todo
            </label>
          </div>
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
            const isSelected = selectedCards.includes(flashcard.id);

            return (
              <Card
                key={flashcard.id}
                className={`p-4 hover:shadow-lg transition-all border-2 relative ${isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-transparent'
                  }`}
                onClick={(e) => {
                  // Permitir seleccionar haciendo click en la tarjeta (opcional, cuidado con los botones)
                  // Mejor solo en el checkbox para evitar conflictos con drag/edit
                }}
              >
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectCard(flashcard.id);
                    }}
                  />
                </div>

                <div className="flex items-start justify-between mb-3 pl-8">
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
                      onClick={(e) => { e.stopPropagation(); handleEditFlashcard(flashcard); }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <IconEdit className="w-4 h-4" />
                    </button>
                    {!isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFlashcard(flashcard.id); }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-4 pl-2 border-l-2 border-gray-100">
                  <div className="text-sm text-text-light">
                    <p className="font-medium mb-1 text-xs uppercase tracking-wider text-gray-400">Pregunta</p>
                    <p className="line-clamp-2">
                      {flashcard.front_text || flashcard.front_image_url ? (
                        flashcard.front_text || '[Imagen]'
                      ) : (
                        <span className="text-gray-400 italic">Vacío</span>
                      )}
                    </p>
                  </div>
                  <div className="text-sm text-text-light mt-2">
                    <p className="font-medium mb-1 text-xs uppercase tracking-wider text-gray-400">Respuesta</p>
                    <p className="line-clamp-2">{flashcard.back_text}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-text-light pt-3 border-t border-gray-100">
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
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-[10px] font-bold">Lvl {flashcard.difficulty_level}</span>
                    {flashcard.points_value > 0 && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-[10px] font-bold">+{flashcard.points_value} pts</span>
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

