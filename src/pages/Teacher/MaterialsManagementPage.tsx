// pages/MaterialsManagementPage.tsx
// Página para administrar materiales procesados para RAG y materiales para descargar

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { materialService, Material, courseService, Course } from '@/services/teacherCourses';
import { MaterialAssignmentModal } from '@/components/Features/MaterialAssignmentModal';
import { supabase } from '@/lib/supabase';
import { subscribeToAllJobs } from '@/services/firestoreService';
import { getAllJobs } from '@/services/firestoreService';
import type { FileProcessingJob } from '@/types/fileProcessing';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
  FileText,
  Download,
  Database,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  BookOpen,
  FileCheck,
  Tag,
  Brain,
  ExternalLink,
  ChevronRight,
  Share2,
  Users,
  Cloud,
  Upload,
  HardDrive,
  MoreVertical,
  ChevronDown,
  Hash
} from 'lucide-react';
import type { MaterialCategory } from '@/types/fileProcessing';

type MaterialPurpose = 'rag' | 'download' | 'both' | 'all';
type RAGStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'all';
type MaterialCategoryFilter = MaterialCategory | 'all';

export const MaterialsManagementPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Verificar permisos - temporalmente permitir estudiantes para testing
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Verificar si el usuario tiene permisos para acceder
    const allowedRoles = ['admin', 'admin-campus', 'coordinator', 'supervisor', 'teacher', 'student'];
    if (!allowedRoles.includes(user.role?.name || '')) {
      alert('No tienes permisos para acceder a esta página');
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Record<number, any[]>>({}); // Unidades por curso
  const [sessions, setSessions] = useState<Record<number, any[]>>({}); // Sesiones por curso
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedPurpose, setSelectedPurpose] = useState<MaterialPurpose>('all');
  const [selectedRAGStatus, setSelectedRAGStatus] = useState<RAGStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selección múltiple
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());

  // Chunks procesados
  const [materialChunks, setMaterialChunks] = useState<Record<string, number>>({});
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [selectedMaterialForChunks, setSelectedMaterialForChunks] = useState<string | null>(null);
  const [chunksContent, setChunksContent] = useState<any[]>([]);

  // Compartir con estudiantes
  const [sharingMaterial, setSharingMaterial] = useState<string | null>(null);
  const [sharingStatus, setSharingStatus] = useState<{ success: number; failed: number } | null>(null);

  // Migración y procesamiento
  const [migratingMaterial, setMigratingMaterial] = useState<string | null>(null);
  const [processingMaterial, setProcessingMaterial] = useState<string | null>(null);

  // Referencia para el scroll de la tabla
  const tableScrollRef = useRef<HTMLDivElement>(null);
  
  // Estado para menús desplegables de acciones
  const [openActionMenus, setOpenActionMenus] = useState<Set<string>>(new Set());
  
  const toggleActionMenu = (materialId: string) => {
    setOpenActionMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };
  
  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openActionMenus.size > 0) {
        const target = event.target as HTMLElement;
        if (!target.closest('.action-menu-container')) {
          setOpenActionMenus(new Set());
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openActionMenus]);

  // Modal de asignación de cursos
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedMaterialForAssignment, setSelectedMaterialForAssignment] = useState<Material | null>(null);

  // Cursos asignados por material
  const [materialCourses, setMaterialCourses] = useState<Record<string, Array<{
    course_id: number;
    course_title: string;
    course_code: string;
  }>>>({});

  // Unidades asignadas por material
  const [materialUnits, setMaterialUnits] = useState<Record<string, Array<{
    unit_id: string;
    unit_title: string;
    unit_number: number;
    course_id: number;
    course_title: string;
  }>>>({});

  // Sesiones asignadas por material
  const [materialSessions, setMaterialSessions] = useState<Record<string, Array<{
    session_id: string;
    session_title: string;
    course_id: number;
    course_title: string;
    unit_id?: string;
    unit_title?: string;
  }>>>({});

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    rag: 0,
    download: 0,
    both: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Agregar este nuevo useEffect para cargar cursos asignados cuando cambien los materiales
  useEffect(() => {
    if (materials.length > 0) {
      loadAllMaterialAssignments();
    }
  }, [materials]);

  useEffect(() => {
    calculateStats();
  }, [materials]);

  useEffect(() => {
    console.log(`📊 [MaterialsManagementPage] useEffect para loadChunksCount: materials.length = ${materials.length}`);
    if (materials.length > 0) {
      console.log(`📊 [MaterialsManagementPage] Ejecutando loadChunksCount para ${materials.length} materiales`);
      loadChunksCount();
    } else {
      console.log(`📊 [MaterialsManagementPage] No hay materiales, saltando loadChunksCount`);
    }
  }, [materials]);

  // Sincronizar estado de materiales con jobs de Firestore
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToAllJobs(user.id, async (jobs: FileProcessingJob[]) => {
      // Usar el estado actual de materials sin incluirlo en dependencias
      setMaterials(currentMaterials => {
        // Buscar materiales que necesitan actualización
        const materialsToUpdate: { id: string; status: 'processing' | 'completed' | 'failed' }[] = [];

        for (const material of currentMaterials) {
          // Buscar job asociado por materialId o sourceFileId
          const job = jobs.find(j =>
            j.metadata?.materialId === material.id ||
            j.metadata?.sourceFileId === material.metadata?.sourceFileId
          );

          if (job) {
            const currentStatus = material.rag_status;
            const jobStatus = job.status;

            // Si el estado no coincide, agregar a la lista de actualización
            if (
              (jobStatus === 'completed' && currentStatus !== 'completed') ||
              (jobStatus === 'failed' && currentStatus !== 'failed') ||
              (jobStatus === 'processing' && currentStatus !== 'processing')
            ) {
              materialsToUpdate.push({
                id: material.id,
                status: jobStatus as 'processing' | 'completed' | 'failed'
              });
            }
          }
        }

        // Actualizar materiales en lote
        if (materialsToUpdate.length > 0) {
          console.log(`🔄 Sincronizando ${materialsToUpdate.length} materiales con estado de jobs`);

          // Actualizar en Supabase y luego actualizar estado local
          materialsToUpdate.forEach(async (update) => {
            try {
              const updateData: any = {
                rag_status: update.status,
              };

              if (update.status === 'completed') {
                updateData.processed_at = new Date().toISOString();
              }

              const { error } = await supabase
                .from('materials')
                .update(updateData)
                .eq('id', update.id);

              if (error) {
                console.error(`Error actualizando material ${update.id}:`, error);
              }
            } catch (err: any) {
              console.error(`Error sincronizando material ${update.id}:`, err);
            }
          });

          // Actualizar estado local
          return currentMaterials.map(m => {
            const update = materialsToUpdate.find(u => u.id === m.id);
            if (update) {
              return {
                ...m,
                rag_status: update.status,
                processed_at: update.status === 'completed' ? new Date().toISOString() : m.processed_at
              };
            }
            return m;
          });
        }

        return currentMaterials;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Limpiar selección cuando cambian los filtros
  useEffect(() => {
    setSelectedMaterials(new Set());
  }, [selectedCourse, selectedPurpose, selectedRAGStatus, selectedCategory, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar cursos del profesor
      const teacherCourses = await courseService.getMyCourses(user?.id || '');
      console.log('📚 Cursos cargados:', teacherCourses.length, teacherCourses);

      if (teacherCourses.length === 0) {
        console.warn('⚠️ No se encontraron cursos para el profesor');
        setError('No tienes cursos creados. Crea un curso primero para poder gestionar materiales.');
      }

      setCourses(teacherCourses);

      // Cargar unidades y sesiones de todos los cursos
      const unitsMap: Record<number, any[]> = {};
      const sessionsMap: Record<number, any[]> = {};

      for (const course of teacherCourses) {
        try {
          // Cargar unidades del curso
          const { data: unitsData } = await supabase
            .from('course_units')
            .select('id, number, title, course_id')
            .eq('course_id', course.id)
            .order('number', { ascending: true });

          if (unitsData) {
            unitsMap[course.id] = unitsData;
          }

          // Cargar sesiones del curso
          const { data: sessionsData } = await supabase
            .from('sessions')
            .select('id, title, unit_id, course_id')
            .eq('course_id', course.id)
            .order('starts_at', { ascending: true });

          if (sessionsData) {
            sessionsMap[course.id] = sessionsData;
          }
        } catch (err) {
          console.error(`Error cargando unidades/sesiones del curso ${course.id}:`, err);
        }
      }

      setUnits(unitsMap);
      setSessions(sessionsMap);

      // Cargar todos los materiales de los cursos del profesor de forma más eficiente
      let allMaterials: Material[] = [];
      try {
        // Intentar usar la nueva función más eficiente
        allMaterials = await materialService.getTeacherMaterials(user?.id || '');
      } catch (err) {
        console.warn('Error usando getTeacherMaterials, usando método alternativo:', err);
        // Fallback: cargar por cada curso
        for (const course of teacherCourses) {
          try {
            const courseMaterials = await materialService.getCourseMaterials(course.id);
            allMaterials.push(...courseMaterials);
          } catch (courseErr) {
            console.error(`Error cargando materiales del curso ${course.id}:`, courseErr);
          }
        }
      }

      setMaterials(allMaterials);
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar los materiales');
    } finally {
      setLoading(false);
    }
  };

  // Agregar esta función aquí
  const loadAllMaterialAssignments = async () => {
    if (materials.length === 0) return;

    try {
      console.log('🔄 Cargando asignaciones para', materials.length, 'materiales...');

      const coursesMap: Record<string, Array<{
        course_id: number;
        course_title: string;
        course_code: string;
      }>> = {};

      const unitsMap: Record<string, Array<{
        unit_id: string;
        unit_title: string;
        unit_number: number;
        course_id: number;
        course_title: string;
      }>> = {};

      const sessionsMap: Record<string, Array<{
        session_id: string;
        session_title: string;
        course_id: number;
        course_title: string;
        unit_id?: string;
        unit_title?: string;
      }>> = {};

      // Cargar asignaciones para todos los materiales en paralelo
      const promises = materials.map(async (material) => {
        try {
          const [assignedCourses, assignedUnits, assignedSessions] = await Promise.all([
            materialService.getMaterialCourses(material.id).catch((err) => {
              console.warn(`Error cargando cursos para material ${material.id}:`, err);
              return [];
            }),
            materialService.getMaterialUnits(material.id).catch((err) => {
              console.warn(`Error cargando unidades para material ${material.id}:`, err);
              return [];
            }),
            materialService.getMaterialSessions(material.id).catch((err) => {
              console.warn(`Error cargando sesiones para material ${material.id}:`, err);
              return [];
            })
          ]);

          if (assignedCourses.length > 0) {
            coursesMap[material.id] = assignedCourses;
          }
          if (assignedUnits.length > 0) {
            unitsMap[material.id] = assignedUnits;
          }
          if (assignedSessions.length > 0) {
            sessionsMap[material.id] = assignedSessions;
          }
        } catch (err) {
          console.error(`Error cargando asignaciones para material ${material.id}:`, err);
        }
      });

      await Promise.all(promises);

      // Actualizar estados preservando valores existentes
      setMaterialCourses(prev => ({ ...prev, ...coursesMap }));
      setMaterialUnits(prev => ({ ...prev, ...unitsMap }));
      setMaterialSessions(prev => ({ ...prev, ...sessionsMap }));

      console.log('✅ Asignaciones cargadas:', {
        cursos: Object.keys(coursesMap).length,
        unidades: Object.keys(unitsMap).length,
        sesiones: Object.keys(sessionsMap).length
      });
    } catch (err) {
      console.error('Error cargando asignaciones de materiales:', err);
    }
  };

  const calculateStats = () => {
    const newStats = {
      total: materials.length,
      rag: materials.filter(m => m.purpose === 'rag').length,
      download: materials.filter(m => m.purpose === 'download').length,
      both: materials.filter(m => m.purpose === 'both').length,
      pending: materials.filter(m => m.rag_status === 'pending').length,
      processing: materials.filter(m => m.rag_status === 'processing').length,
      completed: materials.filter(m => m.rag_status === 'completed').length,
      failed: materials.filter(m => m.rag_status === 'failed').length,
    };
    setStats(newStats);
  };

  const filteredMaterials = materials.filter(material => {
    // Filtro por curso
    if (selectedCourse !== 'all') {
      const materialCourseId = typeof material.course_id === 'number'
        ? material.course_id.toString()
        : material.course_id?.toString() || '';
      if (materialCourseId !== selectedCourse) {
        return false;
      }
    }

    // Filtro por propósito
    if (selectedPurpose !== 'all' && material.purpose !== selectedPurpose) {
      return false;
    }

    // Filtro por estado RAG
    if (selectedRAGStatus !== 'all' && material.rag_status !== selectedRAGStatus) {
      return false;
    }

    // Filtro por categoría
    if (selectedCategory !== 'all' && material.category !== selectedCategory) {
      return false;
    }

    // Filtro por búsqueda
    if (searchQuery && !material.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  const handleUpdatePurpose = async (materialId: string, newPurpose: 'rag' | 'download' | 'both') => {
    try {
      await supabase
        .from('materials')
        .update({ purpose: newPurpose })
        .eq('id', materialId);

      setMaterials(prev => prev.map(m =>
        m.id === materialId ? { ...m, purpose: newPurpose } : m
      ));
    } catch (err: any) {
      console.error('Error actualizando propósito:', err);
      alert('Error al actualizar el propósito del material');
    }
  };

  const handleUpdateCourse = async (materialId: string, newCourseId: string) => {
    if (!newCourseId || newCourseId === 'none') {
      alert('Debes seleccionar un curso válido');
      return;
    }

    try {
      const courseIdNum = parseInt(newCourseId);
      if (isNaN(courseIdNum)) {
        alert('ID de curso inválido');
        return;
      }

      await materialService.updateMaterial(materialId, { course_id: courseIdNum });

      setMaterials(prev => prev.map(m =>
        m.id === materialId ? { ...m, course_id: courseIdNum } : m
      ));

      alert('Curso actualizado correctamente');
    } catch (err: any) {
      console.error('Error actualizando curso:', err);
      alert('Error al actualizar el curso del material: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleUpdateCategory = async (materialId: string, newCategory: MaterialCategory) => {
    try {
      // Validar que la categoría sea válida
      const validCategories: MaterialCategory[] = ['book', 'bibliography', 'syllabus', 'exam', 'pamphlet', 'other'];
      if (!validCategories.includes(newCategory)) {
        console.error('Categoría inválida:', newCategory);
        alert('Categoría inválida. Por favor, selecciona una categoría válida.');
        return;
      }

      console.log('Actualizando categoría:', { materialId, newCategory });

      const updated = await materialService.updateMaterial(materialId, { category: newCategory });

      console.log('Categoría actualizada exitosamente:', updated);

      setMaterials(prev => prev.map(m =>
        m.id === materialId ? { ...m, category: newCategory } : m
      ));
    } catch (err: any) {
      console.error('Error actualizando categoría:', err);
      console.error('Detalles del error:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });

      let errorMessage = 'Error al actualizar la categoría del material';
      if (err.message) {
        errorMessage += `: ${err.message}`;
      } else if (err.details) {
        errorMessage += `: ${err.details}`;
      }

      alert(errorMessage);

      // Recargar datos para mantener sincronización
      loadData();
    }
  };

  const handleUpdateHashtags = async (materialId: string, hashtagsString: string) => {
    try {
      // Parsear hashtags: separar por comas, espacios o ambos, y limpiar
      const hashtags = hashtagsString
        .split(/[,\s]+/)
        .map(tag => tag.trim().replace(/^#/, '')) // Remover # si existe al inicio
        .filter(tag => tag.length > 0);

      // Obtener el material actual
      const currentMaterial = materials.find(m => m.id === materialId);
      if (!currentMaterial) {
        alert('Material no encontrado');
        return;
      }

      // Actualizar metadata con los hashtags
      const updatedMetadata = {
        ...currentMaterial.metadata,
        hashtags: hashtags.length > 0 ? hashtags : null
      };

      // Actualizar en Supabase
      const { error } = await supabase
        .from('materials')
        .update({ metadata: updatedMetadata })
        .eq('id', materialId);

      if (error) {
        throw error;
      }

      // Actualizar estado local
      setMaterials(prev => prev.map(m =>
        m.id === materialId ? { ...m, metadata: updatedMetadata } : m
      ));
    } catch (err: any) {
      console.error('Error actualizando hashtags:', err);
      alert('Error al actualizar los hashtags: ' + (err.message || 'Error desconocido'));
    }
  };

  // Función auxiliar para obtener hashtags de un material
  const getMaterialHashtags = (material: Material): string[] => {
    const hashtags = material.metadata?.hashtags;
    if (Array.isArray(hashtags)) {
      return hashtags.filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim());
    } else if (typeof hashtags === 'string' && hashtags.trim()) {
      return [hashtags.trim()];
    }
    return [];
  };

  // Nota: handleUpdateUnit y handleUpdateSession fueron eliminados.
  // Ahora se usan las tablas de asignación múltiple (material_unit_assignments, material_session_assignments)
  // a través del MaterialAssignmentModal.

  const handleUpdatePermission = async (materialId: string, permission: 'allow_download' | 'allow_view' | 'allow_print', value: boolean) => {
    try {
      await materialService.updateMaterial(materialId, { [permission]: value });

      setMaterials(prev => prev.map(m =>
        m.id === materialId ? { ...m, [permission]: value } : m
      ));
    } catch (err: any) {
      console.error(`Error actualizando permiso ${permission}:`, err);
      alert(`Error al actualizar el permiso: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleShareWithStudents = async (material: Material) => {
    if (!user?.id || !material.course_id) {
      alert('Este material no está asociado a un curso o no estás autenticado');
      return;
    }

    if (!material.metadata?.sourceFileId) {
      alert('Este material no tiene un archivo de Google Drive asociado. Solo se pueden compartir archivos de Google Drive.');
      return;
    }

    const confirmed = confirm(
      `¿Compartir "${material.title}" con todos los estudiantes del curso?\n\n` +
      `Los estudiantes recibirán acceso de SOLO LECTURA al documento en Google Drive.\n\n` +
      `🔒 Restricciones que se aplicarán:\n` +
      `- Solo visualización (no pueden editar)\n` +
      `- Sin descarga del archivo\n` +
      `- Sin copia del contenido\n` +
      `- Sin impresión (limitada)\n\n` +
      `⚠️ NOTA: Los estudiantes recibirán una notificación por email con el enlace de acceso.`
    );

    if (!confirmed) return;

    try {
      setSharingMaterial(material.id);
      setSharingStatus(null);

      const result = await materialService.shareMaterialWithCourseStudents(
        material.id,
        material.course_id,
        user.id,
        'reader' // Solo lectura
      );

      setSharingStatus({
        success: result.success.length,
        failed: result.failed.length
      });

      if (result.failed.length > 0) {
        const failedEmails = result.failed.map(f => f.email).join(', ');
        const message = 
          `✅ Compartido con ${result.success.length} estudiante(s) exitosamente.\n\n` +
          `❌ Error con ${result.failed.length} estudiante(s):\n${failedEmails}\n\n` +
          `Verifica que estos emails sean válidos y que los estudiantes tengan cuentas de Google.\n\n` +
          (result.viewLink ? `🔗 Enlace de vista previa:\n${result.viewLink}` : '');
        
        alert(message);
      } else {
        const message = 
          `✅ Documento compartido exitosamente con ${result.success.length} estudiante(s).\n\n` +
          `Los estudiantes recibirán una notificación por email.\n\n` +
          `🔒 Restricciones aplicadas:\n` +
          `- Solo visualización (no pueden editar)\n` +
          `- Sin descarga del archivo\n` +
          `- Sin copia del contenido\n` +
          `- Sin impresión (limitada)\n\n` +
          (result.viewLink ? `🔗 Enlace de vista previa:\n${result.viewLink}\n\n` : '') +
          `💡 Los estudiantes pueden acceder al documento desde su correo o desde Google Drive.`;
        
        alert(message);
      }
    } catch (error: any) {
      console.error('Error compartiendo material:', error);
      const errorMessage = error.message || 'Error desconocido';
      
      // Mensajes de error más específicos
      if (errorMessage.includes('token') || errorMessage.includes('autenticación')) {
        alert(
          `❌ Error de autenticación con Google Drive.\n\n` +
          `Tu sesión de Google Drive ha expirado o no tienes permisos.\n\n` +
          `Por favor, ve a tu perfil para reconectar tu cuenta de Google Drive.`
        );
      } else {
        alert(`❌ Error al compartir el material:\n\n${errorMessage}`);
      }
    } finally {
      setSharingMaterial(null);
    }
  };

  const handleMigrateDriveToBucket = async (material: Material) => {
    if (!material.course_id) {
      alert('Este material debe estar asociado a un curso para migrarlo');
      return;
    }

    const confirmed = confirm(
      `¿Migrar "${material.title}" de Google Drive a Bucket?\n\n` +
      `Esto copiará el archivo al bucket de Supabase para permitir procesamiento RAG.\n\n` +
      `El archivo original en Google Drive se mantendrá intacto.`
    );

    if (!confirmed) return;

    try {
      setMigratingMaterial(material.id);
      const result = await materialService.migrateDriveToBucket(material.id, material.course_id);

      if (result.success) {
        alert(`✅ Archivo migrado exitosamente al bucket.\n\nRuta: ${result.bucketPath}`);
        // Recargar materiales para actualizar metadata
        await loadData();
      } else {
        const isAuthError = result.error?.includes('401') ||
          result.error?.includes('UNAUTHENTICATED') ||
          result.error?.includes('token') ||
          result.error?.includes('permisos');

        if (isAuthError) {
          const goToProfile = confirm(
            `❌ Error de autenticación con Google Drive.\n\n` +
            `Tu sesión de Google Drive ha expirado o no tienes permisos.\n\n` +
            `¿Quieres ir a tu perfil para reconectar tu cuenta de Google?`
          );

          if (goToProfile) {
            navigate('/profile');
          }
        } else {
          alert(`❌ Error al migrar archivo: ${result.error || 'Error desconocido'}`);
        }
      }
    } catch (error: any) {
      console.error('Error migrando archivo:', error);
      alert('Error al migrar el archivo: ' + (error.message || 'Error desconocido'));
    } finally {
      setMigratingMaterial(null);
    }
  };

  const handleProcessForRAG = async (material: Material) => {
    if (!material.course_id) {
      alert('Este material debe estar asociado a un curso para procesarlo');
      return;
    }

    const source = material.metadata?.source;
    if (source !== 'bucket') {
      alert('Este material debe estar en bucket para procesamiento RAG. Migra el archivo primero.');
      return;
    }

    const confirmed = confirm(
      `¿Iniciar procesamiento RAG para "${material.title}"?\n\n` +
      `Esto generará chunks del documento para el Tutor Virtual.\n\n` +
      `El procesamiento puede tomar varios minutos dependiendo del tamaño del archivo.`
    );

    if (!confirmed) return;

    try {
      setProcessingMaterial(material.id);
      const result = await materialService.processMaterialForRAG(material.id, material.course_id);

      if (result.success) {
        alert(`✅ Procesamiento iniciado exitosamente.\n\nJob ID: ${result.jobId}\n\nPuedes monitorear el progreso en la página de procesamiento.`);
        // Recargar materiales para actualizar metadata
        await loadData();
      } else {
        alert(`❌ Error al iniciar procesamiento: ${result.error || 'Error desconocido'}`);
      }
    } catch (error: any) {
      console.error('Error iniciando procesamiento:', error);
      alert('Error al iniciar procesamiento: ' + (error.message || 'Error desconocido'));
    } finally {
      setProcessingMaterial(null);
    }
  };

  const getCategoryLabel = (category?: string): string => {
    const categoryMap: Record<string, string> = {
      'book': 'Libro',
      'bibliography': 'Bibliografía',
      'syllabus': 'Temario',
      'exam': 'Examen',
      'pamphlet': 'Folleto',
      'other': 'Otro',
    };
    return categoryMap[category || ''] || 'Sin categoría';
  };

  const getMaterialSource = (material: Material): { source: string; label: string; icon: any } => {
    const source = material.metadata?.source || 'google_drive'; // Por defecto Google Drive si no está especificado
    if (source === 'bucket') {
      return { source: 'bucket', label: 'Bucket', icon: HardDrive };
    }
    return { source: 'google_drive', label: 'Google Drive', icon: Cloud };
  };

  const loadChunksCount = async () => {
    try {
      console.log('📊 [MaterialsManagementPage] Iniciando carga de conteo de chunks...');
      setLoadingChunks(true);
      const chunksCount: Record<string, number> = {};

      // Obtener conteo de chunks por material_id desde metadata
      // Nota: Supabase limita a 1000 por defecto, necesitamos obtener todos
      console.log('📊 [MaterialsManagementPage] Consultando course_content_chunks...');
      let allChunks: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: chunks, error } = await supabase
          .from('course_content_chunks')
          .select('metadata')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error('❌ [MaterialsManagementPage] Error cargando chunks:', error);
          break;
        }

        if (chunks && chunks.length > 0) {
          allChunks = allChunks.concat(chunks);
          hasMore = chunks.length === pageSize;
          page++;
          console.log(`📊 [MaterialsManagementPage] Página ${page}: ${chunks.length} chunks obtenidos`);
        } else {
          hasMore = false;
        }
      }

      const chunks = allChunks;

      console.log(`📊 [MaterialsManagementPage] Total chunks obtenidos: ${chunks?.length || 0}`);

      // Contar chunks por material_id (almacenado en metadata)
      if (chunks) {
        let chunksConMaterialId = 0;
        let chunksSinMaterialId = 0;
        
        chunks.forEach(chunk => {
          const materialId = chunk.metadata?.material_id || chunk.metadata?.sourceFileId;
          if (materialId) {
            chunksCount[materialId] = (chunksCount[materialId] || 0) + 1;
            chunksConMaterialId++;
          } else {
            chunksSinMaterialId++;
          }
        });
        
        console.log(`📊 [MaterialsManagementPage] Chunks con material_id: ${chunksConMaterialId}`);
        console.log(`📊 [MaterialsManagementPage] Chunks sin material_id: ${chunksSinMaterialId}`);
        console.log(`📊 [MaterialsManagementPage] Materiales con chunks: ${Object.keys(chunksCount).length}`);
        console.log(`📊 [MaterialsManagementPage] Conteo por material:`, chunksCount);
        
        // Verificar qué materiales tienen chunks pero no están en la lista de materiales cargados
        const materialIdsConChunks = Object.keys(chunksCount);
        const materialIdsCargados = materials.map(m => m.id);
        const materialesConChunksNoCargados = materialIdsConChunks.filter(id => !materialIdsCargados.includes(id));
        
        console.log(`📊 [MaterialsManagementPage] Materiales cargados (${materialIdsCargados.length}):`, materialIdsCargados);
        console.log(`📊 [MaterialsManagementPage] Materiales con chunks (${materialIdsConChunks.length}):`, materialIdsConChunks);
        
        // Verificar qué materiales cargados tienen chunks
        const materialesCargadosConChunks = materialIdsCargados.filter(id => chunksCount[id]);
        const detallesMaterialesConChunks = materialesCargadosConChunks.map(id => {
          const material = materials.find(m => m.id === id);
          return {
            id,
            title: material?.title || 'N/A',
            chunks: chunksCount[id]
          };
        });
        console.log(`✅ [MaterialsManagementPage] Materiales cargados CON chunks (${materialesCargadosConChunks.length}):`, detallesMaterialesConChunks);
        console.log(`📊 [MaterialsManagementPage] Estado de materialChunks después de setMaterialChunks:`, chunksCount);
        
        const materialesCargadosSinChunks = materialIdsCargados.filter(id => !chunksCount[id]);
        if (materialesCargadosSinChunks.length > 0) {
          console.log(`⚠️ [MaterialsManagementPage] Materiales cargados SIN chunks (${materialesCargadosSinChunks.length}):`, materialesCargadosSinChunks);
        }
        
        if (materialesConChunksNoCargados.length > 0) {
          console.log(`⚠️ [MaterialsManagementPage] ${materialesConChunksNoCargados.length} materiales tienen chunks pero no están en la lista cargada:`, materialesConChunksNoCargados);
          
          // Verificar si son IDs temporales
          const idsTemporales = materialesConChunksNoCargados.filter(id => id.startsWith('job_temp_'));
          if (idsTemporales.length > 0) {
            console.log(`🔴 [MaterialsManagementPage] ${idsTemporales.length} IDs temporales encontrados (deberían limpiarse):`, idsTemporales);
          }
        }
      }

      setMaterialChunks(chunksCount);
      console.log('✅ [MaterialsManagementPage] Conteo de chunks cargado exitosamente');
    } catch (err: any) {
      console.error('❌ [MaterialsManagementPage] Error cargando conteo de chunks:', err);
    } finally {
      setLoadingChunks(false);
    }
  };

  const loadChunksForMaterial = async (materialId: string) => {
    try {
      setLoadingChunks(true);

      // Buscar chunks por material_id o sourceFileId en metadata
      const { data: chunks, error } = await supabase
        .from('course_content_chunks')
        .select('id, content, metadata, chunk_index, created_at')
        .or(`metadata->>material_id.eq.${materialId},metadata->>sourceFileId.eq.${materialId}`)
        .order('chunk_index', { ascending: true, nullsFirst: false })
        .limit(50); // Limitar a 50 chunks para no sobrecargar

      if (error) {
        console.error('Error cargando chunks del material:', error);
        // Si falla con .or(), intentar con filtros individuales
        const { data: chunks1, error: error1 } = await supabase
          .from('course_content_chunks')
          .select('id, content, metadata, chunk_index, created_at')
          .eq('metadata->>material_id', materialId)
          .order('chunk_index', { ascending: true, nullsFirst: false })
          .limit(50);

        if (error1) {
          // Intentar con sourceFileId
          const { data: chunks2, error: error2 } = await supabase
            .from('course_content_chunks')
            .select('id, content, metadata, chunk_index, created_at')
            .eq('metadata->>sourceFileId', materialId)
            .order('chunk_index', { ascending: true, nullsFirst: false })
            .limit(50);

          if (error2) {
            alert('Error al cargar los chunks: ' + error2.message);
            return;
          }
          setChunksContent(chunks2 || []);
        } else {
          setChunksContent(chunks1 || []);
        }
      } else {
        setChunksContent(chunks || []);
      }

      setSelectedMaterialForChunks(materialId);
    } catch (err: any) {
      console.error('Error cargando chunks:', err);
      alert('Error al cargar los chunks del material: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoadingChunks(false);
    }
  };

  const openTutorWithCourse = (courseId: string) => {
    navigate(`/teacher/tutor?courseId=${courseId}`);
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este material?')) {
      return;
    }

    try {
      await materialService.deleteMaterial(materialId);
      setMaterials(prev => prev.filter(m => m.id !== materialId));
      setSelectedMaterials(prev => {
        const newSet = new Set(prev);
        newSet.delete(materialId);
        return newSet;
      });
    } catch (err: any) {
      console.error('Error eliminando material:', err);
      alert('Error al eliminar el material');
    }
  };

  const handleToggleSelectMaterial = (materialId: string) => {
    setSelectedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedMaterials.size === filteredMaterials.length) {
      // Deseleccionar todos
      setSelectedMaterials(new Set());
    } else {
      // Seleccionar todos los materiales filtrados
      setSelectedMaterials(new Set(filteredMaterials.map(m => m.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMaterials.size === 0) {
      alert('Por favor, selecciona al menos un material para eliminar');
      return;
    }

    const count = selectedMaterials.size;
    const materialNames = filteredMaterials
      .filter(m => selectedMaterials.has(m.id))
      .map(m => m.title)
      .slice(0, 5)
      .join(', ');
    const moreText = count > 5 ? ` y ${count - 5} más` : '';

    const confirmMessage = `⚠️ ADVERTENCIA: Estás a punto de eliminar ${count} material(es) permanentemente.\n\nMateriales seleccionados:\n${materialNames}${moreText}\n\nEsta acción NO se puede deshacer.\n\n¿Estás completamente seguro de que deseas continuar?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Segunda confirmación para mayor seguridad
    if (!confirm(`⚠️ ÚLTIMA CONFIRMACIÓN\n\nVas a eliminar ${count} material(es) de forma permanente.\n\n¿Confirmas la eliminación?`)) {
      return;
    }

    try {
      setLoading(true);
      const materialIds = Array.from(selectedMaterials);
      let successCount = 0;
      let errorCount = 0;

      // Eliminar materiales uno por uno
      for (const materialId of materialIds) {
        try {
          await materialService.deleteMaterial(materialId);
          successCount++;
        } catch (err) {
          console.error(`Error eliminando material ${materialId}:`, err);
          errorCount++;
        }
      }

      // Actualizar lista de materiales
      setMaterials(prev => prev.filter(m => !selectedMaterials.has(m.id)));
      setSelectedMaterials(new Set());

      if (errorCount > 0) {
        alert(`Se eliminaron ${successCount} material(es) correctamente, pero ${errorCount} material(es) tuvieron errores.`);
      } else {
        alert(`✅ Se eliminaron ${successCount} material(es) correctamente.`);
      }
    } catch (err: any) {
      console.error('Error eliminando materiales:', err);
      alert('Error al eliminar los materiales seleccionados');
    } finally {
      setLoading(false);
    }
  };

  const getRAGStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getRAGStatusLabel = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'processing':
        return 'Procesando';
      case 'failed':
        return 'Fallido';
      case 'pending':
        return 'Pendiente';
      default:
        return 'N/A';
    }
  };

  const getPurposeLabel = (purpose?: string) => {
    switch (purpose) {
      case 'rag':
        return 'Solo RAG';
      case 'download':
        return 'Solo Descarga';
      case 'both':
        return 'RAG y Descarga';
      default:
        return 'No definido';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando materiales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Administración de Materiales
        </h1>
        <p className="text-gray-600">
          Gestiona materiales procesados para RAG y materiales para descargar
        </p>
      </div>

      {/* Banner de App de Escritorio */}
      <Card className="mb-8 bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900 border-none shadow-xl overflow-hidden relative">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-indigo-400 opacity-10 rounded-full blur-2xl"></div>
        
        <div className="p-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl items-center justify-center border border-white/20 shadow-inner">
              <HardDrive className="w-10 h-10 text-indigo-100" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-[10px] font-bold text-indigo-100 uppercase tracking-wider mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Recomendado
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                EduSpark Desktop Uploader
              </h2>
              <p className="text-indigo-100 max-w-xl text-sm leading-relaxed opacity-90">
                ¿Tienes libros pesados o documentos de cientos de páginas? Nuestra <strong>App para Windows</strong> utiliza el procesador local y el nuevo motor <strong>Gemini Embedding 2</strong> para procesar archivos masivos sin errores de navegador.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <a 
              href="/downloads/EduSparkUploader.exe" 
              download 
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 text-center"
            >
              <Download className="w-5 h-5" />
              Descargar App
            </a>
            <button 
              onClick={() => {
                const info = 
                  "VENTAJAS TÉCNICAS DEL UPLOADER:\n\n" +
                  "• Motor Gemini 2: Utiliza el modelo 'gemini-embedding-2-preview' para mayor precisión semántica.\n" +
                  "• Procesamiento Local: Extrae texto y genera vectores en tu PC, enviando solo datos optimizados a la nube.\n" +
                  "• Capacidad Extendida: Procesa documentos de hasta 2000 páginas sin restricciones de memoria.\n" +
                  "• Resiliencia: Sistema de reintentos automáticos ante micro-cortes de internet.\n" +
                  "• Sincronización: Detecta automáticamente archivos pesados delegados desde la plataforma web.";
                alert(info);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-white font-medium rounded-xl border border-white/10 transition-all text-center"
            >
              Más información
            </button>
          </div>
        </div>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Materiales</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Para RAG</p>
              <p className="text-2xl font-bold text-gray-900">{stats.rag + stats.both}</p>
            </div>
            <Database className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Para Descargar</p>
              <p className="text-2xl font-bold text-gray-900">{stats.download + stats.both}</p>
            </div>
            <Download className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">RAG Completados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
            <FileCheck className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="w-4 h-4 inline mr-1" />
              Curso
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={courses.length === 0}
            >
              <option value="all">Todos los cursos</option>
              {courses.length === 0 ? (
                <option value="none" disabled>No hay cursos disponibles</option>
              ) : (
                courses.map(course => (
                  <option key={course.id} value={course.id.toString()}>
                    {course.title || course.code || `Curso ${course.id}`}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Propósito
            </label>
            <select
              value={selectedPurpose}
              onChange={(e) => setSelectedPurpose(e.target.value as MaterialPurpose)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="rag">Solo RAG</option>
              <option value="download">Solo Descarga</option>
              <option value="both">RAG y Descarga</option>
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as MaterialCategoryFilter)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="book">Libro</option>
              <option value="bibliography">Bibliografía</option>
              <option value="syllabus">Temario</option>
              <option value="exam">Examen</option>
              <option value="pamphlet">Folleto</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado RAG
            </label>
            <select
              value={selectedRAGStatus}
              onChange={(e) => setSelectedRAGStatus(e.target.value as RAGStatus)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="processing">Procesando</option>
              <option value="completed">Completado</option>
              <option value="failed">Fallido</option>
            </select>
          </div>

          <Button
            onClick={loadData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
          <Button
            onClick={async () => {
              if (!user) return;
              setLoading(true);
              try {
                // Sincronizar manualmente con jobs de Firestore
                const jobs = await getAllJobs(user.id);

                // Actualizar materiales basándose en jobs
                for (const material of materials) {
                  const job = jobs.find(j =>
                    j.metadata?.materialId === material.id ||
                    j.metadata?.sourceFileId === material.metadata?.sourceFileId
                  );

                  if (job && job.status !== material.rag_status) {
                    const updateData: any = {
                      rag_status: job.status,
                    };

                    if (job.status === 'completed') {
                      updateData.processed_at = new Date().toISOString();
                    } else if (job.status === 'failed') {
                      updateData.rag_error = job.errorMessage || 'Error en el procesamiento';
                    }

                    await supabase
                      .from('materials')
                      .update(updateData)
                      .eq('id', material.id);
                  }
                }

                await loadData();
                alert('Estados sincronizados correctamente');
              } catch (err: any) {
                console.error('Error sincronizando:', err);
                alert('Error al sincronizar estados: ' + (err.message || 'Error desconocido'));
              } finally {
                setLoading(false);
              }
            }}
            variant="outline"
            className="flex items-center gap-2"
            title="Sincronizar estados con jobs de procesamiento"
          >
            <RefreshCw className="w-4 h-4" />
            Sincronizar Estados
          </Button>
        </div>
      </Card>

      {/* Lista de Materiales */}
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Materiales ({filteredMaterials.length})
          </h2>
          <div className="flex items-center gap-3">
            {selectedMaterials.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  {selectedMaterials.size} material(es) seleccionado(s)
                </span>
                <Button
                  onClick={handleDeleteSelected}
                  variant="danger"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Seleccionados
                </Button>
              </div>
            )}
            <Button
              onClick={() => navigate('/teacher/file-processing')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Procesar Nuevo Material
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
            {courses.length === 0 && (
              <Button
                onClick={() => navigate('/teacher/courses/new')}
                className="mt-2"
              >
                Crear Primer Curso
              </Button>
            )}
          </div>
        )}

        {courses.length === 0 && !error && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <p className="text-yellow-700 font-medium">No tienes cursos creados</p>
            </div>
            <p className="text-yellow-600 text-sm mb-3">
              Necesitas crear al menos un curso para poder gestionar materiales.
            </p>
            <Button
              onClick={() => navigate('/teacher/courses/new')}
              className="flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Crear Primer Curso
            </Button>
          </div>
        )}

        {filteredMaterials.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">No se encontraron materiales</p>
            <p className="text-gray-500 text-sm">
              {searchQuery || selectedCourse !== 'all' || selectedPurpose !== 'all' || selectedRAGStatus !== 'all'
                ? 'Intenta ajustar los filtros'
                : 'Comienza procesando materiales desde la página de procesamiento'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            {/* Tabla con scroll */}
            <div
              ref={tableScrollRef}
              className="overflow-x-auto"
              style={{ maxHeight: 'calc(100vh - 350px)' }}
            >
              <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '2400px' }}>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 w-12 min-w-[50px]">
                      <input
                        type="checkbox"
                        checked={filteredMaterials.length > 0 && selectedMaterials.size === filteredMaterials.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        title={selectedMaterials.size === filteredMaterials.length ? "Deseleccionar todos" : "Seleccionar todos"}
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[300px]">Título</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[250px]">Cursos Asignados</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[200px]">Unidad</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[200px]">Sesión</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[140px]">Origen</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[120px]">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[160px]">Categoría</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[200px]">Hashtags</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[170px]">Propósito</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[160px]">Permisos</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[150px]">Estado RAG</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[120px]">Chunks</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[120px]">Tamaño</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((material) => {
                    const course = courses.find(c => {
                      const courseId = typeof c.id === 'number' ? c.id : parseInt(c.id);
                      const materialCourseId = typeof material.course_id === 'number' ? material.course_id : parseInt(material.course_id);
                      return courseId === materialCourseId;
                    });
                    const isSelected = selectedMaterials.has(material.id);
                    return (
                      <tr
                        key={material.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectMaterial(material.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{material.title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {materialCourses[material.id] && materialCourses[material.id].length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {materialCourses[material.id].map((assignedCourse) => {
                                const courseObj = courses.find(c => c.id === assignedCourse.course_id);
                                return (
                                  <span
                                    key={assignedCourse.course_id}
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                                    title={assignedCourse.course_title}
                                  >
                                    {assignedCourse.course_title || assignedCourse.course_code || `Curso ${assignedCourse.course_id}`}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sin cursos asignados</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {materialUnits[material.id] && materialUnits[material.id].length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {materialUnits[material.id].map((assignedUnit) => (
                                <span
                                  key={assignedUnit.unit_id}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded"
                                  title={`${assignedUnit.course_title} - Unidad ${assignedUnit.unit_number}: ${assignedUnit.unit_title}`}
                                >
                                  U{assignedUnit.unit_number}: {assignedUnit.unit_title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sin unidades asignadas</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {materialSessions[material.id] && materialSessions[material.id].length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {materialSessions[material.id].map((assignedSession) => (
                                <span
                                  key={assignedSession.session_id}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded"
                                  title={`${assignedSession.course_title}${assignedSession.unit_title ? ` - ${assignedSession.unit_title}` : ''}: ${assignedSession.session_title}`}
                                >
                                  {assignedSession.session_title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sin sesiones asignadas</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const sourceInfo = getMaterialSource(material);
                            const Icon = sourceInfo.icon;
                            return (
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${sourceInfo.source === 'bucket' ? 'text-green-600' : 'text-blue-600'}`} />
                                <span className={`px-2 py-1 rounded text-xs font-medium ${sourceInfo.source === 'bucket'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                                  }`}>
                                  {sourceInfo.label}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            {material.kind.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={material.category || 'other'}
                            onChange={(e) => handleUpdateCategory(material.id, e.target.value as MaterialCategory)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
                          >
                            <option value="book">Libro</option>
                            <option value="bibliography">Bibliografía</option>
                            <option value="syllabus">Temario</option>
                            <option value="exam">Examen</option>
                            <option value="pamphlet">Folleto</option>
                            <option value="other">Otro</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <input
                              type="text"
                              placeholder="hashtag1, hashtag2..."
                              value={getMaterialHashtags(material).join(', ')}
                              onChange={(e) => {
                                // Actualizar en tiempo real el estado local para feedback visual
                                const hashtags = e.target.value
                                  .split(/[,\s]+/)
                                  .map(tag => tag.trim().replace(/^#/, ''))
                                  .filter(tag => tag.length > 0);
                                
                                setMaterials(prev => prev.map(m => {
                                  if (m.id === material.id) {
                                    const updatedMetadata = {
                                      ...m.metadata,
                                      hashtags: hashtags.length > 0 ? hashtags : null
                                    };
                                    return { ...m, metadata: updatedMetadata };
                                  }
                                  return m;
                                }));
                              }}
                              onBlur={(e) => {
                                // Guardar cuando se pierde el foco
                                handleUpdateHashtags(material.id, e.target.value);
                              }}
                              onKeyDown={(e) => {
                                // Guardar al presionar Enter
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-w-[150px]"
                              title="Separa los hashtags con comas o espacios. Presiona Enter o haz clic fuera para guardar."
                            />
                          </div>
                          {getMaterialHashtags(material).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {getMaterialHashtags(material).map((hashtag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full border border-purple-200"
                                >
                                  #{hashtag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={material.purpose || 'download'}
                            onChange={(e) => handleUpdatePurpose(material.id, e.target.value as 'rag' | 'download' | 'both')}
                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="rag">Solo RAG</option>
                            <option value="download">Solo Descarga</option>
                            <option value="both">RAG y Descarga</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={material.allow_download !== false}
                                onChange={(e) => handleUpdatePermission(material.id, 'allow_download', e.target.checked)}
                                className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                title="Permitir descarga"
                              />
                              <span className="text-gray-700">Descargar</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={material.allow_view !== false}
                                onChange={(e) => handleUpdatePermission(material.id, 'allow_view', e.target.checked)}
                                className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                title="Permitir visualización"
                              />
                              <span className="text-gray-700">Visualizar</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={material.allow_print !== false}
                                onChange={(e) => handleUpdatePermission(material.id, 'allow_print', e.target.checked)}
                                className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                title="Permitir impresión"
                              />
                              <span className="text-gray-700">Imprimir</span>
                            </label>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getRAGStatusIcon(material.rag_status)}
                            <span className="text-sm text-gray-700">
                              {getRAGStatusLabel(material.rag_status)}
                            </span>
                            {material.rag_status === 'processing' && material.metadata?.processingJobId && (
                              <button
                                onClick={async () => {
                                  if (confirm('¿Cancelar este job? Se marcará como fallido.')) {
                                    const result = await materialService.cancelProcessingJob(material.metadata.processingJobId);
                                    if (result.success) {
                                      alert('Job cancelado exitosamente');
                                      loadMaterials();
                                    } else {
                                      alert(`Error: ${result.error}`);
                                    }
                                  }
                                }}
                                className="text-xs text-red-600 hover:text-red-800 underline ml-2"
                                title="Cancelar procesamiento atascado"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {material.rag_status === 'completed' ? (
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-purple-500" />
                              <span className="text-sm font-medium text-purple-700" title={`Material ID: ${material.id}, Chunks en estado: ${materialChunks[material.id] ?? 'undefined'}`}>
                                {materialChunks[material.id] || material.metadata?.totalChunks || material.metadata?.chunksTotal || 0}
                              </span>
                              <button
                                onClick={() => loadChunksForMaterial(material.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                                title="Ver chunks procesados"
                              >
                                Ver
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {formatFileSize(material.size_bytes || material.metadata?.fileSize || material.metadata?.file_size_bytes)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative action-menu-container">
                            {/* Botón principal de menú */}
                            <button
                              onClick={() => toggleActionMenu(material.id)}
                              className="inline-flex items-center justify-center w-9 h-9 text-gray-600 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              title="Más acciones"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>

                            {/* Menú desplegable */}
                            {openActionMenus.has(material.id) && (
                              <div className="absolute right-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1 max-h-96 overflow-y-auto">
                                {/* Acciones principales - siempre visibles */}
                                <button
                                  onClick={() => {
                                    setSelectedMaterialForAssignment(material);
                                    setAssignmentModalOpen(true);
                                    setOpenActionMenus(new Set());
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                                >
                                  <Users className="w-4 h-4" />
                                  <span>Asignar a cursos</span>
                                </button>

                                {(material.url || material.metadata?.sourceFileId) && (
                                  <a
                                    href={material.url || `https://drive.google.com/file/d/${material.metadata?.sourceFileId}/view`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setOpenActionMenus(new Set())}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>Ver material</span>
                                  </a>
                                )}

                                {material.rag_status === 'completed' && material.course_id && (
                                  <button
                                    onClick={() => {
                                      openTutorWithCourse(material.course_id.toString());
                                      setOpenActionMenus(new Set());
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                                  >
                                    <Brain className="w-4 h-4" />
                                    <span>Abrir Tutor Virtual</span>
                                  </button>
                                )}

                                {material.course_id && (
                                  <a
                                    href={`/teacher/tutor?courseId=${material.course_id}${material.unit_id ? `&moduleId=${material.unit_id}` : ''}${material.session_id ? `&highlightId=${material.session_id}&highlightType=session` : ''}${material.id ? `&highlightMaterialId=${material.id}` : ''}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setOpenActionMenus(new Set())}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                                  >
                                    <BookOpen className="w-4 h-4" />
                                    <span>Ver en curso</span>
                                  </a>
                                )}

                                {/* Separador */}
                                {(() => {
                                  const sourceInfo = getMaterialSource(material);
                                  const isGoogleDrive = sourceInfo.source === 'google_drive';
                                  const isBucket = sourceInfo.source === 'bucket';
                                  const isProcessed = material.metadata?.processed === true;
                                  const hasActions = (isGoogleDrive && material.metadata?.sourceFileId && material.course_id) ||
                                                    (isBucket && !isProcessed && material.course_id) ||
                                                    (isGoogleDrive && material.metadata?.sourceFileId && material.course_id);
                                  
                                  return hasActions ? (
                                    <div className="border-t border-gray-200 my-1" />
                                  ) : null;
                                })()}

                                {/* Acciones de procesamiento */}
                                {(() => {
                                  const sourceInfo = getMaterialSource(material);
                                  const isGoogleDrive = sourceInfo.source === 'google_drive';
                                  const isBucket = sourceInfo.source === 'bucket';
                                  const isProcessed = material.metadata?.processed === true;

                                  return (
                                    <>
                                      {/* Botón para migrar de Drive a Bucket */}
                                      {isGoogleDrive && material.metadata?.sourceFileId && material.course_id && (
                                        <button
                                          onClick={() => {
                                            handleMigrateDriveToBucket(material);
                                            setOpenActionMenus(new Set());
                                          }}
                                          disabled={migratingMaterial === material.id}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {migratingMaterial === material.id ? (
                                            <>
                                              <RefreshCw className="w-4 h-4 animate-spin" />
                                              <span>Migrando...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Upload className="w-4 h-4" />
                                              <span>Migrar a Bucket</span>
                                            </>
                                          )}
                                        </button>
                                      )}

                                      {/* Botón para procesar para RAG */}
                                      {isBucket && !isProcessed && material.course_id && (
                                        <button
                                          onClick={() => {
                                            handleProcessForRAG(material);
                                            setOpenActionMenus(new Set());
                                          }}
                                          disabled={processingMaterial === material.id}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {processingMaterial === material.id ? (
                                            <>
                                              <RefreshCw className="w-4 h-4 animate-spin" />
                                              <span>Procesando RAG...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Brain className="w-4 h-4" />
                                              <span>Procesar para RAG</span>
                                            </>
                                          )}
                                        </button>
                                      )}

                                      {/* Botón para compartir con estudiantes */}
                                      {isGoogleDrive && material.metadata?.sourceFileId && material.course_id && (
                                        <button
                                          onClick={() => {
                                            handleShareWithStudents(material);
                                            setOpenActionMenus(new Set());
                                          }}
                                          disabled={sharingMaterial === material.id}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {sharingMaterial === material.id ? (
                                            <>
                                              <RefreshCw className="w-4 h-4 animate-spin" />
                                              <span>Compartiendo...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Share2 className="w-4 h-4" />
                                              <span>Compartir con estudiantes</span>
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Separador antes de eliminar */}
                                <div className="border-t border-gray-200 my-1" />

                                {/* Botón eliminar */}
                                <button
                                  onClick={() => {
                                    handleDeleteMaterial(material.id);
                                    setOpenActionMenus(new Set());
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Eliminar material</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Chunks Procesados */}
      {selectedMaterialForChunks && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Chunks Procesados
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {chunksContent.length} chunks encontrados
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedMaterialForChunks(null);
                  setChunksContent([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingChunks ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Cargando chunks...</p>
                </div>
              ) : chunksContent.length === 0 ? (
                <div className="text-center py-8">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No se encontraron chunks para este material</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Los chunks se crean durante el procesamiento RAG. Verifica que el material esté completamente procesado.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chunksContent.map((chunk, index) => (
                    <div key={chunk.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Chunk #{chunk.chunk_index !== null ? chunk.chunk_index : index + 1}
                        </span>
                        {chunk.created_at && (
                          <span className="text-xs text-gray-500">
                            {new Date(chunk.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">
                        {chunk.content}
                      </p>
                      {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            Ver metadata
                          </summary>
                          <pre className="text-xs text-gray-400 mt-2 p-2 bg-gray-50 rounded overflow-auto">
                            {JSON.stringify(chunk.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Estos chunks están disponibles para el Tutor Virtual RAG
              </p>
              {filteredMaterials.find(m => m.id === selectedMaterialForChunks)?.course_id && (
                <Button
                  onClick={() => {
                    const material = filteredMaterials.find(m => m.id === selectedMaterialForChunks);
                    if (material?.course_id) {
                      openTutorWithCourse(material.course_id.toString());
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Tutor Virtual
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modal de asignación */}
      {assignmentModalOpen && selectedMaterialForAssignment && (
        <MaterialAssignmentModal
          materialId={selectedMaterialForAssignment.id}
          materialTitle={selectedMaterialForAssignment.title}
          teacherCourses={courses}
          onClose={() => {
            setAssignmentModalOpen(false);
            setSelectedMaterialForAssignment(null);
          }}
          onAssigned={async () => {
            // Recargar todas las asignaciones para este material
            if (selectedMaterialForAssignment) {
              try {
                const [assignedCourses, assignedUnits, assignedSessions] = await Promise.all([
                  materialService.getMaterialCourses(selectedMaterialForAssignment.id).catch(() => []),
                  materialService.getMaterialUnits(selectedMaterialForAssignment.id).catch(() => []),
                  materialService.getMaterialSessions(selectedMaterialForAssignment.id).catch(() => [])
                ]);

                setMaterialCourses(prev => ({
                  ...prev,
                  [selectedMaterialForAssignment.id]: assignedCourses
                }));
                setMaterialUnits(prev => ({
                  ...prev,
                  [selectedMaterialForAssignment.id]: assignedUnits
                }));
                setMaterialSessions(prev => ({
                  ...prev,
                  [selectedMaterialForAssignment.id]: assignedSessions
                }));
              } catch (error) {
                console.error('Error reloading material assignments:', error);
              }
            }
          }}
        />
      )}
    </div>
  );
};

