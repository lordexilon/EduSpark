// services/tutorWeeklyAnalysisService.ts
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';
import { TutorInteraction } from './tutorTrackingService';

export interface WeeklyReportData {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    sentiment: 'positive' | 'neutral' | 'needs-attention';
}

/**
 * Servicio para generar el reporte semanal consolidado con IA
 * Esto ahorra costos al no evaluar cada mensaje individualmente.
 */
export const tutorWeeklyAnalysisService = {
    /**
     * Genera o recupera el reporte semanal para un estudiante
     */
    async getOrGenerateWeeklyReport(
        studentId: string,
        courseId: number
    ): Promise<WeeklyReportData | null> {
        const now = new Date();
        // Obtener número de semana (ISO)
        const weekNumber = this.getWeekNumber(now);
        const year = now.getFullYear();

        // 1. Verificar si ya existe el reporte
        const { data: existingReport } = await supabase
            .from('tutor_weekly_reports')
            .select('report_json')
            .eq('student_id', studentId)
            .eq('course_id', courseId)
            .eq('week_number', weekNumber)
            .eq('year', year)
            .maybeSingle();

        if (existingReport) {
            return existingReport.report_json as WeeklyReportData;
        }

        // 2. Si no existe, verificar si es viernes (opcional, para ser estrictos)
        // El usuario sugirió "al finalizar el viernes".
        const isFriday = now.getDay() === 5;
        if (!isFriday && mode === 'strict') { // 'mode' es conceptual aquí
            // Podríamos retornar null o permitir manual si el admin quiere
        }

        // 3. Obtener interacciones de la última semana
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        const { data: interactions, error } = await supabase
            .from('tutor_interactions')
            .select('question, answer, created_at')
            .eq('student_id', studentId)
            .eq('course_id', courseId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error || !interactions || interactions.length === 0) {
            console.log('No hay suficientes interacciones para generar un reporte semanal.');
            return null;
        }

        // 4. Invocar Gemini para consolidación
        const reportData = await this.analyzeInteractionsWithAI(interactions, courseId);

        if (reportData) {
            // 5. Guardar el reporte
            await supabase.from('tutor_weekly_reports').insert({
                student_id: studentId,
                course_id: courseId,
                week_number: weekNumber,
                year: year,
                report_json: reportData,
                tokens_used: 0 // Simplificado
            });
        }

        return reportData;
    },

    /**
     * Usa Gemini para analizar el conjunto de interacciones
     */
    async analyzeInteractionsWithAI(
        interactions: any[],
        courseId: number
    ): Promise<WeeklyReportData | null> {
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) return null;

            const genAI = new GoogleGenAI({ apiKey });
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            // Preparar el historial para el prompt
            const historyStr = interactions
                .map((i, idx) => `INTERACCIÓN ${idx + 1}:\nUsuario: ${i.question}\nTutor: ${i.answer}`)
                .join('\n\n');

            const prompt = `Eres un Pedagogo Experto de EduSpark. Analiza el historial de aprendizaje semanal del estudiante y genera un reporte constructivo.

HISTORIAL DE LA SEMANA:
${historyStr}

INSTRUCCIONES:
1. Identifica temas que el alumno ya domina.
2. Identifica dudas recurrentes o áreas de confusión.
3. Genera 3 acciones recomendadas.
4. Evalúa el sentimiento general (positive/neutral/needs-attention).

Responde ÚNICAMENTE con un JSON válido:
{
  "summary": "Resumen motivacional de 2 párrafos",
  "strengths": ["tema1", "tema2"],
  "weaknesses": ["tema3"],
  "recommendations": ["Consejo 1", "Consejo 2", "Consejo 3"],
  "sentiment": "positive|neutral|needs-attention"
}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as WeeklyReportData;
            }
            return null;
        } catch (error) {
            console.error('Error al analizar historial semanal:', error);
            return null;
        }
    },

    /**
     * Calcula el número de semana ISO
     */
    getWeekNumber(d: Date): number {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    }
};
