import { supabase } from '@/lib/supabase';

export interface AiLimitCheckResult {
  allowed: boolean;
  reason?: string;
}

// Type used by TutorVirtualPage for time-based limits
export interface TutorLimits {
  ttsEnabled: boolean;
  dailyTimeLimitMinutes: number;
  remainingTimeToday: number;
  planType: string;
}

/**
 * Namespace-style object for backward-compatible access from TutorVirtualPage.
 * These are lightweight stubs – the real cost/limit enforcement happens in
 * checkAiEligibility (RPC-based).
 */
export const tutorLimitsService = {
  /** Returns effective limits for a user. Stub: returns generous defaults. */
  async getEffectiveLimits(_userId: string): Promise<TutorLimits> {
    // In the current architecture the real gate is check_ai_request_eligibility RPC.
    // This stub keeps TutorVirtualPage functional without a dedicated limits table.
    return {
      ttsEnabled: false,
      dailyTimeLimitMinutes: 120,
      remainingTimeToday: 120,
      planType: 'standard',
    };
  },

  /** Estimate interaction time in minutes based on response length. */
  estimateInteractionTime(responseLength: number, hasTTS: boolean): number {
    // ~200 words per minute reading speed, plus TTS overhead
    const readingMinutes = responseLength / 5 / 200; // chars -> words -> minutes
    const ttsOverhead = hasTTS ? readingMinutes * 0.5 : 0;
    return readingMinutes + ttsOverhead;
  },

  /** Track time usage. Stub always succeeds. */
  async trackTimeUsage(
    _userId: string,
    _minutes: number,
    _hasTTS: boolean
  ): Promise<{ limitExceeded: boolean }> {
    return { limitExceeded: false };
  },
};

export const checkAiEligibility = async (
  userId: string,
  institutionId?: string,
  estimatedCost: number = 0.0005
): Promise<AiLimitCheckResult> => {
  try {
    const { data, error } = await supabase.rpc('check_ai_request_eligibility', {
      p_user_id: userId,
      p_institution_id: institutionId || null,
      p_estimated_cost: estimatedCost,
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
      p_cost_usd: cost,
    });

    if (error) {
      console.error('Error logging AI usage:', error);
    }
  } catch (err) {
    console.error('Unexpected error in logAiUsage:', err);
  }
};

export const getAiImageQuota = async (userId: string, institutionId?: string): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('get_ai_image_quota', {
      p_user_id: userId,
      p_institution_id: institutionId || null,
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
