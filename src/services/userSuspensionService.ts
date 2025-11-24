// services/userSuspensionService.ts
// Servicio para suspender/reactivar usuarios masivamente por documento de identidad

import { supabase } from '../lib/supabase';

export interface UserSuspensionData {
  documento_identidad: string;
  is_active: boolean; // false = suspender, true = reactivar
}

export interface SuspensionResult {
  success: boolean;
  total: number;
  success_count: number;
  failed_count: number;
  results: Array<{
    success: boolean;
    documento_identidad: string;
    user_id?: string;
    is_active?: boolean;
    action?: string;
    message?: string;
    error?: string;
  }>;
}

export const userSuspensionService = {
  /**
   * Suspender/reactivar usuarios masivamente
   */
  async bulkSuspendReactivate(users: UserSuspensionData[]): Promise<SuspensionResult> {
    try {
      const usersJson = users.map(user => ({
        documento_identidad: user.documento_identidad.trim(),
        is_active: user.is_active
      }));

      const { data, error } = await supabase.rpc('bulk_suspend_reactivate_users', {
        p_users: usersJson
      });

      if (error) throw error;
      return data as SuspensionResult;
    } catch (error: any) {
      console.error('Error suspendiendo/reactivando usuarios:', error);
      return {
        success: false,
        total: users.length,
        success_count: 0,
        failed_count: users.length,
        results: users.map(u => ({
          success: false,
          documento_identidad: u.documento_identidad,
          error: error.message || 'Error desconocido'
        }))
      };
    }
  },

  /**
   * Parsear CSV a array de suspensiones
   */
  parseCSV(csvText: string): UserSuspensionData[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('El CSV debe tener al menos una fila de encabezados y una fila de datos');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const users: UserSuspensionData[] = [];

    // Buscar índices de columnas
    const docIndex = headers.findIndex(h => 
      h.includes('documento') || h.includes('dni') || h.includes('cedula') || h.includes('identidad')
    );
    const statusIndex = headers.findIndex(h => 
      h.includes('activo') || h.includes('active') || h.includes('estado') || h.includes('status') || h.includes('suspender')
    );

    if (docIndex === -1) {
      throw new Error('No se encontró columna de documento de identidad. Busca: documento, dni, cedula, identidad');
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;

      const documento = values[docIndex];
      if (!documento) continue;

      // Determinar is_active
      let is_active: boolean;
      if (statusIndex !== -1) {
        const statusValue = values[statusIndex].toLowerCase().trim();
        // Si dice "activo", "true", "1", "si", "yes" -> true
        // Si dice "suspendido", "false", "0", "no" -> false
        is_active = ['activo', 'true', '1', 'si', 'yes', 'reactivar', 'reactivo'].includes(statusValue);
      } else {
        // Por defecto, si no hay columna de estado, asumir suspender (false)
        is_active = false;
      }

      users.push({
        documento_identidad: documento,
        is_active
      });
    }

    return users;
  },

  /**
   * Validar datos de suspensión
   */
  validateSuspensionData(data: UserSuspensionData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.documento_identidad || data.documento_identidad.trim().length === 0) {
      errors.push('Documento de identidad es requerido');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

