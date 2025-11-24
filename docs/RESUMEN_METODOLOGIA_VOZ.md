# 📋 Resumen Ejecutivo: Metodología de Conversión de Voz

## 🎯 ¿Qué es esto?

Este documento explica cómo se implementó la conversión de texto a voz (TTS) en tiempo real usando **Google Gemini 2.5 Flash** con voces expresivas.

---

## 🔄 Flujo Completo

```
┌─────────────────┐
│   Texto Input   │
│  "Hola mundo"   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  1. Agregar Indicaciones Expresivas │
│     "[friendly and warm] Hola..."  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  2. Llamar a Gemini API             │
│     - Model: gemini-2.5-flash      │
│     - Modality: AUDIO               │
│     - Voice: Kore/Aoede/etc         │
│     - Speed: 1.0                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  3. Recibir Audio Base64            │
│     Formato: PCM 16-bit, mono, 24kHz│
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  4. Decodificar Base64 → Uint8Array │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  5. Convertir PCM → AudioBuffer     │
│     - Little-endian                 │
│     - Normalizar a [-1.0, 1.0]      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  6. Reproducir con Web Audio API    │
│     - AudioContext                  │
│     - BufferSource                  │
│     - PlaybackRate                  │
└─────────────────────────────────────┘
```

---

## 📦 Archivos Clave del Proyecto

### 1. Servicio Principal
**Ubicación**: `services/geminiService.ts` (líneas 383-509)

**Función clave**: `synthesizeSpeech()`
- Convierte texto a audio Base64
- Maneja voces y estilos expresivos
- Retorna audio listo para reproducir

### 2. Agente de Voz
**Ubicación**: `audio-tutor/agents/VoiceAgent.ts`

**Clase**: `VoiceAgent`
- Encapsula toda la lógica de audio
- Maneja reproducción y control
- Gestiona recursos (AudioContext)

### 3. Utilidades de Audio
**Ubicación**: `audio-tutor/agents/VoiceAgent.ts` (métodos privados)

**Funciones**:
- `decodeBase64()` - Convierte Base64 a bytes
- `decodeAudioData()` - Convierte PCM a AudioBuffer
- `playAudio()` - Reproduce audio

---

## 🔑 Puntos Críticos

### 1. Indicaciones Expresivas Naturales

Las voces expresivas se activan con indicaciones en el texto:

```typescript
// ✅ CORRECTO
const text = "[friendly and warm] Hola, ¿cómo estás?";

// ❌ INCORRECTO (sin indicaciones)
const text = "Hola, ¿cómo estás?";
```

### 2. Modality.AUDIO es Obligatorio

Debe especificarse en la configuración:

```typescript
config: {
  responseModalities: [Modality.AUDIO], // ← CRÍTICO
  speechConfig: { ... }
}
```

### 3. Formato de Audio

- **Formato**: PCM lineal
- **Bits**: 16-bit
- **Canales**: Mono (1)
- **Sample Rate**: 24kHz
- **Codificación**: Base64

### 4. Decodificación Little-Endian

```typescript
// Byte bajo primero, byte alto segundo
int16Array[i] = (byte2 << 8) | byte1;
```

### 5. Normalización

```typescript
// De Int16 (-32768 a 32767) a Float32 (-1.0 a 1.0)
channelData[i] = int16Array[i] / 32768.0;
```

---

## 🎨 Voces Disponibles

| Voz | Características | Estilos por Defecto |
|-----|----------------|---------------------|
| **Kore** | Femenina, clara y profesional | professional, clear |
| **Charon** | Masculina, profunda y autoritaria | authoritative, professional |
| **Fenrir** | Masculina, energética y motivadora | energetic, excited |
| **Aoede** | Femenina, cálida y expresiva | warm, empathetic |
| **Puck** | Neutra, versátil y amigable | friendly, calm |

---

## 🚀 Uso Rápido

### Ejemplo Mínimo

```typescript
import { convertirTextoAVoz, reproducirAudio } from './ejemplo-uso-voz-gemini';

// 1. Generar audio
const audioBase64 = await convertirTextoAVoz('Hola mundo', {
  voiceName: 'Kore',
  speed: 1.0
});

// 2. Reproducir
if (audioBase64) {
  await reproducirAudio(audioBase64);
}
```

### Ejemplo Completo

```typescript
import { hablar } from './ejemplo-uso-voz-gemini';

// Todo en una función
await hablar('¡Bienvenido!', {
  voiceName: 'Aoede',
  styles: ['warm', 'empathetic'],
  speed: 1.2
});
```

---

## 📋 Checklist para Exportar

- [ ] Copiar `services/geminiService.ts` → función `synthesizeSpeech`
- [ ] Copiar funciones de decodificación (`decodeBase64`, `decodeAudioData`)
- [ ] Instalar `@google/genai`
- [ ] Configurar `GEMINI_API_KEY`
- [ ] Probar con diferentes voces
- [ ] Probar con diferentes estilos
- [ ] Probar con diferentes velocidades

---

## 📚 Documentación Completa

Para más detalles, consulta:
- **`METODOLOGIA_CONVERSION_VOZ_GEMINI.md`** - Documentación completa
- **`EJEMPLO_USO_VOZ_GEMINI.ts`** - Ejemplos de código listos para usar

---

## 🔧 Configuración Mínima

### 1. Variables de Entorno
```bash
GEMINI_API_KEY=tu_api_key_aqui
```

### 2. Dependencias
```bash
npm install @google/genai
```

### 3. Código Base
```typescript
import { GoogleGenAI, Modality } from "@google/genai";

const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const response = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{ parts: [{ text: '[friendly] Hola' }] }],
  config: {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Kore' }
      }
    }
  }
});

const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
```

---

**Última actualización**: $(date)  
**Versión**: 1.0.0

