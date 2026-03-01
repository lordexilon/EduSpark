---
name: Supabase DevOps Operations
description: Estándares y comandos para el ciclo de vida de Supabase Edge Functions (Deploy, Secrets, Debug).
---

# ⚡ Supabase DevOps & Edge Functions

Este skill define los procedimientos operativos estándar para trabajar con Supabase Edge Functions en EduSpark. Seguir estos pasos asegura que el código local y el de producción estén sincronizados.

## 🚀 Workflow de Despliegue

### 1. Despliegue de Función Individual (Recomendado)
Cuando editas una función específica (ej. `generate-flashcards`), despliega **solo** esa función para minimizar riesgos.

```powershell
npx supabase functions deploy <nombre-funcion> --no-verify-jwt
```
*Ejemplo:* `npx supabase functions deploy generate-flashcards --no-verify-jwt`

### 2. Verificar Variables de Entorno (Secrets)
Si el código usa `Deno.env.get('MI_VAR')`, esa variable debe existir en el servidor de Supabase.

**Listar secretos actuales:**
```powershell
npx supabase secrets list
```

**Establecer/Actualizar secretos:**
```powershell
npx supabase secrets set GEMINI_API_KEY="tu-api-key"
```

---

## 🐞 Depuración y Logs

Cuando el frontend reporta `500 Internal Server Error`, los detalles reales están en los logs de la Edge Function.

### Ver Logs en Tiempo Real
Mantén esto corriendo en una terminal separada mientras pruebas la UI.

```powershell
npx supabase functions serve <nombre-funcion> --no-verify-jwt # Para pruebas locales
# O para logs de producción:
npx supabase check-logs <nombre-funcion> # (Requiere login CLI avanzado)
```

**Método Recomendado (Dashboard):**
1. Ir al Dashboard de Supabase > Edge Functions.
2. Clic en la función.
3. Pestaña "Logs".

---

## 🧪 Pruebas Locales (Antes de Deploy)

Puedes ejecutar la función localmente para probar sin desplegar.

1. **Iniciar servidor local:**
   ```powershell
   npx supabase start
   ```

2. **Servir función:**
   ```powershell
   npx supabase functions serve generate-flashcards --no-verify-jwt --env-file .env.local
   ```
   *Nota: Asegúrate de tener un archivo `.env.local` con las claves necesarias.*

---

## 🚨 Troubleshooting Común

| Error | Causa Probable | Solución |
|-------|----------------|----------|
| `404 Not Found` | URL incorrecta o Modelo AI deprecado | Verificar `index.ts` y versión de API (ej. v1beta vs v1). |
| `500 Internal Server Error` | Fallo de código o Variable de entorno faltante | Revisar Logs. Verificar `supabase secrets list`. |
| `Update failed` | Error de sintaxis o Deno dependencies | Correr el linter o probar localmente con `serve`. |
