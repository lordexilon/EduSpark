import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { documentLibraryService, ProcessedDocument } from '../services/documentLibraryService';
import { fileStorageService } from '../services/fileStorageService';
import { institutionService, Institution } from '../services/institutionService';
import { DocumentAssignmentModal } from '../components/DocumentAssignmentModal';
import { SecureDocumentViewer } from '../components/SecureDocumentViewer';
import { IconUpload } from '../components/Icons';
import {
    FileText,
    Search,
    Filter,
    Plus,
    MoreVertical,
    BookOpen,
    Trash2,
    Download,
    Eye,
    Shield
} from 'lucide-react';

export const DocumentLibraryPage: React.FC = () => {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
    const [viewingDocument, setViewingDocument] = useState<ProcessedDocument | null>(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

    // Estado para migración
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [migratingDoc, setMigratingDoc] = useState<ProcessedDocument | null>(null);
    const [migratingFromDrive, setMigratingFromDrive] = useState<string | null>(null);
    const [documentSourceFileIds, setDocumentSourceFileIds] = useState<Map<string, string>>(new Map());
    
    // Referencia para el scroll de la tabla
    const tableScrollRef = useRef<HTMLDivElement>(null);

    // Estado para selector de institución (solo admin)
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null);

    useEffect(() => {
        if (user) {
            // Si es admin, cargar instituciones
            if (user.role?.name === 'admin') {
                loadInstitutions();
            }
            loadDocuments();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Recargar documentos cuando cambia la institución seleccionada (solo admin)
    useEffect(() => {
        if (user && user.role?.name === 'admin') {
            loadDocuments();
        }
    }, [selectedInstitutionId]);

    const loadInstitutions = async () => {
        try {
            const data = await institutionService.getAllInstitutions();
            setInstitutions(data);
            // Si no hay institución seleccionada, seleccionar la primera o null (todas)
            if (selectedInstitutionId === null && data.length > 0) {
                // Por defecto, mostrar todas (null = todas)
            }
        } catch (error) {
            console.error('Error loading institutions:', error);
        }
    };

    // Cargar sourceFileIds para documentos sin storage_path
    useEffect(() => {
        const loadSourceFileIds = async () => {
            // Buscar sourceFileId para documentos que no tienen storage_path
            // (pueden tener file_url de Google Drive, pero no storage_path)
            const docsWithoutStorage = documents.filter(doc => !doc.storage_path);
            const sourceFileIdsMap = new Map<string, string>();
            
            console.log('🔍 Buscando sourceFileIds para', docsWithoutStorage.length, 'documentos sin storage_path');
            
            for (const doc of docsWithoutStorage) {
                try {
                    const sourceFileId = await documentLibraryService.getDocumentSourceFileId(doc.id);
                    if (sourceFileId) {
                        sourceFileIdsMap.set(doc.id, sourceFileId);
                        console.log('✅ Encontrado sourceFileId para documento:', doc.id, doc.title);
                    }
                } catch (error) {
                    console.error('Error obteniendo sourceFileId para documento', doc.id, error);
                }
            }
            
            console.log('📊 Total sourceFileIds encontrados:', sourceFileIdsMap.size);
            setDocumentSourceFileIds(sourceFileIdsMap);
        };

        if (documents.length > 0) {
            loadSourceFileIds();
        }
    }, [documents]);

    const loadDocuments = async () => {
        if (!user) {
            console.log('📄 DocumentLibrary: No user, skipping load');
            setLoading(false);
            return;
        }

        const roleName = user.role?.name || 'teacher';
        // Para admin, usar la institución seleccionada (null = todas)
        // Para otros roles, usar su institution_id
        const institutionId = roleName === 'admin' 
            ? selectedInstitutionId || undefined 
            : user.institution_id;

        console.log('📄 DocumentLibrary: Loading documents for user:', {
            role: roleName,
            user_id: user.id,
            institution_id: institutionId,
            selected_institution_id: selectedInstitutionId
        });

        try {
            setLoading(true);
            // Pasar institutionId para admin-campus y coordinator
            // Para admin, si selectedInstitutionId es null, se pasan todos los documentos
            const data = await documentLibraryService.getDocumentsByRole(roleName, institutionId);
            console.log('📄 DocumentLibrary: Documents loaded:', data.length, data);
            
            if (data.length === 0) {
                console.warn('📄 DocumentLibrary: No documents found. Possible reasons:');
                console.warn('  - No documents in database');
                console.warn('  - RLS policies blocking access');
                console.warn('  - User institution_id not set:', institutionId);
                console.warn('  - User role:', roleName);
            }
            
            setDocuments(data);
        } catch (error: any) {
            console.error('📄 DocumentLibrary: Error loading documents:', error);
            console.error('  - Error message:', error.message);
            console.error('  - Error code:', error.code);
            console.error('  - Error details:', error.details);
            setError(error.message || 'Error al cargar documentos');
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMigrateClick = (doc: ProcessedDocument) => {
        if (!confirm(`¿Deseas migrar el documento "${doc.title}" a Supabase Storage? Deberás seleccionar el archivo original.`)) {
            return;
        }
        setMigratingDoc(doc);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !migratingDoc) return;

        try {
            setLoading(true);
            console.log('🚀 Iniciando migración para:', migratingDoc.title);

            // Upload file
            const storageFile = await fileStorageService.uploadFile(
                file,
                migratingDoc.institution_id,
                migratingDoc.id
            );

            console.log('✅ Archivo subido a storage:', storageFile);

            // Update document record
            await documentLibraryService.updateDocument(migratingDoc.id, {
                storage_path: storageFile.path,
                original_source: migratingDoc.file_url, // Save old URL as source
                file_size_bytes: file.size,
                file_type: file.type
            });

            console.log('✅ Registro actualizado en BD');

            // Reload documents
            await loadDocuments();
            alert('Documento migrado exitosamente a almacenamiento seguro.');
        } catch (error) {
            console.error('Error migrating document:', error);
            alert('Error al migrar el documento. Verifica la consola para más detalles.');
        } finally {
            setLoading(false);
            setMigratingDoc(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleMigrateFromDrive = async (doc: ProcessedDocument) => {
        const sourceFileId = documentSourceFileIds.get(doc.id);
        if (!sourceFileId) {
            alert('No se encontró un ID de archivo de Google Drive para este documento.');
            return;
        }

        const confirmed = confirm(
            `¿Migrar "${doc.title}" de Google Drive a Supabase Storage?\n\n` +
            `Esto copiará el archivo al bucket de Supabase.\n\n` +
            `El archivo original en Google Drive se mantendrá intacto.`
        );

        if (!confirmed) return;

        try {
            setMigratingFromDrive(doc.id);
            setLoading(true);

            const result = await documentLibraryService.migrateDocumentFromDrive(
                doc.id,
                sourceFileId,
                doc.title,
                doc.file_type
            );

            if (result.success) {
                alert(`✅ Archivo migrado exitosamente al bucket.\n\nRuta: ${result.bucketPath}`);
                // Recargar documentos
                await loadDocuments();
            } else {
                const errorMsg = result.error || 'Error desconocido';
                console.error('❌ Error en migración:', errorMsg);
                alert(`❌ Error al migrar archivo:\n\n${errorMsg}\n\nVerifica:\n- Que el documento esté asignado a un curso\n- Que el sourceFileId sea válido\n- Los logs de la Edge Function en Supabase`);
            }
        } catch (error: any) {
            console.error('❌ Error migrando archivo:', error);
            const errorMsg = error?.message || error?.error || 'Error desconocido';
            alert(`❌ Error al migrar el archivo:\n\n${errorMsg}\n\nSi el problema persiste, verifica los logs de la Edge Function en Supabase.`);
        } finally {
            setLoading(false);
            setMigratingFromDrive(null);
        }
    };

    const handleViewDocument = (doc: ProcessedDocument) => {
        setViewingDocument(doc);
    };

    const closeViewer = () => {
        setViewingDocument(null);
    };

    const handleAssignDocument = (doc: ProcessedDocument) => {
        setSelectedDocument(doc);
        setIsAssignmentModalOpen(true);
    };

    const handleChangeInstitution = async (doc: ProcessedDocument, newInstitutionId: number) => {
        if (!confirm(
            `¿Cambiar institución del documento "${doc.title}"?\n\n` +
            `Institución actual: ${doc.institution_name || 'Sin institución'}\n` +
            `Nueva institución: ${institutions.find(i => i.id === newInstitutionId)?.name || `ID ${newInstitutionId}`}`
        )) {
            return;
        }

        try {
            setLoading(true);
            await documentLibraryService.updateDocumentInstitution(doc.id, newInstitutionId);
            alert(`✅ Institución actualizada exitosamente`);
            await loadDocuments();
        } catch (error: any) {
            console.error('Error updating institution:', error);
            alert('Error al actualizar la institución: ' + (error.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-semibold mb-2">Error al cargar documentos</h3>
                    <p className="text-red-600 text-sm">{error}</p>
                    <button
                        onClick={() => {
                            setError(null);
                            loadDocuments();
                        }}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 w-full mx-auto">
            {/* Hidden file input for migration */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
            />

            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Biblioteca de Documentos
                        </h1>
                        <p className="text-gray-600">
                            Gestiona documentos procesados y asígnalos a múltiples cursos
                        </p>
                    </div>
                    {/* Selector de institución (solo para admin) */}
                    {user?.role?.name === 'admin' && institutions.length > 0 && (
                        <div className="flex items-center gap-2">
                            <label htmlFor="institution-select" className="text-sm font-medium text-gray-700">
                                Institución:
                            </label>
                            <select
                                id="institution-select"
                                value={selectedInstitutionId || ''}
                                onChange={(e) => setSelectedInstitutionId(e.target.value ? parseInt(e.target.value) : null)}
                                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Todas las instituciones</option>
                                {institutions.map((inst) => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    Mostrando {documents.length} documentos
                    {user?.role?.name === 'admin' && selectedInstitutionId && (
                        <span> de {institutions.find(i => i.id === selectedInstitutionId)?.name}</span>
                    )}
                </p>
            </div>

            <div className="bg-white rounded-lg shadow">
                {/* Tabla con scroll */}
                <div 
                    ref={tableScrollRef}
                    className="overflow-x-auto"
                    style={{ maxHeight: 'calc(100vh - 300px)' }}
                >
                    <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1600px' }}>
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                                    Documento
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                                    Institución
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">
                                    Cursos Asignados
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[400px]">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                                            {doc.description && (
                                                <div className="text-sm text-gray-500 truncate max-w-xs">{doc.description}</div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900 font-medium">
                                        {doc.institution_name || `Institución ${doc.institution_id}`}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {doc.assigned_courses && doc.assigned_courses.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {doc.assigned_courses.slice(0, 2).map((course, idx) => (
                                                <div key={idx} className="text-sm text-gray-700">
                                                    <span className="font-medium">{course.course_title}</span>
                                                    {course.course_code && (
                                                        <span className="text-gray-500 ml-1">({course.course_code})</span>
                                                    )}
                                                </div>
                                            ))}
                                            {doc.assigned_courses.length > 2 && (
                                                <div className="text-xs text-gray-500">
                                                    +{doc.assigned_courses.length - 2} más
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-400 italic">Sin asignar</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Procesado
                                    </span>
                                    {doc.storage_path && (
                                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800" title="Almacenado en Supabase">
                                            <Shield className="w-3 h-3 mr-1" /> Seguro
                                        </span>
                                    )}
                                    {!doc.storage_path && !doc.file_url && (
                                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800" title="Archivo no disponible">
                                            Sin archivo
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(doc.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium min-w-[300px]">
                                    <div className="flex items-center justify-end gap-2 flex-wrap">
                                        {/* Botón Ver - Siempre visible */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewDocument(doc);
                                            }}
                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                            title="Ver documento"
                                        >
                                            <Eye className="w-4 h-4 mr-1.5" />
                                            Ver
                                        </button>

                                        {/* Botón Asignar - Siempre visible */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAssignDocument(doc);
                                            }}
                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-700 hover:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                            title="Asignar a carreras, cursos, unidades y sesiones"
                                        >
                                            <BookOpen className="w-4 h-4 mr-1.5" />
                                            Asignar
                                        </button>

                                        {/* Botón de Migración desde Google Drive (solo si no tiene storage_path, tiene sourceFileId y es admin) */}
                                        {!doc.storage_path && 
                                         documentSourceFileIds.has(doc.id) && 
                                         user?.role?.name === 'admin' && (
                                            <button
                                                onClick={() => handleMigrateFromDrive(doc)}
                                                disabled={migratingFromDrive === doc.id || loading}
                                                className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Migrar desde Google Drive a Supabase Storage"
                                            >
                                                {migratingFromDrive === doc.id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-1"></div>
                                                ) : (
                                                    <IconUpload className="w-4 h-4 mr-1" />
                                                )}
                                                Migrar
                                            </button>
                                        )}

                                        {/* Botón de Migración manual (solo si no tiene storage_path, no tiene sourceFileId y es admin) */}
                                        {!doc.storage_path && 
                                         !documentSourceFileIds.has(doc.id) && 
                                         user?.role?.name === 'admin' && (
                                            <button
                                                onClick={() => handleMigrateClick(doc)}
                                                className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                title="Subir archivo manualmente a Supabase Storage"
                                            >
                                                <IconUpload className="w-4 h-4 mr-1" />
                                                Subir
                                            </button>
                                        )}

                                        {/* Dropdown para cambiar institución (solo admin) */}
                                        {user?.role?.name === 'admin' && institutions.length > 0 && (
                                            <select
                                                value={doc.institution_id || ''}
                                                onChange={(e) => {
                                                    const newInstitutionId = parseInt(e.target.value);
                                                    if (!isNaN(newInstitutionId) && newInstitutionId !== doc.institution_id) {
                                                        handleChangeInstitution(doc, newInstitutionId);
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="px-2 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                title="Cambiar institución"
                                            >
                                                {institutions.map((inst) => (
                                                    <option key={inst.id} value={inst.id}>
                                                        {inst.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                </div>

                {documents.length === 0 && (
                    <div className="text-center py-12">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay documentos</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            No se encontraron documentos procesados
                        </p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {selectedDocument && isAssignmentModalOpen && (
                <DocumentAssignmentModal
                    onClose={() => {
                        setIsAssignmentModalOpen(false);
                        setSelectedDocument(null);
                    }}
                    documentId={selectedDocument.id}
                    documentTitle={selectedDocument.title}
                    institutionId={selectedDocument.institution_id || user?.institution_id || 0}
                    onAssigned={() => {
                        setIsAssignmentModalOpen(false);
                        setSelectedDocument(null);
                        loadDocuments();
                    }}
                />
            )}

            {viewingDocument && (
                <SecureDocumentViewer
                    documentId={viewingDocument.id}
                    title={viewingDocument.title}
                    storagePath={viewingDocument.storage_path || undefined}
                    fileUrl={viewingDocument.file_url}
                    totalChunks={viewingDocument.total_chunks}
                    description={viewingDocument.description}
                    onClose={closeViewer}
                />
            )}
        </div>
    );
};
