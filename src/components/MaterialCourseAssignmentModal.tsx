import React, { useState, useEffect } from 'react';
import { materialService, Course } from '../services/teacherCourses';
import { IconX, IconCheck, IconSearch, IconLoader } from './Icons';
import { useAuth } from '../hooks/useAuth';

interface MaterialCourseAssignmentModalProps {
    materialId: string;
    materialTitle: string;
    teacherCourses: Course[];
    onClose: () => void;
    onAssigned: () => void;
}

export const MaterialCourseAssignmentModal: React.FC<MaterialCourseAssignmentModalProps> = ({
    materialId,
    materialTitle,
    teacherCourses,
    onClose,
    onAssigned
}) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Cursos asignados actualmente
    const [assignedCourses, setAssignedCourses] = useState<Array<{
        course_id: number;
        course_title: string;
        course_code: string;
        assigned_at: string;
    }>>([]);

    // Selecciones múltiples
    const [selectedCourses, setSelectedCourses] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadData();
    }, [materialId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Cargar asignaciones actuales
            const courses = await materialService.getMaterialCourses(materialId);
            setAssignedCourses(courses);

            // Pre-seleccionar cursos ya asignados
            const assignedIds = new Set(courses.map(c => c.course_id));
            setSelectedCourses(assignedIds);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAssign = async () => {
        if (selectedCourses.size === 0) {
            alert('Por favor, selecciona al menos un curso');
            return;
        }

        try {
            setAssigning(true);
            const courseIds = Array.from(selectedCourses);
            const result = await materialService.assignMaterialToCourses(materialId, courseIds);

            if (result.failed > 0) {
                const failedCourses = result.results
                    .filter((r: any) => !r.success)
                    .map((r: any) => `Curso ${r.course_id}: ${r.error_message}`)
                    .join('\n');
                alert(`Se asignaron ${result.success} curso(s) correctamente.\n\nErrores:\n${failedCourses}`);
            } else {
                alert(`✅ Material asignado exitosamente a ${result.success} curso(s).`);
            }

            await loadData();
            onAssigned();
        } catch (error: any) {
            console.error('Error assigning courses:', error);
            alert('Error al asignar cursos: ' + (error.message || 'Error desconocido'));
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassign = async (courseId: number) => {
        if (!confirm('¿Estás seguro de que deseas desasignar este curso?')) {
            return;
        }

        try {
            await materialService.unassignMaterialFromCourse(materialId, courseId);
            await loadData();
            onAssigned();
        } catch (error: any) {
            console.error('Error unassigning course:', error);
            alert('Error al desasignar curso: ' + (error.message || 'Error desconocido'));
        }
    };

    const toggleSelection = (courseId: number) => {
        setSelectedCourses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(courseId)) {
                newSet.delete(courseId);
            } else {
                newSet.add(courseId);
            }
            return newSet;
        });
    };

    const getFilteredCourses = () => {
        return teacherCourses.filter(course => {
            const searchLower = searchTerm.toLowerCase();
            const title = (course.title || '').toLowerCase();
            const code = (course.code || '').toLowerCase();
            return title.includes(searchLower) || code.includes(searchLower);
        });
    };

    const getAssignedCourseIds = () => {
        return new Set(assignedCourses.map(c => c.course_id));
    };

    const isSelected = (courseId: number) => selectedCourses.has(courseId);
    const isAssigned = (courseId: number) => getAssignedCourseIds().has(courseId);

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

    const filteredCourses = getFilteredCourses();
    const assignedIds = getAssignedCourseIds();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Asignar Material a Cursos</h2>
                        <p className="text-sm text-gray-600 mt-1">{materialTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <IconX className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Search */}
                    <div className="mb-6">
                        <div className="relative">
                            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar cursos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Selected count */}
                    {selectedCourses.size > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-medium text-blue-900">
                                {selectedCourses.size} curso(s) seleccionado(s)
                            </p>
                        </div>
                    )}

                    {/* Courses list */}
                    <div className="space-y-2">
                        {filteredCourses.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No se encontraron cursos
                            </div>
                        ) : (
                            filteredCourses.map(course => {
                                const assigned = isAssigned(course.id);
                                const selected = isSelected(course.id);

                                return (
                                    <div
                                        key={course.id}
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
                                                onChange={() => toggleSelection(course.id)}
                                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer mr-4"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900">
                                                        {course.title || course.code || `Curso ${course.id}`}
                                                    </span>
                                                    {course.code && (
                                                        <span className="text-sm text-gray-500">
                                                            ({course.code})
                                                        </span>
                                                    )}
                                                    {assigned && (
                                                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                                            Asignado
                                                        </span>
                                                    )}
                                                </div>
                                                {course.description && (
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                        {course.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {assigned && (
                                            <button
                                                onClick={() => handleUnassign(course.id)}
                                                className="ml-4 px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
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

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-600">
                        {assignedCourses.length > 0 && (
                            <span>
                                {assignedCourses.length} curso(s) asignado(s) actualmente
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
                            disabled={assigning || selectedCourses.size === 0}
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
                                    Asignar ({selectedCourses.size})
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

