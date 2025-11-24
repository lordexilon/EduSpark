// pages/UsersManagementPage.tsx
// Página de administración de usuarios (solo para admins)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usersAPI, rolesAPI } from '../services/api';
import { User, supabase } from '../lib/supabase';
import { IconSearch, IconEdit, IconTrash, IconShield, IconUserX, IconUserCheck, IconKey, IconFilter, IconMail, IconCheckCircle, IconDollarSign } from '../components/Icons';

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface Institution {
  id: number;
  name: string;
  code?: string;
}

const UsersManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Estados para modales
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });

  // Estado para rastrear emails confirmados
  const [emailConfirmed, setEmailConfirmed] = useState<Record<string, boolean>>({});
  const [confirmingEmail, setConfirmingEmail] = useState<string | null>(null);

  // Estado para límites de gasto
  const [userLimits, setUserLimits] = useState<Record<string, any>>({});
  const [loadingLimits, setLoadingLimits] = useState<Record<string, boolean>>({});

  // Verificar que el usuario es admin, coordinator o admin-campus
  useEffect(() => {
    const isAdmin = currentUser?.role?.name === 'admin' ||
      currentUser?.role?.name === 'coordinator' ||
      currentUser?.role?.name === 'admin-campus';

    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      setError('No tienes permisos para acceder a esta página. Solo administradores, coordinadores y administradores de campus pueden gestionar usuarios.');
      setLoading(false);
      // No redirigir aquí, dejar que AdminRoute lo maneje
      return;
    }

    loadData();
  }, [currentUser, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersResult, rolesResult, institutionsResult] = await Promise.all([
        usersAPI.getUsers(),
        rolesAPI.getRoles(),
        loadInstitutions()
      ]);

      if (!usersResult.success) {
        setError(usersResult.error || 'Error al cargar usuarios');
        return;
      }

      if (!rolesResult.success) {
        setError(rolesResult.error || 'Error al cargar roles');
        return;
      }

      const usersData = usersResult.data || [];
      setUsers(usersData);
      setRoles(rolesResult.data || []);
      setInstitutions(institutionsResult);

      // Verificar estado de confirmación de email para cada usuario (solo si la función existe)
      for (const user of usersData) {
        try {
          checkEmailStatus(user.id);
        } catch (err) {
          // Ignorar si la función RPC no existe
          console.debug('Función get_user_email_status no disponible');
        }
        try {
          loadUserLimits(user.id);
        } catch (err) {
          // Ignorar si la tabla no existe
          console.debug('Tabla user_query_limits no disponible');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInstitutions = async (): Promise<Institution[]> => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error al cargar instituciones:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error al cargar instituciones:', err);
      return [];
    }
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = !roleFilter || user.role?.id === roleFilter;

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active === true) ||
      (statusFilter === 'inactive' && user.is_active !== true);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Editar usuario
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  // Guardar cambios del usuario
  const handleSaveUser = async (updatedUser: Partial<User>) => {
    if (!editingUser) return;

    try {
      const result = await usersAPI.updateUser(editingUser.id, updatedUser);

      if (result.success) {
        await loadData();
        setShowEditModal(false);
        setEditingUser(null);
        alert('Usuario actualizado correctamente');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error al actualizar usuario: ${err.message}`);
    }
  };

  // Cambiar rol
  const handleChangeRole = async (userId: string, newRoleId: number) => {
    if (!confirm('¿Estás seguro de cambiar el rol de este usuario?')) return;

    try {
      const result = await usersAPI.updateUserRole(userId, newRoleId);

      if (result.success) {
        await loadData();
        alert('Rol actualizado correctamente');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error al cambiar rol: ${err.message}`);
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async () => {
    if (!editingUser) return;
    if (passwordForm.password !== passwordForm.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    if (passwordForm.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const result = await usersAPI.changeUserPassword(editingUser.id, passwordForm.password);

      if (result.success) {
        setShowPasswordModal(false);
        setPasswordForm({ password: '', confirmPassword: '' });
        alert('Contraseña actualizada correctamente');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error al cambiar contraseña: ${err.message}`);
    }
  };

  // Activar/desactivar usuario
  const handleToggleStatus = async (user: User) => {
    // Si is_active es null/undefined, tratarlo como false (inactivo)
    const currentStatus = user.is_active === true;
    const newStatus = !currentStatus;
    const action = newStatus ? 'activar' : 'desactivar';

    if (!confirm(`¿Estás seguro de ${action} este usuario?`)) return;

    try {
      const result = await usersAPI.toggleUserStatus(user.id, newStatus);

      if (result.success) {
        await loadData();
        alert(`Usuario ${action === 'activar' ? 'activado' : 'desactivado'} correctamente`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error al ${action} usuario: ${err.message}`);
    }
  };

  // Confirmar email de usuario
  const handleConfirmEmail = async (user: User) => {
    if (!confirm(`¿Estás seguro de confirmar el email de ${user.email}?`)) return;

    try {
      setConfirmingEmail(user.id);
      const result = await usersAPI.confirmUserEmail(user.id);

      if (result.success && result.data) {
        // Actualizar el estado local
        setEmailConfirmed(prev => ({ ...prev, [user.id]: true }));
        alert(`Email de ${result.data.email} confirmado exitosamente.`);
        await loadData(); // Recargar datos para reflejar cambios
      } else {
        alert(`Error: ${result.error || 'No se pudo confirmar el email'}`);
      }
    } catch (err: any) {
      alert(`Error al confirmar email: ${err.message}`);
    } finally {
      setConfirmingEmail(null);
    }
  };

  // Verificar si el email está confirmado (usando RPC)
  const checkEmailStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_email_status', { p_user_id: userId });

      if (!error && data && data.length > 0) {
        setEmailConfirmed(prev => ({ ...prev, [userId]: data[0].is_confirmed }));
      }
      // Ignorar silenciosamente si la función no existe (404) o cualquier otro error
    } catch (err: any) {
      // Ignorar todos los errores silenciosamente - la función RPC puede no existir
    }
  };

  // Cargar límites de gasto de un usuario
  const loadUserLimits = async (userId: string) => {
    try {
      setLoadingLimits(prev => ({ ...prev, [userId]: true }));
      const { data, error } = await supabase
        .from('user_query_limits')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setUserLimits(prev => ({ ...prev, [userId]: data }));
      }
      // Ignorar silenciosamente todos los errores - la tabla puede no existir
    } catch (err: any) {
      // Ignorar todos los errores silenciosamente - la tabla puede no existir
    } finally {
      setLoadingLimits(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Guardar límites de gasto
  const handleSaveLimits = async (userId: string, limits: any) => {
    try {
      const { error } = await supabase
        .from('user_query_limits')
        .upsert({
          user_id: userId,
          daily_queries: limits.daily_queries,
          monthly_queries: limits.monthly_queries,
          daily_cost_limit: limits.daily_cost_limit,
          monthly_cost_limit: limits.monthly_cost_limit,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        alert(`Error al guardar límites: ${error.message}`);
        return;
      }

      await loadUserLimits(userId);
      setShowLimitsModal(false);
      alert('Límites de gasto actualizados correctamente');
    } catch (err: any) {
      alert(`Error al guardar límites: ${err.message}`);
    }
  };

  // Eliminar (desactivar) usuario
  const handleDeleteUser = async (user: User) => {
    if (!confirm(`¿Estás seguro de desactivar al usuario ${user.email}? Esta acción puede revertirse.`)) return;

    try {
      const result = await usersAPI.deleteUser(user.id);

      if (result.success) {
        await loadData();
        alert('Usuario desactivado correctamente');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error al desactivar usuario: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si hay error y no es por permisos, mostrar mensaje
  if (error && !users.length && (currentUser?.role?.name === 'admin' || currentUser?.role?.name === 'coordinator')) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <h2 className="font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Si no es admin/coordinator/admin-campus, mostrar mensaje de acceso denegado
  const isAdmin = currentUser?.role?.name === 'admin' ||
    currentUser?.role?.name === 'coordinator' ||
    currentUser?.role?.name === 'admin-campus';
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <IconShield className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600 mb-4">
            No tienes permisos para acceder a esta página. Solo los administradores, coordinadores y administradores de campus pueden gestionar usuarios.
          </p>
          <button
            onClick={() => navigate('/teacher/dashboard')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getRoleName = (roleId: number | undefined) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || 'Desconocido';
  };

  const getRoleLabel = (roleName: string) => {
    const labels: Record<string, string> = {
      student: 'Estudiante',
      teacher: 'Docente',
      admin: 'Administrador',
      coordinator: 'Coordinador',
      'admin-campus': 'Admin Campus'
    };
    return labels[roleName] || roleName;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-dark mb-2">Gestión de Usuarios</h1>
        <p className="text-text-light">Administra usuarios, roles y permisos del sistema</p>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Filtro por rol */}
          <div>
            <select
              value={roleFilter || ''}
              onChange={(e) => setRoleFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Todos los roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {getRoleLabel(role.name)}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por estado */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Límites de Gasto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-semibold">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-900">{user.email}</span>
                        {emailConfirmed[user.id] === false && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800" title="Email no confirmado">
                            <IconMail className="w-3 h-3 mr-1" />
                            Pendiente
                          </span>
                        )}
                        {emailConfirmed[user.id] === true && (
                          <IconCheckCircle className="w-4 h-4 text-green-500" title="Email confirmado" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role?.id || ''}
                        onChange={(e) => handleChangeRole(user.id, parseInt(e.target.value))}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={user.id === currentUser?.id}
                      >
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {getRoleLabel(role.name)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active === true
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {user.is_active === true ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('es-ES')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {loadingLimits[user.id] ? (
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
                      ) : userLimits[user.id] ? (
                        <div className="space-y-1">
                          <div className="text-xs">
                            <span className="font-medium">Diario:</span> {userLimits[user.id].current_daily_queries || 0}/{userLimits[user.id].daily_queries || 50} consultas
                            <span className="text-gray-500 ml-2">
                              ${(userLimits[user.id].current_daily_cost || 0).toFixed(4)}/${(userLimits[user.id].daily_cost_limit || 0.05).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Mensual:</span> {userLimits[user.id].current_monthly_queries || 0}/{userLimits[user.id].monthly_queries || 1000} consultas
                            <span className="text-gray-500 ml-2">
                              ${(userLimits[user.id].current_monthly_cost || 0).toFixed(4)}/${(userLimits[user.id].monthly_cost_limit || 1.00).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Por defecto</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Editar usuario"
                        >
                          <IconEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowLimitsModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Configurar límites de gasto"
                        >
                          <IconDollarSign className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowPasswordModal(true);
                          }}
                          className="text-yellow-600 hover:text-yellow-900 p-1"
                          title="Cambiar contraseña"
                        >
                          <IconKey className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-1 ${user.is_active === true
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                            }`}
                          title={user.is_active === true ? 'Desactivar' : 'Activar'}
                        >
                          {user.is_active === true ? (
                            <IconUserX className="w-5 h-5" />
                          ) : (
                            <IconUserCheck className="w-5 h-5" />
                          )}
                        </button>
                        {emailConfirmed[user.id] === false && (
                          <button
                            onClick={() => handleConfirmEmail(user)}
                            disabled={confirmingEmail === user.id}
                            className="text-blue-600 hover:text-blue-900 p-1 disabled:opacity-50"
                            title="Confirmar email"
                          >
                            {confirmingEmail === user.id ? (
                              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <IconMail className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-4 text-sm text-gray-600">
        Mostrando {filteredUsers.length} de {users.length} usuarios
      </div>

      {/* Modal de edición */}
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          onSave={handleSaveUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Modal de cambio de contraseña */}
      {showPasswordModal && editingUser && (
        <PasswordModal
          user={editingUser}
          password={passwordForm.password}
          confirmPassword={passwordForm.confirmPassword}
          onPasswordChange={(value) => setPasswordForm({ ...passwordForm, password: value })}
          onConfirmPasswordChange={(value) => setPasswordForm({ ...passwordForm, confirmPassword: value })}
          onSave={handleChangePassword}
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordForm({ password: '', confirmPassword: '' });
            setEditingUser(null);
          }}
        />
      )}

      {/* Modal de límites de gasto */}
      {showLimitsModal && editingUser && (
        <LimitsModal
          user={editingUser}
          limits={userLimits[editingUser.id] || {
            daily_queries: 50,
            monthly_queries: 1000,
            daily_cost_limit: 0.05,
            monthly_cost_limit: 1.00
          }}
          onSave={(limits) => handleSaveLimits(editingUser.id, limits)}
          onClose={() => {
            setShowLimitsModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

// Modal para editar usuario
interface EditUserModalProps {
  user: User;
  onSave: (userData: Partial<User>) => void;
  onClose: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Editar Usuario</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para cambiar contraseña
interface PasswordModalProps {
  user: User;
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({
  user,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onSave,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Cambiar Contraseña</h2>
        <p className="text-sm text-gray-600 mb-4">Usuario: {user.email}</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            required
            minLength={6}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            required
            minLength={6}
          />
        </div>
        {password !== confirmPassword && password && confirmPassword && (
          <p className="text-red-600 text-sm mb-4">Las contraseñas no coinciden</p>
        )}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!password || password !== confirmPassword || password.length < 6}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cambiar contraseña
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal para configurar límites de gasto
interface LimitsModalProps {
  user: User;
  limits: {
    daily_queries: number;
    monthly_queries: number;
    daily_cost_limit: number;
    monthly_cost_limit: number;
    current_daily_queries?: number;
    current_monthly_queries?: number;
    current_daily_cost?: number;
    current_monthly_cost?: number;
  };
  onSave: (limits: any) => void;
  onClose: () => void;
}

const LimitsModal: React.FC<LimitsModalProps> = ({ user, limits, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    daily_queries: limits.daily_queries || 50,
    monthly_queries: limits.monthly_queries || 1000,
    daily_cost_limit: limits.daily_cost_limit || 0.05,
    monthly_cost_limit: limits.monthly_cost_limit || 1.00
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.daily_queries < 1 || formData.monthly_queries < 1) {
      alert('Los límites de consultas deben ser al menos 1');
      return;
    }
    if (formData.daily_cost_limit < 0 || formData.monthly_cost_limit < 0) {
      alert('Los límites de costo no pueden ser negativos');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <IconDollarSign className="w-6 h-6 mr-2 text-green-600" />
          Configurar Límites de Gasto
        </h2>
        <p className="text-sm text-gray-600 mb-6">Usuario: <span className="font-medium">{user.email}</span></p>

        {/* Uso actual */}
        {(limits.current_daily_queries !== undefined || limits.current_monthly_queries !== undefined) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Uso Actual</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Diario:</span>
                <div className="text-blue-600">
                  {limits.current_daily_queries || 0} consultas / ${(limits.current_daily_cost || 0).toFixed(4)}
                </div>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Mensual:</span>
                <div className="text-blue-600">
                  {limits.current_monthly_queries || 0} consultas / ${(limits.current_monthly_cost || 0).toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Límites diarios */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Límites Diarios</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consultas diarias máximas
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.daily_queries}
                  onChange={(e) => setFormData({ ...formData, daily_queries: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Número máximo de consultas por día</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo diario máximo (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.daily_cost_limit}
                  onChange={(e) => setFormData({ ...formData, daily_cost_limit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Costo máximo en dólares por día</p>
              </div>
            </div>

            {/* Límites mensuales */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Límites Mensuales</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consultas mensuales máximas
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.monthly_queries}
                  onChange={(e) => setFormData({ ...formData, monthly_queries: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Número máximo de consultas por mes</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo mensual máximo (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_cost_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_cost_limit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Costo máximo en dólares por mes</p>
              </div>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Los límites diarios se resetean automáticamente cada día.
              Los límites mensuales se resetean el día 1 de cada mes.
            </p>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Guardar Límites
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsersManagementPage;

