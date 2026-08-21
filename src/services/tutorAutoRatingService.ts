// services/tutorAutoRatingService.ts
// Servicio para calificar automáticamente las respuestas del tutor

import { GoogleGenAI } from '@google/genai';

export interface AutoRatingResult {
  score: number; // 0-100
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  reasoning: string;
  criteria: {
    relevance: number; // 0-100
    completeness: number; // 0-100
    clarity: number; // 0-100
    accuracy: number; // 0-100
  };
}

/**
 * Califica automáticamente una respuesta del tutor usando Gemini
 */
export async function autoRateTutorResponse(
  question: string,
  answer: string,
  courseTitle?: string
): Promise<AutoRatingResult> {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ VITE_GEMINI_API_KEY no configurada, usando calificación por defecto');
      return getDefaultRating(answer);
    }

    const genAI = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';

    const prompt = `Eres un evaluador experto de respuestas educativas. Tu tarea es calificar la calidad de una respuesta del tutor virtual.

CONTEXTO:
${courseTitle ? `Curso: ${courseTitle}` : 'Curso general'}

PREGUNTA DEL ESTUDIANTE:
${question}

RESPUESTA DEL TUTOR:
${answer}

INSTRUCCIONES:
Evalúa la respuesta del tutor en los siguientes criterios (cada uno de 0 a 100):

1. **RELEVANCIA** (0-100): ¿La respuesta responde directamente a la pregunta del estudiante?
2. **COMPLETITUD** (0-100): ¿La respuesta es completa y cubre los aspectos importantes del tema?
3. **CLARIDAD** (0-100): ¿La respuesta es clara, bien estructurada y fácil de entender?
4. **PRECISIÓN** (0-100): ¿La información proporcionada es precisa y correcta?

Calcula un SCORE GENERAL (0-100) como promedio ponderado:
- RELEVANCIA: 30%
- COMPLETITUD: 25%
- CLARIDAD: 25%
- PRECISIÓN: 20%

Clasifica la calidad como:
- "excellent" si score >= 85
- "good" si score >= 70
- "fair" si score >= 50
- "poor" si score < 50

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "score": <número 0-100>,
  "quality": "<excellent|good|fair|poor>",
  "reasoning": "<breve explicación de 1-2 oraciones sobre la calificación>",
  "criteria": {
    "relevance": <número 0-100>,
    "completeness": <número 0-100>,
    "clarity": <número 0-100>,
    "accuracy": <número 0-100>
  }
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional antes o después.`;

    const result = await genAI.models.generateContent({
      model,
      contents: prompt,
    });
    const text = result.text;

    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(
        '⚠️ No se pudo extraer JSON de la respuesta de Gemini, usando calificación por defecto'
      );
      return getDefaultRating(answer);
    }

    const rating = JSON.parse(jsonMatch[0]) as AutoRatingResult;

    // Validar y normalizar
    rating.score = Math.max(0, Math.min(100, Math.round(rating.score || 70)));
    rating.criteria.relevance = Math.max(
      0,
      Math.min(100, Math.round(rating.criteria.relevance || 70))
    );
    rating.criteria.completeness = Math.max(
      0,
      Math.min(100, Math.round(rating.criteria.completeness || 70))
    );
    rating.criteria.clarity = Math.max(0, Math.min(100, Math.round(rating.criteria.clarity || 70)));
    rating.criteria.accuracy = Math.max(
      0,
      Math.min(100, Math.round(rating.criteria.accuracy || 70))
    );

    // Asegurar que quality sea válido
    if (!['excellent', 'good', 'fair', 'poor'].includes(rating.quality)) {
      rating.quality =
        rating.score >= 85
          ? 'excellent'
          : rating.score >= 70
            ? 'good'
            : rating.score >= 50
              ? 'fair'
              : 'poor';
    }

    console.log('✅ Respuesta calificada automáticamente:', {
      score: rating.score,
      quality: rating.quality,
    });

    return rating;
  } catch (error) {
    console.error('Error en autoRateTutorResponse:', error);
    return getDefaultRating(answer);
  }
}

/**
 * Calificación por defecto cuando no se puede usar Gemini
 */
function getDefaultRating(answer: string): AutoRatingResult {
  // Calificación básica basada en longitud y estructura
  const length = answer.length;
  const hasStructure = answer.includes('\n') || answer.includes('*') || answer.includes('-');
  const hasDetails = answer.length > 200;

  let score = 70; // Base
  if (hasStructure) score += 10;
  if (hasDetails) score += 10;
  if (length > 500) score += 5;
  if (length < 100) score -= 15;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    quality: score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor',
    reasoning: 'Calificación automática basada en estructura y longitud de la respuesta.',
    criteria: {
      relevance: 75,
      completeness: score,
      clarity: hasStructure ? 80 : 70,
      accuracy: 75,
    },
  };
}

/**
 * Convierte el score numérico a un rating booleano para compatibilidad
 * true = buena respuesta (score >= 70)
 * false = respuesta que necesita mejora (score < 70)
 */
export function scoreToRating(score: number): boolean {
  return score >= 70;
}
