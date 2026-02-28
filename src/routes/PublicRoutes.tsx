import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/Common/LoginPage';
import PrivacyPage from '@/pages/Common/PrivacyPage';
import TermsPage from '@/pages/Common/TermsPage';
import GoogleOAuthCallbackPage from '@/pages/Common/GoogleOAuthCallbackPage';
import InstitutionLandingPage from '@/pages/Common/InstitutionLandingPage';
import LandingPage from '@/pages/Common/LandingPage';

const PublicRoutes: React.FC = () => {
    const isCacavelos = window.location.hostname === 'cacavelos.com.py' ||
        window.location.hostname.includes('cacavelos');

    return (
        <Routes>
            <Route
                path="/"
                element={isCacavelos ? <Navigate to="/cec" replace /> : <LandingPage />}
            />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/auth/google/callback" element={<GoogleOAuthCallbackPage />} />
            <Route path="/:slug" element={<InstitutionLandingPage />} />
            <Route path="*" element={<Navigate to={isCacavelos ? "/cec" : "/"} replace />} />
        </Routes>
    );
};

export default PublicRoutes;
