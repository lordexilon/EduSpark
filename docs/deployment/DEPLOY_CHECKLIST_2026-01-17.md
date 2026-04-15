# 🚀 Checklist de Despliegue - 17 de Enero 2026

## 📋 **Cambios Incluidos en Este Despliegue**

### ✅ **Sistema de Prevención de Usuarios Huérfanos**
1. **Frontend:**
   - ✅ Eliminado fallback peligroso en `bulkUserImportService.ts`
   - ✅ Nueva página: `/admin/migrate-orphan-users`
   - ✅ Ruta agregada en `App.tsx`

2. **Backend (Pendiente - Ejecutar manualmente en Supabase):**
   - ⏳ Deprecar función RPC: `sql_scripts/5_fixes/deprecate_create_bulk_users.sql`
   - ⏳ Trigger preventivo: `sql_scripts/5_fixes/prevent_orphan_users_trigger.sql`

3. **Edge Functions (Pendiente - Desplegar en Supabase):**
   - ⏳ `migrateUsersToAuth` - Migrar usuarios huérfanos
   - ⏳ Verificar `createBulkUsers` - Ya debe estar desplegada

---

## 🎯 **Pasos de Despliegue**

### **Pre-Despliegue**
- [ ] 1. Código compilado localmente sin errores
- [ ] 2. Autenticado en Google Cloud (`gcloud auth login`)
- [ ] 3. Proyecto configurado (`gcloud config set project eduspark-py`)

### **Despliegue Frontend a Google Cloud Run**
- [ ] 4. Build local: `npm run build`
- [ ] 5. Deploy con Cloud Build: `gcloud builds submit --config cloudbuild.yaml`
- [ ] 6. Verificar URL del servicio desplegado

### **Despliegue Backend en Supabase**
- [ ] 7. Desplegar Edge Function: `supabase functions deploy migrateUsersToAuth`
- [ ] 8. Configurar secret: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`
- [ ] 9. Ejecutar script SQL de deprecación
- [ ] 10. (Opcional) Ejecutar script SQL de trigger preventivo

### **Post-Despliegue**
- [ ] 11. Verificar frontend carga correctamente
- [ ] 12. Probar login
- [ ] 13. Acceder a `/admin/migrate-orphan-users`
- [ ] 14. Ejecutar migración de los 12 usuarios huérfanos
- [ ] 15. Verificar que usuarios pueden iniciar sesión

---

## 📝 **Comandos de Despliegue**

### **1. Build Local (Verificación)**
```bash
npm run build
```

### **2. Despliegue a Google Cloud**
```bash
# Configurar proyecto
gcloud config set project eduspark-py

# Desplegar (método 1 - Cloud Build automático)
gcloud builds submit --config cloudbuild.yaml
```

**O método alternativo (manual):**
```bash
# Build imagen Docker
docker build -f Dockerfile-cloudrun -t gcr.io/eduspark-py/eduspark-frontend:latest .

# Push a GCR
gcloud auth configure-docker
docker push gcr.io/eduspark-py/eduspark-frontend:latest

# Deploy a Cloud Run
gcloud run deploy eduspark-frontend `
  --image gcr.io/eduspark-py/eduspark-frontend:latest `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --min-instances 0 `
  --max-instances 10
```

### **3. Despliegue Edge Functions (Supabase)**
```bash
# Desplegar función de migración
supabase functions deploy migrateUsersToAuth

# Configurar service role key (si no está configurado)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### **4. Ejecutar Scripts SQL (En Supabase SQL Editor)**
```sql
-- Script 1: Deprecar función RPC
\i sql_scripts/5_fixes/deprecate_create_bulk_users.sql

-- Script 2 (Opcional): Trigger preventivo
\i sql_scripts/5_fixes/prevent_orphan_users_trigger.sql
```

---

## ✅ **Verificación Post-Despliegue**

### **Frontend:**
```bash
# Obtener URL del servicio
gcloud run services describe eduspark-frontend --region us-central1 --format "value(status.url)"
```

### **Pruebas:**
1. ✅ Abrir URL en navegador
2. ✅ Login con usuario admin
3. ✅ Ir a `/admin/migrate-orphan-users`
4. ✅ Ver lista de 12 usuarios huérfanos
5. ✅ Clic en "Iniciar Migración Masiva"
6. ✅ Verificar resultados (12 migrados)

### **Verificar Migración de Usuarios:**
```sql
-- Ejecutar en Supabase SQL Editor
SELECT 
    pu.id,
    pu.email,
    CASE 
        WHEN au.id IS NULL THEN '❌ Aún sin auth.users'
        ELSE '✅ Migrado correctamente'
    END as estado
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE pu.id IN (
    '11215074-a65c-47c3-82cf-ea68b1afb679',
    '13d689b8-afa9-4db5-b057-da7bbb5d84fb',
    '3076db90-51e1-4065-bb2d-d321ef6d7a48',
    '69c36c20-c0bf-4cc3-ba64-9d5909f6831c',
    '81d98181-84d7-4b7e-844f-d4cb6c541e50',
    '85c02afb-0a6b-4a89-9e83-214955806909',
    '9955437d-85e5-4c65-ba46-6752564cdb23', -- Paloma
    'a7b71e72-e4c0-4916-9d1a-c175f0fd26e8',
    'ac0e6e1f-c3ff-47bd-b864-cac642469c84',
    'afdcf53f-9256-44fd-afdd-e942647f20dc',
    'ba7bfc03-1bab-47f0-9156-6b22c92b9191',
    'd4bc22f7-cf23-4329-9c90-a7001961d39f'
);
```

---

## 🔥 **Comunicación a Usuarios Afectados**

Una vez migrados los usuarios, enviar credenciales:

**Usuarios con documento de identidad:**
- Email: [su email]
- Contraseña: [su número de documento]

**Usuarios sin documento:**
- Email: [su email]
- Contraseña: `EduSpark2024!`

**Recomendación:** Pedir cambio de contraseña en primer inicio de sesión.

---

## 📊 **Estado Actual**

| Componente | Estado | Acción |
|------------|--------|--------|
| Código Frontend | ✅ Listo | Deploy a Cloud Run |
| Edge Function `migrateUsersToAuth` | ⏳ En local | Deploy a Supabase |
| Edge Function `createBulkUsers` | ❓ Verificar | Confirmar desplegada |
| Script SQL deprecación | ⏳ Pendiente | Ejecutar en Supabase |
| Script SQL trigger | ⏳ Pendiente | Ejecutar en Supabase (opcional) |
| Usuarios Huérfanos | ❌ 12 sin migrar | Migrar post-deploy |

---

**Responsable:** [Tu nombre]  
**Fecha:** 17 de Enero 2026  
**Proyecto:** eduspark-py  
**Servicio:** eduspark-frontend
