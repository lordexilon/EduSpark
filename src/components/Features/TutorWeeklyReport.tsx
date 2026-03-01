// components/Features/TutorWeeklyReport.tsx
import React, { useState, useEffect } from 'react';
import { tutorWeeklyAnalysisService, WeeklyReportData } from '@/services/tutorWeeklyAnalysisService';
import { IconChartBar, IconCheck, IconAlertCircle, IconArrowRight, IconCalendar } from '@/components/Common/Icons';

interface Props {
    studentId: string;
    courseId: number;
}

export const TutorWeeklyReport: React.FC<Props> = ({ studentId, courseId }) => {
    const [report, setReport] = useState<WeeklyReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isFriday = new Date().getDay() === 5;
    const isWeekend = new Date().getDay() === 6 || new Date().getDay() === 0;

    useEffect(() => {
        loadReport();
    }, [studentId, courseId]);

    const loadReport = async () => {
        setLoading(true);
        try {
            const data = await tutorWeeklyAnalysisService.getOrGenerateWeeklyReport(studentId, courseId);
            setReport(data);
        } catch (err) {
            setError("No se pudo cargar el reporte semanal.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-center animate-pulse text-indigo-600 font-medium">✨ Analizando tu desempeño semanal con IA...</div>;

    if (!report) {
        return (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center space-y-3">
                <IconCalendar className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-semibold text-slate-600">Reporte Semanal de IA</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    {isFriday || isWeekend
                        ? "Aún no tienes suficientes interacciones esta semana para generar un análisis."
                        : "Tu reporte personalizado de IA se genera todos los viernes basado en tus dudas y progreso."}
                </p>
                {!isFriday && !isWeekend && (
                    <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full inline-block">
                        Vuelve el viernes para ver tu análisis 🚀
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white border border-indigo-100 rounded-xl shadow-md overflow-hidden">
            <div className="bg-indigo-50/50 p-4 border-b border-indigo-100">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-900">
                            <IconChartBar className="w-5 h-5" />
                            Tu Análisis Semanal (IA)
                        </h3>
                        <p className="text-sm text-indigo-600/70">Resumen de aprendizaje y recomendaciones</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${report.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                            report.sentiment === 'neutral' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        {report.sentiment}
                    </div>
                </div>
            </div>
            <div className="p-4 space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed italic border-l-4 border-indigo-200 pl-4">
                    "{report.summary}"
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <IconCheck className="w-3 h-3 text-green-500" /> Fortalezas
                        </h4>
                        <ul className="text-sm space-y-1">
                            {report.strengths.map((s, i) => (
                                <li key={i} className="text-slate-600 flex items-start gap-1">
                                    <span className="text-indigo-300">•</span>
                                    <span>{s}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <IconAlertCircle className="w-3 h-3 text-amber-500" /> Áreas a Reforzar
                        </h4>
                        <ul className="text-sm space-y-1">
                            {report.weaknesses.map((w, i) => (
                                <li key={i} className="text-slate-600 flex items-start gap-1">
                                    <span className="text-indigo-300">•</span>
                                    <span>{w}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Próximos Pasos Recomendados</h4>
                    <div className="space-y-2">
                        {report.recommendations.map((r, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <IconArrowRight className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                <span>{r}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
