import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card.tsx';
import { IconCog, IconGraduationCap, IconBookOpen, IconUsers, IconShield, IconPalette, IconCheck } from '../components/Icons.tsx';
import { useAuth } from '../hooks/useAuth.tsx';
import { useTheme, Theme } from '../context/ThemeContext.tsx';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  path?: string;
  items?: Array<{
    title: string;
    description: string;
    path: string;
  }>;
  customContent?: React.ReactNode;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const isAdmin = user?.role?.name === 'admin' || user?.role?.name === 'coordinator' || user?.role?.name === 'admin-campus';

  const themes: { id: Theme; name: string; color: string; border: string }[] = [
    { id: 'blue', name: 'Azul (Por defecto)', color: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'slate', name: 'Neutro', color: 'bg-slate-50', border: 'border-slate-200' },
    { id: 'gray', name: 'Alto Contraste', color: 'bg-gray-100', border: 'border-gray-200' },
    { id: 'indigo', name: 'Moderno', color: 'bg-indigo-50', border: 'border-indigo-200' },
    { id: 'corporate', name: 'Corporativo', color: 'bg-slate-100', border: 'border-slate-200' }
  ];

  const sections: SettingsSection[] = [
    {
      id: 'appearance',
      title: 'Apariencia',
      description: 'Personaliza el aspecto visual de la aplicación',
      icon: IconPalette,
      customContent: (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Tema del Fondo</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`relative p-4 rounded-lg border-2 text-left transition-all ${theme === t.id
                  ? `border-primary ring-2 ring-primary/20 ${t.color}`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-semibold ${theme === t.id ? 'text-primary' : 'text-gray-700'}`}>
                    {t.name}
                  </span>
                  {theme === t.id && <IconCheck className="w-5 h-5 text-primary" />}
                </div>
                <div className={`w-full h-12 rounded border ${t.border} ${t.color}`}></div>
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'academic',
      title: 'Gestión Académica',
      description: 'Administra carreras, materias y estructura académica',
      icon: IconGraduationCap,
      items: [
        {
          title: 'Carreras',
          description: 'Gestionar programas académicos y carreras',
          path: '/admin/careers'
        },
        {
          title: 'Materias',
          description: 'Administrar materias y asignaturas',
          path: '/admin/subjects'
        }
      ]
    },
    {
      id: 'users',
      title: 'Gestión de Usuarios',
      description: 'Administrar usuarios, roles y permisos',
      icon: IconUsers,
      items: [
        {
          title: 'Usuarios',
          description: 'Gestionar usuarios del sistema',
          path: '/admin/users'
        }
      ]
    },
    {
      id: 'courses',
      title: 'Gestión de Cursos',
      description: 'Ver y administrar todos los cursos del sistema',
      icon: IconBookOpen,
      items: [
        {
          title: 'Todos los Cursos',
          description: 'Ver todos los cursos del sistema',
          path: '/admin/all-courses'
        },
        {
          title: 'Módulos del Sistema',
          description: 'Administrar módulos de todos los cursos',
          path: '/admin/modules'
        }
      ]
    },
    {
      id: 'system',
      title: 'Configuración del Sistema',
      description: 'Configuración general y parámetros del sistema',
      icon: IconShield,
      items: [
        {
          title: 'Parámetros Generales',
          description: 'Configuración del sistema',
          path: '/admin/settings/system'
        },
        {
          title: 'Landing Page',
          description: 'Personalizar página de inicio de la institución',
          path: '/admin/settings/landing-page'
        }
      ]
    }
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const toggleSection = (sectionId: string) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-8">
            <IconShield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Restringido</h2>
            <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <IconCog className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Configuración del Sistema</h1>
          <p className="text-gray-600">Administra y configura las diferentes áreas del sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          const isExpanded = activeSection === section.id;

          return (
            <Card key={section.id} className="hover:shadow-lg transition-shadow">
              <div
                className="cursor-pointer"
                onClick={() => (section.items || section.customContent) && toggleSection(section.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <SectionIcon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </div>
                  {(section.items || section.customContent) && (
                    <div className="flex-shrink-0">
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''
                          }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {section.items && isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  {section.items.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleNavigate(item.path)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-800 group-hover:text-primary">
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {section.customContent && isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {section.customContent}
                </div>
              )}

              {section.path && !section.items && !section.customContent && (
                <div className="mt-4">
                  <button
                    onClick={() => handleNavigate(section.path!)}
                    className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Acceder
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SettingsPage;

