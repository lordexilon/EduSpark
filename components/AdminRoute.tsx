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

  // Verificar que el usuario sea admin o coordinator
  const isAdmin = user?.role?.name === 'admin' || user?.role?.name === 'coordinator';

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    // Redirigir a dashboard con mensaje de error
    return <Navigate to="/teacher/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;

