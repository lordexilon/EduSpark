import React from 'react';
import TutorVirtualPage from '@/pages/Student/TutorVirtualPage';

const MobileChatPage: React.FC = () => {
    return (
        <div className="h-screen w-full flex flex-col bg-white">
            {/* 
              We wrap the TutorVirtualPage to force it into full height 
              and hide potentially unnecessary elements via CSS if needed 
            */}
            <div className="flex-1 overflow-hidden">
                <TutorVirtualPage />
            </div>

            <style>{`
                /* Hide breadcrumbs or heavy headers if they exist inside TutorVirtualPage */
                /* This is a safeguard, ideally TutorVirtualPage should be responsive */
            `}</style>
        </div>
    );
};

export default MobileChatPage;
