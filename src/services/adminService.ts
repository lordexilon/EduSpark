// src/services/adminService.ts
// ------------------------------------------------------------
// Servicio para generar reportes de dispositivos para administradores
// ------------------------------------------------------------

import { supabase } from '@/lib/supabase';

/**
 * Información de un dispositivo registrado.
 */
export interface DeviceReport {
  id: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip_address: string;
  is_active: boolean;
  last_activity_at: string;
  session_id: string;
}

/**
 * Resumen de dispositivos por usuario.
 * Para admin global incluye `institution_name`.
 */
export interface UserDeviceReport {
  user_id: string;
  user_name: string;
  user_email: string;
  institution_name?: string;
  active_devices_count: number;
  total_devices_count: number;
  last_access: string;
  devices: DeviceReport[];
}

export const adminService = {
  /**
   * Reporte completo para administradores globales.
   * Devuelve todos los usuarios y sus dispositivos con IP completa.
   */
  async getDevicesReportAdmin(): Promise<UserDeviceReport[]> {
    try {
      const { data, error } = await supabase.rpc('get_devices_report_admin');
      if (error) {
        console.error('❌ Error obteniendo reporte admin:', error);
        throw error;
      }
      return data as UserDeviceReport[];
    } catch (err: any) {
      console.error('❌ adminService.getDevicesReportAdmin error:', err);
      throw new Error(err.message || 'Error obteniendo reporte de admin');
    }
  },

  /**
   * Reporte para administradores de campus.
   * Solo usuarios de la institución del admin y con IP ofuscada.
   */
  async getDevicesReportCampus(): Promise<UserDeviceReport[]> {
    try {
      const { data, error } = await supabase.rpc('get_devices_report_campus');
      if (error) {
        console.error('❌ Error obteniendo reporte campus:', error);
        throw error;
      }
      return data as UserDeviceReport[];
    } catch (err: any) {
      console.error('❌ adminService.getDevicesReportCampus error:', err);
      throw new Error(err.message || 'Error obteniendo reporte de campus');
    }
  },

  /**
   * Revocar sesión de un dispositivo (usado en el modal).
   * @param userId - ID del usuario al que pertenece el dispositivo
   * @param deviceId - ID del dispositivo a revocar
   * @param justification - Justificación (obligatoria para admin‑campus)
   */
  async revokeDevice(userId: string, deviceId: string, justification?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('revoke_device_session', {
        p_user_id: userId,
        p_device_id: deviceId,
        p_justification: justification || null,
      });
      if (error) {
        console.error('❌ Error revocando dispositivo:', error);
        throw error;
      }
    } catch (err: any) {
      console.error('❌ adminService.revokeDevice error:', err);
      throw new Error(err.message || 'Error revocando dispositivo');
    }
  },
};
