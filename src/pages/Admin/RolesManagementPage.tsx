import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconTrash, IconPlus } from '@/components/Common/Icons';

interface Role {
    id: number;
    name: string;
    description: string | null;
}

export const RolesManagementPage = () => {
    const { user } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRoles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Error fetching roles:', error);
            setError('Error al cargar roles');
        } else {
            setRoles(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (user?.role?.name === 'admin') {
            fetchRoles();
        }
    }, [user]);

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newRoleName.trim()) return;

        try {
            const { data, error } = await supabase
                .from('roles')
                .insert([{ name: newRoleName.trim().toLowerCase(), description: newRoleDesc }])
                .select()
                .single();

            if (error) throw error;

            setRoles([...roles, data]);
            setNewRoleName('');
            setNewRoleDesc('');
            setIsCreating(false);
        } catch (err: any) {
            console.error('Error creating role:', err);
            setError(err.message || 'Error al crear el rol');
        }
    };

    const handleDeleteRole = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar este rol? Esto podría afectar a usuarios asignados.')) return;

        try {
            const { error } = await supabase
                .from('roles')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setRoles(roles.filter(r => r.id !== id));
        } catch (err: any) {
            console.error('Error deleting role:', err);
            setError('No se puede eliminar el rol (posiblemente esté en uso)');
        }
    };

    if (user?.role?.name !== 'admin') {
        return <div className="p-6">No tienes permisos para ver esta página.</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Gestión de Roles</h1>
                <Button onClick={() => setIsCreating(!isCreating)} variant="primary" leftIcon={<IconPlus className="w-5 h-5" />}>
                    {isCreating ? 'Cancelar' : 'Nuevo Rol'}
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 border border-red-200">
                    {error}
                </div>
            )}

            {isCreating && (
                <Card className="mb-6 animate-fadeIn">
                    <form onSubmit={handleCreateRole} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nombre del Rol (Identificador)
                            </label>
                            <input
                                type="text"
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                                placeholder="ej. supervisor_academico"
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">Se guardará en minúsculas. Usado para lógica del sistema.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Descripción
                            </label>
                            <input
                                type="text"
                                value={newRoleDesc}
                                onChange={e => setNewRoleDesc(e.target.value)}
                                placeholder="ej. Supervisor de área académica"
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary">
                                Guardar Rol
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card>
                {loading ? (
                    <div className="p-4 text-center text-slate-500">Cargando roles...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="p-3 font-semibold text-slate-700">ID</th>
                                    <th className="p-3 font-semibold text-slate-700">Nombre</th>
                                    <th className="p-3 font-semibold text-slate-700">Descripción</th>
                                    <th className="p-3 font-semibold text-slate-700 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map(role => (
                                    <tr key={role.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="p-3 text-slate-500">{role.id}</td>
                                        <td className="p-3 font-medium text-slate-800">
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">
                                                {role.name}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-600">{role.description || '-'}</td>
                                        <td className="p-3 text-right">
                                            {/* Proteger roles del sistema básicos */}
                                            {['admin', 'teacher', 'student'].includes(role.name) ? (
                                                <span className="text-xs text-slate-400 italic">Sistema</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleDeleteRole(role.id)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                                                    title="Eliminar rol"
                                                >
                                                    <IconTrash className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {roles.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-4 text-center text-slate-500">
                                            No se encontraron roles.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default RolesManagementPage;
