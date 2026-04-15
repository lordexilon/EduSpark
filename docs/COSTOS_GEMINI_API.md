# 💰 Costos de Gemini API - Guía Completa

## 🆓 ¿Necesito Pagar Algo?

### Respuesta Corta:
- **Para desarrollo/pruebas:** ✅ Puedes usar el **nivel gratuito** sin pagar
- **Para producción:** 💰 Sí, pero los costos son muy bajos
- **El error 403 puede deberse a:** Falta de facturación habilitada o límites de cuota

## 🎁 Nivel Gratuito (Free Tier)

Google ofrece un **nivel gratuito generoso** para Gemini API:

- ✅ **60 solicitudes por minuto** (RPM)
- ✅ **1,500 solicitudes por día** (RPD)
- ✅ **1 millón de tokens por día** (para algunos modelos)
- ✅ **Sin tarjeta de crédito requerida** para empezar (en algunos casos)

### Modelos Disponibles en Free Tier:
- **Gemini 2.5 Flash** - Recomendado para tu proyecto
- **Gemini 2.5 Flash-Lite**
- Algunos modelos de embedding

## 💵 Costos si Excedes el Nivel Gratuito

### Gemini 2.5 Flash (Modelo que usas)
- **Entrada:** $0.30 por millón de tokens
- **Salida:** $2.50 por millón de tokens
- **Audio:** $1.00 por millón de tokens (entrada)

### Gemini 2.5 Pro (Para tareas complejas)
- **Entrada:** $1.25 por millón de tokens
- **Salida:** $10.00 por millón de tokens

### Embeddings (text-embedding-004)
- **Costo:** $0.00001 por 1,000 embeddings
- **Ejemplo:** 100,000 embeddings = **$0.001** (menos de un centavo)

## 📊 Ejemplo de Costos Reales

### Caso: Plataforma Educativa Pequeña
- **50 estudiantes activos/día**
- **10 preguntas/estudiante/día** = 500 solicitudes/día
- **Promedio: 500 tokens entrada + 500 tokens salida por solicitud**

**Cálculo:**
- Entrada: 500 solicitudes × 500 tokens = 250,000 tokens/día
- Salida: 500 solicitudes × 500 tokens = 250,000 tokens/día
- Total: 500,000 tokens/día = 15 millones tokens/mes

**Costo mensual:**
- Entrada: (15M × $0.30) = **$4.50**
- Salida: (15M × $2.50) = **$37.50**
- **Total: ~$42/mes** (fuera del free tier)

**Dentro del free tier (primeros días):**
- ✅ **$0** si no excedes los límites

## 🔴 ¿Por Qué el Error 403?

El error 403 puede ocurrir por varias razones:

### 1. **Facturación No Habilitada** (Más Común)
- Google puede requerir que habilites facturación incluso para el free tier
- No te cobrarán si no excedes los límites gratuitos
- Pero necesitas una **tarjeta de crédito** asociada

### 2. **Cuota Excedida**
- Has usado todos los créditos gratuitos del día/mes
- Necesitas esperar o habilitar facturación para continuar

### 3. **API No Habilitada**
- La API de Gemini no está habilitada en tu proyecto
- Debes habilitarla en Google Cloud Console

### 4. **Restricciones de la Organización**
- Si tu cuenta está en una organización, puede haber restricciones

## ✅ Solución: Habilitar Facturación (Gratis si no excedes límites)

### Paso 1: Verificar tu Cuenta de Google Cloud

1. **Ir a Google Cloud Console:**
   - https://console.cloud.google.com/
   - Selecciona tu proyecto

2. **Verificar estado de facturación:**
   - Ve a **"Billing"** en el menú lateral
   - Verifica si tienes una cuenta de facturación asociada

### Paso 2: Habilitar Facturación (Si es Necesario)

1. **Crear cuenta de facturación:**
   - Ve a **"Billing"** > **"Link a billing account"**
   - Sigue el proceso para agregar una tarjeta de crédito

2. **Importante:**
   - ✅ **No te cobrarán** si no excedes el free tier
   - ✅ Puedes establecer **alertas de presupuesto** para controlar gastos
   - ✅ Puedes establecer **límites de facturación** ($0 para no gastar nada)

### Paso 3: Configurar Límites de Presupuesto (Recomendado)

1. **Crear alerta de presupuesto:**
   - Ve a **"Billing"** > **"Budgets & alerts"**
   - Crea un presupuesto de **$0.50** o **$1.00** por mes
   - Configura alertas cuando alcances el 50%, 90%, 100%

2. **Esto te protegerá de gastos inesperados**

### Paso 4: Habilitar la API

1. **Habilitar Generative Language API:**
   - Ve a **"APIs & Services"** > **"Library"**
   - Busca **"Generative Language API"**
   - Haz clic en **"Enable"**

2. **Verificar cuotas:**
   - Ve a **"APIs & Services"** > **"Quotas"**
   - Busca "Generative Language API"
   - Verifica que tengas cuota disponible

## 💡 Estrategias para Minimizar Costos

### 1. **Usar el Free Tier Eficientemente**
- Aprovecha los 60 RPM y 1,500 RPD
- Implementa caché para respuestas similares
- Agrupa solicitudes cuando sea posible

### 2. **Optimizar Tokens**
- Usa modelos más pequeños (Flash en lugar de Pro)
- Limita el tamaño del contexto cuando sea posible
- Comprime las respuestas del sistema

### 3. **Monitorear Uso**
- Revisa regularmente el dashboard de Google Cloud
- Configura alertas de uso
- Revisa logs para identificar patrones de uso excesivo

### 4. **Caché Inteligente**
- Guarda respuestas comunes en base de datos
- Reutiliza embeddings cuando sea posible
- Implementa rate limiting

## 📋 Checklist para Resolver el Error 403

- [ ] Cuenta de Google Cloud activa
- [ ] Proyecto creado en Google Cloud Console
- [ ] Facturación habilitada (con tarjeta, pero no se cobrará si no excedes límites)
- [ ] Generative Language API habilitada
- [ ] Límite de presupuesto configurado (opcional pero recomendado)
- [ ] API key válida y activa
- [ ] Sin restricciones de organización bloqueando el acceso

## 🆘 Alternativas si No Quieres Habilitar Facturación

### Opción 1: Usar API Key de Google AI Studio
- Google AI Studio ofrece acceso sin facturación para desarrollo
- Perfecto para pruebas y desarrollo
- Puede tener límites más estrictos

### Opción 2: Usar Otro Proveedor Temporalmente
- OpenAI (tiene free tier más limitado)
- Anthropic Claude (tiene free tier)
- Hugging Face (algunos modelos gratuitos)

### Opción 3: Desarrollo Local
- Usar modelos locales (Ollama, LM Studio)
- Solo para desarrollo, no para producción

## 📊 Comparación de Costos

### Gemini vs Otros Proveedores

| Proveedor | Free Tier | Costo/Millón Tokens (Entrada) |
|-----------|-----------|-------------------------------|
| **Gemini 2.5 Flash** | ✅ 60 RPM, 1.5K RPD | $0.30 |
| **Gemini 2.5 Pro** | ✅ Limitado | $1.25 |
| OpenAI GPT-4 | ❌ No free tier | ~$30.00 |
| OpenAI GPT-3.5 | ✅ Limitado | ~$0.50 |
| Anthropic Claude | ✅ Limitado | ~$3.00 |

**Conclusión:** Gemini es una de las opciones más económicas del mercado.

## ✅ Resumen

1. **Para desarrollo:** Puedes usar el free tier sin pagar
2. **Para producción:** Costos muy bajos (~$0.30-$2.50 por millón tokens)
3. **El error 403:** Probablemente necesitas habilitar facturación (no se cobrará si no excedes límites)
4. **Recomendación:** 
   - Habilitar facturación con alertas de presupuesto
   - Usar Gemini 2.5 Flash (el más económico)
   - Monitorear el uso regularmente

## 🔗 Enlaces Útiles

- [Precios Oficiales de Gemini](https://ai.google.dev/pricing)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google AI Studio](https://aistudio.google.com/)
- [Calculadora de Costos](https://cloud.google.com/products/calculator)

## 💬 Próximos Pasos

1. **Ir a Google Cloud Console** y verificar el estado de facturación
2. **Habilitar facturación** si es necesario (no se cobrará dentro del free tier)
3. **Habilitar Generative Language API**
4. **Configurar alertas de presupuesto** para protegerte
5. **Ejecutar el script de verificación:** `npm run verify:gemini`

---

**Nota:** El error 403 probablemente se resuelve habilitando facturación. Google no te cobrará si no excedes los límites del free tier, pero requiere una tarjeta asociada para verificar tu identidad y prevenir abuso.

