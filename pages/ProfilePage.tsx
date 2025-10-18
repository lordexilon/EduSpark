
import React from 'react';
import Card from '../components/Card.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import { IconUserCircle, IconMail, IconBriefcase } from '../components/Icons.tsx'; 
import Button from '../components/Button.tsx';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <p>Cargando perfil...</p>; 
  }

  const displayRole = (role: string) => {
    if (role === 'student') return 'Estudiante';
    if (role === 'teacher') return 'Profesor';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 text-center">Mi Perfil</h1>
      <Card>
        <div className="flex flex-col items-center">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-32 h-32 rounded-full mb-4 shadow-lg" />
          ) : (
            <IconUserCircle className="w-32 h-32 text-slate-400 mb-4" />
          )}
          <h2 className="text-2xl font-semibold text-slate-800">{user.name}</h2>
          <p className="text-slate-500 capitalize">{displayRole(user.role)}</p>
        </div>
        
        <div className="mt-6 border-t border-slate-200 pt-6 space-y-4">
          <div className="flex items-center">
            <IconMail className="w-5 h-5 text-slate-500 mr-3" />
            <span className="text-slate-700">{user.email}</span>
          </div>
          <div className="flex items-center">
            <IconBriefcase className="w-5 h-5 text-slate-500 mr-3" />
            {/* This could be dynamic based on user.career or similar field */}
            <span className="text-slate-700">Estudiante de Lic. en Análisis de Sistemas Informáticos</span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Button variant="secondary" className="mr-2">Editar Perfil</Button>
          <Button variant="danger" onClick={logout}>Cerrar Sesión</Button>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;