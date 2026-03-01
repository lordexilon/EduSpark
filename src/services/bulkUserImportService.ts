// services/bulkUserImportService.ts
// Servicio para importación masiva de usuarios

import { supabase } from '@/lib/supabase';

export interface BulkUserData {
  email: string;
  password?: string; // Opcional, se puede generar automáticamente
  first_name: string;
  last_name: string;
  role?: 'student' | 'teacher' | 'admin' | 'admin-campus' | 'coordinator';
  institution_id?: number; // ID (si se proporciona directamente)
  institution_name?: string; // Nombre de institución (alternativa a ID)
  identity_document?: string; // Documento de identidad (DNI, cédula, etc.)
  identity_document_type?: 'DNI' | 'CEDULA' | 'PASAPORTE' | 'LICENCIA' | 'OTRO'; // Tipo de documento
  career_id?: number; // ID (si se proporciona directamente)
  career_name?: string; // Nombre de carrera (alternativa a ID)
  subject_id?: number; // ID (si se proporciona directamente)
  subject_name?: string; // Nombre de materia (alternativa a ID)
  course_id?: number; // ID (si se proporciona directamente)
  course_name?: string; // Nombre de curso (alternativa a ID)
  position?: string; // Cargo/posición en la institución
  skip_email_confirmation?: boolean;
}

export interface BulkImportResult {
  success: boolean;
  total: number;
  success_count: number;
  failed_count: number;
  results: Array<{
    success: boolean;
    user_id?: string;
    email: string;
    message?: string;
    error?: string;
  }>;
}

export const bulkUserImportService = {
  /**
   * Mapear nombres de roles comunes a los nombres correctos en la base de datos
   */
  normalizeRoleName(role: string | undefined): string {
    if (!role) return 'student';

    const normalized = role.toLowerCase().trim();

    // Mapeo de nombres comunes a nombres correctos
    const roleMap: Record<string, string> = {
      'administrador': 'admin',
      'admin': 'admin',
      'admin-campos': 'admin-campus',
      'admin-campus': 'admin-campus',
      'admincampus': 'admin-campus',
      'coordinador': 'coordinator',
      'coordinator': 'coordinator',
      'docente': 'teacher',
      'teacher': 'teacher',
      'profesor': 'teacher',
      'estudiante': 'student',
      'student': 'student',
      'alumno': 'student'
    };

    return roleMap[normalized] || normalized;
  },

  /**
   * Crear un usuario individual con asignaciones
   */
  async createUserWithAssignments(userData: BulkUserData): Promise<{
    success: boolean;
    user_id?: string;
    email: string;
    message?: string;
    error?: string;
  }> {
    try {
      // Normalizar el nombre del rol
      const normalizedRole = this.normalizeRoleName(userData.role);

      const { data, error } = await supabase.rpc('create_user_with_assignments', {
        p_email: userData.email,
        p_password: userData.password || this.generateRandomPassword(),
        p_first_name: userData.first_name,
        p_last_name: userData.last_name,
        p_institution_id: userData.institution_id,
        p_role_name: normalizedRole,
        p_identity_document: userData.identity_document || null,
        p_career_id: userData.career_id || null,
        p_subject_id: userData.subject_id || null,
        p_course_id: userData.course_id || null,
        p_position: userData.position || null,
        p_skip_email_confirmation: userData.skip_email_confirmation !== false
      });

      if (error) throw error;
      return data as any;
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      return {
        success: false,
        email: userData.email,
        error: error.message || 'Error desconocido'
      };
    }
  },

  /**
   * Crear múltiples usuarios masivamente
   * Usa Edge Function para crear usuarios en auth.users sin confirmación
   */
  async createBulkUsers(users: BulkUserData[]): Promise<BulkImportResult> {
    try {
      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Convertir array de usuarios a formato para Edge Function
      const usersJson = users.map(user => ({
        email: user.email,
        password: user.password || this.generateRandomPassword(),
        first_name: user.first_name,
        last_name: user.last_name,
        role: this.normalizeRoleName(user.role),
        institution_id: user.institution_id,
        identity_document: user.identity_document ? user.identity_document.trim() : null,
        identity_document_type: user.identity_document_type || null,
        career_id: user.career_id || null,
        subject_id: user.subject_id || null,
        course_id: user.course_id || null,
        position: user.position || null
      }));

      // Obtener URL de Supabase desde las variables de entorno
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mckfscukxcqwntpjagar.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const functionUrl = `${supabaseUrl}/functions/v1/createBulkUsers`;

      // Llamar a Edge Function
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({ users: usersJson })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      return data as BulkImportResult;
    } catch (error: any) {
      console.error('Error creando usuarios masivamente:', error);

      // ⚠️ IMPORTANTE: NO usar fallback a RPC para prevenir usuarios huérfanos
      // La función RPC create_bulk_users solo crea en public.users, NO en auth.users
      // Esto genera usuarios que no pueden iniciar sesión (usuarios huérfanos)

      return {
        success: false,
        total: users.length,
        success_count: 0,
        failed_count: users.length,
        results: users.map(u => ({
          success: false,
          email: u.email,
          error: `Error al crear usuarios: ${error.message}. IMPORTANTE: La Edge Function 'createBulkUsers' debe estar desplegada en Supabase. Ejecuta: supabase functions deploy createBulkUsers`
        }))
      };
    }
  },

  /**
   * Generar contraseña aleatoria segura
   */
  generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  },

  /**
   * Parsear CSV a array de usuarios
   */
  parseCSV(csvText: string): BulkUserData[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('El CSV debe tener al menos una fila de encabezados y una fila de datos');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const users: BulkUserData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;

      const user: any = {};
      headers.forEach((header, index) => {
        const value = values[index];
        if (value) {
          // Convertir tipos según el header
          if (header.includes('_id') && !header.includes('email') && !isNaN(parseInt(value))) {
            user[header] = parseInt(value);
          } else if (header === 'skip_email_confirmation' || header === 'skip') {
            user[header] = value.toLowerCase() === 'true' || value === '1';
          } else {
            user[header] = value;
          }
        }
      });

      // Validar campos requeridos (institución puede ser ID o nombre)
      if (user.email && user.first_name && user.last_name && (user.institution_id || user.institution_name)) {
        users.push({
          email: user.email,
          password: user.password,
          first_name: user.first_name,
          last_name: user.last_name,
          role: this.normalizeRoleName(user.role) as any,
          institution_id: user.institution_id,
          institution_name: user.institution_name,
          identity_document: user.identity_document,
          identity_document_type: user.identity_document_type,
          career_id: user.career_id,
          career_name: user.career_name,
          subject_id: user.subject_id,
          subject_name: user.subject_name,
          course_id: user.course_id,
          course_name: user.course_name,
          position: user.position,
          skip_email_confirmation: user.skip_email_confirmation !== false
        });
      }
    }

    return users;
  },

  /**
   * Parsear archivo Excel a array de usuarios
   */
  async parseExcelFile(file: File): Promise<BulkUserData[]> {
    try {
      const xlsxModule = await import('xlsx');
      const XLSX = xlsxModule.default || xlsxModule;

      if (!XLSX || !XLSX.read) {
        throw new Error('Estructura de la librería Excel no válida');
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Leer la primera hoja
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

      if (data.length < 2) {
        throw new Error('El Excel debe tener al menos una fila de encabezados y una fila de datos');
      }

      // Primera fila son los encabezados
      const headers = data[0].map((h: any) => String(h).trim().toLowerCase());
      const users: BulkUserData[] = [];

      // Procesar filas de datos
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const user: any = {};
        headers.forEach((header: string, index: number) => {
          const value = row[index];
          if (value !== undefined && value !== null && value !== '') {
            const strValue = String(value).trim();

            // Convertir tipos según el header
            if (header.includes('_id') && !header.includes('email') && !isNaN(parseInt(strValue))) {
              user[header] = parseInt(strValue);
            } else if (header === 'skip_email_confirmation' || header === 'skip') {
              user[header] = strValue.toLowerCase() === 'true' || strValue === '1';
            } else {
              user[header] = strValue;
            }
          }
        });

        // Validar campos requeridos (institución puede ser ID o nombre)
        if (user.email && user.first_name && user.last_name && (user.institution_id || user.institution_name)) {
          users.push({
            email: user.email,
            password: user.password,
            first_name: user.first_name,
            last_name: user.last_name,
            role: this.normalizeRoleName(user.role) as any,
            institution_id: user.institution_id,
            institution_name: user.institution_name,
            identity_document: user.identity_document,
            identity_document_type: user.identity_document_type,
            career_id: user.career_id,
            career_name: user.career_name,
            subject_id: user.subject_id,
            subject_name: user.subject_name,
            course_id: user.course_id,
            course_name: user.course_name,
            position: user.position,
            skip_email_confirmation: user.skip_email_confirmation !== false
          });
        }
      }

      return users;
    } catch (error: any) {
      console.error('Error parseando Excel:', error);
      throw new Error(`Error al parsear archivo Excel: ${error.message}`);
    }
  },

  /**
   * Resolver IDs desde nombres (helper para convertir nombres a IDs)
   */
  async resolveIdsFromNames(
    users: BulkUserData[],
    institutions: Array<{ id: number; name: string }>,
    careers: Array<{ id: number; name: string }>,
    subjects: Array<{ id: number; name: string }>,
    courses: Array<{ id: number; title: string }>
  ): Promise<BulkUserData[]> {
    return users.map(user => {
      const resolved: BulkUserData = { ...user };

      // Resolver institución por nombre
      if (!resolved.institution_id && resolved.institution_name) {
        const inst = institutions.find(i =>
          i.name.toLowerCase().trim() === resolved.institution_name!.toLowerCase().trim()
        );
        if (inst) {
          resolved.institution_id = inst.id;
        }
      }

      // Resolver carrera por nombre
      if (!resolved.career_id && resolved.career_name) {
        const career = careers.find(c =>
          c.name.toLowerCase().trim() === resolved.career_name!.toLowerCase().trim()
        );
        if (career) {
          resolved.career_id = career.id;
        }
      }

      // Resolver materia por nombre
      if (!resolved.subject_id && resolved.subject_name) {
        const subject = subjects.find(s =>
          s.name.toLowerCase().trim() === resolved.subject_name!.toLowerCase().trim()
        );
        if (subject) {
          resolved.subject_id = subject.id;
        }
      }

      // Resolver curso por nombre
      if (!resolved.course_id && resolved.course_name) {
        const course = courses.find(c =>
          c.title.toLowerCase().trim() === resolved.course_name!.toLowerCase().trim()
        );
        if (course) {
          resolved.course_id = course.id;
        }
      }

      return resolved;
    });
  },

  /**
   * Validar datos de usuario antes de importar
   * IMPORTANTE: identity_document es el identificador principal (además de email)
   */
  validateUserData(user: BulkUserData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar email O identity_document (al menos uno debe estar presente)
    if (!user.email || !user.email.includes('@')) {
      if (!user.identity_document || user.identity_document.trim().length < 4) {
        errors.push('Email válido o documento de identidad es requerido');
      }
    }

    if (!user.first_name || user.first_name.trim().length === 0) {
      errors.push('Nombre es requerido');
    }

    if (!user.last_name || user.last_name.trim().length === 0) {
      errors.push('Apellido es requerido');
    }

    if (!user.institution_id && !user.institution_name) {
      errors.push('Institución es requerida (ID o nombre)');
    }

    // Normalizar el rol antes de validar
    const normalizedRole = this.normalizeRoleName(user.role);
    const validRoles = ['student', 'teacher', 'admin-campus', 'coordinator', 'admin'];

    if (user.role && !validRoles.includes(normalizedRole)) {
      errors.push(`Rol inválido: "${user.role}". Los roles válidos son: student, teacher, admin, admin-campus, coordinator, administrador, admin-campos`);
    }

    // Validar documento de identidad si se proporciona
    if (user.identity_document) {
      const doc = user.identity_document.trim();
      if (doc.length < 4) {
        errors.push('Documento de identidad debe tener al menos 4 caracteres');
      }
      if (/\s/.test(doc)) {
        errors.push('Documento de identidad no puede contener espacios');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Validar relaciones carrera-materia-curso
   * Verifica que:
   * - Si se proporciona curso y materia, el curso debe pertenecer a esa materia
   * - Si se proporciona materia y carrera, la materia debe pertenecer a esa carrera
   * - Si se proporciona curso y carrera, el curso debe pertenecer a una materia de esa carrera
   */
  async validateRelationships(
    user: BulkUserData,
    careers: Array<{ id: number; name: string }>,
    subjects: Array<{ id: number; name: string; career_id?: number }>,
    courses: Array<{ id: number; title: string; subject_id?: number }>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Si se proporciona curso, obtener su subject_id
    let courseSubjectId: number | undefined;
    if (user.course_id) {
      const course = courses.find(c => c.id === user.course_id);
      if (!course) {
        errors.push(`Curso con ID ${user.course_id} no encontrado`);
      } else {
        courseSubjectId = course.subject_id;
      }
    }

    // Si se proporciona materia, obtener su career_id
    let subjectCareerId: number | undefined;
    if (user.subject_id) {
      const subject = subjects.find(s => s.id === user.subject_id);
      if (!subject) {
        errors.push(`Materia con ID ${user.subject_id} no encontrada`);
      } else {
        subjectCareerId = subject.career_id;
      }
    }

    // Validar: Si se proporciona curso y materia, el curso debe pertenecer a esa materia
    if (user.course_id && user.subject_id && courseSubjectId !== undefined) {
      if (courseSubjectId !== user.subject_id) {
        errors.push(`El curso ${user.course_id} no pertenece a la materia ${user.subject_id}. El curso pertenece a la materia ${courseSubjectId}`);
      }
    }

    // Validar: Si se proporciona materia y carrera, la materia debe pertenecer a esa carrera
    if (user.subject_id && user.career_id && subjectCareerId !== undefined) {
      if (subjectCareerId !== user.career_id) {
        errors.push(`La materia ${user.subject_id} no pertenece a la carrera ${user.career_id}. La materia pertenece a la carrera ${subjectCareerId}`);
      }
    }

    // Validar: Si se proporciona curso y carrera (sin materia), el curso debe pertenecer a una materia de esa carrera
    if (user.course_id && user.career_id && !user.subject_id && courseSubjectId !== undefined) {
      const subject = subjects.find(s => s.id === courseSubjectId);
      if (subject && subject.career_id !== user.career_id) {
        errors.push(`El curso ${user.course_id} pertenece a una materia de la carrera ${subject.career_id}, no a la carrera ${user.career_id} especificada`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

