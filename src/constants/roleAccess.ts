export const ADMIN_ALLOWED_ROLES = ['admin', 'admin-campus', 'coordinator', 'supervisor'] as const;
export const TEACHER_APP_ALLOWED_ROLES = ['teacher', ...ADMIN_ALLOWED_ROLES] as const;

export type AppRoleName = (typeof TEACHER_APP_ALLOWED_ROLES)[number] | 'student';

export const isAdminRole = (roleName?: string | null): boolean =>
  !!roleName && ADMIN_ALLOWED_ROLES.includes(roleName as (typeof ADMIN_ALLOWED_ROLES)[number]);

export const isTeacherAppRole = (roleName?: string | null): boolean =>
  !!roleName &&
  TEACHER_APP_ALLOWED_ROLES.includes(roleName as (typeof TEACHER_APP_ALLOWED_ROLES)[number]);

export const isStudentRole = (roleName?: string | null): boolean => roleName === 'student';
