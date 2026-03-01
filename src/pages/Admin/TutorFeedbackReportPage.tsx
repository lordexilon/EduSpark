// pages/Admin/TutorFeedbackReportPage.tsx
// Página para admin/admin-campus: Reporte de respuestas de conocimiento general del tutor
// Estas son respuestas que deberían estar en el RAG para mejorar el sistema

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconRefreshCw, IconFilter, IconDownload, IconCheck, IconX, IconClock } from '@/components/Common/Icons';

interface GeneralKnowledgeResponse {
  id: string;
  student_id: string;
  course_id: number;
  question: string;
  answer: string;
  rag_confidence: number;
  status: 'pending' | 'processed' | 'rejected';
  quality_score: number | null;
  usage_count: number;
  created_at: string;
  processed_at: string | null;
  student_name?: string;
  course_title?: string;
}

export const TutorFeedbackReportPage: React.FC = () => {
  const { user } = useAuth();
  const [responses, setResponses] = useState<GeneralKnowledgeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processed' | 'rejected'>('all');
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [courses, setCourses] = useState<Array<{ id: number; title: string }>>([]);

  useEffect(() => {
    if (user?.id && (user?.role?.name === 'admin' || user?.role?.name === 'admin-campus')) {
      loadCourses();
      loadResponses();
    }
  }, [user?.id, filterStatus, selectedCourse]);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadResponses = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('tutor_general_knowledge_responses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (selectedCourse) {
        query = query.eq('course_id', selectedCourse);
      }

      const { data: responsesData, error } = await query;

      if (error) throw error;

      if (!responsesData || responsesData.length === 0) {
        setResponses([]);
        return;
      }

      // Obtener cursos únicos
      const courseIds = [...new Set(responsesData.map((r: any) => r.course_id))];
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);

      // Obtener usuarios únicos
      const studentIds = [...new Set(responsesData.map((r: any) => r.student_id).filter(Boolean))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', studentIds);

      // Crear mapas para búsqueda rápida
      const coursesMap = new Map((coursesData || []).map((c: any) => [c.id, c]));
      const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]));

      // Combinar datos
      const formattedResponses = responsesData.map((item: any) => {
        const course = coursesMap.get(item.course_id);
        const user = item.student_id ? usersMap.get(item.student_id) : null;

        // Construir nombre completo
        const studentName = user 
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Desconocido'
          : 'Desconocido';

        return {
          ...item,
          course_title: course?.title || `Curso ${item.course_id}`,
          student_name: studentName,
        };
      });

      setResponses(formattedResponses);
    } catch (error) {
      console.error('Error loading responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadResponses();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      processed: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getQualityBadge = (score: number | null) => {
    if (score === null) return 'bg-gray-100 text-gray-800';
    if (score >= 85) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-blue-100 text-blue-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Curso', 'Estudiante', 'Pregunta', 'Respuesta', 'Confianza RAG', 'Estado', 'Calidad', 'Usos', 'Fecha'];
    const rows = responses.map(r => [
      r.id,
      r.course_title || '',
      r.student_name || '',
      r.question.replace(/,/g, ';'),
      r.answer.replace(/,/g, ';').substring(0, 200),
      r.rag_confidence.toFixed(2),
      r.status,
      r.quality_score?.toString() || 'N/A',
      r.usage_count.toString(),
      formatDate(r.created_at),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tutor-feedback-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const stats = {
    total: responses.length,
    pending: responses.filter(r => r.status === 'pending').length,
    processed: responses.filter(r => r.status === 'processed').length,
    rejected: responses.filter(r => r.status === 'rejected').length,
  };

  if (loading && responses.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Reporte de Retroalimentación del Tutor
        </h1>
        <p className="text-gray-600">
          Respuestas de conocimiento general que deberían estar en el RAG para mejorar el sistema
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-yellow-600 mb-1">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-green-600 mb-1">Procesadas</div>
          <div className="text-2xl font-bold text-green-700">{stats.processed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-red-600 mb-1">Rechazadas</div>
          <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <IconFilter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="processed">Procesadas</option>
            <option value="rejected">Rechazadas</option>
          </select>

          <select
            value={selectedCourse || ''}
            onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos los cursos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          <div className="flex-1"></div>

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <IconRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <IconDownload className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </Card>

      {/* Lista de respuestas */}
      <div className="space-y-4">
        {responses.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No hay respuestas que coincidan con los filtros seleccionados.</p>
          </Card>
        ) : (
          responses.map((response) => (
            <Card key={response.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(response.status)}`}>
                      {response.status === 'pending' ? 'Pendiente' : response.status === 'processed' ? 'Procesada' : 'Rechazada'}
                    </span>
                    <span className="text-sm text-gray-600">{response.course_title}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-600">{response.student_name}</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">
                    {formatDate(response.created_at)}
                    {response.processed_at && (
                      <span className="ml-2">
                        • Procesada: {formatDate(response.processed_at)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Confianza RAG</div>
                    <div className="text-lg font-bold text-gray-900">
                      {(response.rag_confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  {response.quality_score !== null && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Calidad</div>
                      <div className={`text-lg font-bold px-2 py-1 rounded ${getQualityBadge(response.quality_score)}`}>
                        {response.quality_score}/100
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-1">Pregunta:</div>
                <div className="text-gray-900 bg-blue-50 p-3 rounded border border-blue-200">
                  {response.question}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-1">Respuesta:</div>
                <div className="text-gray-800 bg-gray-50 p-3 rounded border border-gray-200 max-h-48 overflow-y-auto">
                  {response.answer.length > 500
                    ? `${response.answer.substring(0, 500)}...`
                    : response.answer}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Usos: {response.usage_count}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
