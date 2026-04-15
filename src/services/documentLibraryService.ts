import { supabase, supabaseAnonKey } from '@/lib/supabase';

// =====================================================
// TIPOS
// =====================================================

export interface ProcessedDocument {
    id: string;
    institution_id: number;
    institution_name?: string; // Nombre de la institución
    title: string;
    description?: string;
    file_url?: string;
    file_type?: string;
    file_size_bytes?: number;
    total_chunks: number;
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    processed_by?: string;
    created_at: string;
    updated_at: string;
    storage_path?: string;
    original_source?: string;
    assignment_count?: number;
    assigned_courses?: Array<{
        course_id: number;
        course_title: string;
        course_code: string;
    }>;
}

export interface DocumentCourseAssignment {
    id: string;
    document_id: string;
    course_id: number;
    assigned_by?: string;
    assigned_at: string;
    notes?: string;
}

export interface DocumentWithCourses extends ProcessedDocument {
    assigned_courses?: Array<{
        course_id: number;
        course_title: string;
        course_code: string;
        assigned_at: string;
    }>;
}

export const documentLibraryService = {
    /**
     * Obtiene todos los documentos de una institución con información de cursos
     */
    async getInstitutionDocuments(institutionId: number): Promise<ProcessedDocument[]> {
        const { data, error } = await supabase
            .from('processed_documents')
            .select(`
                *,
                institutions:institution_id (
                    id,
                    name
                ),
                document_course_assignments (
                    course_id,
                    courses:course_id (
                        id,
                        title,
                        code
                    )
                )
            `)
            .eq('institution_id', institutionId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching institution documents:', error);
            throw error;
        }

        // Procesar datos para incluir información de institución y cursos
        const processedData = (data || []).map((doc: any) => ({
            ...doc,
            institution_name: doc.institutions?.name || 'Sin institución',
            assigned_courses: doc.document_course_assignments?.map((assignment: any) => ({
                course_id: assignment.course_id,
                course_title: assignment.courses?.title || 'Curso desconocido',
                course_code: assignment.courses?.code || ''
            })) || [],
            assignment_count: doc.document_course_assignments?.length || 0
        }));

        return processedData;
    },

    /**
     * Obtiene documentos según el rol del usuario con información de institución y cursos
     */
    async getDocumentsByRole(userRole: string, institutionId?: number): Promise<ProcessedDocument[]> {
        try {
            console.log('📄 getDocumentsByRole called:', { userRole, institutionId });
            
            // Super admin ve todos los documentos con información de institución y cursos
            if (userRole === 'admin') {
                console.log('📄 Admin: Fetching documents with institution and courses', { institutionId });
                
                // Si se especifica institutionId, filtrar por esa institución
                // Si es undefined/null, mostrar todas
                let query = supabase
                    .from('processed_documents')
                    .select('*');
                
                if (institutionId !== undefined && institutionId !== null) {
                    query = query.eq('institution_id', institutionId);
                    console.log('📄 Admin: Filtering by institution_id:', institutionId);
                } else {
                    console.log('📄 Admin: Showing all documents (no institution filter)');
                }
                
                const { data: documentsData, error: docsError } = await query
                    .order('created_at', { ascending: false });

                if (docsError) {
                    console.error('📄 Error fetching all documents:', docsError);
                    throw docsError;
                }

                if (!documentsData || documentsData.length === 0) {
                    console.log('📄 Admin: No documents found');
                    return [];
                }

                console.log('📄 Admin: Found', documentsData.length, 'documents');

                // Obtener información de instituciones para todos los documentos
                const institutionIds = [...new Set(documentsData.map((d: any) => d.institution_id).filter(Boolean))];
                const { data: institutionsData } = await supabase
                    .from('institutions')
                    .select('id, name')
                    .in('id', institutionIds);

                const institutionsMap = new Map((institutionsData || []).map((i: any) => [i.id, i.name]));

                // Obtener asignaciones de cursos para todos los documentos
                const documentIds = documentsData.map((d: any) => d.id);
                const { data: assignmentsData } = await supabase
                    .from('document_course_assignments')
                    .select(`
                        document_id,
                        course_id,
                        courses:course_id (
                            id,
                            title,
                            code
                        )
                    `)
                    .in('document_id', documentIds);

                // Crear mapa de asignaciones por documento
                const assignmentsMap = new Map<string, any[]>();
                (assignmentsData || []).forEach((assignment: any) => {
                    if (!assignmentsMap.has(assignment.document_id)) {
                        assignmentsMap.set(assignment.document_id, []);
                    }
                    assignmentsMap.get(assignment.document_id)!.push({
                        course_id: assignment.course_id,
                        course_title: assignment.courses?.title || 'Curso desconocido',
                        course_code: assignment.courses?.code || ''
                    });
                });

                // Procesar datos para incluir información de institución y cursos
                const processedData = documentsData.map((doc: any) => ({
                    ...doc,
                    institution_name: doc.institution_id ? (institutionsMap.get(doc.institution_id) || `Institución ${doc.institution_id}`) : 'Sin institución',
                    assigned_courses: assignmentsMap.get(doc.id) || [],
                    assignment_count: assignmentsMap.get(doc.id)?.length || 0
                }));
                
                console.log('📄 Admin: Documents processed:', processedData.length);
                console.log('📄 Admin: Institutions found:', institutionsMap.size);
                console.log('📄 Admin: Documents with assignments:', processedData.filter(d => d.assignment_count > 0).length);
                
                return processedData;
            }

            // Admin-campus, supervisor y coordinator ven documentos de su institución
            if (['admin-campus', 'supervisor', 'coordinator', 'teacher'].includes(userRole)) {
                if (!institutionId) {
                    console.warn('📄 Warning: institutionId not provided for role:', userRole);
                    // Intentar obtener documentos sin filtrar por institución (las políticas RLS lo manejarán)
                    const { data: documentsData, error } = await supabase
                        .from('processed_documents')
                        .select('*')
                        .order('created_at', { ascending: false });
                    
                    if (error) {
                        console.error('📄 Error fetching documents (no institution filter):', error);
                        throw error;
                    }
                    
                    if (!documentsData || documentsData.length === 0) {
                        console.log('📄 Documents fetched (RLS filtered): 0');
                        return [];
                    }
                    
                    // Obtener información de instituciones para todos los documentos
                    const institutionIds = [...new Set(documentsData.map((d: any) => d.institution_id).filter(Boolean))];
                    const { data: institutionsData } = await supabase
                        .from('institutions')
                        .select('id, name')
                        .in('id', institutionIds);
                    
                    const institutionsMap = new Map((institutionsData || []).map((i: any) => [i.id, i.name]));
                    
                    // Obtener asignaciones de cursos para todos los documentos
                    const documentIds = documentsData.map((d: any) => d.id);
                    const { data: assignmentsData } = await supabase
                        .from('document_course_assignments')
                        .select(`
                            document_id,
                            course_id,
                            courses:course_id (
                                id,
                                title,
                                code
                            )
                        `)
                        .in('document_id', documentIds);
                    
                    // Crear mapa de asignaciones por documento
                    const assignmentsMap = new Map<string, any[]>();
                    (assignmentsData || []).forEach((assignment: any) => {
                        if (!assignmentsMap.has(assignment.document_id)) {
                            assignmentsMap.set(assignment.document_id, []);
                        }
                        assignmentsMap.get(assignment.document_id)!.push({
                            course_id: assignment.course_id,
                            course_title: assignment.courses?.title || 'Curso desconocido',
                            course_code: assignment.courses?.code || ''
                        });
                    });
                    
                    // Procesar datos para incluir información de institución y cursos
                    const processedData = documentsData.map((doc: any) => ({
                        ...doc,
                        institution_name: doc.institution_id ? (institutionsMap.get(doc.institution_id) || `Institución ${doc.institution_id}`) : 'Sin institución',
                        assigned_courses: assignmentsMap.get(doc.id) || [],
                        assignment_count: assignmentsMap.get(doc.id)?.length || 0
                    }));
                    
                    console.log('📄 Documents fetched (RLS filtered):', processedData.length);
                    console.log('📄 Institutions found:', institutionsMap.size);
                    return processedData;
                }
                
                console.log('📄 Fetching documents for institution:', institutionId);
                return this.getInstitutionDocuments(institutionId);
            }

            console.warn('📄 Unknown role or no access:', userRole);
            return [];
        } catch (error: any) {
            console.error('📄 Error fetching documents by role:', error);
            console.error('  - Message:', error.message);
            console.error('  - Code:', error.code);
            console.error('  - Details:', error.details);
            throw error; // Re-lanzar para que el componente pueda manejarlo
        }
    },

    /**
     * Obtiene un documento por ID
     */
    async getDocumentById(documentId: string): Promise<ProcessedDocument | null> {
        const { data, error } = await supabase
            .from('processed_documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (error) {
            console.error('Error fetching document:', error);
            throw error;
        }

        return data;
    },

    /**
     * Crea un nuevo documento en la biblioteca
     */
    async createDocument(document: Omit<ProcessedDocument, 'id' | 'created_at' | 'updated_at'>): Promise<ProcessedDocument> {
        const { data: user } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('processed_documents')
            .insert({
                ...document,
                processed_by: user.user?.id
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating document:', error);
            throw error;
        }

        return data;
    },

    /**
     * Actualiza un documento existente
     */
    async updateDocument(documentId: string, updates: Partial<ProcessedDocument>): Promise<ProcessedDocument> {
        const { data, error } = await supabase
            .from('processed_documents')
            .update(updates)
            .eq('id', documentId)
            .select()
            .single();

        if (error) {
            console.error('Error updating document:', error);
            throw error;
        }

        return data;
    },

    /**
     * Elimina un documento (y todas sus asignaciones)
     */
    async deleteDocument(documentId: string): Promise<void> {
        const { error } = await supabase
            .from('processed_documents')
            .delete()
            .eq('id', documentId);

        if (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    },

    /**
     * Asigna un documento a un curso
     */
    async assignDocumentToCourse(
        documentId: string,
        courseId: number,
        notes?: string
    ): Promise<DocumentCourseAssignment> {
        const { data: user } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('document_course_assignments')
            .insert({
                document_id: documentId,
                course_id: courseId,
                assigned_by: user.user?.id,
                notes
            })
            .select()
            .single();

        if (error) {
            console.error('Error assigning document to course:', error);
            throw error;
        }

        return data;
    },

    /**
     * Desasigna un documento de un curso
     */
    async unassignDocumentFromCourse(documentId: string, courseId: number): Promise<void> {
        const { error } = await supabase
            .from('document_course_assignments')
            .delete()
            .eq('document_id', documentId)
            .eq('course_id', courseId);

        if (error) {
            console.error('Error unassigning document from course:', error);
            throw error;
        }
    },

    /**
     * Obtiene todos los cursos asignados a un documento
     */
    async getDocumentCourses(documentId: string) {
        const { data, error } = await supabase.rpc('get_document_courses', {
            p_document_id: documentId
        });

        if (error) {
            console.error('Error fetching document courses:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Obtiene todos los documentos asignados a un curso
     */
    async getCourseDocuments(courseId: number) {
        const { data, error } = await supabase.rpc('get_course_documents', {
            p_course_id: courseId
        });

        if (error) {
            console.error('Error fetching course documents:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Obtiene documentos con sus cursos asignados
     */
    async getDocumentsWithCourses(institutionId: number): Promise<DocumentWithCourses[]> {
        const documents = await this.getInstitutionDocuments(institutionId);

        const documentsWithCourses = await Promise.all(
            documents.map(async (doc) => {
                const courses = await this.getDocumentCourses(doc.id);
                return {
                    ...doc,
                    assigned_courses: courses
                };
            })
        );

        return documentsWithCourses;
    },

    /**
     * Busca documentos por título o descripción
     */
    async searchDocuments(institutionId: number, searchTerm: string): Promise<ProcessedDocument[]> {
        const { data, error } = await supabase
            .from('processed_documents')
            .select('*')
            .eq('institution_id', institutionId)
            .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error searching documents:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Obtiene estadísticas de documentos por institución
     */
    async getInstitutionStats(institutionId: number) {
        const { data: documents } = await supabase
            .from('processed_documents')
            .select('id, total_chunks, processing_status')
            .eq('institution_id', institutionId);

        const { data: assignments } = await supabase
            .from('document_course_assignments')
            .select('document_id')
            .in('document_id', documents?.map(d => d.id) || []);

        return {
            total_documents: documents?.length || 0,
            total_chunks: documents?.reduce((sum, doc) => sum + (doc.total_chunks || 0), 0) || 0,
            total_assignments: assignments?.length || 0,
            by_status: {
                completed: documents?.filter(d => d.processing_status === 'completed').length || 0,
                processing: documents?.filter(d => d.processing_status === 'processing').length || 0,
                pending: documents?.filter(d => d.processing_status === 'pending').length || 0,
                failed: documents?.filter(d => d.processing_status === 'failed').length || 0
            }
        };
    },

    /**
     * Obtiene el sourceFileId de Google Drive para un documento
     * Busca en chunks y en materials de cursos asignados
     */
    async getDocumentSourceFileId(documentId: string): Promise<string | null> {
        try {
            // 1. Buscar en metadata de chunks
            const { data: chunks, error: chunksError } = await supabase
                .from('course_content_chunks')
                .select('metadata')
                .eq('document_id', documentId)
                .not('metadata', 'is', null)
                .limit(10);

            if (!chunksError && chunks) {
                for (const chunk of chunks) {
                    const sourceFileId = chunk.metadata?.sourceFileId;
                    if (sourceFileId) {
                        return sourceFileId;
                    }
                }
            }

            // 2. Buscar en materials de cursos asignados
            const { data: assignments } = await supabase
                .from('document_course_assignments')
                .select('course_id')
                .eq('document_id', documentId)
                .limit(5);

            if (assignments && assignments.length > 0) {
                const courseIds = assignments.map(a => a.course_id);
                const { data: materials } = await supabase
                    .from('materials')
                    .select('metadata')
                    .in('course_id', courseIds)
                    .not('metadata', 'is', null)
                    .limit(10);

                if (materials) {
                    for (const material of materials) {
                        const sourceFileId = material.metadata?.sourceFileId;
                        if (sourceFileId) {
                            return sourceFileId;
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting document sourceFileId:', error);
            return null;
        }
    },

    /**
     * Migra un documento desde Google Drive a Supabase Storage
     */
    async migrateDocumentFromDrive(
        documentId: string,
        sourceFileId: string,
        fileName: string,
        mimeType?: string
    ): Promise<{ success: boolean; bucketPath?: string; error?: string }> {
        try {
            // Validar parámetros requeridos
            if (!documentId) {
                throw new Error('ID del documento es requerido');
            }
            if (!sourceFileId) {
                throw new Error('ID del archivo fuente (sourceFileId) es requerido');
            }
            if (!fileName) {
                throw new Error('Nombre del archivo es requerido');
            }

            // Obtener el documento para obtener información adicional
            const document = await this.getDocumentById(documentId);
            if (!document) {
                throw new Error('Documento no encontrado');
            }

            // Obtener el primer curso asignado para la migración
            const { data: assignments, error: assignmentsError } = await supabase
                .from('document_course_assignments')
                .select('course_id')
                .eq('document_id', documentId)
                .limit(1)
                .maybeSingle();

            if (assignmentsError) {
                console.error('Error obteniendo asignaciones:', assignmentsError);
                throw new Error(`Error al obtener asignaciones del documento: ${assignmentsError.message}`);
            }

            const courseId = assignments?.course_id || null;
            if (!courseId) {
                throw new Error('El documento debe estar asignado a un curso para migrarlo. Por favor, asigna el documento a un curso primero.');
            }

            // Preparar parámetros para la Edge Function
            const functionParams = {
                materialId: documentId,
                sourceFileId,
                courseId,
                fileName: fileName || document.title,
                mimeType: mimeType || document.file_type || 'application/pdf'
            };

            console.log('📤 Llamando a Edge Function migrate-drive-to-bucket con parámetros:', {
                ...functionParams,
                sourceFileId: sourceFileId.substring(0, 20) + '...' // Solo mostrar parte del ID por seguridad
            });

            // Verificar que el usuario esté autenticado antes de llamar a la Edge Function
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.');
            }

            // Refrescar el token si es necesario (por si ha expirado)
            let currentSession = session;
            if (session.expires_at && session.expires_at < Date.now() / 1000) {
                console.log('🔄 Token expirado, refrescando...');
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession(session);
                if (refreshError) {
                    console.error('❌ Error al refrescar sesión:', refreshError);
                    throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                }
                if (refreshData?.session) {
                    currentSession = refreshData.session;
                }
            }

            if (!currentSession?.access_token) {
                throw new Error('No se pudo obtener el token de autenticación. Por favor, inicia sesión nuevamente.');
            }

            console.log('✅ Sesión válida, llamando a Edge Function con token');

            // Llamar a Edge Function para descargar y subir a bucket
            // Pasar explícitamente el token de autenticación en el header Authorization
            const { data: migrateResult, error: migrateError } = await supabase.functions.invoke('migrate-drive-to-bucket', {
                body: functionParams,
                headers: {
                    Authorization: `Bearer ${currentSession.access_token}`,
                    apikey: supabaseAnonKey || ''
                }
            });

            if (migrateError) {
                console.error('❌ Error de Edge Function:', migrateError);
                
                // Proporcionar mensajes de error más descriptivos
                if (migrateError.status === 403) {
                    // Error 403: Permisos insuficientes en Google Drive
                    throw new Error('El token de Google Drive no tiene los permisos necesarios. Por favor, reconecta tu cuenta de Google Drive desde tu perfil para otorgar permisos completos.');
                } else if (migrateError.status === 401) {
                    throw new Error('No estás autenticado o no tienes tokens de Google Drive. Por favor, conecta tu cuenta de Google Drive desde tu perfil.');
                } else if (migrateError.message) {
                    throw new Error(`Error en la función de migración: ${migrateError.message}`);
                } else if (migrateError.status === 500) {
                    throw new Error('Error interno del servidor al migrar el archivo. Verifica los logs de la Edge Function en Supabase.');
                } else if (migrateError.status === 400) {
                    throw new Error('Parámetros inválidos. Verifica que el sourceFileId y courseId sean correctos.');
                } else {
                    throw new Error(`Error al migrar archivo (código ${migrateError.status || 'desconocido'})`);
                }
            }

            // Validar respuesta de la función
            if (!migrateResult) {
                throw new Error('La función de migración no devolvió resultados');
            }

            if (!migrateResult.bucketPath) {
                throw new Error('La función de migración no devolvió la ruta del bucket');
            }

            // Actualizar el documento con la nueva información
            const { error: updateError } = await supabase
                .from('processed_documents')
                .update({
                    storage_path: migrateResult.bucketPath,
                    file_url: migrateResult.publicUrl, // URL pública del bucket
                    file_type: mimeType || document.file_type,
                    original_source: document.file_url || `https://drive.google.com/file/d/${sourceFileId}/view`
                })
                .eq('id', documentId);

            if (updateError) throw updateError;

            return {
                success: true,
                bucketPath: migrateResult.bucketPath
            };

        } catch (error: any) {
            console.error('❌ Error en migrateDocumentFromDrive:', {
                error,
                message: error?.message,
                status: error?.status,
                documentId,
                sourceFileId: sourceFileId?.substring(0, 20) + '...',
                fileName
            });
            
            // Proporcionar mensajes de error más específicos
            let errorMessage = 'Error desconocido al migrar archivo';
            
            if (error?.message) {
                errorMessage = error.message;
            } else if (error?.error_description) {
                errorMessage = error.error_description;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            return {
                success: false,
                error: errorMessage
            };
        }
    },

    /**
     * Actualiza la institución de un documento
     */
    async updateDocumentInstitution(documentId: string, institutionId: number): Promise<void> {
        const { error } = await supabase
            .from('processed_documents')
            .update({ institution_id: institutionId })
            .eq('id', documentId);

        if (error) {
            console.error('Error updating document institution:', error);
            throw error;
        }
    },

    /**
     * Obtiene todas las carreras disponibles (para asignación)
     */
    async getAvailableCareers(institutionId?: number): Promise<Array<{ id: number; name: string; code: string }>> {
        let query = supabase
            .from('careers')
            .select('id, name, code')
            .eq('is_active', true)
            .order('name');

        if (institutionId) {
            // Filtrar por institución si se proporciona
            query = query.eq('institution_id', institutionId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching careers:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Obtiene todos los cursos disponibles (para asignación)
     */
    async getAvailableCourses(institutionId?: number): Promise<Array<{ id: number; title: string; code: string; teacher_name?: string }>> {
        let query = supabase
            .from('courses')
            .select(`
                id,
                title,
                code,
                teacher_id,
                users!courses_teacher_id_fkey(first_name, last_name)
            `)
            .eq('status', 'active')
            .order('title');

        if (institutionId) {
            query = query.eq('institution_id', institutionId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching courses:', error);
            throw error;
        }

        return (data || []).map((course: any) => ({
            id: course.id,
            title: course.title,
            code: course.code || '',
            teacher_name: course.users ? `${course.users.first_name} ${course.users.last_name}` : undefined
        }));
    },

    /**
     * Obtiene todas las unidades disponibles de un curso
     */
    async getAvailableUnits(courseId: number): Promise<Array<{ id: string; title: string; number: number; course_id: number }>> {
        const { data, error } = await supabase
            .from('course_units')
            .select('id, title, number, course_id')
            .eq('course_id', courseId)
            .order('number');

        if (error) {
            console.error('Error fetching units:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Obtiene todas las sesiones disponibles de un curso
     */
    async getAvailableSessions(courseId: number): Promise<Array<{ id: string; title: string; course_id: number; unit_id?: string; starts_at?: string }>> {
        const { data, error } = await supabase
            .from('sessions')
            .select('id, title, course_id, unit_id, starts_at')
            .eq('course_id', courseId)
            .order('starts_at', { ascending: true, nullsFirst: true });

        if (error) {
            console.error('Error fetching sessions:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Asigna un documento a múltiples carreras
     */
    async assignDocumentToCareers(documentId: string, careerIds: number[], notes?: string): Promise<void> {
        const { data: user } = await supabase.auth.getUser();

        const assignments = careerIds.map(careerId => ({
            document_id: documentId,
            career_id: careerId,
            assigned_by: user.user?.id,
            notes
        }));

        const { error } = await supabase
            .from('document_career_assignments')
            .upsert(assignments, {
                onConflict: 'document_id,career_id',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('Error assigning document to careers:', error);
            throw error;
        }
    },

    /**
     * Asigna un documento a múltiples cursos
     */
    async assignDocumentToCourses(documentId: string, courseIds: number[], notes?: string): Promise<void> {
        const { data: user } = await supabase.auth.getUser();

        const assignments = courseIds.map(courseId => ({
            document_id: documentId,
            course_id: courseId,
            assigned_by: user.user?.id,
            notes
        }));

        const { error } = await supabase
            .from('document_course_assignments')
            .upsert(assignments, {
                onConflict: 'document_id,course_id',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('Error assigning document to courses:', error);
            throw error;
        }
    },

    /**
     * Asigna un documento a múltiples unidades
     */
    async assignDocumentToUnits(documentId: string, unitIds: string[], notes?: string): Promise<void> {
        const { data: user } = await supabase.auth.getUser();

        const assignments = unitIds.map(unitId => ({
            document_id: documentId,
            unit_id: unitId,
            assigned_by: user.user?.id,
            notes
        }));

        const { error } = await supabase
            .from('document_unit_assignments')
            .upsert(assignments, {
                onConflict: 'document_id,unit_id',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('Error assigning document to units:', error);
            throw error;
        }
    },

    /**
     * Asigna un documento a múltiples sesiones
     */
    async assignDocumentToSessions(documentId: string, sessionIds: string[], notes?: string): Promise<void> {
        const { data: user } = await supabase.auth.getUser();

        const assignments = sessionIds.map(sessionId => ({
            document_id: documentId,
            session_id: sessionId,
            assigned_by: user.user?.id,
            notes
        }));

        const { error } = await supabase
            .from('document_session_assignments')
            .upsert(assignments, {
                onConflict: 'document_id,session_id',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('Error assigning document to sessions:', error);
            throw error;
        }
    },

    /**
     * Obtiene todas las carreras asignadas a un documento
     */
    async getDocumentCareers(documentId: string) {
        const { data, error } = await supabase.rpc('get_document_careers', {
            p_document_id: documentId
        });

        if (error) {
            console.error('Error fetching document careers:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Obtiene todas las unidades asignadas a un documento
     */
    async getDocumentUnits(documentId: string) {
        try {
            const { data, error } = await supabase.rpc('get_document_units', {
                p_document_id: documentId
            });

            if (error) {
                // Si la función no existe, retornar array vacío en lugar de lanzar error
                if (error.code === '42883' || error.message?.includes('does not exist')) {
                    console.warn('Función get_document_units no existe aún. Ejecuta el script SQL 141 y 142.');
                    return [];
                }
                console.error('Error fetching document units:', error);
                throw error;
            }

            return data || [];
        } catch (error: any) {
            console.error('Error fetching document units:', error);
            // Retornar array vacío en caso de error para no romper la UI
            return [];
        }
    },

    /**
     * Obtiene todas las sesiones asignadas a un documento
     */
    async getDocumentSessions(documentId: string) {
        try {
            const { data, error } = await supabase.rpc('get_document_sessions', {
                p_document_id: documentId
            });

            if (error) {
                // Si la función no existe, retornar array vacío en lugar de lanzar error
                if (error.code === '42883' || error.message?.includes('does not exist')) {
                    console.warn('Función get_document_sessions no existe aún. Ejecuta el script SQL 141 y 142.');
                    return [];
                }
                console.error('Error fetching document sessions:', error);
                throw error;
            }

            return data || [];
        } catch (error: any) {
            console.error('Error fetching document sessions:', error);
            // Retornar array vacío en caso de error para no romper la UI
            return [];
        }
    },

    /**
     * Desasigna un documento de una carrera
     */
    async unassignDocumentFromCareer(documentId: string, careerId: number): Promise<void> {
        const { error } = await supabase
            .from('document_career_assignments')
            .delete()
            .eq('document_id', documentId)
            .eq('career_id', careerId);

        if (error) {
            console.error('Error unassigning document from career:', error);
            throw error;
        }
    },

    /**
     * Desasigna un documento de una unidad
     */
    async unassignDocumentFromUnit(documentId: string, unitId: string): Promise<void> {
        const { error } = await supabase
            .from('document_unit_assignments')
            .delete()
            .eq('document_id', documentId)
            .eq('unit_id', unitId);

        if (error) {
            console.error('Error unassigning document from unit:', error);
            throw error;
        }
    },

    /**
     * Desasigna un documento de una sesión
     */
    async unassignDocumentFromSession(documentId: string, sessionId: string): Promise<void> {
        const { error } = await supabase
            .from('document_session_assignments')
            .delete()
            .eq('document_id', documentId)
            .eq('session_id', sessionId);

        if (error) {
            console.error('Error unassigning document from session:', error);
            throw error;
        }
    }
};
