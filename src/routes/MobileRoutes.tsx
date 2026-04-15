import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MobileAppLayout from '@/components/Layout/MobileAppLayout';
import MobileDashboardPage from '@/pages/Mobile/MobileDashboardPage';
import MobileChatPage from '@/pages/Mobile/MobileChatPage';
import MobileFlashcardsPage from '@/pages/Mobile/MobileFlashcardsPage';

const MobileRoutes: React.FC = () => {
    return (
        <Routes>
            <Route element={<MobileAppLayout />}>
                <Route path="/mobile" element={<MobileDashboardPage />} />
                <Route path="/mobile/chat" element={<MobileChatPage />} />
                <Route path="/mobile/flashcards" element={<MobileFlashcardsPage />} />
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/mobile" replace />} />
            </Route>
        </Routes>
    );
};

export default MobileRoutes;
