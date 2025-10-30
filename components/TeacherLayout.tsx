import React from 'react';
import Header from './Header.tsx';
import TeacherSidebar from './TeacherSidebar.tsx';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-surface">
      <TeacherSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
