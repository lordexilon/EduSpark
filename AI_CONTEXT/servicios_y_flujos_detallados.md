# Servicios y Flujos Detallados - EduSpark
## Especificación Técnica de Implementación

**Fecha:** Octubre 2025  
**Versión:** 1.0

---

## 📋 Índice

1. [Servicios del Coordinador](#servicios-del-coordinador)
2. [Servicios del Docente](#servicios-del-docente)
3. [Servicios del Estudiante](#servicios-del-estudiante)
4. [Servicios de IA Analítica](#servicios-de-ia-analítica)
5. [Servicios de Gamificación](#servicios-de-gamificación)
6. [Casos de Uso Detallados](#casos-de-uso-detallados)
7. [APIs y Endpoints](#apis-y-endpoints)

---

## 🎓 Servicios del Coordinador

### Servicio: `careerService.ts`

```typescript
// services/academic/careerService.ts

import { supabase } from '../lib/supabase';

export interface Career {
  id: number;
  name: string;
  code: string;
  description?: string;
  coordinator_id?: string;
  duration_months?: number;
  total_credits?: number;
  degree_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CareerInput {
  name: string;
  code: string;
  description?: string;
  duration_months?: number;
  total_credits?: number;
  degree_type?: string;
}

export const careerService = {
  // Obtener todas las carreras (coordinador)
  async getAll(): Promise<Career[]> {
    const { data, error } = await supabase
      .from('careers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Obtener carrera por ID
  async getById(id: number): Promise<Career | null> {
    const { data, error } = await supabase
      .from('careers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Crear nueva carrera
  async create(input: CareerInput): Promise<Career> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('careers')
      .insert({
        ...input,
        coordinator_id: user.id,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Actualizar carrera
  async update(id: number, input: Partial<CareerInput>): Promise<Career> {
    const { data, error } = await supabase
      .from('careers')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Obtener materias de una carrera
  async getSubjects(careerId: number) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('career_id', careerId)
      .order('semester, name');
    
    if (error) throw error;
    return data || [];
  },

  // Obtener estudiantes matriculados
  async getEnrolledStudents(careerId: number) {
    const { data, error } = await supabase
      .from('career_enrollments')
      .select(`
        *,
        student:users!career_enrollments_student_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('career_id', careerId)
      .order('enrollment_date');
    
    if (error) throw error;
    return data || [];
  }
};
```

### Servicio: `subjectService.ts`

```typescript
// services/academic/subjectService.ts

export interface Subject {
  id: number;
  career_id: number;
  name: string;
  code: string;
  description?: string;
  credits: number;
  hours_per_week?: number;
  total_hours?: number;
  semester: number;
  prerequisite_subject_id?: number;
  is_core: boolean;
  difficulty_level: string;
}

export interface SubjectInput {
  career_id: number;
  name: string;
  code: string;
  description?: string;
  credits?: number;
  hours_per_week?: number;
  total_hours?: number;
  semester: number;
  prerequisite_subject_id?: number;
  is_core?: boolean;
  difficulty_level?: string;
}

export const subjectService = {
  // Crear materia
  async create(input: SubjectInput): Promise<Subject> {
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        ...input,
        is_core: input.is_core ?? true,
        difficulty_level: input.difficulty_level ?? 'medium'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Validar prerrequisitos para estudiante
  async validatePrerequisites(
    studentId: string,
    subjectId: number
  ): Promise<{ canEnroll: boolean; missingPrerequisites: Subject[] }> {
    // Obtener materia
    const { data: subject } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();

    if (!subject || !subject.prerequisite_subject_id) {
      return { canEnroll: true, missingPrerequisites: [] };
    }

    // Verificar si estudiante aprobó prerrequisito
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('course_id, final_grade')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .gt('final_grade', 60) // Aprobado
      .limit(1);

    // Verificar si el curso completado corresponde al prerrequisito
    const { data: prerequisiteCourse } = await supabase
      .from('courses')
      .select('subject_id')
      .eq('id', enrollment?.[0]?.course_id)
      .single();

    const canEnroll = prerequisiteCourse?.subject_id === subject.prerequisite_subject_id;

    if (!canEnroll) {
      const { data: missing } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subject.prerequisite_subject_id)
        .single();
      
      return {
        canEnroll: false,
        missingPrerequisites: missing ? [missing] : []
      };
    }

    return { canEnroll: true, missingPrerequisites: [] };
  },

  // Asignar docente a materia
  async assignTeacher(
    subjectId: number,
    teacherId: string,
    academicPeriod: string,
    startDate: string,
    endDate: string
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('subject_assignments')
      .insert({
        subject_id: subjectId,
        teacher_id: teacherId,
        academic_period: academicPeriod,
        start_date: startDate,
        end_date: endDate,
        assigned_by: user.id,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) throw error;

    // Crear curso automáticamente para el período
    await this.createCourseFromAssignment(data.id);

    return data;
  },

  // Crear curso desde asignación
  async createCourseFromAssignment(assignmentId: number) {
    const { data: assignment } = await supabase
      .from('subject_assignments')
      .select(`
        *,
        subject:subjects!subject_assignments_subject_id_fkey (*)
      `)
      .eq('id', assignmentId)
      .single();

    if (!assignment) throw new Error('Asignación no encontrada');

    // Crear curso
    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        title: assignment.subject.name,
        code: `${assignment.subject.code}-${assignment.academic_period}`,
        description: assignment.subject.description,
        teacher_id: assignment.teacher_id,
        subject_id: assignment.subject_id,
        academic_period: assignment.academic_period,
        start_date: assignment.start_date,
        end_date: assignment.end_date,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return course;
  }
};
```

---

## 👨‍🏫 Servicios del Docente

### Servicio: `classSessionService.ts`

```typescript
// services/teacher/classSessionService.ts

export interface ClassSession {
  id: string;
  course_id: number;
  module_id?: number;
  session_number: number;
  title: string;
  scheduled_date: string;
  duration_minutes: number;
  session_type: string;
  location?: string;
  description?: string;
  learning_objectives?: string[];
  materials_summary?: string;
  is_mandatory: boolean;
  recording_url?: string;
  notes?: string;
}

export interface ClassSessionInput {
  course_id: number;
  module_id?: number;
  session_number: number;
  title: string;
  scheduled_date: string;
  duration_minutes?: number;
  session_type?: string;
  location?: string;
  description?: string;
  learning_objectives?: string[];
  materials_summary?: string;
  is_mandatory?: boolean;
}

export const classSessionService = {
  // Obtener sesiones de un curso
  async getByCourse(courseId: number): Promise<ClassSession[]> {
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('scheduled_date');
    
    if (error) throw error;
    return data || [];
  },

  // Crear sesión
  async create(input: ClassSessionInput): Promise<ClassSession> {
    // Obtener próximo número de sesión si no se especifica
    if (!input.session_number) {
      const { data: lastSession } = await supabase
        .from('class_sessions')
        .select('session_number')
        .eq('course_id', input.course_id)
        .order('session_number', { ascending: false })
        .limit(1)
        .single();

      input.session_number = (lastSession?.session_number || 0) + 1;
    }

    const { data, error } = await supabase
      .from('class_sessions')
      .insert({
        ...input,
        session_type: input.session_type || 'regular',
        duration_minutes: input.duration_minutes || 60,
        is_mandatory: input.is_mandatory ?? true
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Tomar asistencia
  async recordAttendance(
    sessionId: string,
    studentId: string,
    status: 'present' | 'absent' | 'late' | 'excused',
    notes?: string
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('attendance')
      .upsert({
        session_id: sessionId,
        student_id: studentId,
        status,
        notes,
        checked_in_at: status === 'present' || status === 'late' 
          ? new Date().toISOString() 
          : null,
        recorded_by: user.id,
        recorded_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,student_id'
      })
      .select()
      .single();
    
    if (error) throw error;

    // Actualizar porcentaje de asistencia del estudiante en el curso
    await this.updateAttendancePercentage(studentId, sessionId);

    return data;
  },

  // Actualizar porcentaje de asistencia
  async updateAttendancePercentage(studentId: string, sessionId: string) {
    // Obtener curso desde sesión
    const { data: session } = await supabase
      .from('class_sessions')
      .select('course_id')
      .eq('id', sessionId)
      .single();

    if (!session) return;

    // Calcular asistencia total
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', session.course_id)
      .single();

    if (!enrollments) return;

    const { data: totalSessions } = await supabase
      .from('class_sessions')
      .select('id')
      .eq('course_id', session.course_id);

    const { data: attendedSessions } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .in('session_id', totalSessions?.map(s => s.id) || [])
      .in('status', ['present', 'late']);

    const attendancePercentage = totalSessions && totalSessions.length > 0
      ? ((attendedSessions?.length || 0) / totalSessions.length) * 100
      : 0;

    // Actualizar enrollment
    await supabase
      .from('course_enrollments')
      .update({ attendance_percentage: attendancePercentage })
      .eq('id', enrollments.id);
  },

  // Registrar participación
  async recordParticipation(
    sessionId: string,
    studentId: string,
    participationType: 'question' | 'answer' | 'discussion' | 'activity',
    score: number,
    details?: Record<string, any>
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('class_participation')
      .insert({
        session_id: sessionId,
        student_id: studentId,
        participation_type: participationType,
        participation_score: score,
        details: details || {},
        recorded_by: user.id
      })
      .select()
      .single();
    
    if (error) throw error;

    // Actualizar participación en enrollment
    await this.updateParticipationScore(studentId, sessionId);

    // Asignar puntos de gamificación
    await this.awardParticipationPoints(studentId, sessionId, score);

    return data;
  },

  // Actualizar score de participación
  async updateParticipationScore(studentId: string, sessionId: string) {
    const { data: session } = await supabase
      .from('class_sessions')
      .select('course_id')
      .eq('id', sessionId)
      .single();

    if (!session) return;

    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', session.course_id)
      .single();

    if (!enrollment) return;

    // Calcular promedio de participación
    const { data: participations } = await supabase
      .from('class_participation')
      .select('participation_score')
      .eq('student_id', studentId)
      .in('session_id', [sessionId]);

    const avgScore = participations && participations.length > 0
      ? participations.reduce((sum, p) => sum + p.participation_score, 0) / participations.length
      : 0;

    await supabase
      .from('course_enrollments')
      .update({ participation_score: avgScore * 10 }) // Escalar a 0-100
      .eq('id', enrollment.id);
  },

  // Asignar puntos por participación
  async awardParticipationPoints(
    studentId: string,
    sessionId: string,
    score: number
  ) {
    const { data: session } = await supabase
      .from('class_sessions')
      .select('course_id')
      .eq('id', sessionId)
      .single();

    if (!session) return;

    const points = Math.round(score); // 0-10 puntos según score

    await supabase
      .from('student_points')
      .insert({
        student_id: studentId,
        course_id: session.course_id,
        points: points,
        source: 'participation',
        source_id: sessionId,
        reason: `Participación en clase: ${score}/10`
      });
  }
};
```

---

## 🎓 Servicios del Estudiante

### Servicio: `enrollmentService.ts`

```typescript
// services/student/enrollmentService.ts

export const enrollmentService = {
  // Matricularse a una carrera
  async enrollInCareer(careerId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { error } = await supabase
      .from('career_enrollments')
      .insert({
        student_id: user.id,
        career_id: careerId,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active',
        current_semester: 1
      });

    if (error) throw error;
  },

  // Inscribirse a un curso
  async enrollInCourse(courseId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // Validar prerrequisitos
    const { data: course } = await supabase
      .from('courses')
      .select('subject_id, subjects!courses_subject_id_fkey(*)')
      .eq('id', courseId)
      .single();

    if (!course || !course.subject_id) throw new Error('Curso no encontrado');

    // Validar prerrequisitos
    const { canEnroll, missingPrerequisites } = 
      await subjectService.validatePrerequisites(user.id, course.subject_id);

    if (!canEnroll) {
      throw new Error(
        `Prerrequisitos no cumplidos: ${missingPrerequisites.map(s => s.name).join(', ')}`
      );
    }

    // Inscribirse
    const { error } = await supabase
      .from('course_enrollments')
      .insert({
        student_id: user.id,
        course_id: courseId,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active'
      });

    if (error) throw error;
  },

  // Obtener cursos inscritos
  async getMyCourses() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses!course_enrollments_course_id_fkey (
          *,
          teacher:users!courses_teacher_id_fkey (
            id,
            first_name,
            last_name
          ),
          subject:subjects!courses_subject_id_fkey (
            name,
            code
          )
        )
      `)
      .eq('student_id', user.id)
      .order('enrollment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener progreso en un curso
  async getCourseProgress(courseId: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (error) throw error;

    // Calcular progreso actualizado
    const updatedCompletion = await calculateCourseCompletion(data.id);

    return {
      ...data,
      completion_percentage: updatedCompletion
    };
  }
};
```

---

## 🤖 Servicios de IA Analítica

### Servicio: `engagementAnalysisService.ts`

```typescript
// services/ai/engagementAnalysisService.ts

interface EngagementMetrics {
  time_spent_minutes: number;
  materials_viewed: number;
  materials_total: number;
  assignments_submitted: number;
  assignments_total: number;
  quizzes_completed: number;
  quizzes_total: number;
  participation_count: number;
  tutor_interactions: number;
  attendance_count: number;
  attendance_total: number;
  average_quiz_score: number;
  assignment_grades_avg: number;
}

export const engagementAnalysisService = {
  // Calcular engagement score
  async calculateEngagementScore(
    studentId: string,
    courseId: number,
    periodDays: number = 7
  ): Promise<number> {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Recolectar métricas
    const metrics = await this.collectMetrics(studentId, courseId, periodStart);

    // Calcular score base (0-100)
    const baseScore = this.calculateBaseScore(metrics);

    // Refinar con IA
    const refinedScore = await this.refineWithAI(metrics, baseScore);

    // Guardar en base de datos
    await this.saveEngagementData(studentId, courseId, refinedScore, metrics);

    return refinedScore;
  },

  // Recolectar métricas
  async collectMetrics(
    studentId: string,
    courseId: number,
    since: Date
  ): Promise<EngagementMetrics> {
    // Tiempo en plataforma
    const { data: timeData } = await supabase
      .from('analytics_events')
      .select('event_data')
      .eq('user_id', studentId)
      .eq('course_id', courseId)
      .gte('created_at', since.toISOString())
      .eq('event_type', 'time_spent');

    const timeSpent = timeData?.reduce((sum, d) => {
      return sum + (d.event_data?.minutes || 0);
    }, 0) || 0;

    // Materiales vistos
    const { data: materials } = await supabase
      .from('course_materials')
      .select('id')
      .eq('course_id', courseId);

    const { data: viewedMaterials } = await supabase
      .from('analytics_events')
      .select('event_data')
      .eq('user_id', studentId)
      .eq('course_id', courseId)
      .gte('created_at', since.toISOString())
      .eq('event_type', 'material_viewed');

    // Tareas
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('course_id', courseId);

    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('grade')
      .eq('student_id', studentId)
      .in('assignment_id', assignments?.map(a => a.id) || []);

    // Quizz
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('course_id', courseId);

    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('score, max_points')
      .eq('student_id', studentId)
      .in('quiz_id', quizzes?.map(q => q.id) || []);

    // Asistencia
    const { data: sessions } = await supabase
      .from('class_sessions')
      .select('id')
      .eq('course_id', courseId)
      .gte('scheduled_date', since.toISOString());

    const { data: attendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .in('session_id', sessions?.map(s => s.id) || [])
      .in('status', ['present', 'late']);

    // Participación
    const { data: participation } = await supabase
      .from('class_participation')
      .select('id')
      .eq('student_id', studentId)
      .in('session_id', sessions?.map(s => s.id) || []);

    // Tutor interactions
    const { data: tutorInteractions } = await supabase
      .from('analytics_events')
      .select('id')
      .eq('user_id', studentId)
      .eq('course_id', courseId)
      .gte('created_at', since.toISOString())
      .eq('event_type', 'tutor_interaction');

    return {
      time_spent_minutes: timeSpent,
      materials_viewed: viewedMaterials?.length || 0,
      materials_total: materials?.length || 0,
      assignments_submitted: submissions?.length || 0,
      assignments_total: assignments?.length || 0,
      quizzes_completed: attempts?.length || 0,
      quizzes_total: quizzes?.length || 0,
      participation_count: participation?.length || 0,
      tutor_interactions: tutorInteractions?.length || 0,
      attendance_count: attendance?.length || 0,
      attendance_total: sessions?.length || 0,
      average_quiz_score: attempts && attempts.length > 0
        ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
        : 0,
      assignment_grades_avg: submissions && submissions.length > 0
        ? submissions.reduce((sum, s) => sum + (s.grade || 0), 0) / submissions.length
        : 0
    };
  },

  // Calcular score base
  calculateBaseScore(metrics: EngagementMetrics): number {
    const weights = {
      time: 0.15,
      materials: 0.20,
      assignments: 0.25,
      quizzes: 0.15,
      participation: 0.10,
      attendance: 0.15
    };

    const materialRatio = metrics.materials_total > 0
      ? (metrics.materials_viewed / metrics.materials_total) * 100
      : 0;

    const assignmentRatio = metrics.assignments_total > 0
      ? (metrics.assignments_submitted / metrics.assignments_total) * 100
      : 0;

    const quizRatio = metrics.quizzes_total > 0
      ? (metrics.quizzes_completed / metrics.quizzes_total) * 100
      : 0;

    const attendanceRatio = metrics.attendance_total > 0
      ? (metrics.attendance_count / metrics.attendance_total) * 100
      : 0;

    // Normalizar tiempo (asumir que 2 horas/día es 100%)
    const timeScore = Math.min((metrics.time_spent_minutes / (2 * 60 * 7)) * 100, 100);

    // Normalizar participación
    const participationScore = Math.min(metrics.participation_count * 10, 100);

    const baseScore = 
      (timeScore * weights.time) +
      (materialRatio * weights.materials) +
      (assignmentRatio * weights.assignments) +
      (quizRatio * weights.quizzes) +
      (participationScore * weights.participation) +
      (attendanceRatio * weights.attendance);

    return Math.round(baseScore);
  },

  // Refinar con IA
  async refineWithAI(
    metrics: EngagementMetrics,
    baseScore: number
  ): Promise<number> {
    const prompt = `
Analiza el compromiso académico con estas métricas:
- Tiempo de estudio: ${metrics.time_spent_minutes} minutos en 7 días
- Materiales: ${metrics.materials_viewed}/${metrics.materials_total} vistos
- Tareas: ${metrics.assignments_submitted}/${metrics.assignments_total} entregadas
- Quizz: ${metrics.quizzes_completed}/${metrics.quizzes_total} completados
- Participación: ${metrics.participation_count} veces
- Asistencia: ${metrics.attendance_count}/${metrics.attendance_total} clases
- Promedio quizz: ${metrics.average_quiz_score.toFixed(1)}
- Promedio tareas: ${metrics.assignment_grades_avg.toFixed(1)}

Score calculado automáticamente: ${baseScore}/100

Proporciona un score refinado (0-100) considerando:
1. Calidad del engagement (no solo cantidad)
2. Consistencia (mejor si es regular que esporádico)
3. Resultados académicos (quizz y tareas)
4. Participación activa vs pasiva

Responde solo con un número entre 0 y 100.
    `;

    try {
      const response = await geminiService.generateContent(prompt);
      const aiScore = parseFloat(response.trim());
      return isNaN(aiScore) ? baseScore : Math.max(0, Math.min(100, aiScore));
    } catch (error) {
      console.error('Error refinando score con IA:', error);
      return baseScore;
    }
  },

  // Guardar datos de engagement
  async saveEngagementData(
    studentId: string,
    courseId: number,
    score: number,
    metrics: EngagementMetrics
  ) {
    const riskLevel = this.determineRiskLevel(score);

    await supabase
      .from('student_engagement')
      .upsert({
        student_id: studentId,
        course_id: courseId,
        date: new Date().toISOString().split('T')[0],
        engagement_score: score,
        metrics: metrics,
        risk_level: riskLevel
      }, {
        onConflict: 'student_id,course_id,date'
      });
  },

  // Determinar nivel de riesgo
  determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'low';
    if (score >= 40) return 'medium';
    return 'high';
  }
};
```

---

Este documento continúa con más servicios y casos de uso. El siguiente paso sería crear los servicios de gamificación y los casos de uso detallados. ¿Quieres que continúe con más profundización en alguna área específica?

