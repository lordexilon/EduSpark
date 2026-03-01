import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import TeacherLayout from '@/components/Common/TeacherLayout';
import AdminRoute from '@/components/Common/AdminRoute';

// Pages
import DashboardPage from '@/pages/Common/DashboardPage';
import SessionsListPage from '@/pages/Teacher/SessionsListPage';
import { CourseViewPage } from '@/pages/Student/CourseViewPage';
import SessionDetailPage from '@/pages/Common/SessionDetailPage';
import AddEditSessionPage from '@/pages/Teacher/AddEditSessionPage';
import TeacherGradesPage from '@/pages/Teacher/TeacherGradesPage';
import CourseGradingWeightsPage from '@/pages/Teacher/CourseGradingWeightsPage';
import ForumsPage from '@/pages/Common/ForumsPage';
import ProfilePage from '@/pages/Common/ProfilePage';
import AdminModulesPage from '@/pages/Admin/AdminModulesPage';
import TeacherDashboardPage from '@/pages/Teacher/TeacherDashboardPage';
import SupervisorDashboard from '@/pages/Teacher/SupervisorDashboard';
import CareersPage from '@/pages/Admin/CareersPage';
import SubjectsPage from '@/pages/Admin/SubjectsPage';
import SettingsPage from '@/pages/Common/SettingsPage';
import InstitutionManagementPage from '@/pages/Admin/InstitutionManagementPage';
import { TeacherCoursesPage } from '@/pages/Teacher/TeacherCoursesPage';
import CourseStudentProgressPage from '@/pages/Teacher/CourseStudentProgressPage';
import AdminDevicesReportPage from '@/pages/Admin/AdminDevicesReportPage';
import CourseComprehensiveReportPage from '@/pages/Teacher/CourseComprehensiveReportPage';
import { TeacherAssignmentsPage } from '@/pages/Teacher/TeacherAssignmentsPage';
import { CreateEditAssignmentPage } from '@/pages/Teacher/CreateEditAssignmentPage';
import AssignmentDetailPage from '@/pages/Student/AssignmentDetailPage';
import AssignmentSubmissionsPage from '@/pages/Teacher/AssignmentSubmissionsPage';
import { CourseEditorPage } from '@/pages/Teacher/CourseEditorPage';
import CreateCoursePage from '@/pages/Teacher/CreateCoursePage';
import TutorVirtualPage from '@/pages/Student/TutorVirtualPage';
import TeacherTutorAnalyticsPage from '@/pages/Teacher/TeacherTutorAnalyticsPage';
import { FileProcessingPage } from '@/pages/Admin/FileProcessingPage';
import { MaterialsManagementPage } from '@/pages/Teacher/MaterialsManagementPage';
import CourseModulesPage from '@/pages/Teacher/CourseModulesPage';
import ModuleEditorPage from '@/pages/Teacher/ModuleEditorPage';
import StudentsManagementPage from '@/pages/Teacher/StudentsManagementPage';
import UsersManagementPage from '@/pages/Admin/UsersManagementPage';
import BulkUserImportPage from '@/pages/Admin/BulkUserImportPage';
import MigrateOrphanUsersPage from '@/pages/Admin/MigrateOrphanUsersPage';
import BulkSuspendReactivatePage from '@/pages/Admin/BulkSuspendReactivatePage';
import StudentPaymentManagementPage from '@/pages/Student/StudentPaymentManagementPage';
import UserSuspensionManagementPage from '@/pages/Admin/UserSuspensionManagementPage';
import QuizBuilderPage from '@/pages/Teacher/QuizBuilderPage';
import QuizAnalyticsPage from '@/pages/Teacher/QuizAnalyticsPage';
import QuizResultsPage from '@/pages/Student/QuizResultsPage';
import { TeacherQuizzesPage } from '@/pages/Teacher/TeacherQuizzesPage';
import MessagingPage from '@/pages/Common/MessagingPage';
import ForumTopicPage from '@/pages/Common/ForumTopicPage';
import AnnouncementsPage from '@/pages/Common/AnnouncementsPage';
import CreateAnnouncementPage from '@/pages/Teacher/CreateAnnouncementPage';
import AnnouncementStatsPage from '@/pages/Teacher/AnnouncementStatsPage';
import AIUsageReportPage from '@/pages/Admin/AIUsageReportPage';
import ProcessingCostsDashboardPage from '@/pages/Admin/ProcessingCostsDashboardPage';
import AdminComprehensiveReportsPage from '@/pages/Admin/AdminComprehensiveReportsPage';
import { TutorFeedbackReportPage } from '@/pages/Admin/TutorFeedbackReportPage';
import AIControlPanel from '@/pages/Admin/AIControlPanel';
import { FlashcardBuilderPage } from '@/pages/Teacher/FlashcardBuilderPage';
import { TeacherFlashcardsPage } from '@/pages/Teacher/TeacherFlashcardsPage';
import { DocumentLibraryPage } from '@/pages/Admin/DocumentLibraryPage';
import ResetStudentProgressPage from '@/pages/Teacher/ResetStudentProgressPage';
import { UserDevicesPage } from '@/pages/Common/UserDevicesPage';
import LandingPageConfigPage from '@/pages/Admin/LandingPageConfigPage';
import { MenuFeatureEditor } from '@/pages/Admin/MenuFeatureEditor';
import RolesManagementPage from '@/pages/Admin/RolesManagementPage';
import TestPDFViewer from '@/pages/Common/TestPDFViewer';
import SecureViewerPage from '@/pages/Common/SecureViewerPage';
import GoogleOAuthCallbackPage from '@/pages/Common/GoogleOAuthCallbackPage';
import TutorialsPage from '@/pages/TutorialsPage';

const TeacherRoutes: React.FC = () => {
    const { user } = useAuth();

    return (
        <TeacherLayout>
            <Routes>
                <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />
                <Route path="/teacher/dashboard" element={
                    user?.role?.name === 'supervisor'
                        ? <SupervisorDashboard />
                        : <TeacherDashboardPage />
                } />
                <Route path="/teacher/flashcards" element={<TeacherFlashcardsPage />} />
                <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
                <Route path="/courses/:id" element={<CourseViewPage />} />
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

                {/* Admin routes */}
                <Route path="/admin/modules" element={<AdminRoute><AdminModulesPage /></AdminRoute>} />
                <Route path="/admin/all-courses" element={<AdminRoute><div>Todos los Cursos - En desarrollo</div></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><UsersManagementPage /></AdminRoute>} />
                <Route path="/admin/bulk-import" element={<AdminRoute><BulkUserImportPage /></AdminRoute>} />
                <Route path="/admin/migrate-orphan-users" element={<AdminRoute><MigrateOrphanUsersPage /></AdminRoute>} />
                <Route path="/admin/bulk-suspend-reactivate" element={<AdminRoute><BulkSuspendReactivatePage /></AdminRoute>} />
                <Route path="/admin/payment-management" element={<AdminRoute><StudentPaymentManagementPage /></AdminRoute>} />
                <Route path="/admin/ai-usage" element={<AdminRoute allowedRoles={['admin']}><AIUsageReportPage /></AdminRoute>} />
                <Route path="/admin/ai-control" element={<AdminRoute allowedRoles={['admin']}><AIControlPanel /></AdminRoute>} />
                <Route path="/admin/processing-costs" element={<AdminRoute allowedRoles={['admin']}><ProcessingCostsDashboardPage /></AdminRoute>} />
                <Route path="/admin/file-processing" element={<AdminRoute><FileProcessingPage /></AdminRoute>} />
                <Route path="/admin/comprehensive-reports" element={<AdminRoute><AdminComprehensiveReportsPage /></AdminRoute>} />
                <Route path="/admin/tutor-feedback" element={<AdminRoute><TutorFeedbackReportPage /></AdminRoute>} />
                <Route path="/admin/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
                <Route path="/admin/careers" element={<AdminRoute><CareersPage /></AdminRoute>} />
                <Route path="/admin/subjects" element={<AdminRoute><SubjectsPage /></AdminRoute>} />
                <Route path="/admin/institutions" element={<AdminRoute><InstitutionManagementPage /></AdminRoute>} />
                <Route path="/admin/documents" element={<AdminRoute><DocumentLibraryPage /></AdminRoute>} />
                <Route path="/admin/devices-report" element={<AdminRoute><AdminDevicesReportPage /></AdminRoute>} />
                <Route path="/admin/menu-features" element={<AdminRoute><MenuFeatureEditor /></AdminRoute>} />
                <Route path="/admin/roles" element={<AdminRoute><RolesManagementPage /></AdminRoute>} />
                <Route path="/admin/settings/landing-page" element={<AdminRoute><LandingPageConfigPage /></AdminRoute>} />

                <Route path="/devices" element={<UserDevicesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/tutorials" element={<TutorialsPage />} />
                <Route path="/test-pdf" element={<TestPDFViewer />} />
                <Route path="/secure-viewer" element={<SecureViewerPage />} />
                <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
            </Routes>
        </TeacherLayout>
    );
};

export default TeacherRoutes;
