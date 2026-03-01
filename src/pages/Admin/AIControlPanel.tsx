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
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <IconShield className="w-8 h-8 text-indigo-600" />
                        Control de Costos IA
                    </h1>
                    <p className="text-slate-500 mt-1">Administra el "Grifo de Tokens" para controlar el presupuesto de Gemini AI.</p>
                </div>
                <Button onClick={() => { fetchLimits(); fetchDashboardData(); }} variant="outline" size="sm" className="gap-2">
                    <IconRefreshCw className="w-4 h-4" /> Actualizar
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <IconAlertTriangle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* GLOBAL MONITOR */}
                <Card className="md:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IconTrendingUp className="w-5 h-5 text-green-600" />
                            Consumo Global Diario
                        </CardTitle>
                        <CardDescription>Uso acumulado hoy vs Límite Global (Hard Stop)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {globalLimit ? (
                            <>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span>Gasto Estimado: ${globalLimit.used_cost_daily_usd.toFixed(4)} USD</span>
                                        <span className="text-slate-500">Límite: ${globalLimit.limit_cost_daily_usd.toFixed(2)} USD</span>
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${percentageCost > 90 ? 'bg-red-500' : percentageCost > 75 ? 'bg-amber-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(percentageCost, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-right text-slate-400">{percentageCost.toFixed(1)}% utilizado</p>
                                </div>

                                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-sm text-slate-500">Tokens Input</p>
                                        <p className="text-xl font-bold">{(globalLimit.used_tokens_daily / 1000).toFixed(1)}k</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Mensajes</p>
                                        <p className="text-xl font-bold">{globalLimit.used_messages_daily}</p>
                                        <p className="text-xs text-slate-400">de aprox {globalLimit.limit_messages_daily} permitidos</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Estado</p>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${globalLimit.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {globalLimit.is_active ? '🟢 ACTIVO' : '🔴 DETENIDO'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-slate-400">No se ha establecido un límite global.</div>
                        )}
                    </CardContent>
                </Card>

                {/* GLOBAL CONTROLS */}
                <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IconSettings className="w-5 h-5 text-slate-600" />
                            Ajustes del Grifo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Límite Diario ($ USD)</Label>
                            <Input
                                type="number"
                                step="0.5"
                                value={editCostLimit}
                                onChange={(e) => setEditCostLimit(e.target.value)}
                            />
                            <p className="text-xs text-slate-500">Al alcanzar esto, se detiene el servicio.</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Límite Mensajes (Estimado)</Label>
                            <Input
                                type="number"
                                value={editMsgLimit}
                                onChange={(e) => setEditMsgLimit(e.target.value)}
                            />
                        </div>

                        <div className="pt-4 space-y-3">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveGlobal} disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>

                            {globalLimit && (
                                <Button
                                    variant={globalLimit.is_active ? "destructive" : "default"}
                                    className="w-full"
                                    onClick={toggleActive}
                                    disabled={saving}
                                >
                                    {globalLimit.is_active ? '🛑 CERRAR GRIFO GLOBAL' : '✅ ABRIR GRIFO'}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="costos" className="w-full">
                <TabsList>
                    <TabsTrigger value="costos">Costos por Alumno</TabsTrigger>
                    <TabsTrigger value="risk">Riesgo Académico</TabsTrigger>
                    <TabsTrigger value="mantenimiento">Mantenimiento</TabsTrigger>
                    <TabsTrigger value="institutions">Instituciones</TabsTrigger>
                </TabsList>

                <TabsContent value="costos" className="p-4 bg-white rounded-lg border border-slate-200 mt-2">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-slate-800">Detalle de Costos por Usuario</h4>
                        <span className="text-xs text-slate-500">Datos históricos acumulados</span>
                    </div>
                    <AIUsageStatsTable stats={usageStats} loading={dashboardLoading} />
                </TabsContent>

                <TabsContent value="risk" className="p-4 bg-white rounded-lg border border-slate-200 mt-2">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold text-slate-800">Monitoreo de Estudiantes en Riesgo</h4>
                                <p className="text-sm text-slate-500">Detecta estudiantes con bajo progreso y alto consumo de IA (Ineficiencia)</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Label htmlFor="courseSelect" className="whitespace-nowrap">Curso:</Label>
                                <select
                                    id="courseSelect"
                                    className="px-3 py-2 border rounded-md min-w-[200px]"
                                    value={selectedCourseId || ''}
                                    onChange={(e) => setSelectedCourseId(parseInt(e.target.value))}
                                >
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                        </div>

                        {selectedCourseId ? (
                            <StudentsRiskTable courseId={selectedCourseId} />
                        ) : (
                            <div className="text-center py-8 text-slate-400">Selecciona un curso para ver el reporte de riesgo.</div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="institutions" className="p-4 bg-white rounded-lg border border-slate-200 mt-2">
                    <p className="text-slate-500 italic">Gestión de límites por institución (Próximamente)</p>
                </TabsContent>

                <TabsContent value="mantenimiento" className="p-4 bg-white rounded-lg border border-slate-200 mt-2">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-slate-800">Operaciones de Ciclo Weekly</h4>
                        <p className="text-sm text-slate-500">
                            Estas acciones procesan el consolidado de IA que se realiza semanalmente los viernes.
                            Úsalas para pruebas o para forzar la actualización de reportes.
                        </p>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                onClick={async () => {
                                    alert("Esta operación procesará a todos los estudiantes activos en la última semana. ¿Continuar?");
                                    // Lógica conceptual: En producción esto sería un Edge Function programado (Cron)
                                    alert("Operación iniciada en segundo plano (Simulada).");
                                }}
                            >
                                <IconRefreshCw className="w-4 h-4 mr-2" />
                                Procesar Reportes Semanales (Batch)
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AIControlPanel;
