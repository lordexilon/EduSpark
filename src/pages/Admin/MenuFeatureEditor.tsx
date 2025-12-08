import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { type MenuFeature } from '../../services/menuFeatureService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/Card';
import Button from '../../components/Button';

export const MenuFeatureEditor = () => {
    const { user, refreshMenuFeatures } = useAuth();
    const [features, setFeatures] = useState<MenuFeature[]>([]);
    const [loading, setLoading] = useState(true);

    const [roles, setRoles] = useState<string[]>([]);

    // Cargar flags y roles al montar
    useEffect(() => {
        if (user?.role?.name !== 'admin') return;

        const fetchData = async () => {
            const [featuresRes, rolesRes] = await Promise.all([
                supabase.from('menu_features').select('*'),
                supabase.from('roles').select('name')
            ]);

            if (!featuresRes.error && featuresRes.data) {
                setFeatures(featuresRes.data as any);
            }

            if (!rolesRes.error && rolesRes.data) {
                setRoles(rolesRes.data.map((r: any) => r.name));
            }

            setLoading(false);
        };

        fetchData();
    }, [user]);

    const toggle = async (key: string) => {
        const feature = features.find(f => f.key === key);
        if (!feature) return;

        const { error } = await supabase
            .from('menu_features')
            .update({ enabled: !feature.enabled })
            .eq('key', key);

        if (!error) {
            setFeatures(prev =>
                prev.map(f => (f.key === key ? { ...f, enabled: !f.enabled } : f))
            );
            refreshMenuFeatures();
        } else {
            console.warn('⚠️  Error al actualizar flag', error);
        }
    };

    const updateRoles = async (key: string, role: string, checked: boolean) => {
        const feature = features.find(f => f.key === key);
        if (!feature) return;

        let newRoles = feature.allowed_roles || [];
        if (checked) {
            if (!newRoles.includes(role)) newRoles = [...newRoles, role];
        } else {
            newRoles = newRoles.filter(r => r !== role);
        }

        // Si el array está vacío, enviamos null o array vacío según preferencia.
        // Supabase text[] acepta array vacío '{}'.

        const { error } = await supabase
            .from('menu_features')
            .update({ allowed_roles: newRoles })
            .eq('key', key);

        if (!error) {
            setFeatures(prev =>
                prev.map(f => (f.key === key ? { ...f, allowed_roles: newRoles } : f))
            );
            refreshMenuFeatures();
        } else {
            console.warn('⚠️ Error al actualizar roles', error);
        }
    };

    if (user?.role?.name !== 'admin') {
        return <p className="p-4">No tienes permiso para acceder a esta página.</p>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Card>
                <h2 className="text-2xl font-bold mb-6 text-slate-800">Gestión de Funcionalidades del Menú</h2>
                <p className="mb-4 text-slate-600">Habilita o deshabilita secciones del menú globalmente.</p>

                {loading ? (
                    <p>Cargando...</p>
                ) : (
                    <div className="space-y-4">
                        {features.length === 0 && <p>No hay features configuradas.</p>}
                        {features.map(f => (
                            <div key={f.key} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-semibold text-lg text-slate-800">{f.key}</p>
                                        <p className="text-sm text-slate-500">
                                            Estado: <span className={f.enabled ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                                {f.enabled ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={f.enabled}
                                            onChange={() => toggle(f.key)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="bg-white p-3 rounded border border-slate-200">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Roles Permitidos</p>
                                    <div className="flex flex-wrap gap-3">
                                        {roles.map(role => {
                                            const isChecked = f.allowed_roles?.includes(role) || false;
                                            return (
                                                <label key={role} className="inline-flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => updateRoles(f.key, role, e.target.checked)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                                    />
                                                    <span className={`text-sm ${isChecked ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                                        {role}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        * Si no se selecciona ningún rol, la visibilidad dependerá de la configuración por defecto del código.
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default MenuFeatureEditor;
