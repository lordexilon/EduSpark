import { IconDashboard, IconBookOpen, IconClipboardList, IconCog, IconChartBar, IconUserGroup, IconRobot, IconBell, IconCards, IconMessage, IconDevices } from '../Icons.tsx';

export type MenuItem = {
    name: string;
    path?: string;
    icon: any;
    children?: MenuItem[];
    // roles que pueden ver el item (si está vacío → visible para todos)
    allowedRoles?: string[];
    // clave que corresponde a un flag en `menu_features`
    featureKey?: string;
};

export const MENU_ITEMS: MenuItem[] = [
    {
        name: 'Panel',
        path: '/dashboard',
        icon: IconDashboard
    },
    {
        name: 'Aprendizaje',
        icon: IconBookOpen,
        children: [
            { name: 'Mis Clases', path: '/sessions', icon: IconBookOpen, featureKey: 'student_sessions' },
            { name: 'Tutor IA', path: '/tutor', icon: IconRobot, featureKey: 'ai_tutor' },
            { name: 'Flashcards', path: '/flashcards', icon: IconCards, featureKey: 'flashcards' },
        ]
    },
    {
        name: 'Materiales',
        icon: IconBookOpen,
        allowedRoles: ['admin', 'admin-campus', 'coordinator', 'supervisor', 'teacher'],
        children: [
            { name: 'Administrar Materiales', path: '/teacher/materials', icon: IconBookOpen, allowedRoles: ['admin', 'admin-campus', 'coordinator', 'supervisor', 'teacher'] },
            { name: 'Procesar Materiales', path: '/teacher/file-processing', icon: IconClipboardList, allowedRoles: ['admin', 'admin-campus', 'coordinator', 'supervisor', 'teacher'] },
        ]
    },
    {
        name: 'Evaluaciones',
        icon: IconClipboardList,
        allowedRoles: ['student', 'teacher', 'admin', 'admin-campus', 'coordinator'], // supervisor NO ve evaluaciones
        children: [
            { name: 'Mis Tareas', path: '/assignments', icon: IconClipboardList, featureKey: 'assignments' },
            { name: 'Calificaciones', path: '/grades', icon: IconChartBar, featureKey: 'grades', allowedRoles: ['student', 'teacher', 'admin', 'admin-campus', 'coordinator'] }, // supervisor NO ve calificaciones
        ]
    },
    {
        name: 'Comunicación',
        icon: IconMessage,
        children: [
            { name: 'Avisos', path: '/announcements', icon: IconBell, featureKey: 'announcements' },
            { name: 'Foros', path: '/forums', icon: IconUserGroup, featureKey: 'forums' },
            { name: 'Mensajería', path: '/messages', icon: IconMessage, featureKey: 'messaging' },
        ]
    },
    {
        name: 'Administración',
        icon: IconUserGroup,
        allowedRoles: ['admin', 'admin-campus', 'coordinator', 'supervisor'],
        children: [
            // Admin-campus puede ver todo lo que admin, pero limitado a su institución
            { name: 'Crear Cursos', path: '/admin/courses/create', icon: IconBookOpen, allowedRoles: ['admin', 'admin-campus', 'coordinator'] },
            { name: 'Resetear Progreso', path: '/admin/reset-progress', icon: IconClipboardList, allowedRoles: ['admin', 'admin-campus', 'coordinator'] },
            { name: 'Gestión de Usuarios', path: '/admin/users', icon: IconUserGroup, allowedRoles: ['admin', 'admin-campus', 'coordinator'] },
            { name: 'Gestión de Carreras', path: '/admin/careers', icon: IconBookOpen, allowedRoles: ['admin', 'admin-campus', 'coordinator'] },
            { name: 'Gestión de Materias', path: '/admin/subjects', icon: IconBookOpen, allowedRoles: ['admin', 'admin-campus', 'coordinator'] },
            { name: 'Gestión de Instituciones', path: '/admin/institutions', icon: IconUserGroup, allowedRoles: ['admin', 'admin-campus'] },
            // Supervisor SÍ ve:
            { name: 'Importación Masiva', path: '/admin/bulk-import', icon: IconUserGroup, allowedRoles: ['admin', 'admin-campus', 'coordinator', 'supervisor'] },
            { name: 'Suspender/Reactivar', path: '/admin/user-status', icon: IconUserGroup, allowedRoles: ['admin', 'admin-campus', 'coordinator', 'supervisor'] },
            { name: 'Gestión de Pagos', path: '/admin/payments', icon: IconChartBar, allowedRoles: ['admin', 'admin-campus', 'coordinator', 'supervisor'] },
            { name: 'Reporte Dispositivos', path: '/admin/devices-report', icon: IconDevices, allowedRoles: ['admin', 'admin-campus', 'coordinator', 'supervisor'] },
        ]
    },
    {
        name: 'Configuración',
        icon: IconCog,
        allowedRoles: ['admin', 'admin-campus', 'supervisor'],
        children: [
            { name: 'General', path: '/settings/general', icon: IconCog, allowedRoles: ['admin', 'admin-campus', 'supervisor'] },
            { name: 'Apariencia', path: '/settings/appearance', icon: IconCog, allowedRoles: ['admin', 'admin-campus', 'supervisor'] },
            { name: 'Sistema', path: '/settings/system', icon: IconCog, allowedRoles: ['admin', 'admin-campus', 'supervisor'] },
        ]
    },
    {
        name: 'Mis Dispositivos',
        path: '/devices',
        icon: IconDevices
    },
    // Enlace para gestión de features (solo admin)
    {
        name: 'Gestión Menú',
        path: '/admin/menu-features',
        icon: IconCog,
        allowedRoles: ['admin'],
        featureKey: 'menu_management'
    },
    {
        name: 'Gestión Roles',
        path: '/admin/roles',
        icon: IconUserGroup,
        allowedRoles: ['admin'],
        featureKey: 'menu_management'
    }
];
