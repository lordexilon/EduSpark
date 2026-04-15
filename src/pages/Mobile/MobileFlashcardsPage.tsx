import React from 'react';
import { StudentFlashcardsPage } from '@/pages/Student/StudentFlashcardsPage';

const MobileFlashcardsPage: React.FC = () => {
    return (
        <div className="min-h-screen w-full bg-gray-50 pb-safe">
            <StudentFlashcardsPage />

            <style>{`
                /* Mobile specific overrides for flashcards */
                .sfp-page {
                    padding: 16px !important;
                    height: 100vh;
                    overflow-y: auto;
                }
                .sfp-header {
                    margin-top: 10px;
                }
            `}</style>
        </div>
    );
};

export default MobileFlashcardsPage;
