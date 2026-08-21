import { supabase } from '@/lib/supabase';
import { Flashcard } from './flashcardService';
import { checkAiEligibility } from './tutorLimitsService';

// Tipos para la respuesta de la API de IA
export interface ExtractedTopic {
  id: string;
  title: string;
  snippet: string;
  relevance: number;
  cardCount: number;
  selected: boolean;
}

export interface GenerationRequest {
  type: 'text' | 'pdf' | 'docx' | 'pptx' | 'video';
  content: string;
  options?: {
    detailLevel?: 'basic' | 'advanced';
    language?: 'es' | 'en';
  };
}

export interface CourseStructure {
  title: string;
  description: string;
  units: {
    number: number;
    title: string;
    description: string;
    sessions: {
      title: string;
      description: string;
    }[];
  }[];
}

// Clase para manejar la interacción con la IA
export class AiService {
  /**
   * Analiza el contenido para extraer temas clave
   */
  static async analyzeContent(request: GenerationRequest): Promise<ExtractedTopic[]> {
    console.log('Real AI Analysis for:', request.type);

    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { action: 'analyze', ...request },
      });

      if (error) {
        console.error('Error from Supabase Function (Analyze):', error);
        throw error;
      }

      if (data && !Array.isArray(data)) {
        // Si devuelve un objeto error con status 200
        if (data.error) {
          console.error('Supabase Function returned functional error:', data.error);
          throw new Error(data.error);
        }
        // Si devuelve algo desconocido
        console.warn('Unexpected response format (not array):', data);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('AI Analysis Failed (Real Error propagated):', err);
      throw err;
      // DISABLE MOCKS FOR DEBUGGING
      // console.warn("Falling back to mock analysis due to error:", err);
      // ... mocks commented out ...
    }
  }

  /**
   * Genera la estructura completa de un curso basada en el contenido extraído
   */
  static async generateCourseStructure(content: string): Promise<CourseStructure> {
    console.log('Generando estructura de curso con IA...');

    // 1. Check Limits (Cost estim: ~$0.01 for structure)
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const eligibility = await checkAiEligibility(user.id, undefined, 0.01);
      if (!eligibility.allowed) {
        throw new Error(`Límite de IA alcanzado: ${eligibility.reason}`);
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { action: 'generate-structure', content: content.substring(0, 40000) },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error al generar estructura del curso:', err);
      throw err;
    }
  }

  /**
   * Genera flashcards con prompts de imagen para una sesión o unidad específica
   */
  static async generateFlashcardsWithImages(
    content: string,
    context: string
  ): Promise<Flashcard[]> {
    console.log('Generando flashcards con prompts de imagen...');

    // 1. Check Limits (Cost estim: ~$0.02 for flashcards+images)
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const eligibility = await checkAiEligibility(user.id, undefined, 0.02);
      if (!eligibility.allowed) {
        throw new Error(`Límite de IA alcanzado: ${eligibility.reason}`);
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          action: 'generate-with-images',
          content: content.substring(0, 20000),
          context,
        },
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al generar flashcards con imágenes:', err);
      throw err;
    }
  }

  /**
   * Genera un quiz automático basado en contenido
   */
  static async generateQuiz(
    content: string,
    options: { numQuestions: number; difficulty: string }
  ): Promise<any[]> {
    console.log('Generando quiz con IA...');

    // 1. Check Limits (Cost estim: ~$0.03 for quiz generation)
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const eligibility = await checkAiEligibility(user.id, undefined, 0.03);
      if (!eligibility.allowed) {
        throw new Error(`Límite de IA alcanzado: ${eligibility.reason}`);
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          action: 'generate-quiz',
          content: content.substring(0, 40000),
          ...options,
        },
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al generar quiz:', err);
      throw err;
    }
  }

  /**
   * Genera flashcards basadas en temas seleccionados
   */
  static async generateCards(topics: ExtractedTopic[], content: string): Promise<Flashcard[]> {
    console.log('Generando flashcards desde temas:', topics.length);

    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: {
          action: 'generate-cards',
          topics: topics.filter((t) => t.selected),
          content: content.substring(0, 30000),
        },
      });

      if (error) {
        console.error('Error from Supabase Function (Generate Cards):', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('Error generating cards:', err);
      throw err;
    }
  }

  /**
   * Mejora y traduce un prompt de imagen al inglés usando IA
   */
  static async refinePrompt(userPrompt: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { action: 'refine-prompt', prompt: userPrompt },
      });

      if (error) throw error;
      return data.prompt || userPrompt;
    } catch (err) {
      console.error('Error refining prompt:', err);
      return userPrompt;
    }
  }

  /**
   * Genera una URL de imagen de alta calidad usando el backend de EduSpark
   * Costo estimado: $0.04 USD por imagen
   */
  static async generateImage(prompt: string): Promise<string> {
    // 1. Check Limits (Cost estim: $0.04)
    const COST_PER_IMAGE = 0.04;
    const user = (await supabase.auth.getUser()).data.user;

    if (!user) throw new Error('Usuario no autenticado');

    // TODO: Obtener institution_id del contexto si es posible, por ahora null
    // Lo ideal sería pasarlo como argumento al método, pero requeriría refactor mayor.
    // Intentaremos obtenerlo de los metadatos del usuario si existen, o null.
    const institutionId = user.user_metadata?.institution_id || null;

    const eligibility = await checkAiEligibility(user.id, institutionId, COST_PER_IMAGE);
    if (!eligibility.allowed) {
      throw new Error(
        `Límite de presupuesto alcanzado: ${eligibility.reason}. No se pueden generar más imágenes hoy.`
      );
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards', {
        body: { action: 'generate-image', prompt },
      });

      if (error) throw error;

      // Verificar si el backend devolvió un error funcional
      if (data.error || !data.url) {
        const detail = data.detail || data.error || 'Unknown error';
        console.error('Image generation backend error:', detail);
        throw new Error(detail);
      }

      console.log('Image generated successfully, provider:', data.provider);

      // 2. Log Usage (Solo si tuvo éxito)
      // Asumimos ~100 tokens input, ~2000 output (imagen base64 es grande pero aquí cuenta el json response o equivalente en tokens de modelo)
      // Para imágenes, el costo monetario es lo que importa más que los tokens.
      await supabase.rpc('log_ai_usage', {
        p_user_id: user.id,
        p_institution_id: institutionId,
        p_tokens_input: 100,
        p_tokens_output: 1000,
        p_cost_usd: COST_PER_IMAGE,
      });

      return data.url;
    } catch (err) {
      console.error('Error generating image url:', err);
      throw err;
    }
  }
}
