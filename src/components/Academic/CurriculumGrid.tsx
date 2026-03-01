import React, { useMemo } from 'react';
import { Subject } from '../../services/academicService';
import Card from '../Common/Card';
import { BookOpen, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils'; // Si esta utilidad no existe, definiremos una local o simple string concat

// Fallback por si cn no existe
const classNames = (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(' ');
};

// Tipos para el estado de la materia en la malla
export type SubjectStatus = 'completed' | 'in_progress' | 'available' | 'locked' | 'failed';

interface CurriculumGridProps {
    subjects: Subject[];
    studentProgress?: Record<number, { status: SubjectStatus; grade?: number }>;
    onSubjectClick?: (subject: Subject) => void;
    readOnly?: boolean;
}

export const CurriculumGrid: React.FC<CurriculumGridProps> = ({
    subjects,
    studentProgress = {},
    onSubjectClick,
    readOnly = false
}) => {

    // Organizar materias por año y semestre
    const curriculumStructure = useMemo(() => {
        const structure: Record<number, Record<number, Subject[]>> = {};

        subjects.forEach(subject => {
            // Usar 'year' si existe, o calcular basado en semestre (asumiendo 2 por año)
            const year = subject.year || Math.ceil((subject.semester || 1) / 2);
            const semester = subject.semester || ((year - 1) * 2 + 1);

            if (!structure[year]) {
                structure[year] = {};
            }
            if (!structure[year][semester]) {
                structure[year][semester] = [];
            }

            structure[year][semester].push(subject);
        });

        // Ordenar años
        return Object.entries(structure)
            .sort(([yearA], [yearB]) => Number(yearA) - Number(yearB))
            .map(([year, semesters]) => ({
                year: Number(year),
                semesters: Object.entries(semesters)
                    .sort(([semA], [semB]) => Number(semA) - Number(semB))
                    .map(([semester, subjectsInSemester]) => ({
                        semester: Number(semester),
                        subjects: subjectsInSemester.sort((a, b) => a.name.localeCompare(b.name))
                    }))
            }));
    }, [subjects]);

    const getStatusColor = (status?: SubjectStatus) => {
        switch (status) {
            case 'completed': return 'bg-green-100 border-green-300 text-green-800';
            case 'in_progress': return 'bg-blue-100 border-blue-300 text-blue-800';
            case 'failed': return 'bg-red-100 border-red-300 text-red-800';
            case 'locked': return 'bg-gray-100 border-gray-200 text-gray-400 opacity-70';
            case 'available':
            default: return 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm';
        }
    };

    const getStatusIcon = (status?: SubjectStatus) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'in_progress': return <BookOpen className="w-4 h-4 text-blue-600" />;
            case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />;
            case 'locked': return <Lock className="w-4 h-4 text-gray-400" />;
            default: return null;
        }
    };

    return (
        <div className="overflow-x-auto pb-6">
            <div className="min-w-[800px] space-y-8">
                {curriculumStructure.map(({ year, semesters }) => (
                    <div key={year} className="relative">
                        {/* Year Header */}
                        <div className="flex items-center mb-4">
                            <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-r-lg text-sm font-semibold shadow-sm">
                                AÑO {year}
                            </div>
                            <div className="flex-1 h-px bg-gray-200 ml-4"></div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pl-4">
                            {semesters.map(({ semester, subjects }) => (
                                <div key={semester} className="space-y-3">
                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 pl-1">
                                        Semestre {semester}
                                    </h4>

                                    <div className="space-y-3">
                                        {subjects.map(subject => {
                                            const prog = studentProgress[subject.id];
                                            const status = prog?.status || 'available';

                                            return (
                                                <div
                                                    key={subject.id}
                                                    className={classNames(
                                                        "relative group p-3 rounded-lg border transition-all duration-200",
                                                        getStatusColor(status),
                                                        !readOnly && "cursor-pointer active:scale-[0.99]"
                                                    )}
                                                    onClick={() => !readOnly && onSubjectClick?.(subject)}
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate" title={subject.name}>
                                                                {subject.name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                                                                <span>{subject.code}</span>
                                                                <span>•</span>
                                                                <span>{subject.credits} Créditos</span>
                                                            </div>
                                                        </div>
                                                        {getStatusIcon(status)}
                                                    </div>

                                                    {/* Prerequisite Indicator */}
                                                    {subject.prerequisite_subject_id && (
                                                        <div className="mt-2 text-[10px] flex items-center gap-1 text-gray-500">
                                                            <Lock className="w-3 h-3" />
                                                            <span>Req: {
                                                                subjects.find(s => s.id === subject.prerequisite_subject_id)?.code ||
                                                                'Materia Previa'
                                                            }</span>
                                                        </div>
                                                    )}

                                                    {/* Grade if exists */}
                                                    {prog?.grade !== undefined && (
                                                        <div className="absolute -top-2 -right-2 bg-white shadow-sm border px-1.5 py-0.5 rounded text-xs font-bold">
                                                            {prog.grade}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {curriculumStructure.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No hay materias configuradas para esta malla curricular.
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurriculumGrid;
