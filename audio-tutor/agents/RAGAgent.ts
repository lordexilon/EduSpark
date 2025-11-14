// =====================================================
// Agente RAG para Audio-Tutor Multi-Agente
// Búsqueda contextual de información con A2A (Agent-to-Agent)
// =====================================================

import { ragService } from '../services/ragService';
import type { 
  RAGResponse, 
  ConversationContext
} from '../types/agents';
import type { 
  PedagogicalSettings, 
  StudentProfile,
  PersonalizedPrompt 
} from '../types/pedagogical';

// =====================================================
// Clase RAGAgent
// =====================================================

export class RAGAgent {
  private ragService = ragService;

  /**
   * Realiza una consulta contextual usando RAG con A2A
   */
  async query(
    question: string,
    context: ConversationContext
  ): Promise<RAGResponse> {
    try {
      // Enriquecer contexto con personalización pedagógica
      const enrichedContext = this.enrichContextWithPedagogy(
        question,
        context.pedagogicalSettings,
        context.studentProfile
      );

      // Enviar consulta al servicio RAG con contexto enriquecido
      const response = await this.ragService.processQueryWithContext(
        enrichedContext,
        context
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get response from RAG service');
      }

      // Procesar respuesta del servicio RAG
      const ragResponse = this.processRAGResponse(response.data, context);

      return ragResponse;

    } catch (error) {
      console.error('RAG query error:', error);
      return {
        answer: 'Lo siento, estoy teniendo problemas para acceder a la información del curso. Por favor, inténtalo de nuevo más tarde.',
        context: '',
        sources: [],
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Enriquece el contexto con personalización pedagógica
   */
  private enrichContextWithPedagogy(
    question: string,
    pedagogicalSettings: PedagogicalSettings,
    studentProfile: StudentProfile
  ): string {
    const personalizedPrompt = this.createPersonalizedPrompt(
      question,
      pedagogicalSettings,
      studentProfile
    );

    return personalizedPrompt.userPrompt;
  }

  /**
   * Crea un prompt personalizado basado en configuración pedagógica
   */
  private createPersonalizedPrompt(
    question: string,
    pedagogicalSettings: PedagogicalSettings,
    studentProfile: StudentProfile
  ): PersonalizedPrompt {
    const systemPrompt = this.buildSystemPrompt(pedagogicalSettings, studentProfile);
    const userPrompt = this.buildUserPrompt(question, pedagogicalSettings, studentProfile);
    const context = this.buildContext(pedagogicalSettings, studentProfile);

    return {
      systemPrompt,
      userPrompt,
      context,
      examples: pedagogicalSettings.useExamples ? this.getExamples(pedagogicalSettings) : undefined,
      voiceInstructions: this.getVoiceInstructions(pedagogicalSettings)
    };
  }

  /**
   * Construye el prompt del sistema personalizado
   */
  private buildSystemPrompt(
    pedagogicalSettings: PedagogicalSettings,
    studentProfile: StudentProfile
  ): string {
    let prompt = `Eres EduSpark, un tutor de IA especializado en educación.`;

    // Estilo pedagógico
    switch (pedagogicalSettings.teachingStyle) {
      case 'socratico':
        prompt += ` Tu metodología es socrática: haz preguntas guiadas para que el estudiante llegue a sus propias conclusiones.`;
        break;
      case 'directo':
        prompt += ` Tu metodología es directa: proporciona explicaciones claras y estructuradas.`;
        break;
      case 'colaborativo':
        prompt += ` Tu metodología es colaborativa: fomenta el trabajo en equipo y la discusión.`;
        break;
      case 'constructivista':
        prompt += ` Tu metodología es constructivista: ayuda al estudiante a construir su propio conocimiento.`;
        break;
    }

    // Tono
    switch (pedagogicalSettings.tonePreference) {
      case 'amigable':
        prompt += ` Mantén un tono amigable y cercano.`;
        break;
      case 'formal':
        prompt += ` Mantén un tono académico y profesional.`;
        break;
      case 'motivador':
        prompt += ` Mantén un tono alentador y positivo.`;
        break;
      case 'neutro':
        prompt += ` Mantén un tono equilibrado y objetivo.`;
        break;
    }

    // Nivel de detalle
    switch (pedagogicalSettings.detailLevel) {
      case 'basico':
        prompt += ` Explica de manera simple y directa, evitando tecnicismos.`;
        break;
      case 'medio':
        prompt += ` Proporciona explicaciones balanceadas con el nivel apropiado de detalle.`;
        break;
      case 'avanzado':
        prompt += ` Proporciona explicaciones detalladas y técnicas cuando sea apropiado.`;
        break;
    }

    // Estilo de aprendizaje del estudiante
    switch (studentProfile.preferredLearningStyle) {
      case 'visual':
        prompt += ` Incluye descripciones visuales y diagramas conceptuales cuando sea posible.`;
        break;
      case 'auditivo':
        prompt += ` Usa analogías sonoras y ritmo en tus explicaciones.`;
        break;
      case 'kinestesico':
        prompt += ` Incluye ejemplos prácticos y actividades que el estudiante pueda realizar.`;
        break;
      case 'lectoescritor':
        prompt += ` Proporciona explicaciones escritas detalladas y estructuradas.`;
        break;
    }

    // Configuraciones adicionales
    if (pedagogicalSettings.useExamples) {
      prompt += ` Siempre incluye ejemplos prácticos relevantes.`;
    }

    if (pedagogicalSettings.encourageQuestions) {
      prompt += ` Fomenta que el estudiante haga preguntas y participen activamente.`;
    }

    // Temas de dificultad del estudiante
    if (studentProfile.topicsStruggled.length > 0) {
      prompt += ` El estudiante ha tenido dificultades con: ${studentProfile.topicsStruggled.join(', ')}. Ten esto en cuenta en tus explicaciones.`;
    }

    // Temas dominados
    if (studentProfile.topicsMastered.length > 0) {
      prompt += ` El estudiante domina: ${studentProfile.topicsMastered.join(', ')}. Puedes usar estos conocimientos como base.`;
    }

    prompt += ` Responde basándote ÚNICAMENTE en el contexto del material del curso. Si no encuentras la información, di: "No encuentro esa información en el material del curso."`;
    
    // Instrucción de idioma: responder en el mismo idioma que el usuario
    prompt += ` IMPORTANTE: Responde siempre en el mismo idioma en que el estudiante te pregunta (español o inglés). Si pregunta en inglés, responde en inglés; si pregunta en español, responde en español.`;

    return prompt;
  }

  /**
   * Construye el prompt del usuario
   */
  private buildUserPrompt(
    question: string,
    pedagogicalSettings: PedagogicalSettings,
    studentProfile: StudentProfile
  ): string {
    let prompt = `Pregunta del estudiante: ${question}`;

    // Agregar contexto de progreso
    if (studentProfile.interactionCount > 0) {
      prompt += `\n\nContexto: Esta es la interacción #${studentProfile.interactionCount} del estudiante en este curso.`;
    }

    return prompt;
  }

  /**
   * Construye el contexto adicional
   */
  private buildContext(
    pedagogicalSettings: PedagogicalSettings,
    studentProfile: StudentProfile
  ): string {
    const contextParts = [];

    contextParts.push(`Configuración pedagógica:`);
    contextParts.push(`- Estilo: ${pedagogicalSettings.teachingStyle}`);
    contextParts.push(`- Tono: ${pedagogicalSettings.tonePreference}`);
    contextParts.push(`- Nivel: ${pedagogicalSettings.detailLevel}`);
    contextParts.push(`- Ejemplos: ${pedagogicalSettings.useExamples ? 'Sí' : 'No'}`);
    contextParts.push(`- Preguntas: ${pedagogicalSettings.encourageQuestions ? 'Sí' : 'No'}`);

    contextParts.push(`\nPerfil del estudiante:`);
    contextParts.push(`- Estilo de aprendizaje: ${studentProfile.preferredLearningStyle}`);
    contextParts.push(`- Interacciones: ${studentProfile.interactionCount}`);
    contextParts.push(`- Temas con dificultad: ${studentProfile.topicsStruggled.join(', ') || 'Ninguno'}`);
    contextParts.push(`- Temas dominados: ${studentProfile.topicsMastered.join(', ') || 'Ninguno'}`);

    return contextParts.join('\n');
  }

  /**
   * Obtiene ejemplos relevantes según la configuración
   */
  private getExamples(pedagogicalSettings: PedagogicalSettings): string[] {
    const examples = [];

    if (pedagogicalSettings.teachingStyle === 'socratico') {
      examples.push('¿Qué opinas sobre...?', '¿Cómo crees que se relaciona...?', '¿Qué pasaría si...?');
    }

    if (pedagogicalSettings.detailLevel === 'basico') {
      examples.push('Imagina que...', 'Es como cuando...', 'Piénsalo así...');
    }

    return examples;
  }

  /**
   * Obtiene instrucciones de voz
   */
  private getVoiceInstructions(pedagogicalSettings: PedagogicalSettings): string {
    const instructions = [];

    instructions.push(`Usar voz: ${pedagogicalSettings.voiceName}`);
    instructions.push(`Velocidad: ${pedagogicalSettings.voiceSpeed}x`);

    if (pedagogicalSettings.tonePreference === 'motivador') {
      instructions.push('Usar entonación alentadora');
    }

    return instructions.join(', ');
  }

  /**
   * Procesa la respuesta del servicio RAG
   */
  private processRAGResponse(
    ragResponse: any,
    context: ConversationContext
  ): RAGResponse {
    return {
      answer: ragResponse.message,
      context: ragResponse.metadata.contextUsed || '',
      sources: ragResponse.metadata.sources || [],
      confidence: ragResponse.metadata.confidence || 0.8,
      metadata: {
        model: ragResponse.metadata.model,
        source: ragResponse.metadata.source,
        timestamp: ragResponse.metadata.timestamp,
        pedagogicalSettings: context.pedagogicalSettings,
        studentProfile: context.studentProfile
      }
    };
  }

  /**
   * Extrae fuentes de la respuesta
   */
  private extractSources(ragResponse: any): string[] {
    // Las fuentes ya vienen en el metadata del servicio RAG
    return ragResponse.metadata?.sources || ['Material del curso'];
  }

  /**
   * Calcula la confianza de la respuesta
   */
  private calculateConfidence(
    ragResponse: any,
    context: ConversationContext
  ): number {
    let confidence = ragResponse.metadata?.confidence || 0.5; // Base

    // Aumentar confianza si hay contexto usado
    if (ragResponse.metadata?.contextUsed && ragResponse.metadata.contextUsed.length > 100) {
      confidence += 0.2;
    }

    // Aumentar confianza si la respuesta es larga y detallada
    if (ragResponse.message.length > 200) {
      confidence += 0.1;
    }

    // Aumentar confianza si el estudiante tiene experiencia en el tema
    if (context.studentProfile.topicsMastered.length > 0) {
      confidence += 0.1;
    }

    // Reducir confianza si hay muchos temas de dificultad
    if (context.studentProfile.topicsStruggled.length > 3) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Aplica el perfil del estudiante a la respuesta
   */
  applyStudentProfile(
    response: string,
    profile: StudentProfile
  ): string {
    let personalizedResponse = response;

    // Adaptar según estilo de aprendizaje
    switch (profile.preferredLearningStyle) {
      case 'visual':
        personalizedResponse = this.addVisualElements(personalizedResponse);
        break;
      case 'auditivo':
        personalizedResponse = this.addAuditoryElements(personalizedResponse);
        break;
      case 'kinestesico':
        personalizedResponse = this.addKinestheticElements(personalizedResponse);
        break;
      case 'lectoescritor':
        personalizedResponse = this.addReadingElements(personalizedResponse);
        break;
    }

    return personalizedResponse;
  }

  /**
   * Agrega elementos visuales a la respuesta
   */
  private addVisualElements(response: string): string {
    // Deshabilitar la adición aleatoria de elementos visuales
    // que estaba causando que las respuestas se corrompieran
    return response;
  }

  /**
   * Agrega elementos auditivos a la respuesta
   */
  private addAuditoryElements(response: string): string {
    return response.replace(/\./g, '... '); // Pausas más largas
  }

  /**
   * Agrega elementos kinestésicos a la respuesta
   */
  private addKinestheticElements(response: string): string {
    if (!response.includes('practica') && !response.includes('ejercicio')) {
      return response + '\n\n💡 Te sugiero practicar este concepto con ejercicios prácticos.';
    }
    return response;
  }

  /**
   * Agrega elementos de lectura a la respuesta
   */
  private addReadingElements(response: string): string {
    if (!response.includes('1.') && !response.includes('•')) {
      return response.replace(/(\w+)/g, (match, index) => {
        if (index === 0) return `1. ${match}`;
        return match;
      });
    }
    return response;
  }
}
