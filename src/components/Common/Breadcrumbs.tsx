import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { IconChevronRight, IconDashboard } from "@/components/Common/Icons";

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

/**
 * Componente Breadcrumbs para navegación contextual
 * 
 * Si no se proporcionan items, construye automáticamente los breadcrumbs
 * basándose en la ruta actual y los parámetros.
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  const location = useLocation();
  const params = useParams();

  // Construir breadcrumbs automáticamente si no se proporcionan
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', path: '/dashboard' }
    ];

    // Mapeo de rutas a labels
    const routeLabels: Record<string, string> = {
      'courses': 'Mis Cursos',
      'my': 'Mis Cursos',
      'sessions': 'Sesiones',
      'session': 'Sesión',
      'assignments': 'Tareas',
      'tutor': 'Tutor IA',
      'teacher': 'Panel Docente',
      'admin': 'Panel Admin'
    };

    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      
      // Si es un ID (UUID o número), no agregarlo directamente
      if (/^[0-9]+$/.test(part) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) {
        // El label será manejado por el componente padre con datos reales
        return;
      }

      const label = routeLabels[part] || part.charAt(0).toUpperCase() + part.slice(1);
      crumbs.push({
        label,
        path: index === pathParts.length - 1 ? undefined : currentPath
      });
    });

    return crumbs;
  };

  const breadcrumbItems = items || buildBreadcrumbs();

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav 
      className={`flex items-center space-x-2 text-sm text-text-light mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      <Link
        to="/dashboard"
        className="flex items-center hover:text-text-dark transition-colors"
        aria-label="Ir al dashboard"
      >
        <IconDashboard className="w-4 h-4" />
      </Link>
      
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;
        const isFirst = index === 0;

        return (
          <React.Fragment key={index}>
            <IconChevronRight className="w-4 h-4 text-text-light" />
            {isLast || !item.path ? (
              <span 
                className={`text-text-dark font-medium ${isLast ? 'text-primary' : ''}`}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-text-dark transition-colors"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;

