// pages/TeacherTutorAnalyticsPage.tsx
// Dashboard para docentes: Análisis de desempeño del Tutor IA por curso y estudiante

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { courseService, Course } from '@/services/teacherCourses';
import {
  getStudentMetrics,
  getCourseMetrics,
  getTopicAnalysis,
  getStudentsNeedingAttention,
  StudentMetrics,
  CourseMetrics,
  AnalyticsFilters,
} from '@/services/tutorAnalyticsService';
import { getCostMetrics, getUserCostStats, getCourseBudgetLimit, setUsageLimit, getCourseUsageStats } from '@/services/tutorCostService';
import { analyzeCoursePerformance, AdvisorAnalysis } from '@/services/teacherAdvisorAgent';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
  IconBookOpen,
  IconStudent,
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconDollarSign,
  IconRefreshCw,
  IconChartBar,
  IconUsers,
  IconMessage,
  IconRobot,
  IconFilter,
  IconX,
  IconDownload,
  IconFileText,
  IconChevronUp,
  IconChevronDown,
  IconSettings,
} from '@/components/Common/Icons';
import { exportToPDF, exportToExcel, formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '@/utils/exportService';

const TeacherTutorAnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);
  const [loading, setLoading] = useState(true);
  const [studentMetrics, setStudentMetrics] = useState<StudentMetrics[]>([]);
  const [courseMetrics, setCourseMetrics] = useState<CourseMetrics | null>(null);
  const [costMetrics, setCostMetrics] = useState<any>(null);
  const [budgetStats, setBudgetStats] = useState<{
    monthlyCost: number;
    monthlyLimit: number;
    remainingBudget: number;
    monthlyProjection: number;
  } | null>(null);
  const [studentsNeedingAttention, setStudentsNeedingAttention] = useState<
    Array<{ studentId: string; reason: string; priority: 'high' | 'medium' | 'low' }>
  >([]);
  const [advisorAnalysis, setAdvisorAnalysis] = useState<AdvisorAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Estados para filtros
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Estados para configuración de presupuesto
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [newBudgetLimit, setNewBudgetLimit] = useState<string>('');
  const [savingBudget, setSavingBudget] = useState(false);

  // Estados para ordenamiento
  const [sortField, setSortField] = useState<keyof StudentMetrics | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    console.log('📊 Tutor Analytics: Componente montado o usuario cambió', { userId: user?.id, userRole: user?.role?.name });
    if (user?.id) {
      loadCourses();
    }
  }, [user?.id]);

  useEffect(() => {
    console.log('📊 Tutor Analytics: Curso seleccionado cambió:', selectedCourseId);
    if (selectedCourseId) {
      loadAnalytics();
    }
  }, [selectedCourseId]);

  const loadCourses = async () => {
    try {
      console.log('📊 Tutor Analytics: Cargando cursos...', { userId: user?.id, userRole: user?.role?.name });
      // Verificar si es admin o coordinador para ver todos los cursos
      const userRole = user?.role?.name;
      const isAdminOrCoordinator = userRole === 'admin' || userRole === 'coordinator';

      const coursesData = isAdminOrCoordinator
        ? await courseService.getAllCourses()
        : await courseService.getMyCourses(user!.id);

      console.log('📊 Tutor Analytics: Cursos cargados:', { count: coursesData.length, courses: coursesData.map(c => ({ id: c.id, title: c.title })) });

      setCourses(coursesData);
      if (coursesData.length > 0 && !selectedCourseId) {
        // Course.id puede ser number o string dependiendo de la BD
        setSelectedCourseId(String(coursesData[0].id));
        console.log('📊 Tutor Analytics: Curso seleccionado automáticamente:', coursesData[0].id);
      }
    } catch (error) {
      console.error('❌ Tutor Analytics: Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!selectedCourseId) {
      console.log('⚠️ Tutor Analytics: No hay curso seleccionado');
      return;
    }

    console.log('📊 Tutor Analytics: Cargando datos de análisis para curso:', selectedCourseId);
    setLoading(true);
    try {
      // Construir filtros
      const filters: AnalyticsFilters = {};

      if (dateFrom) {
        filters.dateFrom = new Date(dateFrom);
        // Ajustar a inicio del día
        filters.dateFrom.setHours(0, 0, 0, 0);
      }

      if (dateTo) {
        filters.dateTo = new Date(dateTo);
        // Ajustar a fin del día
        filters.dateTo.setHours(23, 59, 59, 999);
      }

      console.log('📊 Tutor Analytics: Aplicando filtros:', filters);

      const [students, course, costs, attention] = await Promise.all([
        getStudentMetrics(selectedCourseId, filters),
        getCourseMetrics(selectedCourseId, filters),
        getCostMetrics({ courseId: selectedCourseId }),
        getStudentsNeedingAttention(selectedCourseId),
      ]);

      console.log('📊 Tutor Analytics: Datos cargados:', {
        studentsCount: students.length,
        courseMetrics: course ? {
          courseId: course.courseId,
          courseTitle: course.courseTitle,
          totalStudents: course.totalStudents,
          activeStudents: course.activeStudents,
          totalInteractions: course.totalInteractions,
          totalCost: course.totalCost,
        } : null,
        costsMetrics: costs ? { totalCost: costs.totalCost, totalInteractions: costs.totalInteractions } : null,
        attentionCount: attention.length,
      });

      setStudentMetrics(students);
      setCourseMetrics(course);
      setCostMetrics(costs);
      setStudentsNeedingAttention(attention);

      // Calcular presupuesto agregado del curso
      if (students.length > 0) {
        try {
          // 1. Obtener estadísticas de uso del curso (una sola llamada RPC)
          const courseUsage = await getCourseUsageStats(selectedCourseId);

          // 2. Verificar si hay un presupuesto específico configurado para el curso
          const courseBudgetLimit = await getCourseBudgetLimit(selectedCourseId);

          if (courseBudgetLimit !== null) {
            // Si hay un límite por curso, usarlo directamente
            const monthlyCost = courseUsage?.monthlyCost || costs?.thisMonth || 0;
            setBudgetStats({
              monthlyCost,
              monthlyLimit: courseBudgetLimit,
              remainingBudget: Math.max(0, courseBudgetLimit - monthlyCost),
              monthlyProjection: courseUsage?.monthlyProjection || costs?.projection?.monthly || 0,
            });
            setNewBudgetLimit(courseBudgetLimit.toString());
          } else {
            // 3. Fallback: usar el total de límites de estudiantes o valor por defecto
            const monthlyCost = courseUsage?.monthlyCost || costs?.thisMonth || 0;
            const defaultLimit = 50.00;
            const estimatedLimit = students.length * defaultLimit;

            setBudgetStats({
              monthlyCost,
              monthlyLimit: estimatedLimit,
              remainingBudget: Math.max(0, estimatedLimit - monthlyCost),
              monthlyProjection: courseUsage?.monthlyProjection || costs?.projection?.monthly || 0,
            });
            setNewBudgetLimit(estimatedLimit.toString());
          }
        } catch (error) {
          console.error('Error calculando presupuesto del curso:', error);
          const monthlyCost = costs?.thisMonth || 0;
          setBudgetStats({
            monthlyCost,
            monthlyLimit: 0,
            remainingBudget: 0,
            monthlyProjection: 0,
          });
        }
      } else {
        setBudgetStats(null);
      }

      // Generar análisis con IA si hay datos
      if (course && students.length > 0) {
        console.log('🤖 Tutor Analytics: Generando análisis con IA...');
        setAnalyzing(true);
        try {
          const analysis = await analyzeCoursePerformance(course, students);
          setAdvisorAnalysis(analysis);
        } catch (error: any) {
          // Si es un error de cuota (429), no inundar la consola, analyzeCoursePerformance ya retorna un fallback
          if (error?.status === 429 || error?.message?.includes('429')) {
            console.warn('🤖 Tutor Analytics: Cuota de Gemini excedida, usando análisis de respaldo.');
          } else {
            console.error('❌ Tutor Analytics: Error generating advisor analysis:', error);
          }
        } finally {
          setAnalyzing(false);
        }
      } else {
        console.log('⚠️ Tutor Analytics: No hay datos suficientes para análisis de IA:', {
          hasCourse: !!course,
          studentsCount: students.length,
        });
        setAdvisorAnalysis(null);
      }
    } catch (error) {
      console.error('❌ Tutor Analytics: Error loading analytics:', error);
    } finally {
      setLoading(false);
      console.log('✅ Tutor Analytics: Carga de análisis completada');
    }
  };

  const isAdmin = user?.role?.name === 'admin' || user?.role?.name === 'admin_campus';
  const currentCourse = courses.find(c => String(c.id) === selectedCourseId);
  const isInstructor = currentCourse?.teacher_id === user?.id;
  const canManageBudget = isAdmin || isInstructor;

  const handleSaveBudget = async () => {
    if (!selectedCourseId || !newBudgetLimit) return;

    const limitValue = parseFloat(newBudgetLimit);
    if (isNaN(limitValue) || limitValue < 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    setSavingBudget(true);
    try {
      await setUsageLimit({
        course_id: String(selectedCourseId),
        limit_type: 'monthly_cost',
        limit_value: limitValue,
        is_active: true
      });
      setIsBudgetModalOpen(false);
      // Recargar analytics para reflejar el nuevo límite
      setTimeout(() => loadAnalytics(), 500);
    } catch (error) {
      console.error('Error saving budget limit:', error);
      alert('Error al guardar el presupuesto');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleApplyFilters = () => {
    setFiltersApplied(true);
    loadAnalytics();
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setFiltersApplied(false);
    // Recargar sin filtros
    setTimeout(() => loadAnalytics(), 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Función para manejar el ordenamiento
  const handleSort = (field: keyof StudentMetrics) => {
    if (sortField === field) {
      // Si ya está ordenando por este campo, cambiar dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nuevo campo, ordenar ascendente por defecto
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Función para ordenar los datos
  const getSortedStudentMetrics = (): StudentMetrics[] => {
    if (!sortField) return studentMetrics;

    return [...studentMetrics].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Manejar valores nulos
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Ordenamiento especial por fecha
      if (sortField === 'lastInteractionDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      // Comparación numérica o de strings
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Comparación de strings
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Componente para el header de la tabla con ordenamiento
  const SortableTableHeader: React.FC<{
    field: keyof StudentMetrics;
    children: React.ReactNode;
    className?: string;
  }> = ({ field, children, className = '' }) => {
    const isSorted = sortField === field;
    const isAsc = sortDirection === 'asc';

    return (
      <th
        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${className}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-2">
          <span>{children}</span>
          <div className="flex flex-col">
            <IconChevronUp
              className={`w-3 h-3 ${isSorted && isAsc ? 'text-blue-600' : 'text-gray-300'
                }`}
            />
            <IconChevronDown
              className={`w-3 h-3 -mt-1 ${isSorted && !isAsc ? 'text-blue-600' : 'text-gray-300'
                }`}
            />
          </div>
        </div>
      </th>
    );
  };

  const handleExportPDF = async () => {
    if (!courseMetrics || studentMetrics.length === 0) {
      alert('No hay datos para exportar. Selecciona un curso y espera a que se carguen los datos.');
      return;
    }

    try {
      const summaries = [
        { label: 'Curso', value: courseMetrics.courseTitle },
        { label: 'Total Estudiantes', value: courseMetrics.totalStudents },
        { label: 'Estudiantes Activos', value: courseMetrics.activeStudents },
        { label: 'Tasa de Participación', value: `${courseMetrics.participationRate.toFixed(1)}%` },
        { label: 'Total Interacciones', value: courseMetrics.totalInteractions.toLocaleString('es-ES') },
        { label: 'Total Tokens', value: courseMetrics.totalTokens.toLocaleString('es-ES') },
        { label: 'Costo Total', value: formatCurrency(courseMetrics.totalCost) },
        { label: 'Promedio Interacciones por Estudiante', value: courseMetrics.averageInteractionsPerStudent.toFixed(1) },
      ];

      const studentsTableData = studentMetrics.map((student, index) => [
        index + 1,
        student.studentName,
        student.studentEmail || '',
        student.totalInteractions,
        student.totalTokens.toLocaleString('es-ES'),
        formatCurrency(student.totalCost),
        student.lastInteractionDate ? formatDateUtil(student.lastInteractionDate) : 'Nunca',
        student.performanceImprovement !== null
          ? `${student.performanceImprovement > 0 ? '+' : ''}${student.performanceImprovement.toFixed(1)}%`
          : 'N/A'
      ]);

      const tables = [
        {
          title: 'Métricas por Estudiante',
          headers: ['#', 'Estudiante', 'Email', 'Interacciones', 'Tokens', 'Costo', 'Última Interacción', 'Desempeño'],
          rows: studentsTableData
        }
      ];

      if (courseMetrics.topTopics.length > 0) {
        const topicsData = courseMetrics.topTopics.slice(0, 10).map((topic, index) => [
          index + 1,
          topic.topic,
          topic.count
        ]);
        tables.push({
          title: 'Temas Más Consultados',
          headers: ['#', 'Tema', 'Consultas'],
          rows: topicsData
        });
      }

      await exportToPDF({
        title: 'Análisis del Tutor IA',
        subtitle: courseMetrics.courseTitle,
        orientation: 'landscape',
        summaries,
        tables,
        fileName: `Analisis_Tutor_${courseMetrics.courseTitle.replace(/[^a-z0-9]/gi, '_')}`,
        showDate: true
      });
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      alert('Error al exportar a PDF. Por favor, intenta nuevamente.');
    }
  };

  const handleExportExcel = async () => {
    if (!courseMetrics || studentMetrics.length === 0) {
      alert('No hay datos para exportar. Selecciona un curso y espera a que se carguen los datos.');
      return;
    }

    try {
      const summaryData = [
        { 'Métrica': 'Curso', 'Valor': courseMetrics.courseTitle },
        { 'Métrica': 'Total Estudiantes', 'Valor': courseMetrics.totalStudents },
        { 'Métrica': 'Estudiantes Activos', 'Valor': courseMetrics.activeStudents },
        { 'Métrica': 'Tasa de Participación (%)', 'Valor': courseMetrics.participationRate.toFixed(1) },
        { 'Métrica': 'Total Interacciones', 'Valor': courseMetrics.totalInteractions },
        { 'Métrica': 'Total Tokens', 'Valor': courseMetrics.totalTokens },
        { 'Métrica': 'Costo Total', 'Valor': formatCurrency(courseMetrics.totalCost) },
        { 'Métrica': 'Promedio Interacciones por Estudiante', 'Valor': courseMetrics.averageInteractionsPerStudent.toFixed(1) },
      ];

      const studentsData = studentMetrics.map((student, index) => ({
        '#': index + 1,
        'Estudiante': student.studentName,
        'Email': student.studentEmail || '',
        'Interacciones': student.totalInteractions,
        'Tokens': student.totalTokens,
        'Costo': student.totalCost,
        'Última Interacción': student.lastInteractionDate ? formatDateUtil(student.lastInteractionDate) : 'Nunca',
        'Desempeño (%)': student.performanceImprovement !== null ? student.performanceImprovement.toFixed(1) : 'N/A'
      }));

      const sheets = [
        {
          name: 'Resumen',
          data: summaryData
        },
        {
          name: 'Estudiantes',
          data: studentsData
        }
      ];

      if (courseMetrics.topTopics.length > 0) {
        const topicsData = courseMetrics.topTopics.slice(0, 10).map((topic, index) => ({
          '#': index + 1,
          'Tema': topic.topic,
          'Consultas': topic.count
        }));
        sheets.push({
          name: 'Temas Más Consultados',
          data: topicsData
        });
      }

      await exportToExcel({
        sheets,
        fileName: `Analisis_Tutor_${courseMetrics.courseTitle.replace(/[^a-z0-9]/gi, '_')}`
      });
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      alert('Error al exportar a Excel. Por favor, intenta nuevamente.');
    }
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-dark">Análisis del Tutor IA</h1>
        <p className="text-text-light mt-1">
          {user?.role?.name === 'admin' || user?.role?.name === 'coordinator'
            ? 'Evalúa el desempeño de todos los cursos y estudiantes con el Tutor Virtual'
            : 'Evalúa el desempeño del curso y de cada estudiante con el Tutor Virtual'}
        </p>
      </div>

      {/* Panel de Filtros */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Selector de Curso */}
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <label className="text-sm font-medium text-text-dark md:w-24">Curso:</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Selecciona un curso</option>
              {courses.map((course) => (
                <option key={course.id} value={String(course.id)}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Filtros de Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-dark">Fecha Desde:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-dark">Fecha Hasta:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleApplyFilters} variant="primary" size="sm">
              <IconFilter className="w-4 h-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button onClick={handleClearFilters} variant="secondary" size="sm">
              <IconX className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </Button>
            <Button onClick={loadAnalytics} variant="ghost" size="sm">
              <IconRefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            {courseMetrics && studentMetrics.length > 0 && (
              <>
                <Button onClick={handleExportExcel} variant="secondary" size="sm">
                  <IconDownload className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
                <Button onClick={handleExportPDF} variant="secondary" size="sm">
                  <IconFileText className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </>
            )}
            {filtersApplied && (
              <span className="text-sm text-blue-600 font-medium ml-2">
                ✓ Filtros aplicados
              </span>
            )}
          </div>
        </div>
      </Card>

      {!selectedCourseId ? (
        <Card className="p-8 text-center">
          <IconBookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-text-dark">Selecciona un curso</h3>
          <p className="mt-1 text-sm text-text-light">
            Elige un curso para ver el análisis del Tutor IA
          </p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Métricas Generales del Curso */}
          {courseMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <IconUsers className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-light truncate">
                        Participación Total
                      </dt>
                      <dd className="text-lg font-medium text-text-dark">
                        {courseMetrics.activeStudents} / {courseMetrics.totalStudents}
                      </dd>
                      <dd className="text-xs text-text-light">
                        {Math.round(courseMetrics.participationRate)}% de estudiantes
                      </dd>
                    </dl>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <IconMessage className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-light truncate">
                        Interacciones
                      </dt>
                      <dd className="text-lg font-medium text-text-dark">
                        {courseMetrics.totalInteractions}
                      </dd>
                      <dd className="text-xs text-text-light">
                        Promedio: {courseMetrics.averageInteractionsPerStudent.toFixed(1)} por
                        estudiante
                      </dd>
                    </dl>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <IconDollarSign className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-light truncate">Costo Total</dt>
                      <dd className="text-lg font-medium text-text-dark">
                        {formatCurrency(courseMetrics.totalCost)}
                      </dd>
                      <dd className="text-xs text-text-light">
                        {courseMetrics.totalInteractions > 0
                          ? formatCurrency(
                            courseMetrics.totalCost / courseMetrics.totalInteractions
                          )
                          : '$0.00'}{' '}
                        por interacción
                      </dd>
                    </dl>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <IconChartBar className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-light truncate">Tokens</dt>
                      <dd className="text-lg font-medium text-text-dark">
                        {courseMetrics.totalTokens.toLocaleString()}
                      </dd>
                      <dd className="text-xs text-text-light">
                        {courseMetrics.totalInteractions > 0
                          ? Math.round(courseMetrics.totalTokens / courseMetrics.totalInteractions)
                          : 0}{' '}
                        por interacción
                      </dd>
                    </dl>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.834a1 1 0 001.364.972l4-.902a1 1 0 00.636-.972V11.333a1 1 0 00-.636-.972l-4-.902a1 1 0 00-1.364.972zm7.5-4.762a1.5 1.5 0 00-2.992-.077l-.825 4.348a1 1 0 01-.992.826H8.5a1 1 0 000 2h1.255a3 3 0 002.973-2.481l.826-4.348a.5.5 0 01.496-.392z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-text-light truncate">Evaluaciones</dt>
                      <dd className="text-lg font-medium text-text-dark">
                        {courseMetrics.totalRatings}
                      </dd>
                      <dd className="text-xs text-text-light">
                        👍 {courseMetrics.thumbsUpCount} / 👎 {courseMetrics.thumbsDownCount}
                        {courseMetrics.totalRatings > 0 && (
                          <span className="ml-1">({Math.round(courseMetrics.averageRating)}% positivas)</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </Card>

              {/* Tarjeta de Presupuesto Mensual */}
              {budgetStats && (
                <Card className={`p-6 ${budgetStats.remainingBudget <= budgetStats.monthlyLimit * 0.1
                  ? 'border-2 border-red-300 bg-red-50'
                  : budgetStats.remainingBudget <= budgetStats.monthlyLimit * 0.3
                    ? 'border-2 border-yellow-300 bg-yellow-50'
                    : 'border-2 border-green-300 bg-green-50'
                  }`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-text-light flex justify-between items-center">
                          <span>Presupuesto Mensual</span>
                          {canManageBudget && (
                            <button
                              onClick={() => setIsBudgetModalOpen(true)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
                              title="Configurar presupuesto"
                            >
                              <IconSettings className="w-4 h-4" />
                            </button>
                          )}
                        </dt>
                        <dd className="text-lg font-medium text-text-dark">
                          {formatCurrency(budgetStats.monthlyCost)} / {formatCurrency(budgetStats.monthlyLimit)}
                        </dd>
                        <dd className={`text-xs font-medium ${budgetStats.remainingBudget <= budgetStats.monthlyLimit * 0.1
                          ? 'text-red-600'
                          : budgetStats.remainingBudget <= budgetStats.monthlyLimit * 0.3
                            ? 'text-yellow-600'
                            : 'text-green-600'
                          }`}>
                          Restante: {formatCurrency(budgetStats.remainingBudget)}
                        </dd>
                        <dd className="text-xs text-text-light mt-1">
                          Proyección: {formatCurrency(budgetStats.monthlyProjection)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Análisis y Recomendaciones del Asesor IA */}
          {advisorAnalysis && (
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <IconRobot className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold text-text-dark">
                  Análisis y Recomendaciones del Asesor IA
                </h2>
                {analyzing && (
                  <div className="ml-auto">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Resumen Ejecutivo */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-text-dark mb-2">Resumen Ejecutivo</h3>
                <p className="text-sm text-text-light whitespace-pre-line">{advisorAnalysis.summary}</p>
              </div>

              {/* Insights Clave */}
              {advisorAnalysis.keyInsights.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-text-dark mb-2">Insights Clave</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {advisorAnalysis.keyInsights.map((insight, index) => (
                      <li key={index} className="text-sm text-text-light">{insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recomendaciones */}
              {advisorAnalysis.recommendations.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-text-dark mb-4">Recomendaciones</h3>
                  <div className="space-y-4">
                    {advisorAnalysis.recommendations.map((rec, index) => {
                      const priorityColors = {
                        high: 'border-red-200 bg-red-50',
                        medium: 'border-orange-200 bg-orange-50',
                        low: 'border-yellow-200 bg-yellow-50',
                      };

                      const priorityIcons = {
                        high: '🔴',
                        medium: '🟠',
                        low: '🟡',
                      };

                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${priorityColors[rec.priority]}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span>{priorityIcons[rec.priority]}</span>
                                <h4 className="font-semibold text-text-dark">{rec.title}</h4>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${rec.priority === 'high'
                                    ? 'bg-red-200 text-red-800'
                                    : rec.priority === 'medium'
                                      ? 'bg-orange-200 text-orange-800'
                                      : 'bg-yellow-200 text-yellow-800'
                                    }`}
                                >
                                  {rec.priority === 'high'
                                    ? 'Alta'
                                    : rec.priority === 'medium'
                                      ? 'Media'
                                      : 'Baja'}
                                </span>
                              </div>
                              <p className="text-sm text-text-light mt-1">{rec.description}</p>
                            </div>
                          </div>
                          {rec.actionItems.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-text-dark mb-1">
                                Acciones sugeridas:
                              </p>
                              <ul className="list-disc list-inside space-y-1">
                                {rec.actionItems.map((action, actionIndex) => (
                                  <li key={actionIndex} className="text-xs text-text-light">
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Alertas: Estudiantes que Necesitan Atención */}
          {studentsNeedingAttention.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <IconAlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                <h2 className="text-lg font-semibold text-text-dark">
                  Estudiantes que Necesitan Atención
                </h2>
              </div>
              <div className="space-y-2">
                {studentsNeedingAttention.map((item) => {
                  const student = studentMetrics.find((s) => s.studentId === item.studentId);
                  if (!student) return null;

                  const priorityColors = {
                    high: 'bg-red-100 text-red-800 border-red-200',
                    medium: 'bg-orange-100 text-orange-800 border-orange-200',
                    low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                  };

                  return (
                    <div
                      key={item.studentId}
                      className={`p-3 rounded-lg border ${priorityColors[item.priority]}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-sm opacity-75">{item.reason}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${item.priority === 'high'
                            ? 'bg-red-200'
                            : item.priority === 'medium'
                              ? 'bg-orange-200'
                              : 'bg-yellow-200'
                            }`}
                        >
                          {item.priority === 'high'
                            ? 'Alta'
                            : item.priority === 'medium'
                              ? 'Media'
                              : 'Baja'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Lista de Estudiantes con Métricas */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-text-dark mb-4">
              Desempeño por Estudiante
            </h2>
            {studentMetrics.length === 0 ? (
              <div className="text-center py-8">
                <IconStudent className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-text-dark">
                  No hay datos disponibles
                </h3>
                <p className="mt-1 text-sm text-text-light">
                  Los estudiantes aún no han usado el Tutor IA en este curso
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <SortableTableHeader field="studentName">
                        Estudiante
                      </SortableTableHeader>
                      <SortableTableHeader field="totalInteractions">
                        Interacciones
                      </SortableTableHeader>
                      <SortableTableHeader field="totalTokens">
                        Tokens
                      </SortableTableHeader>
                      <SortableTableHeader field="totalCost">
                        Costo
                      </SortableTableHeader>
                      <SortableTableHeader field="lastInteractionDate">
                        Última Interacción
                      </SortableTableHeader>
                      <SortableTableHeader field="performanceImprovement">
                        Desempeño
                      </SortableTableHeader>
                      <SortableTableHeader field="averageRating">
                        Evaluación
                      </SortableTableHeader>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedStudentMetrics().map((student) => (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-text-dark">
                              {student.studentName}
                            </div>
                            <div className="text-sm text-text-light">{student.studentEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-dark">
                          {student.totalInteractions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-dark">
                          {student.totalTokens.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-dark">
                          {formatCurrency(student.totalCost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                          {formatDate(student.lastInteractionDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {student.performanceImprovement !== null ? (
                            <div className="flex items-center">
                              {student.performanceImprovement > 0 ? (
                                <>
                                  <IconTrendingUp className="h-4 w-4 text-green-600 mr-1" />
                                  <span className="text-sm text-green-600">
                                    +{student.performanceImprovement.toFixed(1)}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <IconTrendingDown className="h-4 w-4 text-red-600 mr-1" />
                                  <span className="text-sm text-red-600">
                                    {student.performanceImprovement.toFixed(1)}%
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-text-light">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.totalRatings > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-green-600">👍 {student.thumbsUpCount}</span>
                              <span className="text-red-600">👎 {student.thumbsDownCount}</span>
                              <span className="text-gray-600">
                                ({Math.round(student.averageRating)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin evaluaciones</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Temas Más Consultados */}
          {courseMetrics && courseMetrics.topTopics.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-text-dark mb-4">
                Temas Más Consultados
              </h2>
              <div className="space-y-2">
                {courseMetrics.topTopics.slice(0, 10).map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-text-dark">{topic.topic}</span>
                    <span className="text-sm text-text-light">{topic.count} consultas</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal de Configuración de Presupuesto */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md p-6 bg-white shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-text-dark">Configurar Presupuesto IA</h3>
              <button onClick={() => setIsBudgetModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <IconX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-text-light">
                Define el presupuesto máximo mensual en USD para el Tutor IA en este curso.
                Este límite se aplicará a nivel de curso y reemplazará los cálculos basados en promedios por estudiante.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Límite Mensual del Curso (USD)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newBudgetLimit}
                    onChange={(e) => setNewBudgetLimit(e.target.value)}
                    className="block w-full pl-7 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveBudget}
                  disabled={savingBudget}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {savingBudget ? 'Guardando...' : 'Guardar Límite'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TeacherTutorAnalyticsPage;

