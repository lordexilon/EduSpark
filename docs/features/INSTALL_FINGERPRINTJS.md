# 📦 Instalación de Dependencias para Sistema de Dispositivos

## Librería Requerida

### @fingerprintjs/fingerprintjs

**Versión:** ^4.2.0  
**Propósito:** Generar identificadores únicos de dispositivos para tracking

## Instalación

```bash
npm install @fingerprintjs/fingerprintjs
```

## Verificación

Después de instalar, verificar en `package.json`:

```json
{
  "dependencies": {
    "@fingerprintjs/fingerprintjs": "^4.2.0"
  }
}
```

## Uso

```typescript
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const fp = await FingerprintJS.load();
const result = await fp.get();
console.log(result.visitorId); // Fingerprint único
```

## Características

- ✅ Identificación única del dispositivo
- ✅ Funciona sin cookies
- ✅ Resistente a navegación privada
- ✅ Open source y gratuito
- ✅ Compatible con todos los navegadores modernos

## Alternativas Consideradas

| Librería | Pros | Contras | Decisión |
|----------|------|---------|----------|
| **FingerprintJS** | Open source, preciso, mantenido | - | ✅ Seleccionado |
| ClientJS | Más simple | Menos preciso | ❌ |
| DeviceUUID | Ligero | Menos features | ❌ |

## Privacidad

El fingerprint generado es un **hash** que:
- ✅ NO contiene información personal
- ✅ NO puede revertirse para obtener datos del usuario
- ✅ Solo identifica el dispositivo técnicamente
- ✅ Cumple con GDPR/LGPD

---

**Nota:** Ejecutar `npm install` antes de continuar con la implementación.
