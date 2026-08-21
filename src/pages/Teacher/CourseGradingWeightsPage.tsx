// pages/CourseGradingWeightsPage.tsx
// Página para configurar ponderaciones de evaluaciones por materia

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gradingService, SubjectGradingWeights } from '@/services/gradingService';
import { courseService } from '@/services/teacherCourses';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
  IconSave,
  IconAlertTriangle,
  IconCheckCircle,
  IconArrowLeft,
} from '@/components/Common/Icons';
import ScaleSelector from '@/components/Academic/ScaleSelector';

const CourseGradingWeightsPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [weights, setWeights] = useState<SubjectGradingWeights | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [subjectId, setSubjectId] = useState<number | null>(null);

  useEffect(() => {
    if (courseId) {
      loadData();
    }
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar información del curso
      const course = await courseService.getCourse(parseInt(courseId!));
      setCourseTitle(course.title);

      // Verificar si el curso tiene una materia asociada
      if (!course.subject_id) {
        setError(
          'Este curso no tiene una materia asociada. Por favor, asigne una materia al curso primero.'
        );
        setLoading(false);
        return;
      }

      setSubjectId(course.subject_id);

      // Cargar información de la materia
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('name, code')
        .eq('id', course.subject_id)
        .maybeSingle();

      if (subjectError) {
        console.error('Error fetching subject:', subjectError);
      } else if (subject) {
        setSubjectName(`${subject.name} ${subject.code ? `(${subject.code})` : ''}`);
      }

      // Cargar o crear ponderaciones de la materia
      const data = await gradingService.getOrCreateGradingWeights(course.subject_id);
      setWeights(data);
    } catch (err: any) {
      setError('Error al cargar la configuración');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!weights || !subjectId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await gradingService.updateGradingWeights(subjectId, {
        quizzes_weight: weights.quizzes_weight,
        exam1_weight: weights.exam1_weight,
        exam2_weight: weights.exam2_weight,
        exam3_weight: weights.exam3_weight,
        final_exam_weight: weights.final_exam_weight,
        practicals_weight: weights.practicals_weight,
        allow_custom_weights: weights.allow_custom_weights,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateWeight = (field: keyof SubjectGradingWeights, value: number) => {
    if (!weights) return;

    // Validar que el valor esté entre 0 y 100
    const clampedValue = Math.max(0, Math.min(100, value));

    setWeights({
      ...weights,
      [field]: clampedValue,
    });
  };

  const totalWeight = weights
    ? weights.quizzes_weight +
      weights.exam1_weight +
      weights.exam2_weight +
      weights.exam3_weight +
      weights.final_exam_weight +
      weights.practicals_weight
    : 0;

  const isValid = Math.abs(totalWeight - 100) < 0.01;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Configuración de Ponderación
          </h1>
          {subjectName && <p className="text-sm text-gray-600 mt-1">Materia: {subjectName}</p>}
          {courseTitle && <p className="text-xs text-gray-500 mt-1">Curso: {courseTitle}</p>}
        </div>
        <Button
          onClick={() => navigate(-1)}
          variant="secondary"
          className="self-start sm:self-auto"
        >
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>

      {error && (
        <Card>
          <div className="flex items-center gap-3 text-red-600">
            <IconAlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </Card>
      )}

      {success && (
        <Card>
          <div className="flex items-center gap-3 text-green-600">
            <IconCheckCircle className="w-5 h-5 flex-shrink-0" />
            <p>Ponderaciones guardadas correctamente</p>
          </div>
        </Card>
      )}

      {/* Nueva sección de Escala de Calificación */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-2">Sistema de Calificación</h2>
          <p className="text-sm text-gray-600 mb-4">
            Defina la escala de notas que utilizará este curso (ej: 1-5, 1-10, Porcentual).
          </p>

          <ScaleSelector subjectId={subjectId || undefined} className="max-w-md" />
        </div>
      </Card>

      <Card>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Distribución de Ponderaciones</h2>
            <p className="text-sm text-gray-600">
              Configure los porcentajes que representará cada tipo de evaluación en la nota final.
              La suma total debe ser exactamente 100%. Esta configuración se aplicará a todos los
              cursos de esta materia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quizzes, Trivias y Tareas (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={weights?.quizzes_weight || 0}
                onChange={(e) => updateWeight('quizzes_weight', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
              />
              <p className="text-xs text-gray-500">
                Promedio de todas las evaluaciones de tipo quiz, trivia y assignment
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Primer Examen (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={weights?.exam1_weight || 0}
                onChange={(e) => updateWeight('exam1_weight', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
              />
              <p className="text-xs text-gray-500">Porcentaje del primer examen parcial</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Segundo Examen (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={weights?.exam2_weight || 0}
                onChange={(e) => updateWeight('exam2_weight', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
              />
              <p className="text-xs text-gray-500">Porcentaje del segundo examen parcial</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Tercer Examen (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={weights?.exam3_weight || 0}
                onChange={(e) => updateWeight('exam3_weight', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
              />
              <p className="text-xs text-gray-500">
                Porcentaje del tercer examen parcial (opcional)
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Trabajos Prácticos / Lab (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={weights?.practicals_weight || 0}
                onChange={(e) => updateWeight('practicals_weight', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
              />
              <p className="text-xs text-gray-500">
                Tareas que incluyan "Práctico", "Lab" o "Taller" en el título
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Examen Final (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={weights?.final_exam_weight || 0}
                onChange={(e) => updateWeight('final_exam_weight', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
              />
              <p className="text-xs text-gray-500">Debe contener "final" en el título</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-700">Total:</span>
              <span className={`text-lg font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                {totalWeight.toFixed(2)}%
              </span>
            </div>
            {!isValid && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <IconAlertTriangle className="w-4 h-4" />
                La suma debe ser exactamente 100% (diferencia:{' '}
                {Math.abs(totalWeight - 100).toFixed(2)}%)
              </p>
            )}
            {isValid && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <IconCheckCircle className="w-4 h-4" />
                La configuración es válida
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!isValid || saving}
              className="flex-1 sm:flex-none"
            >
              <IconSave className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Card>

      {/* Información adicional */}
      <Card>
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-700">Información sobre el cálculo de notas</h3>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li>Las notas se calculan automáticamente usando estas ponderaciones</li>
            <li>Quizzes, trivias y tareas se promedian entre sí antes de aplicar el porcentaje</li>
            <li>Los exámenes se identifican por orden de fecha de envío</li>
            <li>El examen final se identifica por contener la palabra "final" en el título</li>
            <li>Si falta alguna evaluación, solo se calcula con las disponibles</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default CourseGradingWeightsPage;
