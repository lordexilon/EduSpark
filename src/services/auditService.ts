
import { supabase } from '@/lib/supabase';

export type AuditAction =
    | 'VIEW_PROFILE'
    | 'UPDATE_PROFILE'
    | 'EXPORT_DATA'
    | 'DELETE_REQUEST'
    | 'LOGIN'
    | 'LOGOUT'
    | 'VIEW_REPORT'
    | 'AI_USAGE_EXCEEDED';

export type ResourceType = 'user' | 'course' | 'report' | 'system' | 'ai_limit';

export const auditService = {
    /**
     * Registra una acción en el log de auditoría
     */
    async logAction(
        userId: string,
        action: AuditAction,
        resourceType: ResourceType,
        resourceId?: string,
        metadata: Record<string, any> = {},
        ipAddress?: string
    ) {
        try {
            const { error } = await supabase.from('audit_logs').insert({
                user_id: userId,
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                metadata,
                ip_address: ipAddress
            });

            if (error) {
                console.error('Error recording audit log:', error);
                // No lanzamos error para no interrumpir el flujo principal
            }
        } catch (err) {
            console.error('Unexpected error recording audit log:', err);
        }
    }
};
