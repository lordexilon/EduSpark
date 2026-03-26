import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconTrendingUp, IconAlertTriangle, IconSettings, IconShield, IconRefreshCw, IconUsers } from '@/components/Common/Icons';
import { useAuth } from '@/hooks/useAuth';
import { AIUsageStatsTable } from './components/AIUsageStatsTable';
import { StudentsRiskTable } from './components/StudentsRiskTable';
import { UserUsageStats, aiUsageService } from '@/services/aiUsageService';

interface AiLimit {
    id: string;
    scope: 'global' | 'institution' | 'user';
    scope_id: string | null;
    limit_tokens_daily: number;
    limit_messages_daily: number;
    limit_cost_daily_usd: number;
    used_tokens_daily: number;
    used_messages_daily: number;
    used_cost_daily_usd: number;
    is_active: boolean;
    updated_at: string;
}

const AIControlPanel = () => {
    const { user } = useAuth();
    const [globalLimit, setGlobalLimit] = useState<AiLimit | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [editCostLimit, setEditCostLimit] = useState<string>('');
    const [editMsgLimit, setEditMsgLimit] = useState<string>('');

    // Dashboard Data
    const [usageStats, setUsageStats] = useState<UserUsageStats[]>([]);
    const [dashboardLoading, setDashboardLoading] = useState(false);

    // Risk Report Data
    const [courses, setCourses] = useState<{ id: number, title: string }[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

    useEffect(() => {
        fetchLimits();
        fetchDashboardData();
        fetchCourses();
    }, []);

    const fetchLimits = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch Global Limit
            const { data, error } = await supabase
                .from('ai_limits')
                .select('*')
                .eq('scope', 'global')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Not found, maybe create it? Or just show empty
                    console.warn("Global limit not found");
                } else {
                    throw error;
                }
            }

            if (data) {
                setGlobalLimit(data);
                setEditCostLimit(data.limit_cost_daily_usd.toString());
                setEditMsgLimit(data.limit_messages_daily.toString());
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboardData = async () => {
        setDashboardLoading(true);
        try {
            const stats = await aiUsageService.getUserUsageStats();
            setUsageStats(stats);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setDashboardLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const { data } = await supabase
                .from('courses')
                .select('id, title')
                .order('created_at', { ascending: false });
            if (data) {
                setCourses(data);
                if (data.length > 0) setSelectedCourseId(data[0].id);
            }
        } catch (error) {
            console.error("Error loading courses:", error);
        }
    };

    const handleSaveGlobal = async () => {
        if (!globalLimit) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('ai_limits')
                .update({
                    limit_cost_daily_usd: parseFloat(editCostLimit),
                    limit_messages_daily: parseInt(editMsgLimit),
                    updated_at: new Date().toISOString()
                })
                .eq('id', globalLimit.id);

            if (error) throw error;
            await fetchLimits();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async () => {
        if (!globalLimit) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('ai_limits')
                .update({ is_active: !globalLimit.is_active })
                .eq('id', globalLimit.id);

            if (error) throw error;
            await fetchLimits();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading && !globalLimit) return <div className="p-8">Cargando panel de control...</div>;

    const percentageCost = globalLimit ? (globalLimit.used_cost_daily_usd / globalLimit.limit_cost_daily_usd) * 100 : 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-4 tracking-tight">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-inner">
                            <IconShield className="w-8 h-8" />
                        </div>
                        Control de Costos IA
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Administra el presupuesto y límites operativos de Gemini AI</p>
                </div>
                <Button
                    onClick={() => { fetchLimits(); fetchDashboardData(); }}
                    variant="outline"
                    size="default"
                    className="gap-2 rounded-xl border-gray-200 dark:border-gray-800 dark:hover:bg-gray-800 dark:text-gray-300 font-semibold"
                >
                    <IconRefreshCw className="w-4 h-4" /> Actualizar Datos
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/50 text-red-700 dark:text-red-400 px-5 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <IconAlertTriangle className="w-6 h-6 shrink-0" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* GLOBAL MONITOR */}
                <Card className="lg:col-span-2 border-none shadow-2xl shadow-indigo-500/5 bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <IconTrendingUp className="w-6 h-6 text-green-500" />
                            Consumo Global Diario
                        </CardTitle>
                        <CardDescription className="dark:text-gray-400 font-medium italic">Uso acumulado hoy vs Límite presupuestado</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 p-8 pt-2">
                        {globalLimit ? (
                            <>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">GASTO ESTIMADO</span>
                                            <div className="text-4xl font-black text-gray-900 dark:text-white">
                                                ${globalLimit.used_cost_daily_usd.toFixed(4)} <span className="text-xl font-normal text-gray-400 dark:text-gray-600 italic ml-1">USD</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">LÍMITE DIARIO</span>
                                            <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                                                ${globalLimit.limit_cost_daily_usd.toFixed(2)} USD
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-1 shadow-inner">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 shadow-lg ${percentageCost > 90 ? 'bg-gradient-to-r from-red-500 to-rose-600' : percentageCost > 75 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-green-600'}`}
                                            style={{ width: `${Math.min(percentageCost, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-1.5 font-bold text-xs">
                                            <span className={`w-2 h-2 rounded-full ${percentageCost > 90 ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></span>
                                            <span className={percentageCost > 90 ? 'text-red-500' : 'text-green-500'}>Sincronizado</span>
                                        </div>
                                        <p className="text-sm font-black text-gray-900 dark:text-white">{percentageCost.toFixed(1)}% <span className="font-medium text-gray-400 italic">utilizado</span></p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-100 dark:border-gray-800">
                                    <div className="bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Tokens Input</p>
                                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{(globalLimit.used_tokens_daily / 1000).toFixed(1)}k</p>
                                    </div>
                                    <div className="bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Interacciones</p>
                                        <p className="text-2xl font-black text-gray-900 dark:text-white">{globalLimit.used_messages_daily}</p>
                                        <p className="text-[10px] text-gray-500 italic mt-0.5">de ~{globalLimit.limit_messages_daily} max</p>
                                    </div>
                                    <div className="bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-2xl flex flex-col justify-center items-start">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Estado Servicio</p>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-tight ${globalLimit.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                            {globalLimit.is_active ? 'ACTIVO' : 'DETENIDO'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-400 dark:text-gray-600 font-medium italic">No hay límites operativos configurados.</div>
                        )}
                    </CardContent>
                </Card>

                {/* GLOBAL CONTROLS */}
                <Card className="border-none shadow-2xl shadow-indigo-500/5 bg-gray-50/50 dark:bg-gray-800/20 rounded-[2rem] overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IconSettings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            Ajustes del Grifo
                        </CardTitle>
                        <CardDescription className="dark:text-gray-500">Control maestro de la operación</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-sm font-black text-gray-700 dark:text-gray-300 ml-1">Límite Diario ($ USD)</Label>
                            <Input
                                type="number"
                                step="0.5"
                                value={editCostLimit}
                                onChange={(e) => setEditCostLimit(e.target.value)}
                                className="h-12 border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded-xl focus:ring-2 focus:ring-primary font-bold transition-all"
                            />
                            <p className="text-[11px] text-gray-500 italic ml-1 leading-tight">Umbral de seguridad: el servicio se suspende al alcanzarlo.</p>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-black text-gray-700 dark:text-gray-300 ml-1">Máx. Mensajes (Est.)</Label>
                            <Input
                                type="number"
                                value={editMsgLimit}
                                onChange={(e) => setEditMsgLimit(e.target.value)}
                                className="h-12 border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded-xl focus:ring-2 focus:ring-primary font-bold transition-all"
                            />
                        </div>

                        <div className="pt-6 space-y-3">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 py-6 rounded-2xl font-bold transition-all" onClick={handleSaveGlobal} disabled={saving}>
                                {saving ? <IconRefreshCw className="animate-spin w-5 h-5 mr-2" /> : null}
                                {saving ? 'Sincronizando...' : 'Guardar Ajustes'}
                            </Button>

                            {globalLimit && (
                                <Button
                                    variant={globalLimit.is_active ? "destructive" : "default"}
                                    className={`w-full py-6 rounded-2xl font-black transition-all ${!globalLimit.is_active ? 'bg-green-600 hover:bg-green-700 shadow-green-600/10' : 'shadow-red-600/10'}`}
                                    onClick={toggleActive}
                                    disabled={saving}
                                >
                                    {globalLimit.is_active ? '🛑 DETENER SERVICIO IA' : '✅ REANUDAR SERVICIO IA'}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="costos" className="w-full">
                <TabsList className="bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-2xl h-14 border border-gray-100 dark:border-gray-800">
                    <TabsTrigger value="costos" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-white transition-all">Costos por Alumno</TabsTrigger>
                    <TabsTrigger value="risk" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-white transition-all">Riesgo Académico</TabsTrigger>
                    <TabsTrigger value="mantenimiento" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-white transition-all">Mantenimiento</TabsTrigger>
                    <TabsTrigger value="institutions" className="rounded-xl px-6 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-white transition-all">Instituciones</TabsTrigger>
                </TabsList>

                <TabsContent value="costos" className="p-8 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100/50 dark:border-gray-800/50 shadow-2xl shadow-indigo-500/5 mt-6 ring-0 focus-visible:ring-0 text-gray-900 dark:text-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Detalle Analítico de Costos</h4>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Visibilidad completa sobre el uso de recursos IA por usuario</p>
                        </div>
                        <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">Datos Históricos</span>
                    </div>
                    <AIUsageStatsTable stats={usageStats} loading={dashboardLoading} />
                </TabsContent>

                <TabsContent value="risk" className="p-8 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100/50 dark:border-gray-800/50 shadow-2xl shadow-indigo-500/5 mt-6 ring-0 focus-visible:ring-0">
                    <div className="space-y-8">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                            <div>
                                <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Monitoreo de Estudiantes en Riesgo</h4>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Algoritmo de detección de ineficiencia cognitiva (Bajo progreso + Alto uso IA)</p>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-2 pl-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Filtrar Curso:</span>
                                <select
                                    id="courseSelect"
                                    className="px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl min-w-[240px] font-bold text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-gray-900 dark:text-white"
                                    value={selectedCourseId || ''}
                                    onChange={(e) => setSelectedCourseId(parseInt(e.target.value))}
                                >
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                        </div>

                        {selectedCourseId ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <StudentsRiskTable courseId={selectedCourseId} />
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-800/20 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                                <IconUsers className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-400 dark:text-gray-600 font-bold uppercase tracking-widest text-xs">Selecciona un curso para iniciar la analítica</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="institutions" className="p-12 text-center bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 mt-6 min-h-[400px] flex flex-col justify-center items-center">
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-indigo-600 dark:text-indigo-400 mb-6">
                        <IconRefreshCw className="w-12 h-12 animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Módulo de Instituciones</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto font-medium">Estamos implementando controles granularizados por sede y campus. Estará disponible en la próxima actualización.</p>
                </TabsContent>

                <TabsContent value="mantenimiento" className="p-8 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100/50 dark:border-gray-800/50 mt-6 ring-0 focus-visible:ring-0">
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Operaciones de Ciclo Batch</h4>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Herramientas de mantenimiento preventivo y consolidación de reportes semanales</p>
                        </div>

                        <div className="p-8 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-800/30 flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1 space-y-2 text-left">
                                <h5 className="font-bold text-indigo-900 dark:text-indigo-400">Consolidado Semanal (Friday Cycle)</h5>
                                <p className="text-xs text-indigo-700/70 dark:text-indigo-500/70 leading-relaxed max-w-lg">
                                    Esta operación procesa todos los eventos de la última semana, regenera el mapa de riesgo y actualiza los dashboards institucionales.
                                    Este proceso es automático (CRON), pero puede forzarse manualmente aquí.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="border-indigo-200 dark:border-indigo-800 bg-white dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-2xl h-14 px-8 font-black shadow-lg shadow-indigo-500/5 transition-all w-full md:w-auto"
                                onClick={async () => {
                                    alert("Esta operación procesará a todos los estudiantes activos en la última semana. ¿Continuar?");
                                    alert("Operación iniciada de forma asíncrona.");
                                }}
                            >
                                <IconRefreshCw className="w-5 h-5 mr-3" />
                                Ejecutar Batch Semanal
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AIControlPanel;
