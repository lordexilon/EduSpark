# Configuración de Supabase para Cloud Run

## Problema
Los usuarios no pueden conectarse porque la URL de Cloud Run no está configurada en Supabase como URL de redirect permitida.

## Solución

### Paso 1: Agregar URL de Cloud Run en Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/mckfscukxcqwntpjagar
2. Navega a **Authentication** → **URL Configuration**
3. En **Site URL**, agrega o verifica:
   ```
   https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
   ```
4. En **Redirect URLs**, agrega las siguientes URLs:
   ```
   https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/**
   https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/callback
   https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/auth/confirm
   ```

### Paso 2: Verificar Configuración de CORS (si es necesario)

Si aún hay problemas, verifica la configuración de CORS en Supabase:

1. Ve a **Settings** → **API**
2. Verifica que **CORS** esté configurado para permitir tu dominio:
   - Agrega: `https://eduspark-frontend-mcc5aevj6a-uc.a.run.app`

### Paso 3: Verificar Variables de Entorno

Las variables de Supabase están hardcodeadas en `vite.config.ts` con estos valores:

- **URL**: `https://mckfscukxcqwntpjagar.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8`

Estos valores se compilan en el build, así que están correctos en la aplicación desplegada.

## Verificación

Después de configurar las URLs en Supabase:

1. Abre la aplicación: https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
2. Intenta iniciar sesión
3. Verifica en la consola del navegador (F12) si hay errores de CORS o redirect

## Comandos Útiles

### Ver logs del servicio
```bash
gcloud run services logs read eduspark-frontend --region us-central1 --limit 50
```

### Ver logs en tiempo real
```bash
gcloud run services logs tail eduspark-frontend --region us-central1
```

## Notas Importantes

- **Las variables de entorno de Supabase están hardcodeadas en el build**, por lo que no necesitas configurarlas en Cloud Run
- **La URL de redirect debe coincidir exactamente** con la URL de tu servicio Cloud Run
- **Los cambios en Supabase son inmediatos**, no necesitas redesplegar la aplicación

## Si el Problema Persiste

1. Verifica en la consola del navegador (F12 → Console) los errores específicos
2. Revisa la pestaña Network para ver qué requests están fallando
3. Verifica que la URL de Supabase sea correcta: `https://mckfscukxcqwntpjagar.supabase.co`

