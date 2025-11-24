# Metodología de Conversión de Voz con Gemini 2.5 Flash

## 📋 Resumen Ejecutivo

Este documento explica la metodología completa para implementar conversión de texto a voz (TTS) en tiempo real usando **Google Gemini 2.5 Flash** con voces expresivas. La implementación permite generar audio de alta calidad con control de estilo, velocidad y tono mediante indicaciones naturales.

---

## 🎯 Componentes Principales

### 1. **Servicio de Síntesis de Voz** (`synthesizeSpeech`)

La función principal que convierte texto a audio usando Gemini 2.5 Flash.

**Ubicación**: `services/geminiService.ts` o `audio-tutor/services/geminiService.ts`

**Características clave**:
- ✅ 5 voces predefinidas (Kore, Charon, Fenrir, Aoede, Puck)
- ✅ Control de estilos expresivos mediante indicaciones naturales
- ✅ Control de velocidad (0.5x a 2.0x)
- ✅ Audio en formato PCM 16-bit, mono, 24kHz
- ✅ Retorna audio en Base64

---

## 🔧 Implementación Técnica

### Paso 1: Configuración del Cliente Gemini

```typescript
import { GoogleGenAI, Modality } from "@google/genai";

// Configuración del modelo
const TTS_MODEL = 'gemini-2.5-flash';

// Cliente con caché para optimización
let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

function getClient(): { client: GoogleGenAI | null; missing: boolean } {
  const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    return { client: null, missing: true };
  }

  // Reutilizar cliente si la key no cambió
  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedKey = apiKey;
  }

  return { client: cachedClient, missing: false };
}
```

### Paso 2: Función de Síntesis de Voz

```typescript
/**
 * Voces disponibles en Gemini 2.5 Flash
 */
export type ExpressiveVoiceName = 
  | 'Kore'      // Voz femenina, clara y profesional
  | 'Charon'    // Voz masculina, profunda y autoritaria
  | 'Fenrir'    // Voz masculina, energética y motivadora
  | 'Aoede'     // Voz femenina, cálida y expresiva
  | 'Puck';     // Voz neutra, versátil y amigable

/**
 * Estilos expresivos disponibles
 */
export type ExpressiveStyle = 
  | 'friendly' | 'professional' | 'energetic' | 'calm'
  | 'excited' | 'empathetic' | 'authoritative' | 'warm'
  | 'clear' | 'amused' | 'fast' | 'slow';

/**
 * Sintetiza texto a voz usando Voces Expresivas de Gemini 2.5 Flash
 * 
 * @param text - Texto a sintetizar
 * @param options - Opciones de voz expresiva
 * @returns Audio en Base64 o null si falla
 */
export async function synthesizeSpeech(
  text: string,
  options: {
    voiceName?: ExpressiveVoiceName;
    styles?: ExpressiveStyle[];
    speed?: number; // 0.5 a 2.0, por defecto 1.0
    useNaturalPrompts?: boolean;
  } = {}
): Promise<string | null> {
  const { client, missing } = getClient();

  if (missing || !client) {
    console.warn('⚠️ GEMINI_API_KEY no configurada');
    return null;
  }

  const voiceName = options.voiceName || 'Kore';
  const speed = Math.max(0.5, Math.min(2.0, options.speed || 1.0));
  
  // PASO CRÍTICO: Construir texto con indicaciones expresivas
  let expressiveText = text;
  const stylePrompts: string[] = [];
  
  // Mapear estilos a indicaciones naturales
  if (options.styles && options.styles.length > 0) {
    const styleMap: Record<ExpressiveStyle, string> = {
      'friendly': 'friendly',
      'professional': 'professional',
      'energetic': 'energetic',
      'calm': 'calm',
      'excited': 'excited',
      'empathetic': 'empathetic',
      'authoritative': 'authoritative',
      'warm': 'warm',
      'clear': 'clear',
      'amused': 'amused',
      'fast': 'extremely fast',
      'slow': 'slow',
    };

    options.styles.forEach(style => {
      if (styleMap[style]) {
        stylePrompts.push(styleMap[style]);
      }
    });
  }

  // Estilos por defecto según la voz si no se proporcionan
  if (stylePrompts.length === 0) {
    switch (voiceName) {
      case 'Kore':
        stylePrompts.push('professional', 'clear');
        break;
      case 'Charon':
        stylePrompts.push('authoritative', 'professional');
        break;
      case 'Fenrir':
        stylePrompts.push('energetic', 'excited');
        break;
      case 'Aoede':
        stylePrompts.push('warm', 'empathetic');
        break;
      case 'Puck':
        stylePrompts.push('friendly', 'calm');
        break;
    }
  }

  // Agregar indicación de velocidad
  if (speed !== 1.0) {
    if (speed > 1.5) stylePrompts.push('extremely fast');
    else if (speed > 1.2) stylePrompts.push('fast');
    else if (speed < 0.7) stylePrompts.push('slow');
  }

  // Construir texto con indicaciones expresivas
  if (stylePrompts.length > 0) {
    const promptText = `[${stylePrompts.join(' and ')}]`;
    expressiveText = `${promptText} ${text}`;
  } else {
    expressiveText = `[friendly and clear] ${text}`;
  }

  // Llamar a la API de Gemini
  const response = await client.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text: expressiveText }] }],
    config: {
      responseModalities: [Modality.AUDIO], // CRÍTICO: Activar modo audio
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
        ...(speed !== 1.0 && { speakingRate: speed }),
      },
    },
  });
  
  // Extraer audio Base64 de la respuesta
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (base64Audio) {
    console.log('✅ Audio expresivo sintetizado exitosamente', {
      voiceName,
      styles: options.styles,
      speed,
    });
    return base64Audio;
  }
  
  return null;
}
```

---

## 🔊 Reproducción de Audio

### Paso 3: Decodificación y Reproducción con Web Audio API

```typescript
/**
 * Reproduce audio Base64 usando Web Audio API
 */
export async function playAudio(
  base64Audio: string,
  options: { speed?: number } = {}
): Promise<void> {
  // Crear AudioContext
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Reanudar si está suspendido (requerido por navegadores modernos)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  // Decodificar Base64 a Uint8Array
  const audioData = decodeBase64(base64Audio);
  
  // Decodificar audio PCM
  const buffer = await decodeAudioData(audioData, audioContext);

  // Crear fuente de audio
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);

  // Aplicar velocidad
  if (options.speed) {
    source.playbackRate.value = options.speed;
  }

  // Reproducir
  source.start();
}

/**
 * Decodifica Base64 a Uint8Array
 */
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodifica datos PCM a AudioBuffer
 * Gemini devuelve: PCM 16-bit, mono, 24kHz
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext
): Promise<AudioBuffer> {
  const sampleRate = 24000; // Tasa de muestreo de Gemini TTS
  
  // Convertir bytes a Int16Array (little-endian)
  const int16Array = new Int16Array(data.length / 2);
  for (let i = 0; i < int16Array.length; i++) {
    const byte1 = data[i * 2];
    const byte2 = data[i * 2 + 1];
    // Little-endian: byte bajo primero, byte alto segundo
    int16Array[i] = (byte2 << 8) | byte1;
    // Convertir de unsigned a signed
    if (int16Array[i] >= 32768) {
      int16Array[i] -= 65536;
    }
  }
  
  const frameCount = int16Array.length;
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  // Normalizar a rango [-1.0, 1.0]
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = int16Array[i] / 32768.0;
  }
  
  return buffer;
}
```

---

## 📦 Integración Completa: VoiceAgent

### Paso 4: Clase VoiceAgent (Opcional pero Recomendada)

```typescript
import { synthesizeSpeech } from './services/geminiService';

export class VoiceAgent {
  private audioContext: AudioContext | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  private isSpeaking: boolean = false;

  /**
   * Reproduce texto usando síntesis de voz
   */
  async speak(
    text: string,
    options: {
      voiceName?: ExpressiveVoiceName;
      styles?: ExpressiveStyle[];
      speed?: number;
    } = {}
  ): Promise<void> {
    if (this.isSpeaking) {
      throw new Error('Already speaking');
    }

    try {
      this.isSpeaking = true;

      // Generar audio
      const audioContent = await synthesizeSpeech(text, options);
      
      if (!audioContent) {
        throw new Error('Failed to generate speech');
      }

      // Reproducir audio
      await this.playAudio(audioContent, options);
    } catch (error) {
      this.isSpeaking = false;
      throw error;
    }
  }

  /**
   * Reproduce audio Base64
   */
  private async playAudio(
    base64Audio: string,
    options: { speed?: number } = {}
  ): Promise<void> {
    // Crear AudioContext si no existe
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Reanudar si está suspendido
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const audioContext = this.audioContext;

    // Decodificar Base64
    const audioData = this.decodeBase64(base64Audio);
    
    // Decodificar audio PCM
    const buffer = await this.decodeAudioData(audioData, audioContext);

    // Crear fuente de audio
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    // Aplicar velocidad
    if (options.speed) {
      source.playbackRate.value = options.speed;
    }

    // Configurar eventos
    source.onended = () => {
      this.isSpeaking = false;
      this.audioSource = null;
    };

    // Reproducir
    source.start();
    this.audioSource = source;
  }

  /**
   * Detiene la reproducción
   */
  stopSpeech(): void {
    if (this.audioSource) {
      this.audioSource.stop();
      this.audioSource.disconnect();
      this.audioSource = null;
    }
    this.isSpeaking = false;
  }

  /**
   * Decodifica Base64 a Uint8Array
   */
  private decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Decodifica datos PCM a AudioBuffer
   */
  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext
  ): Promise<AudioBuffer> {
    const sampleRate = 24000;
    const int16Array = new Int16Array(data.length / 2);
    
    for (let i = 0; i < int16Array.length; i++) {
      const byte1 = data[i * 2];
      const byte2 = data[i * 2 + 1];
      int16Array[i] = (byte2 << 8) | byte1;
      if (int16Array[i] >= 32768) {
        int16Array[i] -= 65536;
      }
    }
    
    const frameCount = int16Array.length;
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = int16Array[i] / 32768.0;
    }
    
    return buffer;
  }

  /**
   * Limpia recursos
   */
  cleanup(): void {
    this.stopSpeech();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
```

---

## 🚀 Uso Básico

### Ejemplo 1: Uso Simple

```typescript
import { synthesizeSpeech } from './services/geminiService';
import { playAudio } from './utils/audioPlayer';

// Sintetizar voz
const audioBase64 = await synthesizeSpeech('Hola, ¿cómo estás?', {
  voiceName: 'Kore',
  styles: ['friendly', 'warm'],
  speed: 1.0
});

// Reproducir
if (audioBase64) {
  await playAudio(audioBase64, { speed: 1.0 });
}
```

### Ejemplo 2: Con VoiceAgent

```typescript
import { VoiceAgent } from './agents/VoiceAgent';

const voiceAgent = new VoiceAgent();

// Reproducir directamente
await voiceAgent.speak('Bienvenido al sistema', {
  voiceName: 'Aoede',
  styles: ['warm', 'empathetic'],
  speed: 1.2
});

// Detener si es necesario
voiceAgent.stopSpeech();
```

### Ejemplo 3: En React Component

```typescript
import { useState } from 'react';
import { VoiceAgent } from './agents/VoiceAgent';

function MyComponent() {
  const [voiceAgent] = useState(() => new VoiceAgent());
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = async (text: string) => {
    try {
      setIsSpeaking(true);
      await voiceAgent.speak(text, {
        voiceName: 'Puck',
        styles: ['friendly', 'clear'],
        speed: 1.0
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <div>
      <button 
        onClick={() => handleSpeak('Hola mundo')}
        disabled={isSpeaking}
      >
        {isSpeaking ? 'Hablando...' : 'Reproducir'}
      </button>
    </div>
  );
}
```

---

## 📋 Configuración Requerida

### Variables de Entorno

```bash
# .env o .env.local
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
```

### Dependencias NPM

```json
{
  "dependencies": {
    "@google/genai": "^1.0.0"
  }
}
```

### Instalación

```bash
npm install @google/genai
```

---

## 🎨 Voces y Estilos Disponibles

### Voces Predefinidas

| Voz | Características | Estilos por Defecto |
|-----|----------------|---------------------|
| **Kore** | Femenina, clara y profesional | professional, clear |
| **Charon** | Masculina, profunda y autoritaria | authoritative, professional |
| **Fenrir** | Masculina, energética y motivadora | energetic, excited |
| **Aoede** | Femenina, cálida y expresiva | warm, empathetic |
| **Puck** | Neutra, versátil y amigable | friendly, calm |

### Estilos Expresivos

- `friendly` - Amigable y cercano
- `professional` - Profesional y formal
- `energetic` - Energético y motivador
- `calm` - Calmado y relajante
- `excited` - Emocionado y entusiasta
- `empathetic` - Empático y comprensivo
- `authoritative` - Autoritario y confiable
- `warm` - Cálido y acogedor
- `clear` - Claro y preciso
- `amused` - Divertido y alegre
- `fast` - Rápido
- `slow` - Lento

---

## 🔑 Puntos Clave de la Metodología

### 1. **Indicaciones Expresivas Naturales**

Las voces expresivas se activan mediante indicaciones en lenguaje natural dentro del texto:

```typescript
// ✅ CORRECTO: Usar indicaciones naturales
const text = "[friendly and warm] Hola, ¿cómo estás?";

// ❌ INCORRECTO: No usar indicaciones
const text = "Hola, ¿cómo estás?";
```

### 2. **Modality.AUDIO es Crítico**

Debe especificarse `responseModalities: [Modality.AUDIO]` en la configuración:

```typescript
config: {
  responseModalities: [Modality.AUDIO], // ← CRÍTICO
  speechConfig: { ... }
}
```

### 3. **Formato de Audio**

- **Formato**: PCM lineal
- **Bits**: 16-bit
- **Canales**: Mono (1 canal)
- **Sample Rate**: 24kHz
- **Codificación**: Base64

### 4. **Decodificación Little-Endian**

El audio viene en formato little-endian, por lo que el byte bajo va primero:

```typescript
int16Array[i] = (byte2 << 8) | byte1; // byte1 es el bajo, byte2 es el alto
```

### 5. **Normalización a Float32**

Los valores deben normalizarse de Int16 (-32768 a 32767) a Float32 (-1.0 a 1.0):

```typescript
channelData[i] = int16Array[i] / 32768.0;
```

---

## 🐛 Solución de Problemas

### Problema: Audio no se reproduce

**Solución**: Verificar que el AudioContext esté activado:

```typescript
if (audioContext.state === 'suspended') {
  await audioContext.resume();
}
```

### Problema: Audio distorsionado

**Solución**: Verificar la normalización y el sample rate:

```typescript
// Asegurar sample rate correcto (24kHz)
const sampleRate = 24000;

// Normalizar correctamente
channelData[i] = int16Array[i] / 32768.0;
```

### Problema: No se genera audio

**Solución**: Verificar:
1. API Key configurada correctamente
2. `responseModalities: [Modality.AUDIO]` está presente
3. Indicaciones expresivas en el texto
4. Formato de respuesta correcto

### Problema: Velocidad no funciona

**Solución**: Verificar que `playbackRate` se establezca después de crear el source:

```typescript
source.playbackRate.value = speed; // No usar .setValueAtTime()
```

---

## 📚 Archivos de Referencia en el Proyecto

1. **Servicio Principal**: 
   - `services/geminiService.ts` (líneas 383-509)
   - `audio-tutor/services/geminiService.ts` (líneas 90-206)

2. **Agente de Voz**:
   - `audio-tutor/agents/VoiceAgent.ts` (completo)

3. **Utilidades de Audio**:
   - `audio-tutor/agents/VoiceAgent.ts` (métodos `decodeBase64`, `decodeAudioData`)

---

## 🔄 Exportación a Otro Proyecto

### Pasos para Exportar:

1. **Copiar archivos**:
   ```bash
   # Servicio de Gemini
   cp services/geminiService.ts nuevo-proyecto/src/services/
   
   # VoiceAgent (opcional)
   cp audio-tutor/agents/VoiceAgent.ts nuevo-proyecto/src/agents/
   ```

2. **Instalar dependencias**:
   ```bash
   npm install @google/genai
   ```

3. **Configurar variables de entorno**:
   ```bash
   echo "GEMINI_API_KEY=tu_key" >> .env
   ```

4. **Importar y usar**:
   ```typescript
   import { synthesizeSpeech } from './services/geminiService';
   ```

---

## ✅ Checklist de Implementación

- [ ] Instalar `@google/genai`
- [ ] Configurar `GEMINI_API_KEY`
- [ ] Implementar función `synthesizeSpeech`
- [ ] Implementar función `decodeBase64`
- [ ] Implementar función `decodeAudioData`
- [ ] Implementar función `playAudio`
- [ ] Probar con diferentes voces
- [ ] Probar con diferentes estilos
- [ ] Probar con diferentes velocidades
- [ ] Manejar errores correctamente
- [ ] Limpiar recursos (AudioContext)

---

## 📖 Referencias

- **Documentación Gemini**: [Google AI Studio](https://aistudio.google.com/)
- **Web Audio API**: [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- **Voces Expresivas**: Documentación de Gemini 2.5 Flash

---

**Última actualización**: $(date)  
**Versión**: 1.0.0  
**Autor**: Sistema EduSpark

