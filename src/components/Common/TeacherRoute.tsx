/**
 * Componente para proteger rutas que pueden ser accedidas por profesores y estudiantes (temporal para testing)
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface TeacherRouteProps {
  children: React.ReactElement;
}

const TeacherRoute: React.FC<TeacherRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verificar que el usuario sea teacher, admin, coordinator, admin-campus, supervisor o student (temporal)
  const allowedRoles = ['admin', 'coordinator', 'admin-campus', 'supervisor', 'teacher', 'student'];
  const hasAccess = user && allowedRoles.includes(user.role?.name || '');

  // Logging para diagnóstico
  console.log('👨‍🏫 TeacherRoute - Verificación de permisos:', {
    hasUser: !!user,
    userId: user?.id,
    roleName: user?.role?.name,
    hasAccess,
    allowedRoles,
  });

  if (!user) {
    console.log('👨‍🏫 TeacherRoute - No hay usuario, redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    console.log('👨‍🏫 TeacherRoute - Usuario no tiene permisos, redirigiendo a dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('👨‍🏫 TeacherRoute - Acceso permitido');
  return children;
};

export default TeacherRoute;
