import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Common/Layout';

// Pages
import StudentDashboardPage from '@/pages/Student/StudentDashboardPage';
import StudentAcademicPage from '@/pages/Student/StudentAcademicPage';
import DashboardPage from '@/pages/Common/DashboardPage';
import { MaterialsManagementPage } from '@/pages/Teacher/MaterialsManagementPage';
import MyCoursesPage from '@/pages/Student/MyCoursesPage';
import { CourseViewPage } from '@/pages/Student/CourseViewPage';
import StudentSelfReportPage from '@/pages/Student/StudentSelfReportPage';
import SessionsListPage from '@/pages/Teacher/SessionsListPage';
import AddEditSessionPage from '@/pages/Teacher/AddEditSessionPage';
import SessionDetailPage from '@/pages/Common/SessionDetailPage';
import AssignmentsPage from '@/pages/Student/AssignmentsPage';
import TakeQuizPage from '@/pages/Student/TakeQuizPage';
import QuizResultsPage from '@/pages/Student/QuizResultsPage';
import AnnouncementsPage from '@/pages/Common/AnnouncementsPage';
import GradesPage from '@/pages/Student/GradesPage';
import ForumsPage from '@/pages/Common/ForumsPage';
import ForumTopicPage from '@/pages/Common/ForumTopicPage';
import TutorVirtualPage from '@/pages/Student/TutorVirtualPage';
import { StudentFlashcardsPage } from '@/pages/Student/StudentFlashcardsPage';
import { FlashcardStudyPage } from '@/pages/Student/FlashcardStudyPage';
import MessagingPage from '@/pages/Common/MessagingPage';
import TutorialsPage from '@/pages/TutorialsPage';
import { UserDevicesPage } from '@/pages/Common/UserDevicesPage';
import ProfilePage from '@/pages/Common/ProfilePage';
import TestPDFViewer from '@/pages/Common/TestPDFViewer';
import SecureViewerPage from '@/pages/Common/SecureViewerPage';

const StudentRoutes: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<StudentDashboardPage />} />
        <Route path="/dashboard-legacy" element={<DashboardPage />} />
        <Route path="/teacher/materials" element={<MaterialsManagementPage />} />
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
        <Route path="/tutorials" element={<TutorialsPage />} />
        <Route path="/devices" element={<UserDevicesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/test-pdf" element={<TestPDFViewer />} />
        <Route path="/secure-viewer" element={<SecureViewerPage />} />
        <Route path="/academic" element={<StudentAcademicPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

export default StudentRoutes;
