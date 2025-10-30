
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import Layout from './components/Layout.tsx';
import TeacherLayout from './components/TeacherLayout.tsx';
import RouterWrapper from './components/RouterWrapper.tsx';
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import SessionsListPage from './pages/SessionsListPage.tsx';
import SessionDetailPage from './pages/SessionDetailPage.tsx';
import AddEditSessionPage from './pages/AddEditSessionPage.tsx';
import AssignmentsPage from './pages/AssignmentsPage.tsx';
import GradesPage from './pages/GradesPage.tsx';
import ForumsPage from './pages/ForumsPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
// Teacher pages
import TeacherDashboardPage from './pages/TeacherDashboardPage.tsx';
import { TeacherCoursesPage } from './pages/TeacherCoursesPage.tsx';
import { TeacherAssignmentsPage } from './pages/TeacherAssignmentsPage.tsx';
import { CourseEditorPage } from './pages/CourseEditorPage.tsx';
import CreateCoursePage from './pages/CreateCoursePage.tsx';
// Landing page
import LandingPage from './pages/LandingPage.tsx';
// Tutor Virtual
import TutorVirtualPage from './pages/TutorVirtualPage.tsx';

// This component handles the conditional rendering of routes based on authentication.
const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  console.log('🎨 AppRoutes render:', { user: !!user, loading });

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('⏳ AppRoutes: Mostrando loader');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando EduSpark...</p>
        </div>
      </div>
    );
  }

  // If no user, show landing page or login page
  if (!user) {
    console.log('👤 AppRoutes: No user, mostrando rutas públicas');
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // If user is logged in, show the appropriate layout and routes based on role.
  const isTeacher = user?.role?.name === 'teacher' || user?.role?.name === 'admin';
  console.log('👤 AppRoutes: User logged in', { role: user?.role?.name, isTeacher });
  
  if (isTeacher) {
    console.log('👨‍🏫 AppRoutes: Mostrando rutas de teacher');
    return (
      <TeacherLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
          <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
          <Route path="/teacher/courses/new" element={<CreateCoursePage />} />
          <Route path="/teacher/courses/:id" element={<CourseEditorPage />} />
          <Route path="/teacher/courses/:id/edit" element={<CreateCoursePage />} />
          <Route path="/teacher/assignments" element={<TeacherAssignmentsPage />} />
          <Route path="/teacher/grades" element={<GradesPage />} />
          <Route path="/teacher/forums" element={<ForumsPage />} />
          <Route path="/teacher/tutor" element={<TutorVirtualPage />} />
          <Route path="/teacher/students" element={<div>Estudiantes - En desarrollo</div>} />
          {/* Admin routes */}
          <Route path="/admin/all-courses" element={<div>Todos los Cursos - En desarrollo</div>} />
          <Route path="/admin/users" element={<div>Gestión de Usuarios - En desarrollo</div>} />
          <Route path="/admin/settings" element={<div>Configuración del Sistema - En desarrollo</div>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
        </Routes>
      </TeacherLayout>
    );
  }

  // Student layout and routes
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/sessions" element={<SessionsListPage />} />
        <Route path="/session/nueva" element={<AddEditSessionPage />} />
        <Route path="/session/editar/:sessionId" element={<AddEditSessionPage />} />
        <Route path="/session/:sessionId" element={<SessionDetailPage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/forums" element={<ForumsPage />} />
        <Route path="/tutor" element={<TutorVirtualPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
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

// The main App component wraps everything in providers.
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterWrapper>
          <AppRoutes />
        </RouterWrapper>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;