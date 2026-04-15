
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    careerEnrollmentService,
    subjectService,
    academicHistoryService,
    Subject
} from '@/services/academicService';
import CurriculumGrid, { SubjectStatus } from '@/components/Academic/CurriculumGrid';
import { BookOpen, GraduationCap, Award, Clock } from 'lucide-react';
import Card from '@/components/Common/Card';

const StudentAcademicPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [enrollment, setEnrollment] = useState<any>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [history, setHistory] = useState<Record<number, { status: SubjectStatus; grade?: number }>>({});
    const [stats, setStats] = useState({
        totalSubjects: 0,
        completedSubjects: 0,
        averageGrade: 0,
        totalCredits: 0,
        earnedCredits: 0
    });

    useEffect(() => {
        const loadAcademicData = async () => {
            if (!user) return;

            try {
                setLoading(true);

                // 1. Get active career enrollment
                const enrollments = await careerEnrollmentService.getStudentEnrollments(user.id);
                const activeEnrollment = enrollments.find(e => e.status === 'active' || e.status === 'completed');

                if (!activeEnrollment) {
                    setLoading(false);
                    return;
                }

                setEnrollment(activeEnrollment);

                // 2. Get subjects for the career
                const careerSubjects = await subjectService.getSubjectsByCareer(activeEnrollment.career_id);
                setSubjects(careerSubjects);

                // 3. Get academic history
                const academicHistory = await academicHistoryService.getStudentHistory(user.id);
                setHistory(academicHistory);

                // 4. Calculate stats
                let completed = 0;
                let totalGrade = 0;
                let gradeCount = 0;
                let earnedCredits = 0;
                let totalCredits = 0;

                careerSubjects.forEach(subject => {
                    totalCredits += subject.credits;
                    const record = academicHistory[subject.id];
                    if (record?.status === 'completed') {
                        completed++;
                        earnedCredits += subject.credits;
                        if (record.grade) {
                            totalGrade += record.grade;
                            gradeCount++;
                        }
                    }
                });

                setStats({
                    totalSubjects: careerSubjects.length,
                    completedSubjects: completed,
                    averageGrade: gradeCount > 0 ? totalGrade / gradeCount : 0,
                    totalCredits,
                    earnedCredits
                });

            } catch (err: any) {
                console.error('Error loading academic data:', err);
                setError('No se pudo cargar la información académica. Por favor intenta más tarde.');
            } finally {
                setLoading(false);
            }
        };

        loadAcademicData();
    }, [user]);

    if (loading) {
        return (
            <div className="p-6 space-y-6 animate-pulse">
                <div className="h-32 bg-gray-200 rounded-xl"></div>
                <div className="h-96 bg-gray-200 rounded-xl"></div>
            </div>
        );
    }

    if (!enrollment) {
        return (
            <div className="p-12 text-center text-gray-500">
                <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-medium text-gray-900">No estás inscrito en ninguna carrera</h3>
                <p className="mt-2">Contacta a administración para regularizar tu situación académica.</p>
            </div>
        );
    }

    const progressPercentage = stats.totalSubjects > 0
        ? Math.round((stats.completedSubjects / stats.totalSubjects) * 100)
        : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Malla Curricular</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Seguimiento de tu avance académico en la carrera
                    </p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Semestre Actual: {enrollment.current_semester || 1}º
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4 p-4 border-l-4 border-l-blue-500">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Avance Materias</p>
                        <p className="text-xl font-bold text-gray-900">
                            {stats.completedSubjects} <span className="text-sm text-gray-400 font-normal">/ {stats.totalSubjects}</span>
                        </p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-l-4 border-l-green-500">
                    <div className="p-3 bg-green-50 rounded-full text-green-600">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Promedio General</p>
                        <p className="text-xl font-bold text-gray-900">
                            {stats.averageGrade.toFixed(2)}
                        </p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-l-4 border-l-purple-500">
                    <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Créditos</p>
                        <p className="text-xl font-bold text-gray-900">
                            {stats.earnedCredits} <span className="text-sm text-gray-400 font-normal">/ {stats.totalCredits}</span>
                        </p>
                    </div>
                </Card>

                <Card className="flex items-center gap-4 p-4 border-l-4 border-l-indigo-500">
                    <div className="w-full">
                        <div className="flex justify-between mb-1">
                            <span className="text-xs font-bold text-gray-500 uppercase">Progreso Total</span>
                            <span className="text-xs font-bold text-indigo-600">{progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-indigo-100 rounded-full h-2.5">
                            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }}></div>
                        </div>
                    </div>
                </Card>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {/* Curriculum Grid */}
            <Card className="p-6 overflow-hidden">
                <CurriculumGrid
                    subjects={subjects}
                    studentProgress={history}
                    readOnly={true}
                />
            </Card>
        </div>
    );
};

export default StudentAcademicPage;
