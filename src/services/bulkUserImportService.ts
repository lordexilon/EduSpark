// services/bulkUserImportService.ts
// Servicio para importación masiva de usuarios

import { supabase } from '../lib/supabase';

export interface BulkUserData {
  email: string;
  password?: string; // Opcional, se puede generar automáticamente
  first_name: string;
  last_name: string;
  role?: 'student' | 'teacher' | 'admin-campus' | 'coordinator';
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
      const { data, error } = await supabase.rpc('create_user_with_assignments', {
        p_email: userData.email,
        p_password: userData.password || this.generateRandomPassword(),
        p_first_name: userData.first_name,
        p_last_name: userData.last_name,
        p_institution_id: userData.institution_id,
        p_role_name: userData.role || 'student',
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
        role: user.role || 'student',
        institution_id: user.institution_id,
        identity_document: user.identity_document || null,
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
      
      // Fallback: usar función RPC si Edge Function no está disponible
      try {
        const usersJson = users.map(user => ({
          email: user.email,
          password: user.password || this.generateRandomPassword(),
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role || 'student',
          institution_id: user.institution_id,
          identity_document: user.identity_document || null,
          identity_document_type: user.identity_document_type || null,
          career_id: user.career_id || null,
          subject_id: user.subject_id || null,
          course_id: user.course_id || null,
          position: user.position || null,
          skip_email_confirmation: user.skip_email_confirmation !== false
        }));

        const { data, error: rpcError } = await supabase.rpc('create_bulk_users', {
          p_users: usersJson
        });

        if (rpcError) throw rpcError;
        return data as BulkImportResult;
      } catch (fallbackError: any) {
        return {
          success: false,
          total: users.length,
          success_count: 0,
          failed_count: users.length,
          results: users.map(u => ({
            success: false,
            email: u.email,
            error: error.message || fallbackError.message || 'Error desconocido'
          }))
        };
      }
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
          role: user.role || 'student',
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
      const XLSX = await import('xlsx');
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
            role: user.role || 'student',
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
   */
  validateUserData(user: BulkUserData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!user.email || !user.email.includes('@')) {
      errors.push('Email inválido');
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

    if (user.role && !['student', 'teacher', 'admin-campus', 'coordinator'].includes(user.role)) {
      errors.push('Rol inválido. Debe ser: student, teacher, admin-campus o coordinator');
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
  }
};

