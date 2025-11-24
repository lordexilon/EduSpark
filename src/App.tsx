
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import TeacherGradesPage from './pages/TeacherGradesPage.tsx';
import CourseGradingWeightsPage from './pages/CourseGradingWeightsPage.tsx';
import ForumsPage from './pages/ForumsPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import AdminModulesPage from './pages/AdminModulesPage.tsx';
import MyCoursesPage from './pages/MyCoursesPage.tsx';
import { CourseViewPage } from './pages/CourseViewPage.tsx';
// Teacher pages
import TeacherDashboardPage from './pages/TeacherDashboardPage.tsx';
// Fase 1 - Gestión Académica
import CareersPage from './pages/CareersPage.tsx';
import SubjectsPage from './pages/SubjectsPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import InstitutionManagementPage from './pages/InstitutionManagementPage.tsx';
import { TeacherCoursesPage } from './pages/TeacherCoursesPage.tsx';
import CourseStudentProgressPage from './pages/CourseStudentProgressPage.tsx';
import AdminDevicesReportPage from './pages/AdminDevicesReportPage';
import CourseComprehensiveReportPage from './pages/CourseComprehensiveReportPage.tsx';
import StudentSelfReportPage from './pages/StudentSelfReportPage.tsx';
import { TeacherAssignmentsPage } from './pages/TeacherAssignmentsPage.tsx';
import { CreateEditAssignmentPage } from './pages/CreateEditAssignmentPage.tsx';
import AssignmentDetailPage from './pages/AssignmentDetailPage.tsx';
import AssignmentSubmissionsPage from './pages/AssignmentSubmissionsPage.tsx';
import { CourseEditorPage } from './pages/CourseEditorPage.tsx';
import CreateCoursePage from './pages/CreateCoursePage.tsx';
// Landing page
import LandingPage from './pages/LandingPage.tsx';
import PrivacyPage from './pages/PrivacyPage.tsx';
import TermsPage from './pages/TermsPage.tsx';
// Tutor Virtual
import TutorVirtualPage from './pages/TutorVirtualPage.tsx';
import TeacherTutorAnalyticsPage from './pages/TeacherTutorAnalyticsPage.tsx';
import { FileProcessingPage } from './pages/FileProcessingPage.tsx';
import { MaterialsManagementPage } from './pages/MaterialsManagementPage.tsx';
import CourseModulesPage from './pages/CourseModulesPage.tsx';
import ModuleEditorPage from './pages/ModuleEditorPage.tsx';
import StudentsManagementPage from './pages/StudentsManagementPage.tsx';
import UsersManagementPage from './pages/UsersManagementPage.tsx';
import BulkUserImportPage from './pages/BulkUserImportPage.tsx';
import BulkSuspendReactivatePage from './pages/BulkSuspendReactivatePage.tsx';
import StudentPaymentManagementPage from './pages/StudentPaymentManagementPage.tsx';
import UserSuspensionManagementPage from './pages/UserSuspensionManagementPage.tsx';
import AdminRoute from './components/AdminRoute.tsx';
import QuizBuilderPage from './pages/QuizBuilderPage.tsx';
import TakeQuizPage from './pages/TakeQuizPage.tsx';
import QuizResultsPage from './pages/QuizResultsPage.tsx';
import QuizAnalyticsPage from './pages/QuizAnalyticsPage.tsx';
import { TeacherQuizzesPage } from './pages/TeacherQuizzesPage.tsx';
import GoogleOAuthCallbackPage from './pages/GoogleOAuthCallbackPage.tsx';
import MessagingPage from './pages/MessagingPage.tsx';
import ForumTopicPage from './pages/ForumTopicPage.tsx';
import AnnouncementsPage from './pages/AnnouncementsPage.tsx';
import CreateAnnouncementPage from './pages/CreateAnnouncementPage.tsx';
import AnnouncementStatsPage from './pages/AnnouncementStatsPage.tsx';
import AIUsageReportPage from './pages/AIUsageReportPage.tsx';
import ProcessingCostsDashboardPage from './pages/ProcessingCostsDashboardPage.tsx';
import AdminComprehensiveReportsPage from './pages/AdminComprehensiveReportsPage.tsx';
import { FlashcardBuilderPage } from './pages/FlashcardBuilderPage.tsx';
import { FlashcardStudyPage } from './pages/FlashcardStudyPage.tsx';
import { TeacherFlashcardsPage } from './pages/TeacherFlashcardsPage.tsx';
import { StudentFlashcardsPage } from './pages/StudentFlashcardsPage.tsx';
import { DocumentLibraryPage } from './pages/DocumentLibraryPage.tsx';
import ResetStudentProgressPage from './pages/ResetStudentProgressPage.tsx';
import { UserDevicesPage } from './pages/UserDevicesPage.tsx';

// This component handles the conditional rendering of routes based on authentication.
const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // CRÍTICO: Usar window.location para obtener la URL real (no la de React Router)
  // Esto es necesario porque cuando Google redirige, React Router puede no haber actualizado aún
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : location.pathname;

  console.log('🎨 AppRoutes render:', { user: !!user, loading, pathname: location.pathname, windowPath: currentPath });

  // CRÍTICO: Si estamos en la ruta del callback OAuth, renderizar directamente sin layout
  if (currentPath === '/auth/google/callback') {
    console.log('🔗 AppRoutes: Detectada ruta OAuth callback, renderizando directamente');
    return <GoogleOAuthCallbackPage />;
  }

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
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/auth/google/callback" element={<GoogleOAuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // If user is logged in, show the appropriate layout and routes based on role.
  // Admin, admin-campus, coordinator y teacher usan el layout de teacher
  const isTeacher = user?.role?.name === 'teacher' ||
    user?.role?.name === 'admin' ||
    user?.role?.name === 'admin-campus' ||
    user?.role?.name === 'coordinator';
  console.log('👤 AppRoutes: User logged in', { role: user?.role?.name, isTeacher });

  if (isTeacher) {
    console.log('👨‍🏫 AppRoutes: Mostrando rutas de teacher');
    return (
      <Routes>
        {/* OAuth callback sin layout para evitar interferencias - debe estar primero */}
        <Route path="/auth/google/callback" element={<GoogleOAuthCallbackPage />} />
        {/* Todas las demás rutas dentro del layout */}
        <Route path="/*" element={
          <TeacherLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />
              <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
              <Route path="/teacher/flashcards" element={<TeacherFlashcardsPage />} />
              <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
              <Route path="/teacher/courses/new" element={<CreateCoursePage />} />
              <Route path="/teacher/courses/:id" element={<CourseEditorPage />} />
              <Route path="/teacher/courses/:id/edit" element={<CreateCoursePage />} />
              <Route path="/teacher/courses/:id/modules" element={<CourseModulesPage />} />
              <Route path="/teacher/courses/:id/progress" element={<CourseStudentProgressPage />} />
              <Route path="/teacher/courses/:id/comprehensive-report" element={<CourseComprehensiveReportPage />} />
              <Route path="/teacher/courses/:courseId/modules/:moduleId" element={<ModuleEditorPage />} />
              <Route path="/teacher/courses/:courseId/grading-weights" element={<CourseGradingWeightsPage />} />
              <Route path="/teacher/quizzes" element={<TeacherQuizzesPage />} />
              <Route path="/teacher/quizzes/new" element={<QuizBuilderPage />} />
              <Route path="/teacher/quizzes/edit/:quizId" element={<QuizBuilderPage />} />
              <Route path="/teacher/quizzes/:quizId/analytics" element={<QuizAnalyticsPage />} />
              <Route path="/quiz/:quizId/results/:attemptId" element={<QuizResultsPage />} />
              <Route path="/teacher/announcements" element={<AnnouncementsPage />} />
              <Route path="/teacher/announcements/new" element={<CreateAnnouncementPage />} />
              <Route path="/teacher/announcements/stats" element={<AnnouncementStatsPage />} />
              <Route path="/teacher/announcements/:id/edit" element={<CreateAnnouncementPage />} />
              <Route path="/teacher/assignments" element={<TeacherAssignmentsPage />} />
              <Route path="/teacher/assignments/new" element={<CreateEditAssignmentPage />} />
              <Route path="/teacher/assignments/:id/edit" element={<CreateEditAssignmentPage />} />
              <Route path="/teacher/assignments/:id/submissions" element={<AssignmentSubmissionsPage />} />
              <Route path="/teacher/assignments/:id" element={<AssignmentDetailPage />} />
              <Route path="/teacher/grades" element={<TeacherGradesPage />} />
              <Route path="/teacher/forums" element={<ForumsPage />} />
              <Route path="/forum/:topicId" element={<ForumTopicPage />} />
              <Route path="/teacher/tutor" element={<TutorVirtualPage />} />
              <Route path="/teacher/tutor-analytics" element={<TeacherTutorAnalyticsPage />} />
              <Route path="/teacher/file-processing" element={<FileProcessingPage />} />
              <Route path="/teacher/materials" element={<MaterialsManagementPage />} />
              <Route path="/teacher/courses/:courseId/flashcards" element={<FlashcardBuilderPage />} />
              <Route path="/teacher/students" element={<StudentsManagementPage />} />
              <Route path="/teacher/reset-progress" element={<ResetStudentProgressPage />} />
              <Route path="/teacher/messages" element={<MessagingPage />} />
              {/* Admin routes - Solo accesibles para admin y coordinator */}
              <Route path="/admin/modules" element={<AdminRoute><AdminModulesPage /></AdminRoute>} />
              <Route path="/admin/all-courses" element={<AdminRoute><div>Todos los Cursos - En desarrollo</div></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><UsersManagementPage /></AdminRoute>} />
              <Route path="/admin/bulk-import" element={<AdminRoute><BulkUserImportPage /></AdminRoute>} />
              <Route path="/admin/bulk-suspend-reactivate" element={<AdminRoute><BulkSuspendReactivatePage /></AdminRoute>} />
              <Route path="/admin/payment-management" element={<AdminRoute><StudentPaymentManagementPage /></AdminRoute>} />
              <Route path="/admin/ai-usage" element={<AdminRoute><AIUsageReportPage /></AdminRoute>} />
              <Route path="/admin/processing-costs" element={<AdminRoute><ProcessingCostsDashboardPage /></AdminRoute>} />
              <Route path="/admin/file-processing" element={<AdminRoute><FileProcessingPage /></AdminRoute>} />
              <Route path="/admin/comprehensive-reports" element={<AdminRoute><AdminComprehensiveReportsPage /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
              <Route path="/admin/settings/system" element={<AdminRoute><div>Configuración del Sistema - En desarrollo</div></AdminRoute>} />
              {/* Fase 1 - Gestión Académica (Admin/Coordinator) */}
              <Route path="/admin/careers" element={<AdminRoute><CareersPage /></AdminRoute>} />
              <Route path="/admin/subjects" element={<AdminRoute><SubjectsPage /></AdminRoute>} />
              <Route path="/admin/institutions" element={<AdminRoute><InstitutionManagementPage /></AdminRoute>} />
              <Route path="/admin/documents" element={<AdminRoute><DocumentLibraryPage /></AdminRoute>} />
              <Route path="/admin/devices-report" element={<AdminRoute><AdminDevicesReportPage /></AdminRoute>} />
              <Route path="/devices" element={<UserDevicesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
            </Routes>
          </TeacherLayout>
        } />
      </Routes>
    );
  }

  // Student layout and routes
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/my/courses" element={<MyCoursesPage />} />
        <Route path="/courses/:id" element={<CourseViewPage />} />
        <Route path="/courses/:id/my-report" element={<StudentSelfReportPage />} />
        <Route path="/sessions" element={<SessionsListPage />} />
        <Route path="/session/nueva" element={<AddEditSessionPage />} />
        <Route path="/session/editar/:sessionId" element={<AddEditSessionPage />} />
        <Route path="/session/:sessionId" element={<SessionDetailPage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/quiz/:quizId" element={<TakeQuizPage />} />
        <Route path="/quiz/:quizId/results/:attemptId" element={<QuizResultsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/forums" element={<ForumsPage />} />
        <Route path="/forum/:topicId" element={<ForumTopicPage />} />
        <Route path="/tutor" element={<TutorVirtualPage />} />
        <Route path="/flashcards" element={<StudentFlashcardsPage />} />
        <Route path="/courses/:courseId/flashcards" element={<FlashcardStudyPage />} />
        <Route path="/messages" element={<MessagingPage />} />
        <Route path="/devices" element={<UserDevicesPage />} />
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