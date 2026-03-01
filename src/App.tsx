import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/context/ThemeContext';
import RouterWrapper from '@/components/Common/RouterWrapper';
import GoogleOAuthCallbackPage from '@/pages/Common/GoogleOAuthCallbackPage';

// Modular Routes
import PublicRoutes from '@/routes/PublicRoutes';
import TeacherRoutes from '@/routes/TeacherRoutes';
import StudentRoutes from '@/routes/StudentRoutes';
import MobileRoutes from '@/routes/MobileRoutes';

/**
 * AppRoutes handles the top-level conditional rendering based on authentication state.
 * It's modularized to improve maintainability.
 */
const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // ⚠️ session monitor is disabled in original code
  // useSessionMonitor();

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : location.pathname;

  console.log('🎨 AppRoutes render:', { user: !!user, loading, pathname: location.pathname, windowPath: currentPath });

  // CRITICAL: Render OAuth callback directly to avoid layout/state interference
  if (currentPath === '/auth/google/callback' || location.pathname === '/auth/google/callback') {
    return <GoogleOAuthCallbackPage />;
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando EduSpark...</p>
        </div>
      </div>
    );
  }

  // Mobile Webview Routes (isolated) - Check PROBABLE mobile paths first!
  // We want MobileAppLayout to handle its own sync state even if 'user' is null initially.
  if (currentPath.startsWith('/mobile') || location.pathname.startsWith('/mobile')) {
    return <MobileRoutes />;
  }

  // Unauthenticated routes (for standard web app)
  if (!user) {
    return <PublicRoutes />;
  }

  // Authenticated routes based on roles
  const isTeacherOrAdmin = [
    'teacher', 'admin', 'admin-campus', 'coordinator', 'supervisor'
  ].includes(user?.role?.name || '');

  return (
    <Routes>
      {isTeacherOrAdmin ? (
        <Route path="/*" element={<TeacherRoutes />} />
      ) : (
        <Route path="/*" element={<StudentRoutes />} />
      )}
    </Routes>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error en la aplicación</h1>
            <p className="text-gray-600 mb-4">
              Ha ocurrido un error inesperado. Por favor, recarga la página.
            </p>
            {this.state.error && (
              <details className="text-left mt-4">
                <summary className="cursor-pointer text-sm text-gray-500">Detalles del error</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App component with providers
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <RouterWrapper>
            <AppRoutes />
          </RouterWrapper>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;