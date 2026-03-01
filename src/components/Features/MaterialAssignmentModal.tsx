import React, { useState, useEffect } from 'react';
import { materialService, Course } from '@/services/teacherCourses';
import { IconX, IconCheck, IconSearch, IconLoader } from "@/components/Common/Icons";
import { useAuth } from '@/hooks/useAuth';

interface MaterialAssignmentModalProps {
    materialId: string;
    materialTitle: string;
    teacherCourses: Course[];
    onClose: () => void;
    onAssigned: () => void;
}

type TabType = 'courses' | 'units' | 'sessions';

interface Unit {
    id: string;
    title: string;
    number: number;
    course_id: number;
    course_title?: string;
}

interface Session {
    id: string;
    title: string;
    course_id: number;
    course_title?: string;
    unit_id?: string;
    unit_title?: string;
    unit_number?: number;
}

export const MaterialAssignmentModal: React.FC<MaterialAssignmentModalProps> = ({
    materialId,
    materialTitle,
    teacherCourses,
    onClose,
    onAssigned
}) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('courses');
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Datos disponibles
    const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
    const [availableSessions, setAvailableSessions] = useState<Session[]>([]);

    // Asignaciones actuales
    const [assignedCourses, setAssignedCourses] = useState<Array<{
        course_id: number;
        course_title: string;
        course_code: string;
        assigned_at: string;
    }>>([]);
    const [assignedUnits, setAssignedUnits] = useState<Array<{
        unit_id: string;
        unit_title: string;
        unit_number: number;
        course_id: number;
        course_title: string;
        course_code: string;
    }>>([]);
    const [assignedSessions, setAssignedSessions] = useState<Array<{
        session_id: string;
        session_title: string;
        course_id: number;
        course_title: string;
        course_code: string;
        unit_id?: string;
        unit_title?: string;
        unit_number?: number;
    }>>([]);

    // Selecciones múltiples
    const [selectedCourses, setSelectedCourses] = useState<Set<number>>(new Set());
    const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
    const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, [materialId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Cargar asignaciones actuales
            const [courses, units, sessions] = await Promise.all([
                materialService.getMaterialCourses(materialId).catch(() => []),
                materialService.getMaterialUnits(materialId).catch(() => []),
                materialService.getMaterialSessions(materialId).catch(() => [])
            ]);

            setAssignedCourses(courses);
            setAssignedUnits(units);
            setAssignedSessions(sessions);

            // Pre-seleccionar elementos ya asignados
            setSelectedCourses(new Set(courses.map(c => c.course_id)));
            setSelectedUnits(new Set(units.map(u => u.unit_id)));
            setSelectedSessions(new Set(sessions.map(s => s.session_id)));

            // Cargar todas las unidades y sesiones de todos los cursos del profesor
            const allUnits: Unit[] = [];
            const allSessions: Session[] = [];

            for (const course of teacherCourses) {
                try {
                    const [unitsData, sessionsData] = await Promise.all([
                        materialService.getAvailableUnits?.(course.id).catch(() => []),
                        materialService.getAvailableSessions?.(course.id).catch(() => [])
                    ]);

                    if (unitsData) {
                        allUnits.push(...unitsData.map((u: any) => ({
                            ...u,
                            course_title: course.title
                        })));
                    }

                    if (sessionsData) {
                        allSessions.push(...sessionsData.map((s: any) => ({
                            ...s,
                            course_title: course.title
                        })));
                    }
                } catch (error) {
                    console.error(`Error loading units/sessions for course ${course.id}:`, error);
                }
            }

            // Si no hay funciones getAvailableUnits/getAvailableSessions, cargar desde Supabase directamente
            if (allUnits.length === 0 || allSessions.length === 0) {
                const { supabase } = await import('@/lib/supabase');
                
                for (const course of teacherCourses) {
                    try {
                        // Cargar unidades
                        const { data: unitsData } = await supabase
                            .from('course_units')
                            .select('id, number, title, course_id')
                            .eq('course_id', course.id)
                            .order('number', { ascending: true });

                        if (unitsData) {
                            allUnits.push(...unitsData.map(u => ({
                                ...u,
                                course_title: course.title
                            })));
                        }

                        // Cargar sesiones
                        const { data: sessionsData } = await supabase
                            .from('sessions')
                            .select('id, title, unit_id, course_id')
                            .eq('course_id', course.id)
                            .order('starts_at', { ascending: true });

                        if (sessionsData) {
                            // Obtener información de unidades para las sesiones
                            const unitIds = sessionsData.map(s => s.unit_id).filter(Boolean);
                            let unitsMap: Record<string, any> = {};
                            
                            if (unitIds.length > 0) {
                                const { data: unitsInfo } = await supabase
                                    .from('course_units')
                                    .select('id, number, title')
                                    .in('id', unitIds);

                                if (unitsInfo) {
                                    unitsMap = unitsInfo.reduce((acc, u) => {
                                        acc[u.id] = u;
                                        return acc;
                                    }, {} as Record<string, any>);
                                }
                            }

                            allSessions.push(...sessionsData.map(s => ({
                                ...s,
                                course_title: course.title,
                                unit_title: s.unit_id ? unitsMap[s.unit_id]?.title : undefined,
                                unit_number: s.unit_id ? unitsMap[s.unit_id]?.number : undefined
                            })));
                        }
                    } catch (error) {
                        console.error(`Error loading units/sessions for course ${course.id}:`, error);
                    }
                }
            }

            setAvailableUnits(allUnits);
            setAvailableSessions(allSessions);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAssign = async () => {
        try {
            setAssigning(true);

            switch (activeTab) {
                case 'courses':
                    if (selectedCourses.size === 0) {
                        alert('Por favor, selecciona al menos un curso');
                        return;
                    }
                    const courseIds = Array.from(selectedCourses);
                    const courseResult = await materialService.assignMaterialToCourses(materialId, courseIds);
                    if (courseResult.failed > 0) {
                        const failedCourses = courseResult.results
                            .filter((r: any) => !r.success)
                            .map((r: any) => `Curso ${r.course_id}: ${r.error_message}`)
                            .join('\n');
                        alert(`Se asignaron ${courseResult.success} curso(s) correctamente.\n\nErrores:\n${failedCourses}`);
                    } else {
                        alert(`✅ Material asignado exitosamente a ${courseResult.success} curso(s).`);
                    }
                    setSelectedCourses(new Set());
                    break;
                case 'units':
                    if (selectedUnits.size === 0) {
                        alert('Por favor, selecciona al menos una unidad');
                        return;
                    }
                    const unitIds = Array.from(selectedUnits);
                    const unitResult = await materialService.assignMaterialToUnits(materialId, unitIds);
                    if (unitResult.failed > 0) {
                        const failedUnits = unitResult.results
                            .filter((r: any) => !r.success)
                            .map((r: any) => `Unidad ${r.unit_id}: ${r.error_message}`)
                            .join('\n');
                        alert(`Se asignaron ${unitResult.success} unidad(es) correctamente.\n\nErrores:\n${failedUnits}`);
                    } else {
                        alert(`✅ Material asignado exitosamente a ${unitResult.success} unidad(es).`);
                    }
                    setSelectedUnits(new Set());
                    break;
                case 'sessions':
                    if (selectedSessions.size === 0) {
                        alert('Por favor, selecciona al menos una sesión');
                        return;
                    }
                    const sessionIds = Array.from(selectedSessions);
                    const sessionResult = await materialService.assignMaterialToSessions(materialId, sessionIds);
                    if (sessionResult.failed > 0) {
                        const failedSessions = sessionResult.results
                            .filter((r: any) => !r.success)
                            .map((r: any) => `Sesión ${r.session_id}: ${r.error_message}`)
                            .join('\n');
                        alert(`Se asignaron ${sessionResult.success} sesión(es) correctamente.\n\nErrores:\n${failedSessions}`);
                    } else {
                        alert(`✅ Material asignado exitosamente a ${sessionResult.success} sesión(es).`);
                    }
                    setSelectedSessions(new Set());
                    break;
            }

            await loadData();
            onAssigned();
        } catch (error: any) {
            console.error('Error assigning:', error);
            alert('Error al asignar elementos: ' + (error.message || 'Error desconocido'));
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassign = async (type: TabType, id: number | string) => {
        if (!confirm('¿Deseas desasignar este elemento?')) {
            return;
        }

        try {
            setAssigning(true);

            switch (type) {
                case 'courses':
                    await materialService.unassignMaterialFromCourse(materialId, id as number);
                    break;
                case 'units':
                    await materialService.unassignMaterialFromUnit(materialId, id as string);
                    break;
                case 'sessions':
                    await materialService.unassignMaterialFromSession(materialId, id as string);
                    break;
            }

            await loadData();
            onAssigned();
        } catch (error: any) {
            console.error('Error unassigning:', error);
            alert('Error al desasignar: ' + (error.message || 'Error desconocido'));
        } finally {
            setAssigning(false);
        }
    };

    const toggleSelection = (type: TabType, id: number | string) => {
        switch (type) {
            case 'courses':
                const newCourses = new Set(selectedCourses);
                if (newCourses.has(id as number)) {
                    newCourses.delete(id as number);
                } else {
                    newCourses.add(id as number);
                }
                setSelectedCourses(newCourses);
                break;
            case 'units':
                const newUnits = new Set(selectedUnits);
                if (newUnits.has(id as string)) {
                    newUnits.delete(id as string);
                } else {
                    newUnits.add(id as string);
                }
                setSelectedUnits(newUnits);
                break;
            case 'sessions':
                const newSessions = new Set(selectedSessions);
                if (newSessions.has(id as string)) {
                    newSessions.delete(id as string);
                } else {
                    newSessions.add(id as string);
                }
                setSelectedSessions(newSessions);
                break;
        }
    };

    const getFilteredItems = () => {
        const term = searchTerm.toLowerCase();
        switch (activeTab) {
            case 'courses':
                return teacherCourses.filter(c =>
                    (c.title || '').toLowerCase().includes(term) ||
                    (c.code || '').toLowerCase().includes(term)
                );
            case 'units':
                return availableUnits.filter(u =>
                    u.title.toLowerCase().includes(term) ||
                    u.course_title?.toLowerCase().includes(term)
                );
            case 'sessions':
                return availableSessions.filter(s =>
                    s.title.toLowerCase().includes(term) ||
                    s.course_title?.toLowerCase().includes(term)
                );
            default:
                return [];
        }
    };

    const getAssignedItems = () => {
        switch (activeTab) {
            case 'courses':
                return assignedCourses;
            case 'units':
                return assignedUnits;
            case 'sessions':
                return assignedSessions;
            default:
                return [];
        }
    };

    const getSelectedCount = () => {
        switch (activeTab) {
            case 'courses':
                return selectedCourses.size;
            case 'units':
                return selectedUnits.size;
            case 'sessions':
                return selectedSessions.size;
            default:
                return 0;
        }
    };

    const isSelected = (id: number | string) => {
        switch (activeTab) {
            case 'courses':
                return selectedCourses.has(id as number);
            case 'units':
                return selectedUnits.has(id as string);
            case 'sessions':
                return selectedSessions.has(id as string);
            default:
                return false;
        }
    };

    const isAssigned = (id: number | string) => {
        const assigned = getAssignedItems();
        switch (activeTab) {
            case 'courses':
                return assigned.some((a: any) => a.course_id === id);
            case 'units':
                return assigned.some((a: any) => a.unit_id === id);
            case 'sessions':
                return assigned.some((a: any) => a.session_id === id);
            default:
                return false;
        }
    };

    const filteredItems = getFilteredItems();
    const assignedItems = getAssignedItems();
    const selectedCount = getSelectedCount();

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                    <div className="flex items-center justify-center py-8">
                        <IconLoader className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="ml-3 text-gray-600">Cargando...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Asignar Material</h2>
                            <p className="text-sm text-gray-600 mt-1">{materialTitle}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <IconX className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 px-6">
                    <div className="flex space-x-4">
                        {(['courses', 'units', 'sessions'] as TabType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                                    activeTab === tab
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab === 'courses' && 'Cursos'}
                                {tab === 'units' && 'Unidades'}
                                {tab === 'sessions' && 'Sesiones'}
                                {(() => {
                                    const count = tab === 'courses' ? assignedCourses.length :
                                                 tab === 'units' ? assignedUnits.length :
                                                 assignedSessions.length;
                                    return count > 0 ? (
                                        <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 rounded-full">
                                            {count}
                                        </span>
                                    ) : null;
                                })()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Asignaciones Actuales */}
                        {assignedItems.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                    Asignaciones Actuales ({assignedItems.length})
                                </h3>
                                <div className="space-y-2">
                                    {assignedItems.map((item: any) => {
                                        const id = activeTab === 'courses' ? item.course_id :
                                                   activeTab === 'units' ? item.unit_id :
                                                   item.session_id;
                                        const title = activeTab === 'courses' ? item.course_title :
                                                     activeTab === 'units' ? item.unit_title :
                                                     item.session_title;
                                        const subtitle = activeTab === 'courses' ? item.course_code :
                                                        activeTab === 'units' ? `${item.course_title} - Unidad ${item.unit_number}` :
                                                        `${item.course_title}${item.unit_title ? ` - ${item.unit_title}` : ''}`;

                                        return (
                                            <div
                                                key={id}
                                                className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                                            >
                                                <div className="flex items-center">
                                                    <IconCheck className="w-5 h-5 text-green-600 mr-3" />
                                                    <div>
                                                        <p className="font-medium text-gray-900">{title}</p>
                                                        {subtitle && (
                                                            <p className="text-sm text-gray-600">{subtitle}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleUnassign(activeTab, id)}
                                                    disabled={assigning}
                                                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                                                >
                                                    Desasignar
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Buscar y Asignar */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                {activeTab === 'courses' && 'Asignar a Cursos'}
                                {activeTab === 'units' && 'Asignar a Unidades'}
                                {activeTab === 'sessions' && 'Asignar a Sesiones'}
                            </h3>

                            {/* Search */}
                            <div className="mb-4">
                                <div className="relative">
                                    <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder={
                                            activeTab === 'courses' ? 'Buscar cursos...' :
                                            activeTab === 'units' ? 'Buscar unidades...' :
                                            'Buscar sesiones...'
                                        }
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Selected count */}
                            {selectedCount > 0 && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-medium text-blue-900">
                                        {selectedCount} elemento(s) seleccionado(s)
                                    </p>
                                </div>
                            )}

                            {/* Items list */}
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filteredItems.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No se encontraron elementos
                                    </div>
                                ) : (
                                    filteredItems.map((item: any) => {
                                        const id = activeTab === 'courses' ? item.id :
                                                   activeTab === 'units' ? item.id :
                                                   item.id;
                                        const assigned = isAssigned(id);
                                        const selected = isSelected(id);

                                        const displayTitle = activeTab === 'courses' ? (item.title || item.code || `Curso ${item.id}`) :
                                                           activeTab === 'units' ? `Unidad ${item.number}: ${item.title}` :
                                                           item.title;
                                        const displaySubtitle = activeTab === 'courses' ? item.code :
                                                              activeTab === 'units' ? item.course_title :
                                                              `${item.course_title}${item.unit_title ? ` - ${item.unit_title}` : ''}`;

                                        return (
                                            <div
                                                key={id}
                                                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                                                    assigned
                                                        ? 'bg-green-50 border-green-200'
                                                        : selected
                                                        ? 'bg-blue-50 border-blue-200'
                                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center flex-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={() => toggleSelection(activeTab, id)}
                                                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mr-4"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-900">
                                                                {displayTitle}
                                                            </span>
                                                            {assigned && (
                                                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                                                    Asignado
                                                                </span>
                                                            )}
                                                        </div>
                                                        {displaySubtitle && (
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                {displaySubtitle}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {assigned && (
                                                    <button
                                                        onClick={() => handleUnassign(activeTab, id)}
                                                        disabled={assigning}
                                                        className="ml-4 px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                    >
                                                        Desasignar
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-600">
                        {assignedItems.length > 0 && (
                            <span>
                                {assignedItems.length} elemento(s) asignado(s) actualmente
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleBulkAssign}
                            disabled={assigning || selectedCount === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {assigning ? (
                                <>
                                    <IconLoader className="w-4 h-4 animate-spin" />
                                    Asignando...
                                </>
                            ) : (
                                <>
                                    <IconCheck className="w-4 h-4" />
                                    Asignar ({selectedCount})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

