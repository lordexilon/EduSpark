# Solución: Problema de Text-to-Speech en Tutor AI

## 🔍 Problema Identificado

Según los logs del navegador:
```
❌ Error en síntesis de voz con Gemini: ApiError: {
  "error": {
    "code": 400,
    "message": "This model only supports text output.",
    "status": "INVALID_ARGUMENT"
  }
}
```

**Causa**: El sistema está intentando usar `gemini-2.5-flash` para generar audio, pero este modelo **solo soporta salida de texto**, no audio.

## ✅ Solución Recomendada

### Opción 1: Google Cloud Text-to-Speech API (RECOMENDADO)

**Ventajas:**
- ✅ Voces de alta calidad que suenan humanas
- ✅ Precio económico
- ✅ Múltiples voces en español
- ✅ Soporte para SSML (control de entonación, pausas, etc.)

**Voces Recomendadas en Español:**

1. **Neural2 (Mejor calidad/precio)**:
   - `es-US-Neural2-A` (Femenina) - $16 USD por 1M caracteres
   - `es-US-Neural2-B` (Masculina) - $16 USD por 1M caracteres
   - `es-ES-Neural2-A` (Español de España, Femenina)
   - `es-ES-Neural2-B` (Español de España, Masculina)

2. **WaveNet (Calidad premium)**:
   - `es-US-Wavenet-A` (Femenina) - $16 USD por 1M caracteres
   - `es-US-Wavenet-B` (Masculina)

**Precios** (al 2024):
- Neural2: $16 USD por 1 millón de caracteres
- WaveNet: $16 USD por 1 millón de caracteres
- Standard: $4 USD por 1 millón de caracteres

**Ejemplo de costo**:
- 1000 caracteres (respuesta típica) = $0.000016 USD
- 100,000 interacciones = $1.60 USD

### Opción 2: Gemini con Multimodal Output (SI ESTÁ DISPONIBLE)

Si Google lanza soporte de audio en Gemini 2.0+, verificar:
- Modelo: `gemini-2.0-flash-audio` o similar
- Actualmente **NO disponible** en `gemini-2.5-flash`

## 📝 Implementación Recomendada

### Paso 1: Habilitar Google Cloud Text-to-Speech API

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Habilitar "Cloud Text-to-Speech API"
3. Crear/usar la misma API key que usan para Gemini

### Paso 2: Código de Ejemplo

```typescript
// services/textToSpeechService.ts

interface TTSOptions {
  voice?: string;
  languageCode?: string;
  speakingRate?: number; // 0.25 a 4.0
  pitch?: number; // -20.0 a 20.0
}

export class TextToSpeechService {
  private apiKey: string;
  private baseUrl = 'https://texttospeech.googleapis.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesizeSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<ArrayBuffer> {
    const {
      voice = 'es-US-Neural2-A',
      languageCode = 'es-US',
      speakingRate = 1.0,
      pitch = 0.0
    } = options;

    const response = await fetch(
      `${this.baseUrl}/text:synthesize?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode,
            name: voice,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate,
            pitch,
            effectsProfileId: ['headphone-class-device'], // Optimiza para auriculares
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TTS Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    // El audio viene en base64
    const audioContent = data.audioContent;
    const binaryString = atob(audioContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    const audioContext = new AudioContext();
    const audioData = await audioContext.decodeAudioData(audioBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioData;
    source.connect(audioContext.destination);
    source.start(0);

    return new Promise((resolve) => {
      source.onended = () => resolve();
    });
  }
}
```

### Paso 3: Uso en VoiceAgent

```typescript
// En el VoiceAgent actual, reemplazar la llamada a Gemini con:

async speak(text: string): Promise<void> {
  try {
    const ttsService = new TextToSpeechService(GEMINI_API_KEY);
    
    const audioBuffer = await ttsService.synthesizeSpeech(text, {
      voice: 'es-US-Neural2-A', // Voz femenina natural
      speakingRate: 1.0,
      pitch: 0.0
    });

    await ttsService.playAudio(audioBuffer);
    
    console.log('✅ Audio reproducido exitosamente');
  } catch (error) {
    console.error('❌ Error en TTS:', error);
    // Fallback: sin audio
  }
}
```

## 🎯 Voces Recomendadas por Contexto

### Para Tutor Educativo (Formal):
- **Femenina**: `es-US-Neural2-A` o `es-ES-Neural2-A`
- **Masculina**: `es-US-Neural2-B` o `es-ES-Neural2-B`

### Para Contenido Dinámico (Informal):
- **Femenina**: `es-US-Wavenet-A`
- **Masculina**: `es-US-Wavenet-B`

## 💰 Estimación de Costos

Para un tutor AI con 1000 estudiantes activos:

**Escenario Conservador:**
- 10 interacciones/estudiante/mes
- 500 caracteres promedio por respuesta
- Total: 1000 × 10 × 500 = 5,000,000 caracteres/mes
- **Costo mensual**: $0.08 USD (Neural2/WaveNet)

**Escenario Intensivo:**
- 50 interacciones/estudiante/mes
- 800 caracteres promedio
- Total: 1000 × 50 × 800 = 40,000,000 caracteres/mes
- **Costo mensual**: $0.64 USD (Neural2/WaveNet)

## 🔧 Próximos Pasos

1. ✅ Habilitar Cloud Text-to-Speech API en Google Cloud
2. ✅ Implementar `TextToSpeechService`
3. ✅ Reemplazar llamadas a Gemini TTS con Google Cloud TTS
4. ✅ Probar con voz `es-US-Neural2-A`
5. ✅ Ajustar `speakingRate` y `pitch` según preferencia
6. ✅ Implementar caché de audio para respuestas comunes (opcional)

## 📚 Referencias

- [Google Cloud Text-to-Speech Pricing](https://cloud.google.com/text-to-speech/pricing)
- [Voces disponibles](https://cloud.google.com/text-to-speech/docs/voices)
- [SSML Guide](https://cloud.google.com/text-to-speech/docs/ssml)
