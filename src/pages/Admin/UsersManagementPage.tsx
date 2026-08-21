// pages/UsersManagementPage.tsx
// Página de administración de usuarios (solo para admins)

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserInstitution } from '@/hooks/useUserInstitution';
import { usersAPI, rolesAPI } from '@/services/api';
import { User, supabase } from '@/lib/supabase';
import {
  IconSearch,
  IconEdit,
  IconTrash,
  IconShield,
  IconUserX,
  IconUserCheck,
  IconKey,
  IconFilter,
  IconMail,
  IconCheckCircle,
  IconDollarSign,
} from '@/components/Common/Icons';

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
  const { institution } = useUserInstitution();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [institutionFilter, setInstitutionFilter] = useState<number | null>(null);

  const isSupervisor = currentUser?.role?.name === 'supervisor';
  const isAdminCampus = currentUser?.role?.name === 'admin-campus';
  const isAdminGlobal =
    currentUser?.role?.name === 'admin' || currentUser?.role?.name === 'coordinator';

  // Estados para modales
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });

  // Estado para rastrear emails confirmados
  const [emailConfirmed, setEmailConfirmed] = useState<Record<string, boolean>>({});
  const [confirmingEmail, setConfirmingEmail] = useState<string | null>(null);
  // Registro de usuarios que acabamos de confirmar (para evitar que checkEmailStatus los sobrescriba)
  const recentlyConfirmedRef = useRef<Set<string>>(new Set());

  // Estado para límites de gasto
  const [userLimits, setUserLimits] = useState<Record<string, any>>({});
  const [loadingLimits, setLoadingLimits] = useState<Record<string, boolean>>({});

  // Verificar que el usuario es admin, coordinator, admin-campus o supervisor
  useEffect(() => {
    const isAdmin =
      currentUser?.role?.name === 'admin' ||
      currentUser?.role?.name === 'coordinator' ||
      currentUser?.role?.name === 'admin-campus' ||
      currentUser?.role?.name === 'supervisor';

    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      setError(
        'No tienes permisos para acceder a esta página. Solo administradores, coordinadores, administradores de campus y supervisores pueden gestionar usuarios.'
      );
      setLoading(false);
      // No redirigir aquí, dejar que AdminRoute lo maneje
      return;
    }

    // Si es supervisor o admin-campus, esperar a que se cargue la institución
    if ((isSupervisor || isAdminCampus) && !institution) {
      // Esperar un momento para que se cargue la institución
      return;
    }

    loadData();
  }, [currentUser, navigate, institution, isSupervisor, isAdminCampus]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Si es supervisor o admin-campus y no tiene institución, mostrar error
      if ((isSupervisor || isAdminCampus) && !institution) {
        setError('No tienes una institución asignada. Por favor, contacta al administrador.');
        setLoading(false);
        return;
      }

      // Si es supervisor o admin-campus, cargar usuarios filtrados por institución
      let usersResult;
      if ((isSupervisor || isAdminCampus) && institution) {
        // Cargar usuarios de la institución del supervisor
        const { data, error } = await supabase
          .from('users')
          .select(
            `
            id,
            email,
            first_name,
            last_name,
            is_active,
            created_at,
            updated_at,
            role:roles(id, name),
            user_institutions!inner(institution_id)
          `
          )
          .eq('user_institutions.institution_id', institution.id)
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message || 'Error al cargar usuarios');
          setLoading(false);
          return;
        }

        // Limpiar los datos para eliminar la relación user_institutions
        const cleanedUsers = (data || []).map((user: any) => ({
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
          role: user.role,
        }));

        usersResult = { success: true, data: cleanedUsers };
      } else {
        // Para otros roles (administradores globales), cargar usuarios e incluir institución
        const { data, error } = await supabase
          .from('users')
          .select(
            `
            id,
            email,
            first_name,
            last_name,
            is_active,
            created_at,
            updated_at,
            role:roles(id, name),
            user_institutions(institution_id)
          `
          )
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message || 'Error al cargar usuarios');
          setLoading(false);
          return;
        }

        // Transformar para que el tipo coincida con User (agregando field virtual para filtrado)
        const usersWithInstitutions = (data || []).map((user: any) => ({
          ...user,
          institution_ids: user.user_institutions?.map((ui: any) => ui.institution_id) || [],
        }));

        usersResult = { success: true, data: usersWithInstitutions as any };
      }

      const [rolesResult, institutionsResult] = await Promise.all([
        rolesAPI.getRoles(),
        loadInstitutions(),
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

      // Si es supervisor o admin-campus, solo mostrar su institución
      if ((isSupervisor || isAdminCampus) && institution) {
        setInstitutions([{ id: institution.id, name: institution.name }]);
      } else {
        setInstitutions(institutionsResult);
      }

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
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = !roleFilter || user.role?.id === roleFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active === true) ||
      (statusFilter === 'inactive' && user.is_active !== true);

    const matchesInstitution =
      !institutionFilter ||
      ((user as any).institution_ids && (user as any).institution_ids.includes(institutionFilter));

    return matchesSearch && matchesRole && matchesStatus && matchesInstitution;
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

    // Validar que el userId sea un UUID válido
    if (!editingUser.id || typeof editingUser.id !== 'string') {
      alert('Error: ID de usuario inválido. Por favor, recarga la página e intenta nuevamente.');
      return;
    }

    // Validar formato UUID básico
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(editingUser.id)) {
      alert(
        'Error: El ID de usuario no tiene un formato válido. Por favor, contacta al administrador.'
      );
      console.error('ID de usuario inválido:', editingUser.id, 'Usuario:', editingUser);
      return;
    }

    try {
      console.log('🔐 Intentando cambiar contraseña para usuario:', {
        id: editingUser.id,
        email: editingUser.email,
        name: `${editingUser.first_name} ${editingUser.last_name}`,
      });

      const result = await usersAPI.changeUserPassword(editingUser.id, passwordForm.password);

      if (result.success) {
        // La Cloud Function changeUserPassword ya confirma el email automáticamente,
        // pero llamamos explícitamente a confirmUserEmail para asegurar que se confirme
        // y que el estado se actualice correctamente
        console.log(
          `📧 Confirmando email explícitamente después de cambiar contraseña para: ${editingUser.email}`
        );
        try {
          const confirmResult = await usersAPI.confirmUserEmail(editingUser.id);
          if (confirmResult.success) {
            console.log(`✅ Email confirmado explícitamente para: ${editingUser.email}`);
          } else {
            console.warn(
              `⚠️ No se pudo confirmar email explícitamente (puede que ya esté confirmado): ${confirmResult.error}`
            );
          }
        } catch (confirmErr: any) {
          console.error('Error confirmando email explícitamente:', confirmErr);
          // No fallar si falla la confirmación explícita, ya que changeUserPassword ya lo hace
        }

        // Agregar a la lista de recientemente confirmados para evitar que checkEmailStatus lo sobrescriba
        recentlyConfirmedRef.current.add(editingUser.id);
        console.log(`✅ Usuario ${editingUser.id} agregado a lista de recientemente confirmados`);

        // Actualizar el estado local INMEDIATAMENTE para reflejar que el email está confirmado
        setEmailConfirmed((prev) => ({ ...prev, [editingUser.id]: true }));
        console.log(`✅ Contraseña cambiada y email confirmado para: ${editingUser.email}`);

        // Recargar datos para actualizar la UI, pero mantener el estado de email confirmado
        await loadData();

        // Limpiar de la lista después de 10 segundos (más tiempo para que la RPC se actualice)
        setTimeout(() => {
          recentlyConfirmedRef.current.delete(editingUser.id);
          console.log(
            `✅ Usuario ${editingUser.id} removido de lista de recientemente confirmados`
          );
        }, 10000);

        setShowPasswordModal(false);
        setPasswordForm({ password: '', confirmPassword: '' });
        alert('✅ Contraseña actualizada correctamente y email confirmado');
      } else {
        // Mostrar mensaje de error más descriptivo
        const errorMsg = result.error || 'Error desconocido al cambiar la contraseña';
        alert(`❌ Error: ${errorMsg}`);
        console.error('Error al cambiar contraseña:', result);
      }
    } catch (err: any) {
      console.error('Excepción al cambiar contraseña:', err);
      alert(
        `❌ Error al cambiar contraseña: ${err.message || 'Error desconocido. Por favor, intenta nuevamente.'}`
      );
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
        // Si se está activando el usuario y su email no está confirmado, confirmarlo automáticamente
        let emailWasConfirmed = false;
        if (newStatus && emailConfirmed[user.id] !== true) {
          console.log(`📧 Activando usuario y confirmando email para: ${user.email}`);
          try {
            const confirmResult = await usersAPI.confirmUserEmail(user.id);
            if (confirmResult.success) {
              // Agregar a la lista de recientemente confirmados
              recentlyConfirmedRef.current.add(user.id);
              console.log(
                `✅ Usuario ${user.id} agregado a lista de recientemente confirmados (activación)`
              );

              setEmailConfirmed((prev) => ({ ...prev, [user.id]: true }));
              emailWasConfirmed = true;
              console.log(`✅ Email confirmado automáticamente para: ${user.email}`);

              // Limpiar de la lista después de 5 segundos
              setTimeout(() => {
                recentlyConfirmedRef.current.delete(user.id);
                console.log(
                  `✅ Usuario ${user.id} removido de lista de recientemente confirmados (activación)`
                );
              }, 5000);
            } else {
              console.warn(`⚠️ No se pudo confirmar email automáticamente: ${confirmResult.error}`);
            }
          } catch (confirmErr: any) {
            console.error('Error confirmando email automáticamente:', confirmErr);
            // No fallar la activación si falla la confirmación de email
          }
        }

        // Recargar datos para actualizar la UI con el estado más reciente
        await loadData();

        // Forzar el estado a confirmado después de recargar si se confirmó el email
        if (newStatus && emailWasConfirmed) {
          setTimeout(() => {
            setEmailConfirmed((prev) => ({ ...prev, [user.id]: true }));
            console.log(
              `✅ Estado de email forzado a confirmado después de activar: ${user.email}`
            );
          }, 100);
        }

        alert(
          `Usuario ${action === 'activar' ? 'activado' : 'desactivado'} correctamente${emailWasConfirmed ? ' y email confirmado' : ''}`
        );
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error al ${action} usuario: ${err.message}`);
    }
  };

  // Confirmar email de usuario
  const handleConfirmEmail = async (user: User) => {
    // Si es supervisor, verificar que el usuario pertenezca a su institución
    if (isSupervisor && institution) {
      const userInstitution = await supabase
        .from('user_institutions')
        .select('institution_id')
        .eq('user_id', user.id)
        .eq('institution_id', institution.id)
        .maybeSingle();

      if (!userInstitution.data) {
        alert('No puedes confirmar el email de usuarios de otras instituciones.');
        return;
      }
    }

    if (!confirm(`¿Estás seguro de confirmar el email de ${user.email}?`)) return;

    try {
      setConfirmingEmail(user.id);
      const result = await usersAPI.confirmUserEmail(user.id);

      if (result.success && result.data) {
        // Agregar a la lista de recientemente confirmados
        recentlyConfirmedRef.current.add(user.id);
        console.log(
          `✅ Usuario ${user.id} agregado a lista de recientemente confirmados (confirmación manual)`
        );

        // Actualizar el estado local INMEDIATAMENTE
        setEmailConfirmed((prev) => ({ ...prev, [user.id]: true }));
        console.log(`✅ Email confirmado para: ${user.email}`);

        // Recargar datos para actualizar la UI, pero mantener el estado de email confirmado
        await loadData();

        // Limpiar de la lista después de 5 segundos
        setTimeout(() => {
          recentlyConfirmedRef.current.delete(user.id);
          console.log(
            `✅ Usuario ${user.id} removido de lista de recientemente confirmados (confirmación manual)`
          );
        }, 5000);

        alert(`Email de ${result.data.email} confirmado exitosamente.`);
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
    // Si acabamos de confirmar este email, no verificar (evitar sobrescribir el estado)
    if (recentlyConfirmedRef.current.has(userId)) {
      console.log(`📧 Omitiendo verificación de email para ${userId} (recientemente confirmado)`);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_email_status', { p_user_id: userId });

      if (!error && data && data.length > 0) {
        const isConfirmed = data[0].is_confirmed;
        // Solo actualizar si no está en la lista de recientemente confirmados
        if (!recentlyConfirmedRef.current.has(userId)) {
          setEmailConfirmed((prev) => ({ ...prev, [userId]: isConfirmed }));
          console.log(
            `📧 Estado de email verificado para ${userId}: ${isConfirmed ? 'Confirmado' : 'Pendiente'}`
          );
        } else {
          console.log(
            `📧 Estado de email verificado para ${userId}: ${isConfirmed ? 'Confirmado' : 'Pendiente'} (manteniendo estado confirmado)`
          );
        }
      } else if (error) {
        console.debug('⚠️ Error verificando estado de email (RPC):', error.message);
        // Si la función RPC no existe o falla, y el usuario está activo,
        // asumir que el email está confirmado (especialmente después de cambiar contraseña o activar)
        const user = users.find((u) => u.id === userId);
        if (user && user.is_active === true && !recentlyConfirmedRef.current.has(userId)) {
          setEmailConfirmed((prev) => ({ ...prev, [userId]: true }));
          console.log(`📧 Asumiendo email confirmado para usuario activo: ${userId}`);
        }
      }
    } catch (err: any) {
      console.debug('⚠️ Error verificando estado de email (catch):', err.message);
      // Si falla completamente, y el usuario está activo, asumir confirmado
      const user = users.find((u) => u.id === userId);
      if (user && user.is_active === true && !recentlyConfirmedRef.current.has(userId)) {
        setEmailConfirmed((prev) => ({ ...prev, [userId]: true }));
        console.log(`📧 Asumiendo email confirmado para usuario activo (fallback): ${userId}`);
      }
    }
  };

  // Cargar límites de gasto de un usuario
  const loadUserLimits = async (userId: string) => {
    try {
      setLoadingLimits((prev) => ({ ...prev, [userId]: true }));
      const { data, error } = await supabase
        .from('user_query_limits')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setUserLimits((prev) => ({ ...prev, [userId]: data }));
      }
      // Ignorar silenciosamente todos los errores - la tabla puede no existir
    } catch (err: any) {
      // Ignorar todos los errores silenciosamente - la tabla puede no existir
    } finally {
      setLoadingLimits((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // Guardar límites de gasto
  const handleSaveLimits = async (userId: string, limits: any) => {
    try {
      const { error } = await supabase.from('user_query_limits').upsert(
        {
          user_id: userId,
          daily_queries: limits.daily_queries,
          monthly_queries: limits.monthly_queries,
          daily_cost_limit: limits.daily_cost_limit,
          monthly_cost_limit: limits.monthly_cost_limit,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

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

  // Crear nuevo usuario
  const handleCreateUser = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: number;
    autoConfirm: boolean;
  }) => {
    try {
      console.log('🔐 handleCreateUser: Creando usuario con autoConfirm:', userData.autoConfirm);

      const result = await usersAPI.createUser(
        {
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          roleId: userData.roleId,
        },
        userData.autoConfirm
      );

      if (result.success) {
        setShowCreateModal(false);
        await loadData();
        alert(
          userData.autoConfirm
            ? 'Usuario creado y activado correctamente. Ya puede iniciar sesión.'
            : 'Usuario creado correctamente. Deberá confirmar su email para iniciar sesión.'
        );
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err: any) {
      alert(`Error al crear usuario: ${err.message}`);
      console.error('Error al crear usuario:', err);
    }
  };

  // Eliminar (desactivar) usuario
  const handleDeleteUser = async (user: User) => {
    if (
      !confirm(
        `¿Estás seguro de desactivar al usuario ${user.email}? Esta acción puede revertirse.`
      )
    )
      return;

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
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Si hay error y no es por permisos, mostrar mensaje
  if (
    error &&
    !users.length &&
    (currentUser?.role?.name === 'admin' || currentUser?.role?.name === 'coordinator')
  ) {
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
  const isAdmin =
    currentUser?.role?.name === 'admin' ||
    currentUser?.role?.name === 'coordinator' ||
    currentUser?.role?.name === 'admin-campus';
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <IconShield className="w-16 h-16 mx-auto mb-4 text-yellow-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600 mb-4">
            No tienes permisos para acceder a esta página. Solo los administradores, coordinadores y
            administradores de campus pueden gestionar usuarios.
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
    const role = roles.find((r) => r.id === roleId);
    return role?.name || 'Desconocido';
  };

  const getRoleLabel = (roleName: string) => {
    const labels: Record<string, string> = {
      student: 'Estudiante',
      teacher: 'Docente',
      admin: 'Administrador',
      coordinator: 'Coordinador',
      'admin-campus': 'Admin Campus',
    };
    return labels[roleName] || roleName;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 font-medium"
        >
          <IconUserCheck className="w-5 h-5" />
          Crear Usuario
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Filtro por rol */}
          <div>
            <select
              value={roleFilter || ''}
              onChange={(e) => setRoleFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="">Todos los roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id} className="dark:bg-gray-800">
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
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </select>
          </div>

          {/* Filtro por institución (solo para Admins Globales) */}
          {isAdminGlobal && (
            <div>
              <select
                value={institutionFilter || ''}
                onChange={(e) =>
                  setInstitutionFilter(e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">Todas las instituciones</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id} className="dark:bg-gray-800">
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Registro
                </th>
                {isAdminGlobal && (
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Institución
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Límites de Gasto
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdminGlobal ? 8 : 7}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center">
                          <span className="text-primary font-bold">
                            {user.first_name?.[0]}
                            {user.last_name?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {user.first_name} {user.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {user.email}
                        </span>
                        {emailConfirmed[user.id] === false && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                            title="Email no confirmado"
                          >
                            <IconMail className="w-3 h-3 mr-1" />
                            Pendiente
                          </span>
                        )}
                        {emailConfirmed[user.id] === true && (
                          <IconCheckCircle
                            className="w-4 h-4 text-green-500"
                            title="Email confirmado"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role?.id || ''}
                        onChange={(e) => handleChangeRole(user.id, parseInt(e.target.value))}
                        className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        disabled={user.id === currentUser?.id}
                      >
                        {roles.map((role) => (
                          <option
                            key={role.id}
                            value={role.id}
                            className="dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            {getRoleLabel(role.name)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.is_active === true
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        }`}
                      >
                        {user.is_active === true ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString('es-ES')
                        : '-'}
                    </td>
                    {isAdminGlobal && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {(user as any).user_institutions?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(user as any).user_institutions.map((ui: any) => {
                              const inst = institutions.find((i) => i.id === ui.institution_id);
                              return inst ? (
                                <span
                                  key={inst.id}
                                  className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px] font-medium border border-gray-200 dark:border-gray-700"
                                >
                                  {inst.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="text-red-400 dark:text-red-500 italic text-xs">
                            Ninguna
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {loadingLimits[user.id] ? (
                        <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-700 border-t-primary rounded-full animate-spin"></div>
                      ) : userLimits[user.id] ? (
                        <div className="space-y-1 text-gray-700 dark:text-gray-300">
                          <div className="text-[11px] leading-tight">
                            <span className="font-bold">Día:</span>{' '}
                            {userLimits[user.id].current_daily_queries || 0}/
                            {userLimits[user.id].daily_queries || 50} q
                            <span className="text-gray-400 dark:text-gray-500 ml-1.5 font-medium">
                              ${(userLimits[user.id].current_daily_cost || 0).toFixed(4)}
                            </span>
                          </div>
                          <div className="text-[11px] leading-tight">
                            <span className="font-bold">Mes:</span>{' '}
                            {userLimits[user.id].current_monthly_queries || 0}/
                            {userLimits[user.id].monthly_queries || 1000} q
                            <span className="text-gray-400 dark:text-gray-500 ml-1.5 font-medium">
                              ${(userLimits[user.id].current_monthly_cost || 0).toFixed(4)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600 text-[10px] font-medium uppercase tracking-wider">
                          Por defecto
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar usuario"
                        >
                          <IconEdit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowLimitsModal(true);
                          }}
                          className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Límites de gasto"
                        >
                          <IconDollarSign className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowPasswordModal(true);
                          }}
                          className="p-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                          title="Cambiar contraseña"
                        >
                          <IconKey className="w-5 h-5" />
                        </button>
                        {emailConfirmed[user.id] !== true && (
                          <button
                            onClick={() => handleConfirmEmail(user)}
                            disabled={confirmingEmail === user.id}
                            className="p-1.5 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all disabled:opacity-50"
                            title="Confirmar email"
                          >
                            {confirmingEmail === user.id ? (
                              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <IconMail className="w-5 h-5" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.is_active === true
                              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={user.is_active === true ? 'Desactivar' : 'Activar'}
                        >
                          {user.is_active === true ? (
                            <IconUserX className="w-5 h-5" />
                          ) : (
                            <IconUserCheck className="w-5 h-5" />
                          )}
                        </button>
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
      <div className="mt-6 p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between text-sm">
        <div className="text-gray-500 dark:text-gray-400 font-medium">
          Mostrando{' '}
          <span className="text-gray-900 dark:text-white font-bold">{filteredUsers.length}</span> de{' '}
          <span className="text-gray-900 dark:text-white font-bold">{users.length}</span> usuarios
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {users.filter((u) => u.is_active).length} Activos
          </div>
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {users.filter((u) => !u.is_active).length} Inactivos
          </div>
        </div>
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
          onConfirmPasswordChange={(value) =>
            setPasswordForm({ ...passwordForm, confirmPassword: value })
          }
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
          limits={
            userLimits[editingUser.id] || {
              daily_queries: 50,
              monthly_queries: 1000,
              daily_cost_limit: 0.05,
              monthly_cost_limit: 1.0,
            }
          }
          onSave={(limits) => handleSaveLimits(editingUser.id, limits)}
          onClose={() => {
            setShowLimitsModal(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Modal de creación de usuario */}
      {showCreateModal && (
        <CreateUserModal
          roles={roles}
          onSave={handleCreateUser}
          onClose={() => setShowCreateModal(false)}
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
    email: user.email || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm shadow-2xl flex items-center justify-center z-[100] p-4 transition-all duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800 transform scale-100 animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
            <IconEdit className="w-6 h-6" />
          </div>
          Editar Usuario
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Nombre
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Apellido
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-semibold"
            >
              Guardar Cambios
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
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 shadow-2xl backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full border border-gray-100 dark:border-gray-800 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl text-yellow-600 dark:text-yellow-400">
            <IconKey className="w-6 h-6" />
          </div>
          Cambiar Contraseña
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
          Usuario: <span className="text-gray-900 dark:text-gray-200">{user.email}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
        </div>

        {password !== confirmPassword && password && confirmPassword && (
          <p className="text-red-500 text-xs mt-3 flex items-center gap-1 font-medium italic">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Las contraseñas no coinciden
          </p>
        )}

        <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!password || password !== confirmPassword || password.length < 6}
            className="px-5 py-2.5 bg-yellow-500 text-white rounded-xl font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            Actualizar Contraseña
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
    monthly_cost_limit: limits.monthly_cost_limit || 1.0,
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
    <div className="fixed inset-0 bg-black/60 shadow-2xl backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 max-w-2xl w-full border border-gray-100 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto transform animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-xl text-green-600 dark:text-green-400">
            <IconDollarSign className="w-6 h-6 " />
          </div>
          Límites de Gasto
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 font-medium">
          Usuario: <span className="text-gray-900 dark:text-gray-200">{user.email}</span>
        </p>

        {/* Uso actual */}
        {(limits.current_daily_queries !== undefined ||
          limits.current_monthly_queries !== undefined) && (
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-2xl p-6 mb-8">
            <h3 className="font-bold text-primary dark:text-primary-light mb-4 text-sm uppercase tracking-wider">
              Uso Consumido Actual
            </h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  DIARIO (Consultas / Costo)
                </span>
                <div className="text-xl font-bold text-gray-900 dark:text-white flex items-baseline gap-1">
                  {limits.current_daily_queries || 0}{' '}
                  <span className="text-xs font-normal text-gray-400">q</span>
                  <span className="mx-2 text-gray-200 dark:text-gray-700">|</span>
                  <span className="text-primary">
                    ${(limits.current_daily_cost || 0).toFixed(4)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  MENSUAL (Consultas / Costo)
                </span>
                <div className="text-xl font-bold text-gray-900 dark:text-white flex items-baseline gap-1">
                  {limits.current_monthly_queries || 0}{' '}
                  <span className="text-xs font-normal text-gray-400">q</span>
                  <span className="mx-2 text-gray-200 dark:text-gray-700">|</span>
                  <span className="text-primary">
                    ${(limits.current_monthly_cost || 0).toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Límites diarios */}
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">
                Controles Diarios
              </h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                  Máx. Consultas
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.daily_queries}
                  onChange={(e) =>
                    setFormData({ ...formData, daily_queries: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                  Costo Máx. (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.daily_cost_limit}
                  onChange={(e) =>
                    setFormData({ ...formData, daily_cost_limit: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Límites mensuales */}
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">
                Controles Mensuales
              </h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                  Máx. Consultas
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.monthly_queries}
                  onChange={(e) =>
                    setFormData({ ...formData, monthly_queries: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                  Costo Máx. (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_cost_limit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthly_cost_limit: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all"
            >
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para crear usuario
interface CreateUserModalProps {
  roles: Role[];
  onSave: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: number;
    autoConfirm: boolean;
  }) => void;
  onClose: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ roles, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    roleId: roles.find((r) => r.name === 'teacher')?.id || roles[0]?.id || 0,
    autoConfirm: true, // Por defecto, confirmar email automáticamente
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    onSave(formData);
  };

  const getRoleLabel = (roleName: string) => {
    const labels: Record<string, string> = {
      student: 'Estudiante',
      teacher: 'Docente',
      admin: 'Administrador',
      coordinator: 'Coordinador',
      'admin-campus': 'Admin Campus',
    };
    return labels[roleName] || roleName;
  };

  return (
    <div className="fixed inset-0 bg-black/60 shadow-2xl backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 max-w-lg w-full border border-gray-100 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto transform animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-xl text-primary">
            <IconUserCheck className="w-6 h-6" />
          </div>
          Crear Nuevo Usuario
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                Apellido *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                Contraseña *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                Confirmar *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">
              Rol *
            </label>
            <select
              value={formData.roleId}
              onChange={(e) => setFormData({ ...formData, roleId: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              required
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id} className="dark:bg-gray-800">
                  {getRoleLabel(role.name)}
                </option>
              ))}
            </select>
          </div>

          <div className="py-2">
            <label className="flex items-center group cursor-pointer">
              <div className="relative flex items-center justify-center w-5 h-5 mr-3">
                <input
                  type="checkbox"
                  checked={formData.autoConfirm}
                  onChange={(e) => setFormData({ ...formData, autoConfirm: e.target.checked })}
                  className="peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md checked:bg-primary checked:border-primary transition-all cursor-pointer"
                />
                <IconCheckCircle className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">
                Habilitar usuario directamente (sin confirmación)
              </span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              Crear Usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsersManagementPage;
