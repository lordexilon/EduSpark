// services/videoTranscriptService.ts
// Servicio para extraer transcripciones de videos de YouTube y Vimeo

import { supabase } from '../lib/supabase';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface VideoPlatform {
  name: 'youtube' | 'vimeo' | 'other';
  extractId: (url: string) => string | null;
  extractTranscript: (videoId: string) => Promise<string | null>;
}

interface TranscriptResult {
  success: boolean;
  transcript?: string;
  platform?: string;
  videoId?: string;
  error?: string;
}

// =====================================================
// PLATAFORMAS DE VIDEO
// =====================================================

class YouTubePlatform implements VideoPlatform {
  name = 'youtube' as const;
  
  extractId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
  
  async extractTranscript(videoId: string): Promise<string | null> {
    try {
      // Usar la API pública de YouTube para obtener transcripciones
      // Primero intentamos obtener la lista de transcripciones disponibles
      const transcriptUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=es`;
      
      // Intentar obtener transcripción en español primero
      let response = await fetch(transcriptUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml',
        },
      });
      
      if (response.ok) {
        const xml = await response.text();
        return this.parseYouTubeTranscriptXML(xml);
      }
      
      // Si no hay transcripción en español, intentar inglés
      const transcriptUrlEn = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`;
      response = await fetch(transcriptUrlEn);
      
      if (response.ok) {
        const xml = await response.text();
        return this.parseYouTubeTranscriptXML(xml);
      }
      
      // Si no hay transcripciones automáticas, intentar con librería de terceros
      // Nota: En producción, esto debería hacerse en un backend/Edge Function
      return await this.extractWithLibrary(videoId);
    } catch (error) {
      console.error('Error extrayendo transcripción de YouTube:', error);
      return null;
    }
  }
  
  private parseYouTubeTranscriptXML(xml: string): string {
    // Parsear XML de transcripción de YouTube
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const texts = doc.querySelectorAll('text');
    
    const transcriptParts: string[] = [];
    texts.forEach((text) => {
      const content = text.textContent?.trim();
      if (content) {
        transcriptParts.push(content);
      }
    });
    
    return transcriptParts.join(' ');
  }
  
  private async extractWithLibrary(videoId: string): Promise<string | null> {
    // Para implementación completa, usar una librería como youtube-transcript
    // Por ahora, retornamos null si no hay transcripción automática
    console.warn(`No se encontró transcripción automática para video ${videoId}`);
    return null;
  }
}

class VimeoPlatform implements VideoPlatform {
  name = 'vimeo' as const;
  
  extractId(url: string): string | null {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  }
  
  async extractTranscript(videoId: string): Promise<string | null> {
    try {
      // Vimeo requiere autenticación para obtener transcripciones
      // En producción, esto debería hacerse en un backend/Edge Function
      // Por ahora, retornamos null y se puede implementar después
      console.warn(`Extracción de transcripción de Vimeo requiere API key. Video ID: ${videoId}`);
      return null;
    } catch (error) {
      console.error('Error extrayendo transcripción de Vimeo:', error);
      return null;
    }
  }
}

// =====================================================
// SERVICIO PRINCIPAL
// =====================================================

export class VideoTranscriptService {
  private platforms: VideoPlatform[] = [
    new YouTubePlatform(),
    new VimeoPlatform(),
  ];
  
  /**
   * Detecta la plataforma del video basándose en la URL
   */
  detectPlatform(url: string): VideoPlatform | null {
    for (const platform of this.platforms) {
      const videoId = platform.extractId(url);
      if (videoId) return platform;
    }
    return null;
  }
  
  /**
   * Extrae la transcripción de un video y la guarda en la base de datos
   */
  async extractTranscript(materialId: string, url: string): Promise<TranscriptResult> {
    const platform = this.detectPlatform(url);
    
    if (!platform) {
      return {
        success: false,
        error: 'Plataforma de video no soportada o URL inválida',
      };
    }
    
    const videoId = platform.extractId(url);
    if (!videoId) {
      return {
        success: false,
        error: 'No se pudo extraer el ID del video',
      };
    }
    
    // Actualizar estado a "processing"
    await this.updateTranscriptionStatus(materialId, 'processing', {
      platform: platform.name,
      videoId,
    });
    
    try {
      const transcript = await platform.extractTranscript(videoId);
      
      if (!transcript) {
        await this.updateTranscriptionStatus(materialId, 'failed');
        return {
          success: false,
          error: 'No se pudo extraer la transcripción (puede que el video no tenga subtítulos disponibles)',
        };
      }
      
      // Guardar transcripción en la base de datos
      await this.saveTranscript(materialId, transcript, platform.name, videoId);
      
      // Indexar en RAG
      await this.indexTranscriptInRAG(materialId, transcript);
      
      return {
        success: true,
        transcript,
        platform: platform.name,
        videoId,
      };
    } catch (error) {
      await this.updateTranscriptionStatus(materialId, 'failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
  
  /**
   * Actualiza el estado de la transcripción
   */
  private async updateTranscriptionStatus(
    materialId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    metadata?: Record<string, any>
  ) {
    try {
      const updateData: any = {
        transcription_status: status,
      };
      
      if (metadata) {
        const { data: currentMaterial } = await supabase
          .from('materials')
          .select('transcription_metadata')
          .eq('id', materialId)
          .single();
        
        const currentMetadata = currentMaterial?.transcription_metadata || {};
        updateData.transcription_metadata = { ...currentMetadata, ...metadata };
      }
      
      await supabase
        .from('materials')
        .update(updateData)
        .eq('id', materialId);
    } catch (error) {
      console.error('Error actualizando estado de transcripción:', error);
    }
  }
  
  /**
   * Guarda la transcripción en la base de datos
   */
  private async saveTranscript(
    materialId: string,
    transcript: string,
    platform: string,
    videoId: string
  ) {
    try {
      const { data: material } = await supabase
        .from('materials')
        .select('transcription_metadata')
        .eq('id', materialId)
        .single();
      
      const currentMetadata = material?.transcription_metadata || {};
      
      await supabase
        .from('materials')
        .update({
          transcription: transcript,
          transcription_status: 'completed',
          video_platform: platform,
          video_id: videoId,
          transcription_metadata: {
            ...currentMetadata,
            extracted_at: new Date().toISOString(),
            language: 'es', // Detectar idioma si es posible
            length: transcript.length,
            platform,
            video_id: videoId,
          },
        })
        .eq('id', materialId);
    } catch (error) {
      console.error('Error guardando transcripción:', error);
      throw error;
    }
  }
  
  /**
   * Indexa la transcripción en el RAG dividiéndola en chunks
   */
  private async indexTranscriptInRAG(materialId: string, transcript: string) {
    try {
      // Obtener información del material
      const { data: material, error: materialError } = await supabase
        .from('materials')
        .select('course_id, unit_id, title')
        .eq('id', materialId)
        .single();
      
      if (materialError || !material) {
        console.error('Error obteniendo material para indexar:', materialError);
        return;
      }
      
      // Dividir transcripción en chunks para RAG
      const chunks = this.splitIntoChunks(transcript, 1000); // 1000 caracteres por chunk
      
      // Generar embeddings y guardar en course_content_chunks
      const { generateEmbedding } = await import('./geminiService');
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          const embedding = await generateEmbedding(chunk);
          
          if (embedding && embedding.length > 0) {
            await supabase.from('course_content_chunks').insert({
              course_id: material.course_id,
              unit_id: material.unit_id,
              content_id: materialId,
              content: `[Video: ${material.title}]\n\n${chunk}`,
              embedding: `[${embedding.join(',')}]`,
              metadata: {
                source: 'video_transcript',
                material_id: materialId,
                chunk_index: i,
                platform: material.video_platform || 'unknown',
              },
              chunk_index: i,
            });
          }
          
          // Pequeña pausa para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error indexando chunk ${i}:`, error);
        }
      }
      
      console.log(`✅ Transcripción indexada en RAG: ${chunks.length} chunks`);
    } catch (error) {
      console.error('Error indexando transcripción en RAG:', error);
    }
  }
  
  /**
   * Divide el texto en chunks para el RAG
   */
  private splitIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]\s+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }
}

