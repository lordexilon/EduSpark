import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { sessionService, Session } from '@/services/teacherCourses';
import { courseService, Course } from '@/services/teacherCourses';
import { unitService, CourseUnit } from '@/services/teacherCourses';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import Breadcrumbs from '@/components/Common/Breadcrumbs';
import FilterBar from '@/components/Features/FilterBar';
import { IconChevronRight, IconCalendar, IconBookOpen, IconPlusCircle, IconPencil, IconArrowLeft } from '@/components/Common/Icons';
import { useAuth } from '@/hooks/useAuth'; 

const SessionsListPage: React.FC = () => {
  const { user } = useAuth(); 
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('order');

  useEffect(() => {
    if (courseIdParam) {
      loadSessions();
    } else {
      // Si no hay courseId, redirigir a mis cursos o mostrar mensaje
      setError('Debes seleccionar un curso para ver sus sesiones.');
      setLoading(false);
    }
  }, [courseIdParam]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const courseId = parseInt(courseIdParam!);
      
      const [courseData, sessionsData, unitsData] = await Promise.all([
        courseService.getCourse(courseId),
        sessionService.getCourseSessions(courseId),
        unitService.getCourseUnits(courseId)
      ]);

      setCourse(courseData);
      setSessions(sessionsData);
      setUnits(unitsData);
    } catch (err: any) {
      console.error('Error loading sessions:', err);
      setError(err.message || 'Error al cargar las sesiones.');
    } finally {
      setLoading(false);
    }
  };

  const getUnitTitle = (unitId: string | null | undefined): string => {
    if (!unitId) return 'Sin módulo';
    const unit = units.find(u => u.id === unitId);
    return unit ? `Módulo ${unit.number}: ${unit.title}` : 'Sin módulo';
  };

  // Esta lógica ahora está dentro del bloque de filtros

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !courseIdParam) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Selecciona un curso</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/my/courses')}>
            Ver Mis Cursos
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={() => navigate('/my/courses')}>
              Volver a Mis Cursos
            </Button>
            <Button onClick={loadSessions}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        {course && (
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/courses/${course.id}`)}
              leftIcon={<IconArrowLeft className="w-4 h-4" />}
            >
              Volver al Curso
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
              <p className="text-gray-600">Sesiones del curso</p>
            </div>
          </div>
        )}
        <Card>
          <div className="text-center py-8">
            <IconBookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-slate-600">Este curso aún no tiene sesiones publicadas.</p>
            {user?.role?.name === 'teacher' && courseIdParam && (
              <Button
                variant="primary"
                className="mt-4"
                leftIcon={<IconPlusCircle className="w-5 h-5" />}
                onClick={() => navigate(`/teacher/courses/${courseIdParam}`)}
              >
                Ir al Editor para Crear Sesiones
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      {course && (
        <Breadcrumbs 
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Mis Cursos', path: '/my/courses' },
            { label: course.title, path: `/courses/${course.id}` },
            { label: 'Sesiones' }
          ]}
        />
      )}
      
      {/* Header con información del curso */}
      {course && (
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${course.id}`)}
            leftIcon={<IconArrowLeft className="w-4 h-4" />}
          >
            Volver al Curso
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-gray-600">Sesiones del curso • {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'}</p>
          </div>
          {user?.role?.name === 'teacher' && (
            <Button 
              variant="primary" 
              leftIcon={<IconPlusCircle className="w-5 h-5"/>} 
              onClick={() => navigate(`/teacher/courses/${course.id}`)}
            >
              Gestionar Sesiones
            </Button>
          )}
        </div>
      )}

      {/* Filtros */}
      {course && (
        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar sesiones por título o descripción..."
          filters={[
            ...(units.length > 0 ? [{
              key: 'unit',
              label: 'Módulo',
              options: [
                { value: '', label: 'Todos' },
                ...units.map(unit => ({ value: unit.id, label: `Módulo ${unit.number}: ${unit.title}` }))
              ],
              value: unitFilter,
              onChange: setUnitFilter
            }] : [])
          ]}
          sortOptions={[
            { value: 'order', label: 'Por orden' },
            { value: 'date-asc', label: 'Fecha (más antigua)' },
            { value: 'date-desc', label: 'Fecha (más reciente)' },
            { value: 'title', label: 'Título (A-Z)' }
          ]}
          sortValue={sortBy}
          onSortChange={setSortBy}
          onClearFilters={() => {
            setSearchQuery('');
            setUnitFilter('');
            setSortBy('order');
          }}
          hasActiveFilters={!!(searchQuery || unitFilter || sortBy !== 'order')}
        />
      )}

      {/* Aplicar filtros y ordenamiento */}
      {(() => {
        let filtered = [...sessions];

        // Filtro de búsqueda
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(s => 
            s.title.toLowerCase().includes(query) ||
            s.description?.toLowerCase().includes(query) ||
            s.objective?.toLowerCase().includes(query)
          );
        }

        // Filtro por módulo
        if (unitFilter) {
          filtered = filtered.filter(s => s.unit_id === unitFilter);
        }

        // Ordenamiento
        filtered.sort((a, b) => {
          switch (sortBy) {
            case 'order':
              if (a.order_index !== null && b.order_index !== null) {
                return a.order_index - b.order_index;
              }
              if (a.order_index !== null) return -1;
              if (b.order_index !== null) return 1;
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case 'date-asc':
              if (a.starts_at && b.starts_at) {
                return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
              }
              if (a.starts_at) return -1;
              if (b.starts_at) return 1;
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case 'date-desc':
              if (a.starts_at && b.starts_at) {
                return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime();
              }
              if (a.starts_at) return 1;
              if (b.starts_at) return -1;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case 'title':
              return a.title.localeCompare(b.title);
            default:
              return 0;
          }
        });

        // Re-agrupar sesiones filtradas
        const filteredSessionsByUnit = filtered.reduce((acc, session) => {
          const unitId = session.unit_id || 'sin-unidad';
          if (!acc[unitId]) {
            acc[unitId] = [];
          }
          acc[unitId].push(session);
          return acc;
        }, {} as Record<string, Session[]>);

        // Ordenar sesiones dentro de cada unidad
        Object.keys(filteredSessionsByUnit).forEach(unitId => {
          filteredSessionsByUnit[unitId].sort((a, b) => {
            if (a.order_index !== null && b.order_index !== null) {
              return a.order_index - b.order_index;
            }
            if (a.starts_at && b.starts_at) {
              return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
            }
            return 0;
          });
        });

        // Mostrar resultados
        if (filtered.length === 0) {
          return (
            <Card>
              <div className="text-center py-8">
                <IconBookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-slate-600">
                  {searchQuery || unitFilter
                    ? 'No se encontraron sesiones con los filtros aplicados.'
                    : 'Este curso aún no tiene sesiones publicadas.'}
                </p>
              </div>
            </Card>
          );
        }

        // Contador de resultados filtrados
        const showFilteredCount = filtered.length < sessions.length;

        return (
          <>
            {showFilteredCount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Mostrando {filtered.length} de {sessions.length} sesiones
              </div>
            )}
            
                  {/* Mostrar sesiones agrupadas por módulo si hay módulos, sino todas juntas */}
            {units.length > 0 && Object.keys(filteredSessionsByUnit).length > 0 ? (
              // Agrupadas por módulo
              <div className="space-y-6">
                {Object.entries(filteredSessionsByUnit)
            .sort(([unitIdA], [unitIdB]) => {
              if (unitIdA === 'sin-unidad') return 1;
              if (unitIdB === 'sin-unidad') return -1;
              const unitA = units.find(u => u.id === unitIdA);
              const unitB = units.find(u => u.id === unitIdB);
              if (!unitA || !unitB) return 0;
              return unitA.number - unitB.number;
            })
            .map(([unitId, unitSessions]) => (
              <div key={unitId}>
                {unitId !== 'sin-unidad' && (
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">
                    {getUnitTitle(unitId)}
                  </h2>
                )}
                {unitId === 'sin-unidad' && unitSessions.length > 0 && (
                  <h2 className="text-lg font-semibold text-gray-800 mb-3">
                    Sesiones sin Módulo Asignado
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {unitSessions.map((session) => (
                    <Card 
                      key={session.id} 
                      className="h-full flex flex-col justify-between hover:border-primary border-2 border-transparent transition-all group relative"
                    >
                      <Link to={`/session/${session.id}`} className="flex flex-col h-full">
                        <div>
                          <div className="flex items-center text-primary mb-2">
                            <IconBookOpen className="w-5 h-5 mr-2" />
                            <h3 className="text-lg font-semibold line-clamp-1">{session.title}</h3>
                          </div>
                          {(session.objective || session.description) && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-grow">
                              {session.objective || session.description}
                            </p>
                          )}
                          {session.starts_at && (
                            <div className="flex items-center text-xs text-gray-500 mb-4">
                              <IconCalendar className="w-4 h-4 mr-1.5" />
                              <span>
                                {new Date(session.starts_at).toLocaleDateString('es-ES', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-auto text-right">
                          <span className="inline-flex items-center text-primary font-medium">
                            Ver Detalles <IconChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </Link>
                      {user?.role?.name === 'teacher' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 !p-1 text-gray-400 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/session/editar/${session.id}`);
                          }}
                          aria-label="Editar Sesión"
                        >
                          <IconPencil className="w-5 h-5" />
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
              ) : (
                // Todas las sesiones juntas si no hay módulos
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered
                    .map((session) => (
              <Card 
                key={session.id} 
                className="h-full flex flex-col justify-between hover:border-primary border-2 border-transparent transition-all group relative"
              >
                <Link to={`/session/${session.id}`} className="flex flex-col h-full">
                  <div>
                    <div className="flex items-center text-primary mb-2">
                      <IconBookOpen className="w-5 h-5 mr-2" />
                      <h3 className="text-lg font-semibold line-clamp-1">{session.title}</h3>
                    </div>
                    {(session.objective || session.description) && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-grow">
                        {session.objective || session.description}
                      </p>
                    )}
                    {session.starts_at && (
                      <div className="flex items-center text-xs text-gray-500 mb-4">
                        <IconCalendar className="w-4 h-4 mr-1.5" />
                        <span>
                          {new Date(session.starts_at).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-auto text-right">
                    <span className="inline-flex items-center text-primary font-medium">
                      Ver Detalles <IconChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
                {user?.role?.name === 'teacher' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 !p-1 text-gray-400 hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/session/editar/${session.id}`);
                    }}
                    aria-label="Editar Sesión"
                  >
                    <IconPencil className="w-5 h-5" />
                  </Button>
                )}
                    </Card>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>
    );
  };

  export default SessionsListPage;