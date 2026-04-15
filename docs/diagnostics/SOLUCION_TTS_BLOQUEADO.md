# 🔧 Solución al Problema de Text-to-Speech Bloqueado

## ❌ Error Actual

```
POST https://texttospeech.googleapis.com/v1/text:synthesize 403 (Forbidden)

Error: Requests to this API texttospeech.googleapis.com method 
google.cloud.texttospeech.v1.TextToSpeech.SynthesizeSpeech are blocked.
```

## 🔍 Diagnóstico

El error **"are blocked"** indica que la API está **bloqueada por restricciones de la API key**, no solo deshabilitada.

### Posibles Causas:

1. **API Key con Restricciones de API**
   - La API key tiene restricciones que solo permiten ciertas APIs
   - Text-to-Speech no está en la lista de APIs permitidas

2. **API No Habilitada en el Proyecto**
   - Cloud Text-to-Speech API no está habilitada
   - El proyecto no tiene permisos para usar TTS

3. **Restricciones de Facturación**
   - El proyecto no tiene facturación habilitada
   - Text-to-Speech requiere facturación activa

## ✅ Soluciones

### Solución 1: Habilitar y Configurar la API (RECOMENDADO)

#### Paso 1: Habilitar Cloud Text-to-Speech API

1. Ve a: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
2. Selecciona tu proyecto (ID: 468517556859)
3. Haz clic en **"ENABLE" (HABILITAR)**
4. Espera 2-3 minutos

#### Paso 2: Verificar Restricciones de la API Key

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Encuentra tu API key: `AIzaSyCE-K_2cpz-BCu_Wan0uC7xvBb7OJJXGRc`
3. Haz clic en **"Edit" (Editar)**
4. En **"API restrictions"**:
   - Si está en "Restrict key", agrega **"Cloud Text-to-Speech API"** a la lista
   - O cambia a **"Don't restrict key"** (menos seguro pero más simple)
5. Guarda los cambios
6. Espera 5 minutos para que se propague

#### Paso 3: Verificar Facturación

1. Ve a: https://console.cloud.google.com/billing
2. Verifica que el proyecto tenga una cuenta de facturación asociada
3. Si no tiene, agrega una (Text-to-Speech requiere facturación)

### Solución 2: Usar Web Speech API (FALLBACK - Sin Costo)

Si no puedes habilitar Google Cloud TTS, podemos usar la Web Speech API del navegador:

#### Ventajas:
- ✅ Gratis
- ✅ No requiere API key
- ✅ Funciona en Chrome, Edge, Safari
- ✅ Voces en español disponibles

#### Desventajas:
- ❌ Calidad variable según navegador
- ❌ Requiere interacción del usuario
- ❌ No funciona en todos los navegadores

#### Implementación:

```typescript
// services/browserTTSService.ts
export class BrowserTTSService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    
    // Si las voces no están cargadas aún, esperar el evento
    if (this.voices.length === 0) {
      this.synth.addEventListener('voiceschanged', () => {
        this.voices = this.synth.getVoices();
      });
    }
  }

  async speak(text: string, options: { lang?: string; rate?: number } = {}): Promise<void> {
    const { lang = 'es-ES', rate = 1.0 } = options;

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Buscar voz en español
      const spanishVoice = this.voices.find(voice => 
        voice.lang.startsWith('es')
      );
      
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }
      
      utterance.lang = lang;
      utterance.rate = rate;
      
      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);
      
      this.synth.speak(utterance);
    });
  }

  cancel(): void {
    this.synth.cancel();
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => voice.lang.startsWith('es'));
  }
}
```

### Solución 3: Deshabilitar TTS Temporalmente

Si ninguna de las anteriores funciona, podemos deshabilitar TTS temporalmente:

```typescript
// En geminiService.ts, modificar synthesizeSpeech:

export async function synthesizeSpeech(...): Promise<string | null> {
  // TEMPORAL: Deshabilitar TTS hasta resolver problema de API
  console.warn('⚠️ TTS temporalmente deshabilitado');
  return null; // El sistema continuará funcionando sin audio
}
```

## 🎯 Plan de Acción Recomendado

### Opción A: Resolver el Problema de API (Mejor Calidad)

1. **Habilitar Cloud Text-to-Speech API** (5 min)
2. **Quitar restricciones de la API key** (5 min)
3. **Verificar facturación** (2 min)
4. **Esperar propagación** (5 min)
5. **Probar** (1 min)

**Total: ~20 minutos**

### Opción B: Usar Web Speech API (Más Rápido)

1. **Crear `browserTTSService.ts`** (10 min)
2. **Modificar `geminiService.ts` para usar fallback** (5 min)
3. **Probar** (1 min)

**Total: ~15 minutos**

### Opción C: Deshabilitar TTS (Más Rápido, Menos Funcional)

1. **Modificar `geminiService.ts`** (2 min)
2. **Probar** (1 min)

**Total: ~3 minutos**

## 📝 Recomendación

**Opción A** es la mejor a largo plazo (voces de alta calidad).

Si necesitas una solución **inmediata**, usa **Opción B** (Web Speech API) como fallback temporal mientras resuelves la Opción A.

## 🔗 Enlaces Útiles

- [Habilitar Cloud TTS](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)
- [Gestionar API Keys](https://console.cloud.google.com/apis/credentials)
- [Configurar Facturación](https://console.cloud.google.com/billing)
- [Web Speech API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

## ✅ Verificación Post-Solución

Después de aplicar cualquier solución, verifica que veas en la consola:

```
✅ TTS: Audio sintetizado exitosamente
✅ TTS: Reproducción completada
```

En lugar de:

```
❌ Error: Requests to this API are blocked
```

---

**Última actualización:** 2025-11-22 14:46
**Estado:** Pendiente de resolución
