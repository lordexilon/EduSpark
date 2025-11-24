/**
 * Componente para proteger rutas que solo pueden ser accedidas por administradores
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface AdminRouteProps {
  children: React.ReactElement;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verificar que el usuario sea admin, coordinator o admin-campus
  const isAdmin = user?.role?.name === 'admin' || 
                  user?.role?.name === 'coordinator' || 
                  user?.role?.name === 'admin-campus';
  
  // Logging para diagnóstico
  console.log('🔐 AdminRoute - Verificación de permisos:', {
    hasUser: !!user,
    userId: user?.id,
    roleName: user?.role?.name,
    roleId: user?.role?.id,
    isAdmin,
    fullUser: user
  });

  if (!user) {
    console.log('🔐 AdminRoute - No hay usuario, redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    console.log('🔐 AdminRoute - Usuario no es admin/coordinator/admin-campus, redirigiendo a dashboard');
    // Redirigir a dashboard con mensaje de error
    return <Navigate to="/teacher/dashboard" replace />;
  }

  console.log('🔐 AdminRoute - Acceso permitido');
  return children;
};

export default AdminRoute;

