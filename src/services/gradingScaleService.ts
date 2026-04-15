// services/gradingScaleService.ts
// Servicio para gestión de escalas de calificación (Paraguay)
// Soporta escalas 1-5 (Universidad Católica) y 1-10 (otras universidades)

import { supabase } from '@/lib/supabase';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface GradingScale {
    id: string;
    institution_id?: number;
    subject_id?: number;
    scale_name: string;
    min_grade: number;
    max_grade: number;
    passing_grade: number;
    passing_percentage: number;
    grade_labels: string[];
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface GradeConversion {
    percentage: number;
    grade: number;
    is_passing: boolean;
    label: string;
    scale_min: number;
    scale_max: number;
    passing_grade: number;
}

// Escalas predefinidas para Paraguay
export const GRADING_SCALE_PRESETS = {
    // Escala Universidad Católica (1-5)
    SCALE_1_5: {
        scale_name: 'Escala 1-5 (Paraguay)',
        min_grade: 1,
        max_grade: 5,
        passing_grade: 3,
        passing_percentage: 60,
        grade_labels: ['Reprobado (1)', 'Insuficiente (2)', 'Aceptable (3)', 'Bueno (4)', 'Distinguido (5)']
    },
    // Escala otras universidades (1-10)  
    SCALE_1_10: {
        scale_name: 'Escala 1-10',
        min_grade: 1,
        max_grade: 10,
        passing_grade: 6,
        passing_percentage: 60,
        grade_labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    },
    // Escala porcentual (0-100)
    SCALE_PERCENTAGE: {
        scale_name: 'Escala Porcentual',
        min_grade: 0,
        max_grade: 100,
        passing_grade: 60,
        passing_percentage: 60,
        grade_labels: ['Reprobado', 'Suficiente', 'Bueno', 'Muy Bueno', 'Excelente']
    }
} as const;

// Tipos de grado válidos para Paraguay
export const DEGREE_TYPES_PARAGUAY = [
    { value: 'licenciatura', label: 'Licenciatura', duration_years: '4-5' },
    { value: 'medico_cirujano', label: 'Médico Cirujano', duration_years: '6' },
    { value: 'ingenieria', label: 'Ingeniería', duration_years: '5' },
    { value: 'tecnicatura', label: 'Tecnicatura', duration_years: '2-3' },
    { value: 'maestria', label: 'Maestría', duration_years: '2' },
    { value: 'doctorado', label: 'Doctorado', duration_years: '3-5' },
    { value: 'especializacion', label: 'Especialización Médica', duration_years: '3-4' },
    // Legacy values (compatibilidad)
    { value: 'bachelor', label: 'Bachelor (Licenciatura)', duration_years: '4-5' },
    { value: 'master', label: 'Master (Maestría)', duration_years: '2' },
    { value: 'doctorate', label: 'Doctorate (Doctorado)', duration_years: '3-5' },
    { value: 'technical', label: 'Technical (Tecnicatura)', duration_years: '2-3' },
] as const;

// ============================================
// SERVICIO DE ESCALAS
// ============================================

export const gradingScaleService = {
    /**
     * Obtener escala de una institución
     */
    async getInstitutionScale(institutionId: number): Promise<GradingScale | null> {
        const { data, error } = await supabase
            .from('grading_scales')
            .select('*')
            .eq('institution_id', institutionId)
            .eq('is_default', true)
            .maybeSingle();

        if (error) {
            console.error('Error fetching institution scale:', error);
            throw error;
        }
        return data;
    },

    /**
     * Obtener escala de una materia (si tiene una específica)
     */
    async getSubjectScale(subjectId: number): Promise<GradingScale | null> {
        const { data, error } = await supabase
            .from('grading_scales')
            .select('*')
            .eq('subject_id', subjectId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching subject scale:', error);
            throw error;
        }
        return data;
    },

    /**
     * Obtener la escala aplicable (prioridad: subject > institution)
     */
    async getApplicableScale(
        subjectId?: number,
        institutionId?: number
    ): Promise<GradingScale | null> {
        // Primero intentar obtener escala específica de materia
        if (subjectId) {
            const subjectScale = await this.getSubjectScale(subjectId);
            if (subjectScale) return subjectScale;
        }

        // Si no, usar escala de institución
        if (institutionId) {
            return this.getInstitutionScale(institutionId);
        }

        return null;
    },

    /**
     * Crear nueva escala
     */
    async createScale(scale: Omit<GradingScale, 'id' | 'created_at' | 'updated_at'>): Promise<GradingScale> {
        const { data, error } = await supabase
            .from('grading_scales')
            .insert([scale])
            .select()
            .single();

        if (error) {
            console.error('Error creating grading scale:', error);
            throw error;
        }
        return data;
    },

    /**
     * Actualizar escala
     */
    async updateScale(id: string, updates: Partial<GradingScale>): Promise<GradingScale> {
        const { data, error } = await supabase
            .from('grading_scales')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating grading scale:', error);
            throw error;
        }
        return data;
    },

    /**
     * Convertir porcentaje a nota según escala
     * Usa la función SQL para consistencia
     */
    async convertPercentageToGrade(
        percentage: number,
        scaleId?: string,
        subjectId?: number,
        institutionId?: number
    ): Promise<GradeConversion> {
        const { data, error } = await supabase.rpc('convert_percentage_to_grade', {
            p_percentage: percentage,
            p_scale_id: scaleId || null,
            p_subject_id: subjectId || null,
            p_institution_id: institutionId || null
        });

        if (error) {
            console.error('Error converting percentage to grade:', error);
            throw error;
        }
        return data as GradeConversion;
    },

    /**
     * Conversión local (sin llamada a DB) usando escala proporcionada
     */
    convertPercentageLocal(percentage: number, scale: GradingScale): GradeConversion {
        const grade = scale.min_grade + (percentage / 100) * (scale.max_grade - scale.min_grade);
        const roundedGrade = Math.round(grade * 100) / 100;
        const clampedGrade = Math.max(scale.min_grade, Math.min(scale.max_grade, roundedGrade));

        const isPassing = clampedGrade >= scale.passing_grade;

        // Calcular índice del label
        const labelIndex = Math.floor(
            ((clampedGrade - scale.min_grade) / (scale.max_grade - scale.min_grade)) *
            (scale.grade_labels.length - 1)
        );
        const safeIndex = Math.max(0, Math.min(scale.grade_labels.length - 1, labelIndex));

        return {
            percentage,
            grade: clampedGrade,
            is_passing: isPassing,
            label: scale.grade_labels[safeIndex],
            scale_min: scale.min_grade,
            scale_max: scale.max_grade,
            passing_grade: scale.passing_grade
        };
    },

    /**
     * Obtener texto descriptivo de nota
     */
    getGradeDescription(grade: number, scale: GradingScale): string {
        if (grade >= scale.passing_grade) {
            const percentage = ((grade - scale.min_grade) / (scale.max_grade - scale.min_grade)) * 100;
            if (percentage >= 90) return 'Excelente';
            if (percentage >= 80) return 'Muy Bueno';
            if (percentage >= 70) return 'Bueno';
            return 'Aprobado';
        }
        return 'Reprobado';
    }
};

export default gradingScaleService;
