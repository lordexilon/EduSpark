/**
 * MenuConfig.ts - Configuración CENTRALIZADA del menú sidebar para TODOS los roles.
 *
 * Fuente única de verdad para la navegación.
 * Cada item puede tener:
 *   - allowedRoles: Array de roles que ven el item (vacío = todos)
 *   - featureKey: Clave del feature flag en menu_features
 *   - sectionLabel: Etiqueta visual para separar secciones
 *
 * Roles del sistema:
 *   - student
 *   - teacher
 *   - admin (super admin global)
 *   - admin-campus (admin de una institución)
 *   - coordinator
 *   - supervisor
 */

import {
  IconDashboard,
  IconBookOpen,
  IconClipboardList,
  IconClipboardCheck,
  IconCog,
  IconChartBar,
  IconUserGroup,
  IconRobot,
  IconBell,
  IconCards,
  IconMessage,
  IconDevices,
  IconInfoCircle,
  IconStar,
  IconFileText,
  IconUpload,
  IconXCircle,
  IconDollarSign,
  IconTrendingUp,
  IconShield,
  IconUserCircle,
  IconGraduationCap,
  IconRefreshCw,
  IconBuilding,
  IconGlobe,
  IconBrain,
} from '../Icons.tsx';

export type MenuItem = {
  name: string;
  path?: string;
  icon: any;
  children?: MenuItem[];
  /** Roles que pueden ver el item (vacío = visible para todos) */
  allowedRoles?: string[];
  /** Clave para feature flag dinámico */
  featureKey?: string;
  /** Etiqueta de sección visual (separador con título) */
  sectionLabel?: string;
};

// =============================================
// ITEMS DEL SIDEBAR DE ESTUDIANTE
// =============================================
export const STUDENT_MENU_ITEMS: MenuItem[] = [
  {
    name: 'Panel',
    path: '/dashboard',
    icon: IconDashboard,
  },
  {
    name: 'Aprendizaje',
    icon: IconBookOpen,
    children: [
      {
        name: 'Mis Clases',
        path: '/sessions',
        icon: IconClipboardList,
        featureKey: 'student_sessions',
      },
      { name: 'Tutor IA', path: '/tutor', icon: IconRobot, featureKey: 'ai_tutor' },
      { name: 'Flashcards', path: '/flashcards', icon: IconCards, featureKey: 'flashcards' },
      { name: 'Malla Curricular', path: '/academic', icon: IconGraduationCap },
    ],
  },
  {
    name: 'Evaluaciones',
    icon: IconClipboardCheck,
    children: [
      {
        name: 'Mis Tareas',
        path: '/assignments',
        icon: IconClipboardList,
        featureKey: 'assignments',
      },
      { name: 'Calificaciones', path: '/grades', icon: IconStar, featureKey: 'grades' },
    ],
  },
  {
    name: 'Comunicación',
    icon: IconMessage,
    children: [
      { name: 'Avisos', path: '/announcements', icon: IconBell, featureKey: 'announcements' },
      { name: 'Foros', path: '/forums', icon: IconUserGroup, featureKey: 'forums' },
      { name: 'Mensajería', path: '/messages', icon: IconMessage, featureKey: 'messaging' },
    ],
  },
  {
    name: 'Herramientas',
    icon: IconInfoCircle,
    children: [
      { name: 'Tutoriales', path: '/tutorials', icon: IconInfoCircle },
      { name: 'Mis Dispositivos', path: '/devices', icon: IconDevices },
    ],
  },
];

// =============================================
// ITEMS DEL SIDEBAR TEACHER/ADMIN
// Separados en baseItems + adminItems
// =============================================

// --- Items base para SUPERVISOR (menú reducido) ---
const SUPERVISOR_BASE_ITEMS: MenuItem[] = [
  { name: 'Panel', path: '/teacher/dashboard', icon: IconDashboard },
  {
    name: 'Materiales',
    icon: IconFileText,
    children: [{ name: 'Administrar Materiales', path: '/teacher/materials', icon: IconFileText }],
  },
  {
    name: 'Tutor IA',
    icon: IconRobot,
    featureKey: 'ai_tutor',
    children: [
      { name: 'Tutor IA', path: '/teacher/tutor', icon: IconBrain, featureKey: 'ai_tutor' },
    ],
  },
];

// --- Items base para TEACHER, ADMIN, ADMIN-CAMPUS, COORDINATOR ---
const TEACHER_BASE_ITEMS: MenuItem[] = [
  { name: 'Panel', path: '/teacher/dashboard', icon: IconDashboard },
  {
    name: 'Cursos y Materiales',
    icon: IconBookOpen,
    children: [
      { name: 'Mis Cursos', path: '/teacher/courses', icon: IconBookOpen },
      { name: 'Administrar Materiales', path: '/teacher/materials', icon: IconFileText },
    ],
  },
  {
    name: 'Evaluaciones',
    icon: IconClipboardCheck,
    children: [
      { name: 'Quizzes', path: '/teacher/quizzes', icon: IconClipboardCheck },
      {
        name: 'Flashcards',
        path: '/teacher/flashcards',
        icon: IconCards,
        featureKey: 'flashcards',
      },
      {
        name: 'Tareas',
        path: '/teacher/assignments',
        icon: IconClipboardList,
        featureKey: 'assignments',
      },
      { name: 'Calificaciones', path: '/teacher/grades', icon: IconStar, featureKey: 'grades' },
    ],
  },
  {
    name: 'Tutor IA',
    icon: IconRobot,
    featureKey: 'ai_tutor',
    children: [
      { name: 'Tutor IA', path: '/teacher/tutor', icon: IconBrain, featureKey: 'ai_tutor' },
      {
        name: 'Análisis Tutor IA',
        path: '/teacher/tutor-analytics',
        icon: IconChartBar,
        featureKey: 'ai_tutor',
      },
    ],
  },
  {
    name: 'Comunicación',
    icon: IconMessage,
    children: [
      {
        name: 'Avisos',
        path: '/teacher/announcements',
        icon: IconBell,
        featureKey: 'announcements',
      },
      { name: 'Foros', path: '/teacher/forums', icon: IconUserGroup, featureKey: 'forums' },
      { name: 'Mensajería', path: '/teacher/messages', icon: IconMessage, featureKey: 'messaging' },
    ],
  },
  { name: 'Mis Dispositivos', path: '/devices', icon: IconDevices },
];

// --- Sección ADMINISTRACIÓN para SUPERVISOR ---
const SUPERVISOR_ADMIN_ITEMS: MenuItem[] = [
  {
    name: 'Usuarios',
    icon: IconUserGroup,
    children: [
      { name: 'Estudiantes', path: '/teacher/students', icon: IconUserCircle },
      { name: 'Importación Masiva', path: '/admin/bulk-import', icon: IconUpload },
      { name: 'Suspender/Reactivar', path: '/admin/bulk-suspend-reactivate', icon: IconXCircle },
      { name: 'Gestión de Pagos', path: '/admin/payment-management', icon: IconDollarSign },
    ],
  },
  {
    name: 'Institución',
    icon: IconBuilding,
    children: [{ name: 'Datos de Institución', path: '/admin/institutions', icon: IconBuilding }],
  },
  { name: 'Documentos', path: '/admin/documents', icon: IconFileText },
  {
    name: 'Configuración',
    icon: IconCog,
    children: [{ name: 'Configuración General', path: '/admin/settings', icon: IconCog }],
  },
];

// --- Sección ADMINISTRACIÓN para ADMIN-CAMPUS y COORDINATOR ---
const CAMPUS_ADMIN_ITEMS: MenuItem[] = [
  {
    name: 'Usuarios y Acceso',
    icon: IconUserGroup,
    children: [
      { name: 'Crear Curso', path: '/teacher/courses/new', icon: IconGraduationCap },
      { name: 'Estudiantes', path: '/teacher/students', icon: IconUserCircle },
      { name: 'Gestión de Usuarios', path: '/admin/users', icon: IconUserGroup },
      { name: 'Importación Masiva', path: '/admin/bulk-import', icon: IconUpload },
      { name: 'Suspender/Reactivar', path: '/admin/bulk-suspend-reactivate', icon: IconXCircle },
      { name: 'Gestión de Pagos', path: '/admin/payment-management', icon: IconDollarSign },
    ],
  },
  {
    name: 'Institución y Académico',
    icon: IconBuilding,
    children: [
      { name: 'Mi Institución', path: '/admin/institutions', icon: IconBuilding },
      { name: 'Carreras', path: '/admin/careers', icon: IconGraduationCap },
      { name: 'Materias', path: '/admin/subjects', icon: IconBookOpen },
      { name: 'Resetear Progreso', path: '/teacher/reset-progress', icon: IconRefreshCw },
    ],
  },
  {
    name: 'Reportes',
    icon: IconChartBar,
    children: [
      {
        name: 'Reporte Dispositivos',
        path: '/admin/devices-report',
        icon: IconDevices,
        featureKey: 'admin_reports',
      },
    ],
  },
  {
    name: 'Configuración',
    icon: IconCog,
    children: [
      { name: 'Configuración General', path: '/admin/settings', icon: IconCog },
      { name: 'Landing Page', path: '/admin/settings/landing-page', icon: IconGlobe },
    ],
  },
];

// --- Sección ADMINISTRACIÓN para ADMIN GLOBAL ---
const GLOBAL_ADMIN_ITEMS: MenuItem[] = [
  {
    name: 'Usuarios y Acceso',
    icon: IconUserGroup,
    children: [
      { name: 'Crear Curso', path: '/teacher/courses/new', icon: IconGraduationCap },
      { name: 'Estudiantes', path: '/teacher/students', icon: IconUserCircle },
      { name: 'Gestión de Usuarios', path: '/admin/users', icon: IconUserGroup },
      { name: 'Importación Masiva', path: '/admin/bulk-import', icon: IconUpload },
      { name: 'Suspender/Reactivar', path: '/admin/bulk-suspend-reactivate', icon: IconXCircle },
      { name: 'Gestión de Pagos', path: '/admin/payment-management', icon: IconDollarSign },
    ],
  },
  {
    name: 'Institución y Académico',
    icon: IconBuilding,
    children: [
      { name: 'Instituciones', path: '/admin/institutions', icon: IconBuilding },
      { name: 'Carreras', path: '/admin/careers', icon: IconGraduationCap },
      { name: 'Materias', path: '/admin/subjects', icon: IconBookOpen },
      { name: 'Módulos (Admin)', path: '/admin/modules', icon: IconBookOpen },
      { name: 'Resetear Progreso', path: '/teacher/reset-progress', icon: IconRefreshCw },
    ],
  },
  {
    name: 'Reportes y Costos',
    icon: IconChartBar,
    children: [
      { name: 'Reportes Globales', path: '/admin/comprehensive-reports', icon: IconChartBar },
      {
        name: 'Reporte Dispositivos',
        path: '/admin/devices-report',
        icon: IconDevices,
        featureKey: 'admin_reports',
      },
      { name: 'Consumo de IA', path: '/admin/ai-usage', icon: IconTrendingUp },
      { name: 'Costos de Procesamiento', path: '/admin/processing-costs', icon: IconDollarSign },
      { name: 'Documentos', path: '/admin/documents', icon: IconFileText },
    ],
  },
  {
    name: 'Control IA',
    icon: IconShield,
    children: [
      { name: 'Control Costos IA', path: '/admin/ai-control', icon: IconShield },
      { name: 'Modelos & Límites', path: '/admin/models', icon: IconShield },
    ],
  },
  {
    name: 'Configuración',
    icon: IconCog,
    children: [
      { name: 'Configuración General', path: '/admin/settings', icon: IconCog },
      { name: 'Landing Page', path: '/admin/settings/landing-page', icon: IconGlobe },
      {
        name: 'Gestión Menú',
        path: '/admin/menu-features',
        icon: IconCog,
        featureKey: 'menu_management',
      },
      {
        name: 'Gestión Roles',
        path: '/admin/roles',
        icon: IconUserGroup,
        featureKey: 'menu_management',
      },
    ],
  },
];

// =============================================
// FUNCIONES DE ACCESO
// =============================================

/**
 * Devuelve los items BASE del sidebar según el rol.
 * Estos son los items principales de trabajo (Cursos, Evaluaciones, etc.)
 */
export function getBaseItems(role: string): MenuItem[] {
  if (role === 'supervisor') return SUPERVISOR_BASE_ITEMS;
  return TEACHER_BASE_ITEMS;
}

/**
 * Devuelve los items de ADMINISTRACIÓN según el rol.
 * Estos aparecen debajo de un separador visual.
 */
export function getAdminItems(role: string): MenuItem[] {
  switch (role) {
    case 'supervisor':
      return SUPERVISOR_ADMIN_ITEMS;
    case 'admin':
      return GLOBAL_ADMIN_ITEMS;
    case 'admin-campus':
    case 'coordinator':
      return CAMPUS_ADMIN_ITEMS;
    default:
      return []; // teacher no tiene items de admin
  }
}

/**
 * Items del menú de ESTUDIANTE (sidebar separado).
 */
export { STUDENT_MENU_ITEMS as MENU_ITEMS };
