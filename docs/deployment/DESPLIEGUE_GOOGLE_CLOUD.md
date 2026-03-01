# 🚀 Despliegue Frontend - Google Cloud Run

**Fecha:** 2025-12-14  
**Versión:** 2.0  
**Cambios:** Mejoras UI Tutor + Control Sesión Única

---

## 📋 Cambios Incluidos en Este Despliegue

### 1. Mejoras UI del Tutor Virtual ✨
- ✅ Contador de materiales solo muestra asignados
- ✅ Ocultar costos/tokens para estudiantes
- ✅ Chat ocupa pantalla completa (sin márgenes)
- ✅ Tarjeta de institución mejorada (gradiente azul, logo grande)
- ✅ Tutor mantiene sidebar visible
- ✅ Secure-viewer integrado con sidebar

### 2. Control de Sesión Única 🔐
- ✅ Hook `useSessionMonitor` - Monitorea sesión cada 30 segundos
- ✅ Cierre automático si otro dispositivo inicia sesión
- ✅ Página `/devices` mejorada con dispositivos inactivos colapsables
- ✅ Badge "ACTIVO AHORA" prominente con efecto pulso

### 3. Redirección de Logout 🚪
- ✅ Todos los usuarios redirigen a `/cec` después de logout

---

## 📁 Archivos Modificados

### Frontend (React/TypeScript)
```
src/
├── App.tsx                                    ← Routing + useSessionMonitor
├── hooks/
│   └── useSessionMonitor.tsx                  ← NUEVO: Monitor de sesión
├── pages/
│   ├── TutorVirtualPage.tsx                   ← Chat pantalla completa
│   ├── ProfilePage.tsx                        ← Logout → /cec
│   └── UserDevicesPage.tsx                    ← UI mejorada + colapsable
├── components/
│   ├── Sidebar.tsx                            ← Tarjeta institución mejorada
│   └── TeacherSidebar.tsx                     ← Tarjeta institución mejorada
└── audio-tutor/
    └── components/
        └── CourseContentPanel.tsx             ← Contador materiales actualizado
```

### Backend (Supabase SQL)
```
supabase/functions/
└── register_user_device_single_session.sql    ← NUEVO: Función sesión única
```

### Documentación
```
docs/
├── CAMBIOS_2025-12-14_TUTOR_UI.md            ← Cambios UI Tutor
└── IMPLEMENTACION_SESION_UNICA.md            ← Implementación sesión única
```

---

## 🔧 Pasos de Despliegue

### PASO 1: Ejecutar Función SQL en Supabase ⚠️ CRÍTICO

**ANTES de desplegar el frontend**, ejecutar en Supabase:

```bash
# 1. Abrir: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
# 2. Copiar TODO el contenido de:
#    supabase/functions/register_user_device_single_session.sql
# 3. Pegar y ejecutar (RUN)
```

**Verifica que no haya errores.** Esta función es necesaria para el control de sesión única.

---

### PASO 2: Build del Frontend

```bash
# 1. Asegurarse de estar en el directorio del proyecto
cd c:\Users\ADMIN\Documents\ApplicandoLA-Lenovo\Oportunidad Negocios\eduspark

# 2. Instalar dependencias (si hace falta)
npm install

# 3. Limpiar build anterior
rm -rf dist

# 4. Crear build de producción
npm run build

# 5. Verificar que el build fue exitoso
# Debe crear carpeta dist/ con index.html y assets/
```

---

### PASO 3: Desplegar a Google Cloud Run

```bash
# Desplegar usando gcloud
gcloud run deploy eduspark-frontend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10 \
  --port 8080

# Esperar a que complete el despliegue
# Al finalizar, mostrará la URL:
# Service URL: https://eduspark-frontend-XXXXX.a.run.app
```

---

## ✅ Verificación Post-Despliegue

### 1. Verificar UI del Tutor
```
URL: https://eduspark-frontend-XXXXX.a.run.app/tutor?courseId=12

Verificar:
- ✅ Chat ocupa todo el ancho
- ✅ Sidebar visible
- ✅ Tarjeta de institución con gradiente azul
- ✅ Costos/tokens NO visibles para estudiantes
```

### 2. Verificar Sesión Única
```
URL: https://eduspark-frontend-XXXXX.a.run.app/devices

Verificar:
- ✅ Muestra "Sesión Activa (1/1)"
- ✅ Badge "ACTIVO AHORA" con pulso verde
- ✅ Dispositivos inactivos colapsables
- ✅ Mensaje de "Solo 1 sesión activa a la vez"
```

### 3. Verificar Logout
```
1. Ir a /profile
2. Click en "Cerrar Sesión"
Verificar:
- ✅ Redirige a /cec
```

### 4. Test de Sesión Única
```
1. Login en Chrome
2. Login en Firefox (mismo usuario)
3. En Chrome, esperar 30 segundos
Verificar:
- ✅ Chrome muestra alerta de sesión cerrada
- ✅ Chrome redirige a /cec
- ✅ Solo Firefox tiene sesión activa
```

---

## 🔄 Rollback en Caso de Problemas

Si hay problemas después del despliegue:

```bash
# Ver revisiones anteriores
gcloud run revisions list --service eduspark-frontend --region us-central1

# Hacer rollback a revisión anterior
gcloud run services update-traffic eduspark-frontend \
  --to-revisions REVISION_NAME=100 \
  --region us-central1
```

---

## 📊 Monitoreo Post-Despliegue

### Logs en Google Cloud
```bash
# Ver logs en tiempo real
gcloud run services logs read eduspark-frontend \
  --region us-central1 \
  --follow

# Buscar errores
gcloud run services logs read eduspark-frontend \
  --region us-central1 \
  --filter="severity>=ERROR"
```

### Métricas a Monitorear
- **CPU Usage**: Debe estar < 80%
- **Memory Usage**: Debe estar < 400Mi
- **Request Count**: Normal según tráfico
- **Error Rate**: Debe ser < 1%

---

## ⚠️ Notas Importantes

### Variables de Entorno
Asegurarse de que estén configuradas en Google Cloud Run:
```
VITE_SUPABASE_URL=https://XXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyXXX...
VITE_GEMINI_API_KEY=AIzaXXX...
VITE_GOOGLE_TTS_API_KEY=AIzaXXX...
```

### Dependencias de Backend
**CRÍTICO:** La función SQL debe estar ejecutada ANTES de desplegar.

Si no se ejecutó:
1. Algunos usuarios pueden experimentar errores al iniciar sesión
2. El monitor de sesión puede no funcionar correctamente

### Cache del Navegador
Después del despliegue, algunos usuarios pueden necesitar:
- **Ctrl + F5** (limpiar caché)
- O esperar 5-10 minutos para que el CDN actualice

---

## 🎯 Expectativas de Rendimiento

### Tiempo de Build
- **Build local**: ~2-3 minutos
- **Despliegue GCloud**: ~3-5 minutos
- **Total**: ~5-8 minutos

### Tamaño del Bundle
- **Esperado**: ~2-3 MB comprimido
- **Assets**: ~500 KB
- **JavaScript**: ~1.5 MB

---

## 📞 Troubleshooting

### Error: "Function register_user_device not found"
**Solución:** Ejecutar el SQL en Supabase primero (Paso 1)

### Error: "Build failed"
**Solución:** 
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Error: "Memory limit exceeded"
**Solución:** Aumentar memoria en el comando de despliegue a `--memory 1Gi`

### Usuarios reportan "Sesión cerrada"
**Normal:** Es el comportamiento esperado con sesión única.
**Verificar:** Que el usuario entiende que solo puede tener 1 sesión activa.

---

## ✅ Checklist de Despliegue

Antes de desplegar, verificar:

- [ ] Función SQL ejecutada en Supabase
- [ ] Build local exitoso (`npm run build`)
- [ ] Sin errores de TypeScript
- [ ] Variables de entorno configuradas
- [ ] Backup de la versión anterior disponible
- [ ] Plan de rollback preparado
- [ ] Equipo notificado del despliegue

Después del despliegue, verificar:

- [ ] UI del tutor funciona correctamente
- [ ] Página de dispositivos muestra info correcta
- [ ] Logout redirige a /cec
- [ ] Monitor de sesión funciona (test con 2 dispositivos)
- [ ] No hay errores en los logs
- [ ] Métricas de performance son normales

---

**¡Despliegue Listo! 🚀**

_Documentado por: Antigravity AI Agent_  
_Fecha: 2025-12-14_
