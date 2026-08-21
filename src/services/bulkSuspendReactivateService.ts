// services/bulkSuspendReactivateService.ts
// Servicio para suspender/reactivar usuarios masivamente mediante documento de identidad
// Soporta importación desde CSV y Excel

import { supabase } from '@/lib/supabase';

export interface SuspendReactivateUserData {
  identity_document: string;
  is_active?: boolean | string; // Puede ser boolean, "suspender"/"reactivar", "1"/"0", etc.
  paid?: boolean | string; // Indica si pagó la mensualidad: true/false, "si"/"no", "pagado"/"no pagado", etc.
  payment_date?: string; // Fecha del pago (opcional)
  amount?: number; // Monto pagado (opcional)
}

export interface SuspendReactivateResult {
  success: boolean;
  total: number;
  success_count: number;
  failed_count: number;
  results: Array<{
    success: boolean;
    user_id?: string;
    identity_document: string;
    previous_status?: boolean;
    new_status?: boolean;
    message?: string;
    error?: string;
  }>;
}

export const bulkSuspendReactivateService = {
  /**
   * Suspender o reactivar usuarios masivamente
   * @param users Array de usuarios a procesar
   * @param institutionId ID de institución opcional para filtrar usuarios (para supervisores)
   */
  async bulkSuspendReactivateUsers(
    users: SuspendReactivateUserData[],
    institutionId?: number
  ): Promise<SuspendReactivateResult> {
    try {
      // Si se proporciona institutionId, filtrar usuarios por institución
      let usersToProcess = users;
      if (institutionId) {
        const identityDocuments = users.map((u) => u.identity_document).filter(Boolean);

        if (identityDocuments.length > 0) {
          // Buscar usuarios por documento de identidad y filtrar por institución
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select(
              `
              id,
              identity_document,
              user_institutions!inner(institution_id)
            `
            )
            .in('identity_document', identityDocuments)
            .eq('user_institutions.institution_id', institutionId);

          if (usersError) {
            throw new Error(`Error al validar usuarios por institución: ${usersError.message}`);
          }

          // Crear un mapa de documentos válidos
          const validDocuments = new Set((usersData || []).map((u: any) => u.identity_document));

          // Filtrar usuarios que no pertenecen a la institución
          usersToProcess = users.filter(
            (u) => !u.identity_document || validDocuments.has(u.identity_document)
          );

          // Si se filtraron usuarios, informar
          if (usersToProcess.length < users.length) {
            const filteredCount = users.length - usersToProcess.length;
            console.warn(
              `⚠️ ${filteredCount} usuario(s) no pertenecen a la institución ${institutionId} y fueron excluidos`
            );
          }
        }
      }

      // Convertir array de usuarios a JSONB
      const usersJson = usersToProcess.map((user) => ({
        identity_document: user.identity_document,
        is_active: user.is_active,
      }));

      const { data, error } = await supabase.rpc('bulk_suspend_reactivate_users', {
        p_users: usersJson,
      });

      if (error) throw error;
      return data as SuspendReactivateResult;
    } catch (error: any) {
      console.error('Error suspendiendo/reactivando usuarios:', error);
      return {
        success: false,
        total: users.length,
        success_count: 0,
        failed_count: users.length,
        results: users.map((u) => ({
          success: false,
          identity_document: u.identity_document,
          error: error.message || 'Error desconocido',
        })),
      };
    }
  },

  /**
   * Parsear CSV a array de usuarios para suspender/reactivar
   */
  parseSuspendReactivateCSV(csvText: string): SuspendReactivateUserData[] {
    const lines = csvText.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error('El CSV debe tener al menos una fila de encabezados y una fila de datos');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const users: SuspendReactivateUserData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      if (values.length !== headers.length) continue;

      const user: any = {};
      headers.forEach((header, index) => {
        const value = values[index];
        if (value) {
          user[header] = value;
        }
      });

      // Validar campos requeridos
      if (user.identity_document) {
        const userData: SuspendReactivateUserData = {
          identity_document: user.identity_document,
        };

        // Si hay campo is_active, usarlo
        if (user.is_active !== undefined) {
          userData.is_active = user.is_active;
        }

        // Si hay campo paid, usarlo para determinar is_active
        if (user.paid !== undefined) {
          userData.paid = user.paid;
          // Si pagó, reactivar; si no pagó, suspender
          userData.is_active = this.parsePaymentStatus(user.paid);
        }

        // Campos opcionales
        if (user.payment_date) userData.payment_date = user.payment_date;
        if (user.amount) userData.amount = parseFloat(user.amount) || undefined;

        users.push(userData);
      }
    }

    return users;
  },

  /**
   * Parsear archivo Excel a array de usuarios
   */
  async parseExcelFile(file: File): Promise<SuspendReactivateUserData[]> {
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
      const users: SuspendReactivateUserData[] = [];

      // Procesar filas de datos
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const user: any = {};
        headers.forEach((header: string, index: number) => {
          const value = row[index];
          if (value !== undefined && value !== null && value !== '') {
            user[header] = String(value).trim();
          }
        });

        // Validar campos requeridos
        if (user.identity_document || user.documento || user.ci || user.dni) {
          const identityDoc = user.identity_document || user.documento || user.ci || user.dni;

          const userData: SuspendReactivateUserData = {
            identity_document: identityDoc,
          };

          // Buscar campo de pago (puede tener varios nombres)
          const paidValue =
            user.paid || user.pagado || user.pago || user.payment || user.mensualidad;
          if (paidValue !== undefined) {
            userData.paid = paidValue;
            userData.is_active = this.parsePaymentStatus(paidValue);
          }

          // Si hay campo is_active explícito, usarlo
          if (
            user.is_active !== undefined ||
            user.activo !== undefined ||
            user.estado !== undefined
          ) {
            const statusValue = user.is_active || user.activo || user.estado;
            userData.is_active = this.parseStatusValue(statusValue);
          }

          // Campos opcionales
          if (user.payment_date || user.fecha_pago || user.fecha) {
            userData.payment_date = user.payment_date || user.fecha_pago || user.fecha;
          }
          if (user.amount || user.monto || user.importe) {
            userData.amount = parseFloat(user.amount || user.monto || user.importe) || undefined;
          }

          users.push(userData);
        }
      }

      return users;
    } catch (error: any) {
      console.error('Error parseando Excel:', error);
      throw new Error(`Error al parsear archivo Excel: ${error.message}`);
    }
  },

  /**
   * Convertir valor de pago a estado is_active
   */
  parsePaymentStatus(paidValue: any): boolean | string {
    const value = String(paidValue).toLowerCase().trim();

    // Valores que indican que pagó (reactivar)
    if (
      value === 'true' ||
      value === '1' ||
      value === 'si' ||
      value === 'yes' ||
      value === 'pagado' ||
      value === 'paid' ||
      value === 'pago' ||
      value === 'sí'
    ) {
      return true;
    }

    // Valores que indican que no pagó (suspender)
    if (
      value === 'false' ||
      value === '0' ||
      value === 'no' ||
      value === 'no pagado' ||
      value === 'unpaid' ||
      value === 'sin pago' ||
      value === 'pendiente' ||
      value === 'pending'
    ) {
      return false;
    }

    // Si no se reconoce, retornar el valor original
    return paidValue;
  },

  /**
   * Convertir valor de estado a is_active
   */
  parseStatusValue(statusValue: any): boolean | string {
    const value = String(statusValue).toLowerCase().trim();

    // Valores que indican activo
    if (
      value === 'true' ||
      value === '1' ||
      value === 'activo' ||
      value === 'active' ||
      value === 'reactivar' ||
      value === 'reactivate'
    ) {
      return true;
    }

    // Valores que indican suspendido
    if (
      value === 'false' ||
      value === '0' ||
      value === 'suspendido' ||
      value === 'suspended' ||
      value === 'suspender' ||
      value === 'suspend'
    ) {
      return false;
    }

    return statusValue;
  },

  /**
   * Validar datos de usuario antes de procesar
   */
  validateSuspendReactivateData(user: SuspendReactivateUserData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!user.identity_document || user.identity_document.trim().length === 0) {
      errors.push('Documento de identidad es requerido');
    }

    // is_active puede venir de paid o directamente
    if (user.is_active === undefined && user.paid === undefined) {
      errors.push('Se requiere estado (is_active) o información de pago (paid)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Procesar pagos desde Excel y actualizar estados automáticamente
   * Esta función registra los pagos y actualiza el estado de los usuarios
   * @param users Array de usuarios a procesar
   * @param institutionId ID de institución opcional para filtrar usuarios (para supervisores)
   */
  async processPaymentsFromExcel(
    users: SuspendReactivateUserData[],
    institutionId?: number
  ): Promise<SuspendReactivateResult> {
    try {
      // Si se proporciona institutionId, filtrar usuarios por institución
      let usersToProcess = users;
      if (institutionId) {
        const identityDocuments = users.map((u) => u.identity_document).filter(Boolean);

        if (identityDocuments.length > 0) {
          // Buscar usuarios por documento de identidad y filtrar por institución
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select(
              `
              id,
              identity_document,
              user_institutions!inner(institution_id)
            `
            )
            .in('identity_document', identityDocuments)
            .eq('user_institutions.institution_id', institutionId);

          if (usersError) {
            throw new Error(`Error al validar usuarios por institución: ${usersError.message}`);
          }

          // Crear un mapa de documentos válidos
          const validDocuments = new Set((usersData || []).map((u: any) => u.identity_document));

          // Filtrar usuarios que no pertenecen a la institución
          usersToProcess = users.filter(
            (u) => !u.identity_document || validDocuments.has(u.identity_document)
          );

          // Si se filtraron usuarios, informar
          if (usersToProcess.length < users.length) {
            const filteredCount = users.length - usersToProcess.length;
            console.warn(
              `⚠️ ${filteredCount} usuario(s) no pertenecen a la institución ${institutionId} y fueron excluidos`
            );
          }
        }
      }

      // Convertir array de usuarios a JSONB con información de pago
      const usersJson = usersToProcess.map((user) => {
        // Determinar is_active basado en paid si no está definido
        let isActive = user.is_active;
        if (isActive === undefined && user.paid !== undefined) {
          isActive = this.parsePaymentStatus(user.paid);
        }

        return {
          identity_document: user.identity_document,
          is_active: isActive,
          paid: user.paid,
          payment_date: user.payment_date,
          amount: user.amount,
        };
      });

      const { data, error } = await supabase.rpc('process_payments_and_update_status', {
        p_users: usersJson,
      });

      if (error) throw error;
      return data as SuspendReactivateResult;
    } catch (error: any) {
      console.error('Error procesando pagos:', error);
      return {
        success: false,
        total: users.length,
        success_count: 0,
        failed_count: users.length,
        results: users.map((u) => ({
          success: false,
          identity_document: u.identity_document || '',
          error: error.message || 'Error desconocido',
        })),
      };
    }
  },
};
