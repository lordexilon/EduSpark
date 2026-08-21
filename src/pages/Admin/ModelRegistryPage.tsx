import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconRefreshCw, IconShield, IconDollarSign, IconPlus } from '@/components/Common/Icons';

interface ModelRow {
  id: string;
  model_key: string;
  provider: string;
  model_id: string;
  display_name: string;
  tier: string;
  input_cost_per_mtok: number;
  output_cost_per_mtok: number;
  supports_tools: boolean;
  supports_vision: boolean;
  context_window: number;
  max_output_tokens: number;
  enabled: boolean;
  priority: number;
}

interface CostLimitRow {
  limit_id: string;
  institution_id: number;
  institution_name: string | null;
  daily_cost_limit: number;
  monthly_cost_limit: number;
  is_active: boolean;
  current_monthly_cost: number;
  current_daily_cost: number;
}

const TIERS = ['local', 'economy', 'premium', 'fallback'];

export const ModelRegistryPage = () => {
  const { user } = useAuth();
  const [models, setModels] = useState<ModelRow[]>([]);
  const [limits, setLimits] = useState<CostLimitRow[]>([]);
  const [institutions, setInstitutions] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newInstitutionId, setNewInstitutionId] = useState<number | ''>('');
  const [newMonthly, setNewMonthly] = useState(50);
  const [newDaily, setNewDaily] = useState(2);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelsRes, limitsRes, instRes] = await Promise.all([
        supabase.rpc('admin_list_models'),
        supabase.rpc('admin_list_cost_limits'),
        supabase.from('institutions').select('id, name').order('name'),
      ]);
      if (modelsRes.error) throw modelsRes.error;
      if (limitsRes.error) throw limitsRes.error;
      if (instRes.error) throw instRes.error;
      setModels(modelsRes.data || []);
      setLimits(limitsRes.data || []);
      setInstitutions(instRes.data || []);
    } catch (err: any) {
      console.error('Error cargando modelos/límites:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role?.name === 'admin') loadData();
  }, [user]);

  const toggleModel = async (row: ModelRow) => {
    setSavingKey(row.model_key);
    try {
      const { error } = await supabase.rpc('admin_update_model', {
        p_model_key: row.model_key,
        p_enabled: !row.enabled,
      });
      if (error) throw error;
      setModels((prev) => prev.map((m) => (m.model_key === row.model_key ? { ...m, enabled: !m.enabled } : m)));
    } catch (err: any) {
      setError(err.message || 'Error al actualizar modelo');
    } finally {
      setSavingKey(null);
    }
  };

  const updateModelField = async (row: ModelRow, patch: Record<string, unknown>) => {
    setSavingKey(row.model_key);
    try {
      const { error } = await supabase.rpc('admin_update_model', {
        p_model_key: row.model_key,
        ...patch,
      });
      if (error) throw error;
      setModels((prev) => prev.map((m) => (m.model_key === row.model_key ? { ...m, ...patch } : m)));
    } catch (err: any) {
      setError(err.message || 'Error al actualizar modelo');
    } finally {
      setSavingKey(null);
    }
  };

  const updateLimit = async (row: CostLimitRow) => {
    setSavingKey(`limit-${row.institution_id}`);
    try {
      const { error } = await supabase.rpc('admin_upsert_cost_limit', {
        p_institution_id: row.institution_id,
        p_daily_cost_limit: row.daily_cost_limit,
        p_monthly_cost_limit: row.monthly_cost_limit,
        p_is_active: row.is_active,
      });
      if (error) throw error;
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al guardar límite');
    } finally {
      setSavingKey(null);
    }
  };

  const createLimit = async () => {
    if (!newInstitutionId) return;
    setSavingKey(`new-${newInstitutionId}`);
    try {
      const { error } = await supabase.rpc('admin_upsert_cost_limit', {
        p_institution_id: newInstitutionId,
        p_daily_cost_limit: newDaily,
        p_monthly_cost_limit: newMonthly,
        p_is_active: true,
      });
      if (error) throw error;
      setShowCreate(false);
      setNewInstitutionId('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al crear límite');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Cargando modelos y límites…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modelos &amp; Límites IA</h1>
          <p className="text-slate-500">CoreSpark — registro de modelos y presupuesto por institución.</p>
        </div>
        <Button variant="outline" leftIcon={<IconRefreshCw className="w-4 h-4" />} onClick={loadData}>
          Refrescar
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {/* Panel 1: Registro de modelos */}
      <Card>
        <div className="p-4 border-b flex items-center gap-2">
          <IconShield className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Registro de Modelos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Modelo</th>
                <th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Tier</th>
                <th className="px-4 py-3 text-right">$ in / 1M</th>
                <th className="px-4 py-3 text-right">$ out / 1M</th>
                <th className="px-4 py-3 text-center">Tools</th>
                <th className="px-4 py-3 text-center">Visión</th>
                <th className="px-4 py-3 text-center">Activo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {models.map((m) => (
                <tr key={m.model_key} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.display_name || m.model_key}</div>
                    <div className="text-xs text-slate-400">{m.model_key}</div>
                  </td>
                  <td className="px-4 py-3">{m.provider}</td>
                  <td className="px-4 py-3">
                    <select
                      value={m.tier}
                      onChange={(e) => updateModelField(m, { p_tier: e.target.value })}
                      className="border border-slate-200 rounded px-2 py-1 text-xs"
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={m.input_cost_per_mtok}
                      onChange={(e) => setModels((prev) => prev.map((x) => (x.model_key === m.model_key ? { ...x, input_cost_per_mtok: Number(e.target.value) } : x)))}
                      onBlur={(e) => updateModelField(m, { p_input_cost_per_mtok: Number(e.target.value) })}
                      className="border border-slate-200 rounded px-2 py-1 text-xs w-24 text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={m.output_cost_per_mtok}
                      onChange={(e) => setModels((prev) => prev.map((x) => (x.model_key === m.model_key ? { ...x, output_cost_per_mtok: Number(e.target.value) } : x)))}
                      onBlur={(e) => updateModelField(m, { p_output_cost_per_mtok: Number(e.target.value) })}
                      className="border border-slate-200 rounded px-2 py-1 text-xs w-24 text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">{m.supports_tools ? '✅' : '—'}</td>
                  <td className="px-4 py-3 text-center">{m.supports_vision ? '✅' : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleModel(m)}
                      disabled={savingKey === m.model_key}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${m.enabled ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${m.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Panel 2: Límites de costo */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconDollarSign className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Límites de Costo por Institución</h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<IconPlus className="w-4 h-4" />}
            onClick={() => setShowCreate((v) => !v)}
          >
            Nuevo límite
          </Button>
        </div>

        {showCreate && (
          <div className="p-4 border-b bg-slate-50 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Institución</label>
              <select
                value={newInstitutionId}
                onChange={(e) => setNewInstitutionId(e.target.value ? Number(e.target.value) : '')}
                className="border border-slate-200 rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="">Seleccionar…</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tope mensual ($)</label>
              <input
                type="number"
                step="0.5"
                value={newMonthly}
                onChange={(e) => setNewMonthly(Number(e.target.value))}
                className="border border-slate-200 rounded px-2 py-1.5 text-sm w-28"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tope diario ($)</label>
              <input
                type="number"
                step="0.25"
                value={newDaily}
                onChange={(e) => setNewDaily(Number(e.target.value))}
                className="border border-slate-200 rounded px-2 py-1.5 text-sm w-28"
              />
            </div>
            <Button
              size="sm"
              isLoading={savingKey === `new-${newInstitutionId}`}
              disabled={!newInstitutionId}
              onClick={createLimit}
            >
              Crear
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Institución</th>
                <th className="px-4 py-3 text-right">Tope mensual ($)</th>
                <th className="px-4 py-3 text-right">Tope diario ($)</th>
                <th className="px-4 py-3 text-right">Consumo mes ($)</th>
                <th className="px-4 py-3 text-right">Hoy ($)</th>
                <th className="px-4 py-3 text-center">Guardar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {limits.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No hay límites configurados. Usa el botón «Nuevo límite» para crear uno.
                  </td>
                </tr>
              )}
              {limits.map((l) => (
                <tr key={l.limit_id || l.institution_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{l.institution_name || `Institución ${l.institution_id}`}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.5"
                      value={l.monthly_cost_limit}
                      onChange={(e) => setLimits((prev) => prev.map((x) => (x.institution_id === l.institution_id ? { ...x, monthly_cost_limit: Number(e.target.value) } : x)))}
                      className="border border-slate-200 rounded px-2 py-1 text-xs w-24 text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.25"
                      value={l.daily_cost_limit}
                      onChange={(e) => setLimits((prev) => prev.map((x) => (x.institution_id === l.institution_id ? { ...x, daily_cost_limit: Number(e.target.value) } : x)))}
                      className="border border-slate-200 rounded px-2 py-1 text-xs w-24 text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">${Number(l.current_monthly_cost || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">${Number(l.current_daily_cost || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      isLoading={savingKey === `limit-${l.institution_id}`}
                      onClick={() => updateLimit(l)}
                    >
                      Guardar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ModelRegistryPage;
