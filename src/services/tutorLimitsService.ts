import { supabase } from '@/lib/supabase';

export interface AiLimitCheckResult {
    allowed: boolean;
    reason?: string;
}

export const checkAiEligibility = async (
    userId: string,
    institutionId?: string,
    estimatedCost: number = 0.0005
): Promise<AiLimitCheckResult> => {
    try {
        const { data, error } = await supabase.rpc('check_ai_request_eligibility', {
            p_user_id: userId,
            p_institution_id: institutionId || null,
            p_estimated_cost: estimatedCost
        });

        if (error) {
            console.error('Error checking AI limits:', error);
            // Fail safe: If error (e.g. function missing), allow but log
            // Or block? Better to block if we are strict about costs.
            // But for now, let's block and return error reason.
            return { allowed: false, reason: 'Error checking limits: ' + error.message };
        }

        // RPC returns a table/record, data is an array
        if (data && data.length > 0) {
            return { allowed: data[0].allowed, reason: data[0].reason };
        }

        return { allowed: false, reason: 'Unknown limit status' };
    } catch (err) {
        console.error('Unexpected error in checkAiEligibility:', err);
        return { allowed: false, reason: 'System error' };
    }
};

export const logAiUsage = async (
    userId: string,
    institutionId: string | undefined,
    tokensInput: number,
    tokensOutput: number,
    cost: number
): Promise<void> => {
    try {
        const { error } = await supabase.rpc('log_ai_usage', {
            p_user_id: userId,
            p_institution_id: institutionId || null,
            p_tokens_input: tokensInput,
            p_tokens_output: tokensOutput,
            p_cost_usd: cost
        });

        if (error) {
            console.error('Error logging AI usage:', error);
        }
    } catch (err) {
        console.error('Unexpected error in logAiUsage:', err);
    }
};

export const getAiImageQuota = async (
    userId: string,
    institutionId?: string
): Promise<number> => {
    try {
        const { data, error } = await supabase.rpc('get_ai_image_quota', {
            p_user_id: userId,
            p_institution_id: institutionId || null
        });

        if (error) {
            console.error('Error fetching AI image quota:', error);
            return 0;
        }

        return data as number;
    } catch (err) {
        console.error('Unexpected error in getAiImageQuota:', err);
        return 0;
    }
};
