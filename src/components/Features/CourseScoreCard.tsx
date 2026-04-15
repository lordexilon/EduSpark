import React from 'react';
import { IconBookOpen, IconCards, IconCheck, IconClipboardCheck, IconClock, IconSparkles } from '@/components/Common/Icons';

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    count: number;
    total: number;
    colorClass: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, count, total, colorClass }) => {
    const pending = total - count;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-2">
                <span className={`${colorClass}`}>{icon}</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
            </div>
            <div>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{count}</span>
                    <span className="text-sm text-gray-400">/{total}</span>
                </div>
                {total === 0 ? (
                    <p className="text-xs text-gray-400 font-medium mt-1">Sin contenido</p>
                ) : pending > 0 ? (
                    <p className="text-xs text-orange-500 font-medium mt-1">{pending} pendientes</p>
                ) : (
                    <p className="text-xs text-green-500 font-medium mt-1">¡Completado!</p>
                )}
            </div>
        </div>
    );
};

interface CourseScoreCardProps {
    score?: number;
    level?: string;
    progress: number;
    metrics: {
        units: { completed: number; total: number };
        sessions: { completed: number; total: number };
        quizzes: { completed: number; total: number };
        flashcards: { completed: number; total: number };
    };
}

export const CourseScoreCard: React.FC<CourseScoreCardProps> = ({
    score = 0,
    level = 'Novato',
    progress,
    metrics
}) => {
    const pendingItems = [];

    if (metrics.units.total - metrics.units.completed > 0) {
        pendingItems.push(`${metrics.units.total - metrics.units.completed} unidades sin completar`);
    }
    if (metrics.sessions.total - metrics.sessions.completed > 0) {
        pendingItems.push(`${metrics.sessions.total - metrics.sessions.completed} sesiones sin ver`);
    }
    if (metrics.quizzes.total - metrics.quizzes.completed > 0) {
        pendingItems.push(`${metrics.quizzes.total - metrics.quizzes.completed} quizzes pendientes`);
    }
    if (metrics.flashcards.total - metrics.flashcards.completed > 0) {
        pendingItems.push(`${metrics.flashcards.total - metrics.flashcards.completed} flashcards sin dominar`);
    }

    return (
        <div className="bg-blue-50/50 dark:bg-gray-900/50 rounded-2xl p-6 border border-blue-100 dark:border-gray-800 shadow-sm mb-8">
            {/* Header Score & Progress */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                            <IconSparkles className="w-8 h-8" />
                        </div>
                        {/* Notification badge simulation if needed */}
                        <div className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                            0
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Score: {score} pts
                        </h2>
                        <div className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                            Nivel: {level}
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/3 text-right">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Progreso General</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">Completado</p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                    icon={<IconBookOpen className="w-5 h-5" />}
                    label="Unidades"
                    count={metrics.units.completed}
                    total={metrics.units.total}
                    colorClass="text-blue-600"
                />
                <MetricCard
                    icon={<IconCheck className="w-5 h-5" />} // Using Check as placeholder for Sessions/Classes
                    label="Sesiones"
                    count={metrics.sessions.completed}
                    total={metrics.sessions.total}
                    colorClass="text-purple-600"
                />
                <MetricCard
                    icon={<IconClipboardCheck className="w-5 h-5" />}
                    label="Quizzes"
                    count={metrics.quizzes.completed}
                    total={metrics.quizzes.total}
                    colorClass="text-green-600"
                />
                <MetricCard
                    icon={<IconCards className="w-5 h-5" />}
                    label="Flashcards"
                    count={metrics.flashcards.completed}
                    total={metrics.flashcards.total}
                    colorClass="text-indigo-600"
                />
            </div>

            {/* Pending Items Warning */}
            {pendingItems.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500 p-4 rounded-r-lg">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-orange-500 mt-0.5">warning</span>
                        <div>
                            <h4 className="text-orange-800 dark:text-orange-200 font-bold text-sm mb-2">Elementos Pendientes</h4>
                            <ul className="space-y-1 mb-2">
                                {pendingItems.map((item, index) => (
                                    <li key={index} className="text-orange-700 dark:text-orange-300 text-sm flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <p className="text-orange-600 dark:text-orange-400 text-xs italic">
                                Completa estos elementos para aumentar tu score y avanzar de nivel
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
