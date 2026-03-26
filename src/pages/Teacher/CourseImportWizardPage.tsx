import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
    IconBookOpen,
    IconSparkles,
    IconUpload,
    IconCheckCircle,
    IconArrowRight,
    IconX,
    IconChevronDown,
    IconChevronUp,
    IconClock,
    IconLoader,
    IconSave,
    IconDownload
} from '@/components/Common/Icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { courseService, unitService, sessionService } from '@/services/teacherCourses';
import { subjectService, Subject } from '@/services/academicService';
import * as XLSX from 'xlsx';

interface GeneratedSyllabus {
    title: string;
    description: string;
    duration_months?: number;
    total_credits?: number;
    units: {
        title: string;
        description: string;
        learning_objectives: string[];
        order: number;
        sessions: {
            title: string;
            description: string;
            duration_minutes: number;
            order: number;
        }[];
    }[];
}

export const CourseImportWizardPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [importMode, setImportMode] = useState<'ai' | 'excel' | null>(null);
    const [inputData, setInputData] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedSyllabus, setGeneratedSyllabus] = useState<GeneratedSyllabus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set([0]));

    // Excel-specific state
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [excelCourseTitle, setExcelCourseTitle] = useState('');
    const [excelCourseDescription, setExcelCourseDescription] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadSubjects = async () => {
            try {
                const data = await subjectService.getAllSubjects();
                setSubjects(data);
            } catch (err) {
                console.error('Error cargando materias:', err);
            }
        };
        loadSubjects();
    }, []);

    const handleNext = () => {
        if (step === 1 && importMode) setStep(2);
        else if (step === 2 && importMode === 'ai' && inputData) processInput();
    };

    // --- Excel Drag & Drop handlers ---
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            validateAndSetFile(files[0]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            validateAndSetFile(files[0]);
        }
    };

    const validateAndSetFile = (file: File) => {
        const validExts = ['.xlsx', '.xls', '.csv'];
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!validExts.includes(ext)) {
            setError('Formato no soportado. Usa archivos .xlsx, .xls o .csv');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('El archivo es demasiado grande. Máximo 5MB.');
            return;
        }
        setError(null);
        setExcelFile(file);
    };

    // --- Parse Excel file ---
    const parseExcelFile = async () => {
        if (!excelFile) return;
        setIsProcessing(true);
        setError(null);

        try {
            const buffer = await excelFile.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });

            // Try to find sheets named 'Unidades' and 'Sesiones', or use first two sheets
            let unitsSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('unidad')) || workbook.SheetNames[0];
            let sessionsSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('sesi') || n.toLowerCase().includes('clase')) || workbook.SheetNames[1];

            // If there's only one sheet, try to parse everything from it
            if (workbook.SheetNames.length === 1) {
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

                if (rows.length === 0) {
                    throw new Error('El archivo está vacío. Asegúrate que tenga datos.');
                }

                // Detect column names (case insensitive)
                const cols = Object.keys(rows[0]);
                const findCol = (keywords: string[]) => cols.find(c => keywords.some(kw => c.toLowerCase().includes(kw.toLowerCase()))) || '';

                const unitCol = findCol(['unidad', 'unit', 'módulo', 'modulo']);
                const sessionCol = findCol(['sesión', 'sesion', 'session', 'clase', 'tema']);
                const descCol = findCol(['descripción', 'descripcion', 'description', 'detalle']);
                const durationCol = findCol(['duración', 'duracion', 'duration', 'minutos', 'min']);

                if (!unitCol && !sessionCol) {
                    throw new Error(`No se encontraron columnas reconocibles. Columnas encontradas: ${cols.join(', ')}. Se esperan columnas como: Unidad, Sesión/Clase, Descripción, Duración.`);
                }

                // Group by unit
                const unitsMap = new Map<string, { title: string; description: string; sessions: { title: string; description: string; duration_minutes: number }[] }>();
                let currentUnit = '';

                for (const row of rows) {
                    const unitName = String(row[unitCol] || '').trim();
                    const sessionName = String(row[sessionCol] || '').trim();
                    const desc = String(row[descCol] || '').trim();
                    const duration = parseInt(String(row[durationCol] || '60')) || 60;

                    if (unitName) currentUnit = unitName;
                    if (!currentUnit) currentUnit = 'Unidad 1';

                    if (!unitsMap.has(currentUnit)) {
                        unitsMap.set(currentUnit, {
                            title: currentUnit,
                            description: unitName ? desc : '',
                            sessions: []
                        });
                    }

                    if (sessionName) {
                        unitsMap.get(currentUnit)!.sessions.push({
                            title: sessionName,
                            description: desc,
                            duration_minutes: duration
                        });
                    }
                }

                const units = Array.from(unitsMap.values()).map((u, idx) => ({
                    title: u.title,
                    description: u.description,
                    learning_objectives: [] as string[],
                    order: idx + 1,
                    sessions: u.sessions.map((s, sIdx) => ({
                        ...s,
                        order: sIdx + 1
                    }))
                }));

                if (units.length === 0) {
                    throw new Error('No se pudieron extraer unidades del archivo. Verifica el formato.');
                }

                setGeneratedSyllabus({
                    title: excelCourseTitle || excelFile.name.replace(/\.[^.]+$/, ''),
                    description: excelCourseDescription || `Curso importado desde ${excelFile.name}`,
                    units
                });
            } else {
                // Two-sheet mode: Unidades + Sesiones
                const unitsSheet = workbook.Sheets[unitsSheetName];
                const sessionsSheet = workbook.Sheets[sessionsSheetName];

                const unitRows = XLSX.utils.sheet_to_json<any>(unitsSheet, { defval: '' });
                const sessionRows = XLSX.utils.sheet_to_json<any>(sessionsSheet, { defval: '' });

                if (unitRows.length === 0) {
                    throw new Error(`La hoja "${unitsSheetName}" está vacía.`);
                }

                const unitCols = Object.keys(unitRows[0]);
                const sessionCols = sessionRows.length > 0 ? Object.keys(sessionRows[0]) : [];
                const findCol = (cols: string[], keywords: string[]) => cols.find(c => keywords.some(kw => c.toLowerCase().includes(kw.toLowerCase()))) || '';

                const uTitleCol = findCol(unitCols, ['título', 'titulo', 'title', 'nombre', 'unidad']);
                const uDescCol = findCol(unitCols, ['descripción', 'descripcion', 'description']);
                const uOrderCol = findCol(unitCols, ['orden', 'order', 'número', 'numero', '#']);

                const sUnitCol = findCol(sessionCols, ['unidad', 'unit', 'id_unidad', 'unit_id', 'número unidad']);
                const sTitleCol = findCol(sessionCols, ['título', 'titulo', 'title', 'nombre', 'sesión', 'sesion', 'clase', 'tema']);
                const sDescCol = findCol(sessionCols, ['descripción', 'descripcion', 'description']);
                const sDurationCol = findCol(sessionCols, ['duración', 'duracion', 'duration', 'minutos', 'min']);

                const units = unitRows.map((row: any, idx: number) => {
                    const unitOrder = parseInt(String(row[uOrderCol] || (idx + 1))) || (idx + 1);
                    const unitTitle = String(row[uTitleCol] || `Unidad ${unitOrder}`).trim();

                    // Find sessions for this unit by matching order number or unit name
                    const unitSessions = sessionRows
                        .filter((s: any) => {
                            const sUnit = String(s[sUnitCol] || '').trim();
                            return sUnit === String(unitOrder) || sUnit === unitTitle || sUnit === String(idx + 1);
                        })
                        .map((s: any, sIdx: number) => ({
                            title: String(s[sTitleCol] || `Sesión ${sIdx + 1}`).trim(),
                            description: String(s[sDescCol] || '').trim(),
                            duration_minutes: parseInt(String(s[sDurationCol] || '60')) || 60,
                            order: sIdx + 1
                        }));

                    return {
                        title: unitTitle,
                        description: String(row[uDescCol] || '').trim(),
                        learning_objectives: [] as string[],
                        order: unitOrder,
                        sessions: unitSessions.length > 0 ? unitSessions : [{
                            title: `Sesión 1 - ${unitTitle}`,
                            description: '',
                            duration_minutes: 60,
                            order: 1
                        }]
                    };
                });

                setGeneratedSyllabus({
                    title: excelCourseTitle || excelFile.name.replace(/\.[^.]+$/, ''),
                    description: excelCourseDescription || `Curso importado desde ${excelFile.name}`,
                    units
                });
            }

            setStep(3);
            setExpandedUnits(new Set([0]));
        } catch (err: any) {
            console.error('Error parseando Excel:', err);
            setError(err.message || 'Error al leer el archivo. Verifica el formato.');
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Download Excel Template ---
    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Unidades
        const unitsData = [
            { 'Orden': 1, 'Título Unidad': 'Introducción a la Materia', 'Descripción': 'Conceptos básicos y fundamentos' },
            { 'Orden': 2, 'Título Unidad': 'Desarrollo de Contenidos', 'Descripción': 'Temas principales del curso' },
            { 'Orden': 3, 'Título Unidad': 'Evaluación y Cierre', 'Descripción': 'Repaso y evaluación final' }
        ];
        const wsUnits = XLSX.utils.json_to_sheet(unitsData);
        wsUnits['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 50 }];
        XLSX.utils.book_append_sheet(wb, wsUnits, 'Unidades');

        // Sheet 2: Sesiones
        const sessionsData = [
            { 'Unidad': 1, 'Título Sesión': 'Presentación del Curso', 'Descripción': 'Bienvenida y lineamientos', 'Duración (min)': 60 },
            { 'Unidad': 1, 'Título Sesión': 'Conceptos Fundamentales', 'Descripción': 'Bases teóricas', 'Duración (min)': 90 },
            { 'Unidad': 2, 'Título Sesión': 'Tema Principal 1', 'Descripción': 'Desarrollo del primer tema', 'Duración (min)': 90 },
            { 'Unidad': 2, 'Título Sesión': 'Tema Principal 2', 'Descripción': 'Desarrollo del segundo tema', 'Duración (min)': 90 },
            { 'Unidad': 3, 'Título Sesión': 'Repaso General', 'Descripción': 'Revisión de temas clave', 'Duración (min)': 60 },
            { 'Unidad': 3, 'Título Sesión': 'Evaluación Final', 'Descripción': 'Examen o entrega final', 'Duración (min)': 120 }
        ];
        const wsSessions = XLSX.utils.json_to_sheet(sessionsData);
        wsSessions['!cols'] = [{ wch: 10 }, { wch: 35 }, { wch: 50 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsSessions, 'Sesiones');

        XLSX.writeFile(wb, 'Plantilla_Curso_EduSpark.xlsx');
    };

    const processInput = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            if (importMode === 'ai') {
                const { data, error: funcError } = await supabase.functions.invoke('generate-course-syllabus', {
                    body: {
                        action: 'generate-syllabus',
                        content: inputData,
                        prompt_instructions: 'Genera una estructura pedagógica coherente y profesional.'
                    }
                });

                if (funcError) throw funcError;
                if (data.error) throw new Error(data.error);

                setGeneratedSyllabus(data);
                setStep(3);
                setExpandedUnits(new Set([0]));
            }
        } catch (err: any) {
            console.error('Error procesando entrada:', err);
            setError(err.message || 'Error al conectar con el servicio de IA. Intenta de nuevo.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!generatedSyllabus || !user) return;
        setIsSaving(true);
        setError(null);

        try {
            // 1. Crear el curso
            const course = await courseService.createCourse({
                title: generatedSyllabus.title,
                description: generatedSyllabus.description,
                teacher_id: user.id,
                status: 'draft',
                subject_id: selectedSubjectId ? Number(selectedSubjectId) : undefined,
                institution_id: (user as any).institution_id,
                academic_period: new Date().getFullYear().toString() + '-1'
            });

            // 2. Crear unidades y sesiones de forma secuencial
            for (const unit of generatedSyllabus.units) {
                const createdUnit = await unitService.createUnit({
                    course_id: course.id,
                    number: unit.order,
                    title: unit.title,
                    description: unit.description,
                    learning_objectives: unit.learning_objectives,
                    order_index: unit.order
                });

                // Crear todas las sesiones de esta unidad
                await Promise.all(unit.sessions.map(session =>
                    sessionService.createSession({
                        course_id: course.id,
                        unit_id: createdUnit.id,
                        title: session.title,
                        description: session.description,
                        duration_minutes: session.duration_minutes,
                        order_index: session.order
                    })
                ));
            }

            // Éxito - Redirigir al curso
            navigate(`/teacher/courses/${course.id}`);
        } catch (err: any) {
            console.error('Error guardando curso:', err);
            setError(err.message || 'No se pudo guardar el programa en la base de datos.');
            setIsSaving(false);
        }
    };

    const toggleUnit = (index: number) => {
        const newSet = new Set(expandedUnits);
        if (newSet.has(index)) newSet.delete(index);
        else newSet.add(index);
        setExpandedUnits(newSet);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold dark:text-text-dark text-gray-900 flex items-center gap-2">
                        <IconSparkles className="w-6 h-6 text-purple-600" />
                        Asistente de Creación de Curso
                    </h1>
                    <p className="dark:text-gray-400 text-gray-600 mt-1">Crea estructuras completas de cursos en segundos con IA</p>
                </div>
                <Button onClick={() => navigate('/teacher/courses')} variant="outline">
                    Cancelar
                </Button>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${step >= 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>1</div>
                    <div className={`h-1 w-16 transition-all ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-800'}`}></div>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${step >= 2 ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>2</div>
                    <div className={`h-1 w-16 transition-all ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-800'}`}></div>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${step >= 3 ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>3</div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 animate-shake">
                    <IconX className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <Card className="p-8 shadow-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-surface">
                {step === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold dark:text-text-dark text-gray-900">¿Cómo deseas estructurar tu curso?</h2>
                            <p className="text-gray-500 mt-2">Elige el método que mejor se adapte a tu material actual</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button
                                onClick={() => setImportMode('ai')}
                                className={`p-8 border-2 rounded-2xl text-left transition-all group ${importMode === 'ai' ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/10 ring-4 ring-purple-100 dark:ring-purple-900/20 shadow-lg' : 'border-gray-100 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                            >
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${importMode === 'ai' ? 'bg-purple-600 text-white' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'}`}>
                                    <IconSparkles className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-xl dark:text-text-dark text-gray-900">Generación Inteligente (EduSpark AI)</h3>
                                <p className="text-sm dark:text-gray-400 text-gray-600 mt-3 leading-relaxed">Pega tu syllabus o describe tu curso y nuestra IA construirá la estructura académica completa automáticamente.</p>
                            </button>

                            <button
                                onClick={() => setImportMode('excel')}
                                className={`p-8 border-2 rounded-2xl text-left transition-all group ${importMode === 'excel' ? 'border-green-600 bg-green-50 dark:bg-green-900/10 ring-4 ring-green-100 dark:ring-green-900/20 shadow-lg' : 'border-gray-100 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                            >
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${importMode === 'excel' ? 'bg-green-600 text-white' : 'bg-green-100 dark:bg-green-900/30 text-green-600 group-hover:bg-green-600 group-hover:text-white'}`}>
                                    <IconUpload className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-xl dark:text-text-dark text-gray-900">Importación Manual (Excel/CSV)</h3>
                                <p className="text-sm dark:text-gray-400 text-gray-600 mt-3 leading-relaxed">Sube una plantilla estructurada con tus unidades y sesiones formativas.</p>
                            </button>
                        </div>

                        <div className="flex justify-end mt-10 pt-6 border-t border-gray-50 dark:border-gray-800">
                            <Button onClick={handleNext} disabled={!importMode} className="px-8 py-3 text-lg">
                                Continuar <IconArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    </div>
                )
                }

                {step === 2 && importMode === 'ai' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-xl border border-purple-100 dark:border-purple-800/30 flex items-start gap-4 mb-6">
                            <div className="bg-purple-600 text-white p-2 rounded-lg">
                                <IconSparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-purple-900 dark:text-purple-300 font-bold">Instrucciones para la IA</h3>
                                <p className="text-purple-700 dark:text-purple-400 text-sm mt-1">Describe los temas que quieres cubrir o pega un programa existente. Entre más específico seas, mejor será el resultado.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold dark:text-text-dark text-gray-700 mb-3 uppercase tracking-wider">Materia (Opcional)</label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-text-dark rounded-xl shadow-sm focus:ring-purple-500 focus:border-purple-500 p-3"
                                >
                                    <option value="">Selecciona una materia...</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold dark:text-text-dark text-gray-700 mb-3 uppercase tracking-wider">Contenido del Programa</label>
                            <textarea
                                value={inputData}
                                onChange={(e) => setInputData(e.target.value)}
                                rows={10}
                                className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-text-dark rounded-xl shadow-sm focus:ring-purple-500 focus:border-purple-500 p-6 font-sans text-base leading-relaxed"
                                placeholder="Ej: Curso de programación en Python desde cero. Incluye tipos de datos, estructuras de control, funciones y programación orientada a objetos. Duración 8 semanas."
                            ></textarea>
                        </div>

                        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-50 dark:border-gray-800">
                            <Button onClick={() => setStep(1)} variant="outline">Volver</Button>
                            <div className="flex items-center gap-4">
                                <Button
                                    onClick={handleNext}
                                    disabled={inputData.length < 10 || isProcessing}
                                    className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 dark:shadow-none"
                                >
                                    {isProcessing ? (
                                        <>
                                            <IconLoader className="w-5 h-5 mr-2 animate-spin" />
                                            Generando Magia...
                                        </>
                                    ) : (
                                        <>
                                            Generar Programa <IconSparkles className="w-5 h-5 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== STEP 2: EXCEL/CSV IMPORT ===== */}
                {step === 2 && importMode === 'excel' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Info banner */}
                        <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-xl border border-green-100 dark:border-green-800/30 flex items-start gap-4 mb-2">
                            <div className="bg-green-600 text-white p-2 rounded-lg">
                                <IconUpload className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-green-900 dark:text-green-300 font-bold">Importar desde Excel o CSV</h3>
                                <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                                    Sube un archivo con la estructura de tu curso. Puedes usar una sola hoja con columnas <strong>Unidad</strong> y <strong>Sesión/Clase</strong>, o dos hojas separadas (<strong>Unidades</strong> y <strong>Sesiones</strong>).
                                </p>
                            </div>
                            <button
                                onClick={downloadTemplate}
                                className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                            >
                                <IconDownload className="w-4 h-4" />
                                Descargar Plantilla
                            </button>
                        </div>

                        {/* Course info fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold dark:text-text-dark text-gray-700 mb-2 uppercase tracking-wider">Nombre del Curso</label>
                                <input
                                    type="text"
                                    value={excelCourseTitle}
                                    onChange={(e) => setExcelCourseTitle(e.target.value)}
                                    className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-text-dark rounded-xl shadow-sm focus:ring-green-500 focus:border-green-500 p-3"
                                    placeholder="Ej: Matemáticas Avanzadas"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold dark:text-text-dark text-gray-700 mb-2 uppercase tracking-wider">Materia (Opcional)</label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-text-dark rounded-xl shadow-sm focus:ring-green-500 focus:border-green-500 p-3"
                                >
                                    <option value="">Selecciona una materia...</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold dark:text-text-dark text-gray-700 mb-2 uppercase tracking-wider">Descripción del Curso (Opcional)</label>
                            <textarea
                                value={excelCourseDescription}
                                onChange={(e) => setExcelCourseDescription(e.target.value)}
                                rows={2}
                                className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-text-dark rounded-xl shadow-sm focus:ring-green-500 focus:border-green-500 p-3 text-sm"
                                placeholder="Breve descripción del curso..."
                            />
                        </div>

                        {/* Drop zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${isDragging
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 scale-[1.02] shadow-lg shadow-green-100 dark:shadow-none'
                                    : excelFile
                                        ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-green-400 hover:bg-green-50/30 dark:hover:bg-green-900/5'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            {excelFile ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                        <IconCheckCircle className="w-9 h-9 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg dark:text-text-dark text-gray-900">{excelFile.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {(excelFile.size / 1024).toFixed(1)} KB • Haz clic para cambiar el archivo
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setExcelFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        className="mt-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 flex items-center gap-1 transition-colors"
                                    >
                                        <IconX className="w-3 h-3" /> Quitar archivo
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${isDragging
                                            ? 'bg-green-500 text-white scale-110'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                                        }`}>
                                        <IconUpload className={`w-10 h-10 transition-transform ${isDragging ? 'animate-bounce' : ''}`} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg dark:text-text-dark text-gray-700">
                                            {isDragging ? '¡Suelta tu archivo aquí!' : 'Arrastra tu archivo aquí'}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            o <span className="text-green-600 dark:text-green-400 font-semibold underline">haz clic para seleccionar</span>
                                        </p>
                                    </div>
                                    <div className="flex gap-3 mt-2">
                                        {['.xlsx', '.xls', '.csv'].map(ext => (
                                            <span key={ext} className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full font-mono border border-gray-200 dark:border-gray-700">
                                                {ext}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-50 dark:border-gray-800">
                            <Button onClick={() => { setStep(1); setExcelFile(null); setError(null); }} variant="outline">Volver</Button>
                            <Button
                                onClick={parseExcelFile}
                                disabled={!excelFile || isProcessing}
                                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200 dark:shadow-none"
                            >
                                {isProcessing ? (
                                    <>
                                        <IconLoader className="w-5 h-5 mr-2 animate-spin" />
                                        Procesando Archivo...
                                    </>
                                ) : (
                                    <>
                                        Procesar y Previsualizar <IconArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && generatedSyllabus && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h2 className="text-3xl font-black dark:text-text-dark text-gray-900">{generatedSyllabus.title}</h2>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${importMode === 'excel' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}>
                                        {importMode === 'excel' ? 'Importado desde Excel' : 'Sugerido por IA'}
                                    </span>
                                    {selectedSubjectId && (
                                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-full uppercase">
                                            {subjects.find(s => s.id === selectedSubjectId)?.name}
                                        </span>
                                    )}
                                </div>
                                <p className="dark:text-gray-400 text-gray-600 max-w-3xl text-lg leading-relaxed">{generatedSyllabus.description}</p>
                                <div className="flex gap-6 mt-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <IconClock className="w-4 h-4 text-blue-500" />
                                        <span className="font-bold dark:text-text-dark text-gray-700">{generatedSyllabus.duration_months || 4} meses</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                                        <IconBookOpen className="w-4 h-4 text-purple-500" />
                                        <span className="font-bold dark:text-text-dark text-gray-700">{generatedSyllabus.total_credits || 10} Créditos</span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setStep(2)} disabled={isSaving}>
                                Re-generar
                            </Button>
                        </div>

                        <div className="space-y-4 font-sans">
                            <h3 className="text-lg font-bold dark:text-text-dark text-gray-800 flex items-center gap-2">
                                <IconCheckCircle className="w-5 h-5 text-green-500" />
                                Estructura Sugerida
                            </h3>

                            {generatedSyllabus.units.map((unit, uIdx) => (
                                <div key={uIdx} className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                                    <div
                                        className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${expandedUnits.has(uIdx) ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-white dark:bg-surface hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                                        onClick={() => toggleUnit(uIdx)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow-md">
                                                {unit.order}
                                            </div>
                                            <div>
                                                <h4 className="font-bold dark:text-text-dark text-gray-900 text-lg">{unit.title}</h4>
                                                <p className="text-sm dark:text-gray-400 text-gray-500 truncate max-w-xs md:max-w-md">{unit.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="hidden sm:inline-block text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded text-gray-500 font-medium font-sans">
                                                {unit.sessions.length} Clases
                                            </span>
                                            {expandedUnits.has(uIdx) ? <IconChevronUp className="w-5 h-5 dark:text-gray-500" /> : <IconChevronDown className="w-5 h-5 dark:text-gray-500" />}
                                        </div>
                                    </div>

                                    {expandedUnits.has(uIdx) && (
                                        <div className="p-6 bg-white dark:bg-surface border-t border-gray-50 dark:border-gray-800 space-y-6">
                                            {unit.learning_objectives.length > 0 && (
                                                <div className="bg-blue-50/30 dark:bg-blue-900/5 p-4 rounded-xl border border-blue-50 dark:border-blue-900/20">
                                                    <h5 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-3">Objetivos de la Unidad</h5>
                                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {unit.learning_objectives.map((obj, oIdx) => (
                                                            <li key={oIdx} className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                                                                <span className="text-blue-400 mt-1 shrink-0">•</span> {obj}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                <h5 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Contenido de Clases</h5>
                                                {unit.sessions.map((session, sIdx) => (
                                                    <div key={sIdx} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-gray-800 transition-all group font-sans">
                                                        <div className="text-gray-300 dark:text-gray-700 font-mono text-xs group-hover:text-blue-300">
                                                            {String(session.order).padStart(2, '0')}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-semibold dark:text-text-dark text-gray-800">{session.title}</span>
                                                                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-800 italic">
                                                                    <IconClock className="w-3 h-3" /> {session.duration_minutes} min
                                                                </span>
                                                            </div>
                                                            <p className="text-xs dark:text-gray-400 text-gray-500 mt-0.5">{session.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-4 mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                            <Button variant="outline" onClick={() => setStep(2)} disabled={isSaving}>Descartar</Button>
                            <Button
                                className="px-10 py-4 bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-100 dark:shadow-none text-lg font-bold"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <IconLoader className="w-5 h-5 mr-3 animate-spin" />
                                        Creando Curso...
                                    </>
                                ) : (
                                    <>
                                        Guardar y Publicar <IconSave className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};
