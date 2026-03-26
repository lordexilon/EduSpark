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
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Gestión de Roles</h1>
                    <p className="text-gray-600 dark:text-gray-400">Administra los roles y permisos estructurales del sistema</p>
                </div>
                <Button
                    onClick={() => setIsCreating(!isCreating)}
                    variant={isCreating ? "secondary" : "primary"}
                    leftIcon={<IconPlus className="w-5 h-5" />}
                    className="shadow-lg shadow-primary/20 rounded-xl"
                >
                    {isCreating ? 'Cancelar' : 'Nuevo Rol'}
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 border border-red-100 dark:border-red-800/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    {error}
                </div>
            )}

            {isCreating && (
                <Card className="mb-8 animate-in fade-in zoom-in duration-200 border-none shadow-xl bg-white dark:bg-gray-900 rounded-3xl overflow-hidden">
                    <form onSubmit={handleCreateRole} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                                    Nombre del Rol (ID Sistema)
                                </label>
                                <input
                                    type="text"
                                    value={newRoleName}
                                    onChange={e => setNewRoleName(e.target.value)}
                                    placeholder="ej. supervisor_academico"
                                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    required
                                />
                                <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1.5 ml-1 font-medium italic">Se guardará en minúsculas. Usado para lógica interna.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                                    Descripción Legible
                                </label>
                                <input
                                    type="text"
                                    value={newRoleDesc}
                                    onChange={e => setNewRoleDesc(e.target.value)}
                                    placeholder="ej. Supervisor del área académica"
                                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                                <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1.5 ml-1 font-medium italic">Nombre descriptivo para administradores.</p>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-50 dark:border-gray-800">
                            <Button type="button" variant="secondary" onClick={() => setIsCreating(false)} className="rounded-xl">
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary" className="rounded-xl shadow-lg shadow-primary/20 px-8">
                                Guardar Nuevo Rol
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card className="border-none shadow-xl bg-white dark:bg-gray-900 rounded-3xl overflow-hidden p-0">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                        Cargando roles...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">ID</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">Nombre del Sistema</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">Descripción</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {roles.map(role => (
                                    <tr key={role.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-600">#{role.id}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-primary/10 dark:bg-primary/20 text-primary px-3 py-1 rounded-lg text-xs font-bold tracking-tight border border-primary/10 dark:border-primary/20">
                                                {role.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 italic">
                                            {role.description || <span className="text-gray-300 dark:text-gray-700 italic font-normal">Sin descripción</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {/* Proteger roles del sistema básicos */}
                                            {['admin', 'teacher', 'student'].includes(role.name) ? (
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">Sistema</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleDeleteRole(role.id)}
                                                    className="text-red-500 hover:text-red-700 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
                                                    title="Eliminar rol"
                                                >
                                                    <IconTrash className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {roles.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-gray-500 dark:text-gray-400 font-medium">
                                            No se encontraron roles definidos.
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
