// audio-tutor/services/textToSpeechService.ts
// Servicio para síntesis de texto a voz usando Google Cloud Text-to-Speech API
// Usa voces premium WaveNet/Neural2 para mejor calidad
// Detecta automáticamente el idioma del texto (español/inglés)

/**
 * Detecta el idioma del texto (español o inglés)
 * Mejorado para detectar con mayor precisión
 */
const detectLanguage = (text: string): 'es' | 'en' => {
  const trimmedText = text.trim();
  if (!trimmedText) return 'es'; // Por defecto español
  
  // Contar caracteres típicos de cada idioma
  const spanishChars = /[áéíóúñüÁÉÍÓÚÑÜ¿¡]/g;
  const spanishWords = /\b(el|la|los|las|de|del|en|un|una|es|son|con|por|para|que|como|más|muy|también|está|están|hacer|tener|ser|estar|haber|poder|decir|ver|dar|saber|ir|venir|pasar|quedar|deber|parecer|hablar|llevar|dejar|seguir|encontrar|llamar|pensar|salir|volver|tomar|conocer|vivir|sentir|tratar|mirar|contar|empezar|esperar|buscar|existir|entrar|trabajar|escribir|perder|producir|ocurrir|entender|pedir|recordar|terminar|permitir|aparecer|conseguir|servir|sacar|necesitar|mantener|resultar|leer|caer|cambiar|presentar|crear|abrir|considerar|oír|acabar|convertir|ganar|formar|traer|morir|aceptar|realizar|suponer|comprender|lograr|explicar|preguntar|tocar|reconocer|estudiar|alcanzar|nacer|dirigir|correr|utilizar|pagar|ayudar|gustar|jugar|escuchar|continuar|encontrar|sufrir|ofrecer|descubrir|intentar|recibir|mostrar|elegir|abandonar)\b/gi;
  
  const spanishMatches = (trimmedText.match(spanishChars) || []).length;
  const spanishWordMatches = (trimmedText.match(spanishWords) || []).length;
  
  // Palabras comunes en inglés
  const englishWords = /\b(the|a|an|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|could|may|might|must|can|this|that|these|those|I|you|he|she|it|we|they|me|him|her|us|them|my|your|his|her|its|our|their|what|which|who|whom|whose|where|when|why|how|all|each|every|both|few|many|other|some|such|no|nor|not|only|own|same|so|than|too|very|just|now|then|more|most|less|least|about|into|through|during|including|against|among|throughout|despite|towards|upon|concerning|to|of|in|for|on|with|at|by|from|up|about|into|through|during|including|against|among|throughout|despite|towards|upon|concerning)\b/gi;
  const englishWordMatches = (trimmedText.match(englishWords) || []).length;
  
  // Puntuación específica de español
  const hasSpanishPunctuation = /[¿¡]/.test(trimmedText);
  
  // Si hay caracteres específicos del español o puntuación española, es español
  if (spanishMatches > 0 || hasSpanishPunctuation) {
    return 'es';
  }
  
  // Si hay más palabras en inglés que en español, es inglés
  if (englishWordMatches > spanishWordMatches && englishWordMatches > 2) {
    return 'en';
  }
  
  // Si hay palabras en español pero no en inglés, es español
  if (spanishWordMatches > 2 && englishWordMatches === 0) {
    return 'es';
  }
  
  // Por defecto, español
  return 'es';
};

/**
 * Sintetiza texto a voz usando Google Cloud Text-to-Speech API
 * Detecta automáticamente el idioma del texto (español/inglés)
 * 
 * @param text - Texto a sintetizar
 * @param options - Opciones de voz:
 *   - voiceName: Nombre de la voz (ej: 'es-US-Neural2-A', 'es-ES-Neural2-A', etc.)
 *   - languageCode: Código de idioma (ej: 'es-ES', 'es-US', 'en-US'). Si no se especifica, se detecta automáticamente
 *   - ssmlGender: Género de la voz ('NEUTRAL', 'FEMALE', 'MALE')
 *   - speakingRate: Velocidad del habla (0.25 a 4.0, por defecto 1.2)
 *   - pitch: Tono de la voz (-20.0 a 20.0, por defecto 0.0)
 *   - audioEncoding: Formato de audio ('MP3', 'LINEAR16', 'OGG_OPUS')
 */
export const synthesizeSpeech = async (
  text: string,
  options: {
    voiceName?: string;
    languageCode?: string;
    ssmlGender?: 'NEUTRAL' | 'FEMALE' | 'MALE';
    speakingRate?: number;
    pitch?: number;
    audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
  } = {}
): Promise<string | null> => {
  try {
    // Obtener API key de Google Cloud (puede ser la misma que Gemini o una diferente)
    const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ Google Cloud API Key no configurada. Saltando síntesis de voz.');
      return null;
    }

    // Detectar idioma automáticamente si no se especifica
    let detectedLang: 'es' | 'en' = 'es';
    if (!options.languageCode) {
      detectedLang = detectLanguage(text);
      console.log('🌐 TextToSpeechService: Idioma detectado:', detectedLang);
    }

    // Configuración de idioma
    let languageCode = options.languageCode;
    if (!languageCode) {
      // Usar el idioma detectado
      languageCode = detectedLang === 'es' ? 'es-ES' : 'en-US';
    }

    const ssmlGender = options.ssmlGender || 'NEUTRAL';
    const speakingRate = Math.max(0.25, Math.min(4.0, options.speakingRate || 1.2)); // Velocidad optimizada
    const pitch = Math.max(-20.0, Math.min(20.0, options.pitch || 0.0));
    const audioEncoding = options.audioEncoding || 'MP3';

    // Seleccionar voz premium (WaveNet/Neural2) según el idioma detectado
    let voiceName = options.voiceName;
    if (!voiceName) {
      // Voces premium Neural2 disponibles
      if (languageCode.startsWith('es-ES')) {
        voiceName = 'es-ES-Neural2-A'; // Voz femenina española premium
      } else if (languageCode.startsWith('es-US') || languageCode.startsWith('es-MX')) {
        voiceName = 'es-US-Neural2-A'; // Voz femenina español latino premium
      } else if (languageCode.startsWith('en-US')) {
        voiceName = 'en-US-Neural2-A'; // Voz femenina inglesa premium
      } else if (languageCode.startsWith('en-GB')) {
        voiceName = 'en-GB-Neural2-A'; // Voz femenina inglesa británica premium
      } else {
        // Fallback: usar español si no se puede determinar
        voiceName = 'es-ES-Neural2-A';
      }
    }

    console.log('🎤 TextToSpeechService: Sintetizando audio con voz premium', {
      voiceName,
      languageCode,
      speakingRate,
      textLength: text.length,
    });

    // Llamar a la API REST de Google Cloud Text-to-Speech
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode,
            name: voiceName,
            ssmlGender,
          },
          audioConfig: {
            audioEncoding,
            speakingRate,
            pitch,
            // Configuraciones adicionales para mejor calidad
            sampleRateHertz: 24000, // Alta calidad
            effectsProfileId: ['telephony-class-application'], // Optimizado para voz clara
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error en Text-to-Speech API:', errorData);
      
      // Manejar errores específicos
      if (response.status === 403) {
        console.warn('⚠️ Text-to-Speech API: Error 403 - La API key no tiene permisos o la API no está habilitada');
        console.warn('💡 Para habilitar Text-to-Speech:');
        console.warn('   1. Ve a Google Cloud Console: https://console.cloud.google.com/');
        console.warn('   2. Selecciona tu proyecto');
        console.warn('   3. Ve a "APIs & Services" > "Library"');
        console.warn('   4. Busca "Cloud Text-to-Speech API" y habilítala');
        console.warn('   5. Asegúrate de que tu API key tenga permisos para Text-to-Speech');
        console.warn('   6. O crea una nueva API key específica para Text-to-Speech');
        return null; // Retornar null en lugar de lanzar error
      }
      
      if (response.status === 401) {
        console.warn('⚠️ Text-to-Speech API: Error 401 - API key inválida o expirada');
        return null;
      }
      
      throw new Error(`Text-to-Speech API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const audioContent = data.audioContent;

    if (audioContent) {
      console.log('✅ TextToSpeechService: Audio sintetizado exitosamente', {
        voiceName,
        audioLength: audioContent.length,
        encoding: audioEncoding,
      });
      return audioContent; // Retorna base64 string
    }

    return null;
  } catch (error: any) {
    console.error('❌ Error synthesizing speech:', error);
    
    // Si es un error 403, no es crítico - el sistema puede continuar sin audio
    if (error?.message?.includes('403') || error?.message?.includes('Forbidden')) {
      console.warn('⚠️ Text-to-Speech no disponible - el sistema continuará sin audio');
      return null;
    }
    
    return null;
  }
};

/**
 * Obtiene la lista de voces disponibles para un idioma
 */
export const listVoices = async (languageCode: string = 'es-ES'): Promise<any[]> => {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ Google Cloud API Key no configurada.');
      return [];
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}&languageCode=${languageCode}`
    );

    if (!response.ok) {
      throw new Error(`Error obteniendo voces: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Error listing voices:', error);
    return [];
  }
};

