// components/Features/UserDetailPanel.tsx
// S4-T02 — Panel lateral unificado de gestión de usuario
// Permite al admin cambiar rol + asignar institución + matricular en cursos en una sola vista.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usersAPI, rolesAPI } from '@/services/api';
import { courseService, Course } from '@/services/teacherCourses';
import { institutionService } from '@/services/institutionService';
import { courseEnrollmentService } from '@/services/academicService';
import { auditService } from '@/services/auditService';
import { formatDateTime } from '@/utils/dateFormat';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface UserDetailPanelProps {
  userId: string;
  onClose: () => void;
  onChanged: () => void;   // callback para recargar la lista principal
  currentAdminInstitutionId?: number | null;  // institución del admin (supervisor/admin-campus)
}

interface Enrollment {
  id: string;
  course_id: number;
  course_title: string;
  status: string;
  enrolled_at: string;
  completion_percentage: number;
}

interface Role { id: number; name: string; }
interface Institution { id: number; name: string; }

const ROLE_LABELS: Record<string, string> = {
  student: 'Estudiante',
  teacher: 'Docente',
  admin: 'Administrador',
  'admin-campus': 'Admin Campus',
  coordinator: 'Coordinador',
  supervisor: 'Supervisor',
};

const StatusDot: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`inline-block size-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
);

// ─── Componente ───────────────────────────────────────────────────────────────

export const UserDetailPanel: React.FC<UserDetailPanelProps> = ({
  userId,
  onClose,
  onChanged,
  currentAdminInstitutionId,
}) => {
  const [userData, setUserData] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Sección activa del panel
  const [activeSection, setActiveSection] = useState<'info' | 'role' | 'institution' | 'enrollment'>('info');

  // Estado de formularios
  const [newRoleId, setNewRoleId] = useState<number | ''>('');
  const [newInstitutionId, setNewInstitutionId] = useState<number | ''>('');
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [selectedInstForCourse, setSelectedInstForCourse] = useState<number | ''>(currentAdminInstitutionId || '');

  // Estado de acciones
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // ─── Carga ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [{ data: user }, rolesResult, enrollmentsData, coursesData] = await Promise.all([
        supabase.from('users').select('*, role:roles(id, name), user_institutions(institution_id)').eq('id', userId).single(),
        rolesAPI.getRoles(),
        courseEnrollmentService.getStudentEnrollments(userId).catch(() => []),
        courseService.getAllCourses().catch(() => []),
      ]);

      setUserData(user);
      setRoles(rolesResult.data || []);
      setNewRoleId(user?.role?.id ?? '');

      // Matrículas con nombre de curso
      const courseIds = enrollmentsData.map((e: any) => e.course_id);
      const enrolled: Enrollment[] = enrollmentsData.map((e: any) => ({
        id: e.id,
        course_id: e.course_id,
        course_title: (coursesData as Course[]).find(c => c.id === e.course_id)?.title ?? `Curso #${e.course_id}`,
        status: e.status,
        enrolled_at: e.enrollment_date || e.created_at,
        completion_percentage: e.completion_percentage ?? 0,
      }));
      setEnrollments(enrolled);
      setAvailableCourses(coursesData as Course[]);

      // Instituciones
      const instData = currentAdminInstitutionId
        ? [{ id: currentAdminInstitutionId, name: 'Tu institución' }]
        : await institutionService.getAllInstitutions().catch(() => []);
      setInstitutions(instData.map((i: any) => ({ id: i.id, name: i.name })));

    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Error cargando datos del usuario' });
    } finally {
      setLoading(false);
    }
  }, [userId, currentAdminInstitutionId]);

  useEffect(() => { load(); }, [load]);

  // ─── Acciones ─────────────────────────────────────────────────────────────

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    if (type === 'success') setTimeout(() => setFeedback(null), 4000);
  };

  // Cambiar rol
  const handleSaveRole = async () => {
    if (!newRoleId) return;
    setSaving(true);
    try {
      const result = await usersAPI.updateUserRole(userId, Number(newRoleId));
      if (result.success) {
        // Registrar en auditoría
        auditService.logAction('UPDATE_USER_ROLE', 'user', userId, {
          old_role: userData?.role?.name,
          new_role: roles.find(r => r.id === Number(newRoleId))?.name
        });
        
        showFeedback('success', 'Rol actualizado correctamente');
        await load();
        onChanged();
      } else {
        showFeedback('error', result.error || 'Error al cambiar rol');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Asignar institución
  const handleSaveInstitution = async () => {
    const instId = currentAdminInstitutionId || Number(newInstitutionId);
    if (!instId) { showFeedback('error', 'Selecciona una institución'); return; }
    setSaving(true);
    try {
      await institutionService.assignUserToInstitution(userId, instId, true);
      
      // Registrar en auditoría
      auditService.logAction('ASSIGN_INSTITUTION', 'user', userId, {
        institution_id: instId
      });

      showFeedback('success', 'Institución asignada correctamente');
      await load();
      onChanged();
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Matricular en curso
  const handleEnroll = async () => {
    if (!selectedCourseId) { showFeedback('error', 'Selecciona un curso'); return; }
    setSaving(true);
    try {
      const existing = enrollments.find(e => e.course_id === Number(selectedCourseId));
      if (existing) {
        if (existing.status === 'active') { showFeedback('error', 'El usuario ya está activo en ese curso'); setSaving(false); return; }
        await courseEnrollmentService.updateEnrollment(existing.id, { status: 'active', enrollment_date: new Date().toISOString() } as any);
      } else {
        await courseEnrollmentService.enrollStudent({
          student_id: userId,
          course_id: Number(selectedCourseId),
          enrollment_date: new Date().toISOString(),
          status: 'active',
          attendance_percentage: 0,
          participation_score: 0,
          completion_percentage: 0,
          time_spent_minutes: 0,
        } as any);
      }
      
      // Registrar en auditoría
      auditService.logAction('ENROLL_STUDENT', 'user', userId, {
        course_id: Number(selectedCourseId)
      });

      showFeedback('success', 'Matrícula registrada correctamente');
      setSelectedCourseId('');
      await load();
      onChanged();
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Desmatricular
  const handleUnenroll = async (enrollmentId: string, courseTitle: string) => {
    if (!confirm(`¿Desmatricular de "${courseTitle}"?`)) return;
    setSaving(true);
    try {
      await courseEnrollmentService.updateEnrollment(enrollmentId, { status: 'inactive' } as any);
      
      // Registrar en auditoría
      auditService.logAction('UNENROLL_STUDENT', 'user', userId, {
        enrollment_id: enrollmentId
      });

      showFeedback('success', 'Matrícula removida');
      await load();
      onChanged();
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Cursos disponibles para matricular (filtrados por institución si aplica)
  const coursesForEnrollment = availableCourses.filter(c =>
    !selectedInstForCourse || c.institution_id === Number(selectedInstForCourse)
  );

  // Iniciales del avatar
  const initials = userData
    ? `${userData.first_name?.[0] ?? ''}${userData.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  const currentRoleName = userData?.role?.name ?? '';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-background border-l border-border shadow-2xl flex flex-col h-full animate-slide-in-right overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface">
          <h2 className="text-base font-black text-text-dark flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-primary text-[20px]">manage_accounts</span>
            Gestión de usuario
          </h2>
          <button onClick={onClose} className="size-8 flex items-center justify-center rounded-lg text-text-light hover:bg-muted transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div className={`mx-4 mt-4 flex items-start gap-2 p-3 rounded-xl text-sm font-semibold ${
            feedback.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}>
            <span className="material-symbols-outlined text-[16px] shrink-0">{feedback.type === 'success' ? 'check_circle' : 'error'}</span>
            {feedback.msg}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="size-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
          </div>
        ) : !userData ? (
          <div className="flex-1 flex items-center justify-center text-sm text-text-light">Usuario no encontrado</div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Perfil del usuario */}
            <div className="px-5 py-5 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-full bg-gradient-to-br from-brand-primary/60 to-brand-primary flex items-center justify-center text-white text-xl font-black shadow-md">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-text-dark text-base truncate">{userData.first_name} {userData.last_name}</p>
                  <p className="text-xs text-text-light truncate">{userData.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusDot active={userData.is_active} />
                    <span className="text-xs text-text-light">{userData.is_active ? 'Activo' : 'Inactivo'}</span>
                    <span className="text-xs font-bold bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">
                      {ROLE_LABELS[currentRoleName] || currentRoleName || '—'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-text-light mt-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                Creado: {formatDateTime(userData.created_at)}
              </p>
            </div>

            {/* Tabs de sección */}
            <div className="flex border-b border-border">
              {[
                { key: 'info',        icon: 'info',            label: 'Info' },
                { key: 'role',        icon: 'admin_panel_settings', label: 'Rol' },
                { key: 'institution', icon: 'apartment',       label: 'Institución' },
                { key: 'enrollment',  icon: 'school',          label: 'Cursos' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveSection(tab.key as any); setFeedback(null); }}
                  className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors border-b-2 ${
                    activeSection === tab.key
                      ? 'border-brand-primary text-brand-primary'
                      : 'border-transparent text-text-light hover:text-text-dark'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Sección: Info ───────────────────────────────────────────── */}
            {activeSection === 'info' && (
              <div className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-text-dark">Información general</h3>
                {[
                  { label: 'Email',     value: userData.email },
                  { label: 'Nombre',    value: `${userData.first_name} ${userData.last_name}` },
                  { label: 'Rol',       value: ROLE_LABELS[currentRoleName] || currentRoleName },
                  { label: 'Estado',    value: userData.is_active ? 'Activo' : 'Inactivo' },
                  { label: 'Creado',    value: formatDateTime(userData.created_at) },
                  { label: 'Cursos activos', value: String(enrollments.filter(e => e.status === 'active').length) },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-start">
                    <span className="text-xs text-text-light">{item.label}</span>
                    <span className="text-xs font-semibold text-text-dark text-right max-w-[60%]">{item.value || '—'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Sección: Rol ─────────────────────────────────────────────── */}
            {activeSection === 'role' && (
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-text-dark mb-1">Rol actual</p>
                  <span className="text-sm font-bold bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-full">
                    {ROLE_LABELS[currentRoleName] || currentRoleName || '—'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-dark mb-1.5">Nuevo rol</label>
                  <select
                    value={newRoleId}
                    onChange={e => setNewRoleId(Number(e.target.value))}
                    className="w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                  >
                    <option value="">Seleccionar rol…</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{ROLE_LABELS[r.name] || r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Cambiar el rol modifica los permisos del usuario inmediatamente. Esta acción queda registrada en auditoría.
                </div>

                <button
                  onClick={handleSaveRole}
                  disabled={saving || !newRoleId || Number(newRoleId) === userData?.role?.id}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-primary/90 disabled:opacity-50 transition-all shadow-md shadow-brand-primary/30"
                >
                  {saving
                    ? <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
                    : <><span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>Cambiar rol</>
                  }
                </button>
              </div>
            )}

            {/* ── Sección: Institución ────────────────────────────────────── */}
            {activeSection === 'institution' && (
              <div className="p-5 space-y-4">
                <p className="text-sm font-bold text-text-dark">Asignar a institución</p>

                {currentAdminInstitutionId ? (
                  <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-xl text-sm text-text-dark">
                    Se asignará a <strong>tu institución</strong> actualmente configurada.
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-text-dark mb-1.5">Institución</label>
                    <select
                      value={newInstitutionId}
                      onChange={e => setNewInstitutionId(Number(e.target.value))}
                      className="w-full rounded-xl border border-border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                    >
                      <option value="">Seleccionar institución…</option>
                      {institutions.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleSaveInstitution}
                  disabled={saving || (!currentAdminInstitutionId && !newInstitutionId)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-primary/90 disabled:opacity-50 transition-all shadow-md shadow-brand-primary/30"
                >
                  {saving
                    ? <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
                    : <><span className="material-symbols-outlined text-[18px]">apartment</span>Asignar institución</>
                  }
                </button>
              </div>
            )}

            {/* ── Sección: Cursos / Matrícula ─────────────────────────────── */}
            {activeSection === 'enrollment' && (
              <div className="p-5 space-y-5">
                {/* Matrículas actuales */}
                <div>
                  <p className="text-sm font-bold text-text-dark mb-2">Matrículas actuales</p>
                  {enrollments.length === 0 ? (
                    <p className="text-xs text-text-light text-center py-4 border-2 border-dashed border-border rounded-xl">Sin matrículas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {enrollments.map(e => (
                        <div key={e.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-background/50">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-text-dark truncate">{e.course_title}</p>
                            <p className="text-[10px] text-text-light flex items-center gap-1 mt-0.5">
                              <span className={`size-1.5 rounded-full inline-block ${e.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                              {e.status === 'active' ? 'Activo' : 'Inactivo'} · {e.completion_percentage}%
                            </p>
                          </div>
                          {e.status === 'active' && (
                            <button
                              onClick={() => handleUnenroll(e.id, e.course_title)}
                              disabled={saving}
                              className="shrink-0 size-7 flex items-center justify-center rounded-lg text-text-light hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Remover matrícula"
                            >
                              <span className="material-symbols-outlined text-[16px]">person_remove</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nueva matrícula */}
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-sm font-bold text-text-dark">Agregar matrícula</p>

                  {/* Filtro por institución para cursos */}
                  {!currentAdminInstitutionId && institutions.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-text-dark block mb-1">Filtrar cursos por institución</label>
                      <select
                        value={selectedInstForCourse}
                        onChange={e => { setSelectedInstForCourse(Number(e.target.value) || ''); setSelectedCourseId(''); }}
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                      >
                        <option value="">Todas las instituciones</option>
                        {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-text-dark block mb-1">Curso</label>
                    <select
                      value={selectedCourseId}
                      onChange={e => setSelectedCourseId(Number(e.target.value) || '')}
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                    >
                      <option value="">Seleccionar curso…</option>
                      {coursesForEnrollment.map(c => (
                        <option key={c.id} value={c.id}
                          disabled={enrollments.some(e => e.course_id === c.id && e.status === 'active')}
                        >
                          {c.title}{enrollments.some(e => e.course_id === c.id && e.status === 'active') ? ' (ya matriculado)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleEnroll}
                    disabled={saving || !selectedCourseId}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-primary/90 disabled:opacity-50 transition-all shadow-md shadow-brand-primary/30"
                  >
                    {saving
                      ? <><div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando…</>
                      : <><span className="material-symbols-outlined text-[18px]">school</span>Matricular</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetailPanel;
