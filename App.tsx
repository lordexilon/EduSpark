

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import Layout from './components/Layout.tsx';
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import SessionsListPage from './pages/SessionsListPage.tsx';
import SessionDetailPage from './pages/SessionDetailPage.tsx';
import AddEditSessionPage from './pages/AddEditSessionPage.tsx';
import AssignmentsPage from './pages/AssignmentsPage.tsx';
import GradesPage from './pages/GradesPage.tsx';
import ForumsPage from './pages/ForumsPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';

// This component handles the conditional rendering of routes based on authentication.
const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  // If no user, show only login page and redirect all other paths to login.
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // If user is logged in, show the main application layout and routes.
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
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

// The main App component wraps everything in providers.
const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;