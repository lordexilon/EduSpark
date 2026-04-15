import React, { useState, useEffect } from 'react';
import gradingScaleService, { GradingScale, GRADING_SCALE_PRESETS } from '@/services/gradingScaleService';
import Card from '../Common/Card';
import Button from '../Common/Button';

interface ScaleSelectorProps {
    institutionId?: number;
    subjectId?: number;
    onScaleChange?: (scale: GradingScale) => void;
    className?: string;
}

export const ScaleSelector: React.FC<ScaleSelectorProps> = ({
    institutionId,
    subjectId,
    onScaleChange,
    className = ''
}) => {
    const [loading, setLoading] = useState(false);
    const [currentScale, setCurrentScale] = useState<GradingScale | null>(null);
    const [scales, setScales] = useState<GradingScale[]>([]);
    const [showConfig, setShowConfig] = useState(false);

    useEffect(() => {
        loadScales();
    }, [institutionId, subjectId]);

    const loadScales = async () => {
        try {
            setLoading(true);
            // Cargar la escala actual aplicable
            const applicable = await gradingScaleService.getApplicableScale(subjectId, institutionId);
            setCurrentScale(applicable);
            if (applicable) {
                onScaleChange?.(applicable);
            }
        } catch (error) {
            console.error('Error loading scales:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyPreset = async (presetName: keyof typeof GRADING_SCALE_PRESETS) => {
        if (!institutionId && !subjectId) return;

        // IMPORTANTE: Por ahora solo simulamos la selección porque la creación requiere permisos de admin
        // En una implementación real, esto guardaría la configuración en la BD
        const preset = GRADING_SCALE_PRESETS[presetName];

        // Simular objeto GradingScale
        const newScale: GradingScale = {
            id: 'preview',
            scale_name: preset.scale_name,
            min_grade: preset.min_grade,
            max_grade: preset.max_grade,
            passing_grade: preset.passing_grade,
            passing_percentage: preset.passing_percentage,
            grade_labels: [...preset.grade_labels],
            is_default: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        setCurrentScale(newScale);
        onScaleChange?.(newScale);
        setShowConfig(false);
    };

    if (loading) {
        return <div className="animate-pulse h-10 w-full bg-gray-100 rounded"></div>;
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Sistema de Calificación</label>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    {showConfig ? 'Cerrar' : 'Cambiar'}
                </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">
                        {currentScale?.scale_name || 'Escala Predeterminada (1-5)'}
                    </span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-700">
                        {currentScale ? `${currentScale.min_grade} - ${currentScale.max_grade}` : '1 - 5'}
                    </span>
                </div>

                {currentScale && (
                    <div className="mt-2 text-xs text-gray-500 flex justify-between">
                        <span>Aprueba con: {currentScale.passing_grade} ({currentScale.passing_percentage}%)</span>
                    </div>
                )}
            </div>

            {showConfig && (
                <Card className="mt-2 border-indigo-100 shadow-lg">
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-800">Seleccionar Escala</h4>

                        <div className="grid gap-2">
                            <button
                                onClick={() => handleApplyPreset('SCALE_1_5')}
                                className="flex items-center p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-left transition-colors"
                                type="button"
                            >
                                <div className="flex-1">
                                    <div className="font-medium text-sm text-indigo-900">Escala 1-5 (Paraguay)</div>
                                    <div className="text-xs text-gray-500">Universidad Católica, Nacional (mayoría)</div>
                                </div>
                                <div className="text-xs font-mono bg-white px-1.5 py-0.5 border rounded text-gray-600">1-5</div>
                            </button>

                            <button
                                onClick={() => handleApplyPreset('SCALE_1_10')}
                                className="flex items-center p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-left transition-colors"
                                type="button"
                            >
                                <div className="flex-1">
                                    <div className="font-medium text-sm text-indigo-900">Escala 1-10</div>
                                    <div className="text-xs text-gray-500">Colegios, algunas universidades privadas</div>
                                </div>
                                <div className="text-xs font-mono bg-white px-1.5 py-0.5 border rounded text-gray-600">1-10</div>
                            </button>

                            <button
                                onClick={() => handleApplyPreset('SCALE_PERCENTAGE')}
                                className="flex items-center p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-left transition-colors"
                                type="button"
                            >
                                <div className="flex-1">
                                    <div className="font-medium text-sm text-indigo-900">Porcentual (0-100)</div>
                                    <div className="text-xs text-gray-500">Cursos libres, postgrados internacionales</div>
                                </div>
                                <div className="text-xs font-mono bg-white px-1.5 py-0.5 border rounded text-gray-600">0-100</div>
                            </button>
                        </div>

                        <div className="pt-2 text-[10px] text-gray-400 border-t items-center flex gap-1">
                            <span>Nota:</span> La configuración se aplicará a todas las evaluaciones del curso.
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ScaleSelector;
