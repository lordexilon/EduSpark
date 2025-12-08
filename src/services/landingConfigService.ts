import { supabase } from '../lib/supabase';

export interface GalleryImage {
    url: string;
    caption: string;
}

export interface FeaturedStudent {
    name: string;
    career: string;
    place: string;
    image: string;
}

export interface LandingConfig {
    id: number;
    institution_id: number;
    brand_name: string;
    logo_url?: string;
    hero_title: string;
    hero_subtitle: string;
    hero_image_url?: string;
    hero_button_text: string;
    philosophy_title: string;
    philosophy_content?: string;
    notification_text?: string;
    notification_enabled: boolean;
    primary_color: string;
    secondary_color: string;
    gallery_title: string;
    gallery_description: string;
    gallery_images: GalleryImage[];
    featured_students: FeaturedStudent[];
    contact_email?: string;
    contact_phone?: string;
    contact_whatsapp?: string;
    contact_address?: string;
    calendar_embed_url?: string;
    created_at: string;
    updated_at: string;
}

export interface LandingConfigInput {
    institution_id: number;
    brand_name: string;
    logo_url?: string;
    hero_title: string;
    hero_subtitle: string;
    hero_image_url?: string;
    hero_button_text?: string;
    philosophy_title?: string;
    philosophy_content?: string;
    notification_text?: string;
    notification_enabled?: boolean;
    primary_color?: string;
    secondary_color?: string;
    gallery_title?: string;
    gallery_description?: string;
    gallery_images?: GalleryImage[];
    featured_students?: FeaturedStudent[];
    contact_email?: string;
    contact_phone?: string;
    contact_whatsapp?: string;
    contact_address?: string;
    calendar_embed_url?: string;
}

class LandingConfigService {
    /**
     * Get landing page configuration by institution ID
     */
    async getByInstitutionId(institutionId: number): Promise<LandingConfig | null> {
        const { data, error } = await supabase
            .from('institution_landing_config')
            .select('*')
            .eq('institution_id', institutionId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching landing config:', error);
            throw error;
        }

        return data;
    }

    /**
     * Get landing page configuration by institution slug (using name as fallback)
     */
    async getBySlug(slug: string): Promise<LandingConfig | null> {
        const { data, error } = await supabase
            .from('institution_landing_config')
            .select(`
                *,
                institutions!inner(slug)
            `)
            .eq('institutions.slug', slug.toLowerCase())
            .maybeSingle();

        if (error) {
            console.error('Error fetching landing config by slug:', error);
            throw error;
        }

        return data;
    }

    /**
     * Get all landing page configurations (admin only)
     */
    async getAll(): Promise<LandingConfig[]> {
        const { data, error } = await supabase
            .from('institution_landing_config')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all landing configs:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Create a new landing page configuration
     */
    async create(config: LandingConfigInput): Promise<LandingConfig> {
        const { data, error } = await supabase
            .from('institution_landing_config')
            .insert([config])
            .select()
            .maybeSingle();

        if (error) {
            console.error('Error creating landing config:', error);
            throw error;
        }

        return data;
    }

    /**
     * Update landing page configuration
     */
    async update(id: number, config: Partial<LandingConfigInput>): Promise<LandingConfig> {
        const { data, error } = await supabase
            .from('institution_landing_config')
            .update(config)
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Error updating landing config:', error);
            throw error;
        }

        return data;
    }

    /**
     * Update landing page configuration by institution ID
     */
    async updateByInstitutionId(institutionId: number, config: Partial<LandingConfigInput>): Promise<LandingConfig> {
        const { data, error } = await supabase
            .from('institution_landing_config')
            .update(config)
            .eq('institution_id', institutionId)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Error updating landing config by institution:', error);
            throw error;
        }

        return data;
    }

    /**
     * Delete landing page configuration
     */
    async delete(id: number): Promise<void> {
        const { error } = await supabase
            .from('institution_landing_config')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting landing config:', error);
            throw error;
        }
    }

    /**
     * Get landing config for current user's institution (admin-campus)
     */
    async getForCurrentUser(): Promise<LandingConfig | null> {
        try {
            // First get the user's institution
            const { data: userData, error: userError } = await supabase.auth.getUser();

            if (userError || !userData.user) {
                console.warn('User not authenticated or error getting user:', userError);
                return null;
            }

            const { data: userInstitution, error: instError } = await supabase
                .from('user_institutions')
                .select('institution_id')
                .eq('user_id', userData.user.id)
                .maybeSingle();

            if (instError || !userInstitution) {
                console.warn('No institution found for user or error:', instError);
                return null;
            }

            return this.getByInstitutionId(userInstitution.institution_id);
        } catch (error) {
            console.error('Error in getForCurrentUser:', error);
            return null;
        }
    }
}

export const landingConfigService = new LandingConfigService();
