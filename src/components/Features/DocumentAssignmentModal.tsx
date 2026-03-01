import React, { useState, useEffect } from 'react';
import { documentLibraryService } from '@/services/documentLibraryService';
import { IconX, IconCheck, IconSearch, IconLoader } from '@/components/Common/Icons';
import { useAuth } from '@/hooks/useAuth';

interface DocumentAssignmentModalProps {
    documentId: string;
    documentTitle: string;
    institutionId: number;
    onClose: () => void;
    onAssigned: () => void;
}

type TabType = 'careers' | 'courses' | 'units' | 'sessions';

interface Career {
    id: number;
    name: string;
    code: string;
}

interface Course {
    id: number;
    title: string;
    code: string;
    teacher_name?: string;
}

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
}

export const DocumentAssignmentModal: React.FC<DocumentAssignmentModalProps> = ({
    documentId,
    documentTitle,
    institutionId,
    onClose,
    onAssigned
}) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('careers');
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Si es admin, no filtrar por institución (pasar undefined)
    const filterInstitutionId = user?.role?.name === 'admin' ? undefined : institutionId;

    // Datos disponibles
    const [availableCareers, setAvailableCareers] = useState<Career[]>([]);
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
    const [availableSessions, setAvailableSessions] = useState<Session[]>([]);

    // Asignaciones actuales
    const [assignedCareers, setAssignedCareers] = useState<any[]>([]);
    const [assignedCourses, setAssignedCourses] = useState<any[]>([]);
    const [assignedUnits, setAssignedUnits] = useState<any[]>([]);
    const [assignedSessions, setAssignedSessions] = useState<any[]>([]);

    // Selecciones múltiples
    const [selectedCareers, setSelectedCareers] = useState<Set<number>>(new Set());
    const [selectedCourses, setSelectedCourses] = useState<Set<number>>(new Set());
    const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
    const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadData();
    }, [documentId, filterInstitutionId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Cargar asignaciones actuales
            const [careers, courses, units, sessions] = await Promise.all([
                documentLibraryService.getDocumentCareers(documentId).catch(() => []),
                documentLibraryService.getDocumentCourses(documentId).catch(() => []),
                documentLibraryService.getDocumentUnits(documentId).catch(() => []),
                documentLibraryService.getDocumentSessions(documentId).catch(() => [])
            ]);

            setAssignedCareers(careers);
            setAssignedCourses(courses);
            setAssignedUnits(units);
            setAssignedSessions(sessions);

            // Cargar opciones disponibles
            // Si es admin, no filtrar por institución para ver todas las opciones
            const [careersData, coursesData] = await Promise.all([
                documentLibraryService.getAvailableCareers(filterInstitutionId).catch(() => []),
                documentLibraryService.getAvailableCourses(filterInstitutionId).catch(() => [])
            ]);

            setAvailableCareers(careersData);
            setAvailableCourses(coursesData);

            // Cargar todas las unidades y sesiones de todos los cursos
            const allUnits: Unit[] = [];
            const allSessions: Session[] = [];

            for (const course of coursesData) {
                try {
                    const [units, sessions] = await Promise.all([
                        documentLibraryService.getAvailableUnits(course.id).catch(() => []),
                        documentLibraryService.getAvailableSessions(course.id).catch(() => [])
                    ]);

                    allUnits.push(...units.map(u => ({
                        ...u,
                        course_title: course.title
                    })));

                    allSessions.push(...sessions.map(s => ({
                        ...s,
                        course_title: course.title
                    })));
                } catch (error) {
                    console.error(`Error loading units/sessions for course ${course.id}:`, error);
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

    const loadUnits = async (courseId: number) => {
        try {
            const units = await documentLibraryService.getAvailableUnits(courseId);
            // Agregar información del curso
            const course = availableCourses.find(c => c.id === courseId);
            setAvailableUnits(units.map(u => ({
                ...u,
                course_title: course?.title
            })));
        } catch (error) {
            console.error('Error loading units:', error);
        }
    };

    const loadSessions = async (courseId: number) => {
        try {
            const sessions = await documentLibraryService.getAvailableSessions(courseId);
            // Agregar información del curso y unidad
            const course = availableCourses.find(c => c.id === courseId);
            setAvailableSessions(sessions.map(s => ({
                ...s,
                course_title: course?.title
            })));
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    };

    const handleBulkAssign = async () => {
        try {
            setAssigning(true);

            switch (activeTab) {
                case 'careers':
                    if (selectedCareers.size > 0) {
                        await documentLibraryService.assignDocumentToCareers(
                            documentId,
                            Array.from(selectedCareers)
                        );
                        setSelectedCareers(new Set());
                    }
                    break;
                case 'courses':
                    if (selectedCourses.size > 0) {
                        await documentLibraryService.assignDocumentToCourses(
                            documentId,
                            Array.from(selectedCourses)
                        );
                        setSelectedCourses(new Set());
                    }
                    break;
                case 'units':
                    if (selectedUnits.size > 0) {
                        await documentLibraryService.assignDocumentToUnits(
                            documentId,
                            Array.from(selectedUnits)
                        );
                        setSelectedUnits(new Set());
                    }
                    break;
                case 'sessions':
                    if (selectedSessions.size > 0) {
                        await documentLibraryService.assignDocumentToSessions(
                            documentId,
                            Array.from(selectedSessions)
                        );
                        setSelectedSessions(new Set());
                    }
                    break;
            }

            await loadData();
            onAssigned();
        } catch (error) {
            console.error('Error assigning:', error);
            alert('Error al asignar elementos');
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
                case 'careers':
                    await documentLibraryService.unassignDocumentFromCareer(documentId, id as number);
                    break;
                case 'courses':
                    await documentLibraryService.unassignDocumentFromCourse(documentId, id as number);
                    break;
                case 'units':
                    await documentLibraryService.unassignDocumentFromUnit(documentId, id as string);
                    break;
                case 'sessions':
                    await documentLibraryService.unassignDocumentFromSession(documentId, id as string);
                    break;
            }

            await loadData();
            onAssigned();
        } catch (error) {
            console.error('Error unassigning:', error);
            alert('Error al desasignar');
        } finally {
            setAssigning(false);
        }
    };

    const toggleSelection = (type: TabType, id: number | string) => {
        switch (type) {
            case 'careers':
                const newCareers = new Set(selectedCareers);
                if (newCareers.has(id as number)) {
                    newCareers.delete(id as number);
                } else {
                    newCareers.add(id as number);
                }
                setSelectedCareers(newCareers);
                break;
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
            case 'careers':
                return availableCareers.filter(c =>
                    c.name.toLowerCase().includes(term) ||
                    c.code.toLowerCase().includes(term)
                );
            case 'courses':
                return availableCourses.filter(c =>
                    c.title.toLowerCase().includes(term) ||
                    c.code.toLowerCase().includes(term) ||
                    c.teacher_name?.toLowerCase().includes(term)
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
            case 'careers':
                return assignedCareers;
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
            case 'careers':
                return selectedCareers.size;
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
            case 'careers':
                return selectedCareers.has(id as number);
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
            case 'careers':
                return assigned.some((a: any) => a.career_id === id);
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Asignar Documento</h2>
                            <p className="text-sm text-gray-600 mt-1">{documentTitle}</p>
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
                        {(['careers', 'courses', 'units', 'sessions'] as TabType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                                    activeTab === tab
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab === 'careers' && 'Carreras'}
                                {tab === 'courses' && 'Cursos'}
                                {tab === 'units' && 'Unidades'}
                                {tab === 'sessions' && 'Sesiones'}
                                {assignedItems.length > 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 rounded-full">
                                        {assignedItems.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <IconLoader className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Asignaciones Actuales */}
                            {assignedItems.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                        Asignaciones Actuales ({assignedItems.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {assignedItems.map((item: any) => {
                                            const id = activeTab === 'careers' ? item.career_id :
                                                       activeTab === 'courses' ? item.course_id :
                                                       activeTab === 'units' ? item.unit_id :
                                                       item.session_id;
                                            const title = activeTab === 'careers' ? item.career_name :
                                                         activeTab === 'courses' ? item.course_title :
                                                         activeTab === 'units' ? item.unit_title :
                                                         item.session_title;
                                            const subtitle = activeTab === 'careers' ? item.career_code :
                                                            activeTab === 'courses' ? item.course_code :
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
                                    Asignar Nuevos Elementos
                                </h3>

                                {/* Búsqueda */}
                                <div className="relative mb-4">
                                    <input
                                        type="text"
                                        placeholder={`Buscar ${activeTab === 'careers' ? 'carreras' : activeTab === 'courses' ? 'cursos' : activeTab === 'units' ? 'unidades' : 'sesiones'}...`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <IconSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                </div>

                                {/* Lista de Elementos Disponibles */}
                                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                                    {filteredItems.length > 0 ? (
                                        filteredItems
                                            .filter(item => {
                                                const id = activeTab === 'careers' ? (item as Career).id :
                                                           activeTab === 'courses' ? (item as Course).id :
                                                           activeTab === 'units' ? (item as Unit).id :
                                                           (item as Session).id;
                                                return !isAssigned(id);
                                            })
                                            .map((item) => {
                                                const id = activeTab === 'careers' ? (item as Career).id :
                                                           activeTab === 'courses' ? (item as Course).id :
                                                           activeTab === 'units' ? (item as Unit).id :
                                                           (item as Session).id;
                                                const title = activeTab === 'careers' ? (item as Career).name :
                                                             activeTab === 'courses' ? (item as Course).title :
                                                             activeTab === 'units' ? (item as Unit).title :
                                                             (item as Session).title;
                                                const subtitle = activeTab === 'careers' ? (item as Career).code :
                                                                activeTab === 'courses' ? `${(item as Course).code}${(item as Course).teacher_name ? ` - ${(item as Course).teacher_name}` : ''}` :
                                                                activeTab === 'units' ? `${(item as Unit).course_title} - Unidad ${(item as Unit).number}` :
                                                                `${(item as Session).course_title}${(item as Session).unit_title ? ` - ${(item as Session).unit_title}` : ''}`;

                                                return (
                                                    <div
                                                        key={id}
                                                        className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                                    >
                                                        <div className="flex items-center flex-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected(id)}
                                                                onChange={() => toggleSelection(activeTab, id)}
                                                                className="mr-3 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-900">{title}</p>
                                                                {subtitle && (
                                                                    <p className="text-sm text-gray-600">{subtitle}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center py-8">
                                            {searchTerm ? 'No se encontraron elementos' : 'No hay elementos disponibles'}
                                        </p>
                                    )}
                                </div>

                                {/* Botón de Asignación Múltiple */}
                                {selectedCount > 0 && (
                                    <button
                                        onClick={handleBulkAssign}
                                        disabled={assigning}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {assigning ? 'Asignando...' : `Asignar ${selectedCount} elemento${selectedCount > 1 ? 's' : ''}`}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
