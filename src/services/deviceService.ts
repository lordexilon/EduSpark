/**
 * Device Management Service
 * Servicio para gestionar dispositivos de usuarios con límite de 3 activos
 * Implementa modelo ético de tres niveles de acceso
 */

import { supabase } from '../lib/supabase';
import { getDeviceFingerprint, getUserIP, type DeviceInfo } from '../utils/deviceFingerprint';

export interface UserDevice {
    id: string;
    device_name: string;
    device_type: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
    ip_address: string;
    first_login_at: string;
    last_activity_at: string;
    is_active: boolean;
    is_current: boolean;
}

export interface RegisterDeviceResult {
    success: boolean;
    message: string;
    deviceId: string;
    removedDeviceId?: string;
    removedDeviceName?: string;
}

export interface DeviceAccessLog {
    id: string;
    admin_user_id: string;
    target_user_id: string;
    action: string;
    device_id?: string;
    justification?: string;
    ip_address: string;
    created_at: string;
}

export const deviceService = {
    /**
     * Registrar dispositivo al hacer login
     * Automáticamente cierra sesión en el dispositivo más antiguo si hay 3 activos
     * @param userId - ID del usuario
     * @param sessionId - ID de sesión de Supabase
     * @returns {Promise<RegisterDeviceResult>} Resultado del registro
     */
    async registerDevice(userId: string, sessionId: string): Promise<RegisterDeviceResult> {
        try {
            console.log('📱 Registrando dispositivo...');
            console.log('👤 User ID:', userId);
            console.log('🔑 Session ID:', sessionId);

            // Obtener información del dispositivo
            const deviceInfo: DeviceInfo = await getDeviceFingerprint();
            console.log('🔍 Device fingerprint:', deviceInfo.fingerprint);
            console.log('📱 Device info:', {
                name: deviceInfo.deviceName,
                type: deviceInfo.deviceType,
                browser: deviceInfo.browser,
                os: deviceInfo.os
            });

            // Obtener IP del usuario
            const ip = await getUserIP();
            console.log('🌐 IP del usuario:', ip);

            // Preparar parámetros
            const params = {
                p_user_id: userId,
                p_device_fingerprint: deviceInfo.fingerprint,
                p_device_name: deviceInfo.deviceName,
                p_device_type: deviceInfo.deviceType,
                p_browser: deviceInfo.browser,
                p_os: deviceInfo.os,
                p_session_id: sessionId,
                p_ip_address: ip,
                p_user_agent: deviceInfo.userAgent
            };

            console.log('📤 Parámetros a enviar:', params);

            // Llamar a la función RPC
            const { data, error } = await supabase.rpc('register_user_device', params);

            if (error) {
                console.error('❌ Error RPC completo:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    error: error
                });
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error('No se recibió respuesta del servidor');
            }

            const result = data[0];

            console.log('✅ Dispositivo registrado:', result);

            return {
                success: result.success,
                message: result.message,
                deviceId: result.device_id,
                removedDeviceId: result.removed_device_id || undefined,
                removedDeviceName: result.removed_device_name || undefined
            };
        } catch (error: any) {
            console.error('❌ Error en registerDevice:', error);
            console.error('❌ Error completo:', {
                message: error.message,
                stack: error.stack,
                error: error
            });
            throw new Error(error.message || 'Error registrando dispositivo');
        }
    },

    /**
     * Obtener dispositivos del usuario
     * Implementa ofuscación de IP según rol (admin-campus ve IP parcial)
     * @param userId - ID del usuario
     * @returns {Promise<UserDevice[]>} Lista de dispositivos
     */
    async getUserDevices(userId: string): Promise<UserDevice[]> {
        try {
            console.log('📱 Obteniendo dispositivos del usuario:', userId);

            const { data, error } = await supabase.rpc('get_user_devices_by_role', {
                p_user_id: userId
            });

            if (error) {
                console.error('❌ Error obteniendo dispositivos:', error);
                throw error;
            }

            console.log('✅ Dispositivos obtenidos:', data?.length || 0);
            return data || [];
        } catch (error: any) {
            console.error('❌ Error en getUserDevices:', error);

            // Si el error es de permisos, lanzarlo tal cual
            if (error.message?.includes('permiso')) {
                throw error;
            }

            throw new Error('Error obteniendo dispositivos');
        }
    },

    /**
     * Cerrar sesión en un dispositivo específico
     * Admin-campus requiere justificación obligatoria
     * @param userId - ID del usuario
     * @param deviceId - ID del dispositivo
     * @param justification - Justificación (obligatoria para admin-campus)
     * @returns {Promise<boolean>} True si se cerró correctamente
     */
    async revokeDevice(
        userId: string,
        deviceId: string,
        justification?: string
    ): Promise<boolean> {
        try {
            console.log('🔒 Cerrando sesión en dispositivo:', deviceId);

            const { data, error } = await supabase.rpc('revoke_device_session', {
                p_user_id: userId,
                p_device_id: deviceId,
                p_justification: justification || null
            });

            if (error) {
                console.error('❌ Error revocando dispositivo:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error('No se recibió respuesta del servidor');
            }

            const result = data[0];

            if (!result.success) {
                throw new Error(result.message);
            }

            console.log('✅ Sesión cerrada correctamente');
            return true;
        } catch (error: any) {
            console.error('❌ Error en revokeDevice:', error);

            // Propagar el mensaje de error original
            throw new Error(error.message || 'Error cerrando sesión');
        }
    },

    /**
     * Obtener logs de acceso administrativo a dispositivos
     * Solo disponible para admins
     * @param targetUserId - ID del usuario objetivo (opcional)
     * @returns {Promise<DeviceAccessLog[]>} Logs de acceso
     */
    async getAccessLogs(targetUserId?: string): Promise<DeviceAccessLog[]> {
        try {
            let query = supabase
                .from('device_access_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (targetUserId) {
                query = query.eq('target_user_id', targetUserId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ Error obteniendo logs:', error);
                throw error;
            }

            return data || [];
        } catch (error: any) {
            console.error('❌ Error en getAccessLogs:', error);
            throw new Error('Error obteniendo logs de acceso');
        }
    },

    /**
     * Actualizar última actividad del dispositivo actual
     * Debe llamarse periódicamente para mantener el dispositivo activo
     * @param userId - ID del usuario
     * @returns {Promise<void>}
     */
    async updateDeviceActivity(userId: string): Promise<void> {
        try {
            const deviceInfo = await getDeviceFingerprint();

            const { error } = await supabase
                .from('user_devices')
                .update({
                    last_activity_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('device_fingerprint', deviceInfo.fingerprint)
                .eq('is_active', true);

            if (error) {
                console.warn('⚠️ Error actualizando actividad:', error);
                // No lanzar error, es una operación no crítica
            }
        } catch (error) {
            console.warn('⚠️ Error en updateDeviceActivity:', error);
            // No lanzar error, es una operación no crítica
        }
    },

    /**
     * Verificar si el dispositivo actual está activo
     * Útil para validar sesión en cada request
     * @param userId - ID del usuario
     * @returns {Promise<boolean>} True si el dispositivo está activo
     */
    async isDeviceActive(userId: string): Promise<boolean> {
        try {
            const deviceInfo = await getDeviceFingerprint();

            const { data, error } = await supabase
                .from('user_devices')
                .select('is_active')
                .eq('user_id', userId)
                .eq('device_fingerprint', deviceInfo.fingerprint)
                .maybeSingle();

            if (error) {
                console.warn('⚠️ Error verificando dispositivo:', error);
                return true; // Asumir activo en caso de error
            }

            return data?.is_active ?? true;
        } catch (error) {
            console.warn('⚠️ Error en isDeviceActive:', error);
            return true; // Asumir activo en caso de error
        }
    },

    /**
     * Obtener el dispositivo actual
     * @param userId - ID del usuario
     * @returns {Promise<UserDevice | null>} Dispositivo actual o null
     */
    async getCurrentDevice(userId: string): Promise<UserDevice | null> {
        try {
            const devices = await this.getUserDevices(userId);
            return devices.find(d => d.is_current) || null;
        } catch (error) {
            console.error('❌ Error obteniendo dispositivo actual:', error);
            return null;
        }
    }
};
