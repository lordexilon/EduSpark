/**
 * Componente para proteger rutas que solo pueden ser accedidas por administradores
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AdminRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userRole = user?.role?.name || '';

  // Si se especifican roles permitidos, verificar contra esa lista
  // Si no, usar la lógica por defecto de administración
  const isAuthorized = allowedRoles
    ? allowedRoles.includes(userRole)
    : ['admin', 'coordinator', 'admin-campus', 'supervisor'].includes(userRole) ||
      (userRole === 'student' && process.env.NODE_ENV === 'development'); // Student solo para testing local

  // Logging para diagnóstico
  console.log('🔐 AdminRoute - Verificación de permisos:', {
    hasUser: !!user,
    userId: user?.id,
    roleName: userRole,
    isAuthorized,
    allowedRoles: allowedRoles || 'default admin roles',
  });

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthorized) {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
