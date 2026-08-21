# 🎯 Próximos Pasos para Completar la Configuración

**Estado Actual:** 99% Completado  
**Tiempo Restante:** 5 minutos

---

## ✅ Lo que Ya Está Hecho

1. ✅ VM creada y funcionando
2. ✅ Node.js 20 instalado
3. ✅ Código del worker copiado
4. 🔄 Dependencias instalándose (`npm install`)

---

## 📋 Pasos Finales (5 minutos)

### **Paso 1: Configurar API Key de Gemini**

Una vez que terminen de instalarse las dependencias, necesitas agregar tu GEMINI_API_KEY:

```bash
# Conectarse a la VM
gcloud compute ssh rag-worker-vm --zone=us-central1-a

# Editar el archivo .env
sudo nano /opt/rag-worker/functions/rag-worker/.env

# Buscar la línea:
# GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# Reemplazar con tu API key real de Gemini
# Guardar: Ctrl+O, Enter
# Salir: Ctrl+X
```

---

### **Paso 2: Crear Servicio Systemd**

```bash
# Crear archivo de servicio
sudo tee /etc/systemd/system/rag-worker.service > /dev/null <<EOF
[Unit]
Description=RAG Worker Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/rag-worker/functions/rag-worker
EnvironmentFile=/opt/rag-worker/functions/rag-worker/.env
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=rag-worker

[Install]
WantedBy=multi-user.target
EOF

# Habilitar e iniciar el servicio
sudo systemctl daemon-reload
sudo systemctl enable rag-worker
sudo systemctl start rag-worker

# Verificar estado
sudo systemctl status rag-worker
```

---

### **Paso 3: Verificar Logs**

```bash
# Ver logs en tiempo real
sudo journalctl -u rag-worker -f

# Deberías ver algo como:
# [RAG Worker] Iniciando procesamiento...
# [RAG Worker] Conectado a Supabase
# [RAG Worker] Monitoreando jobs...
```

---

### **Paso 4: Apagar la VM**

```bash
# Salir de la VM
exit

# Desde PowerShell en tu máquina local:
Stop-RagWorker
```

---

## 🧪 Paso 5: Probar con un Archivo

### **Workflow Completo:**

```powershell
# 1. Encender VM
Start-RagWorker

# 2. Esperar 2 minutos
Start-Sleep -Seconds 120

# 3. Verificar que esté funcionando
Status-RagWorker

# 4. Ir al frontend y subir un PDF pequeño
# URL: http://localhost:5173/teacher/file-processing
# O en producción: https://eduspark-frontend-mcc5aevj6a-uc.a.run.app/teacher/file-processing

# 5. Monitorear logs (opcional)
Logs-RagWorker

# 6. Cuando termine, apagar VM
Stop-RagWorker
```

---

## 📊 Verificar que Todo Funciona

### **En la VM:**
```bash
# Servicio activo
sudo systemctl is-active rag-worker
# Debe mostrar: active

# Sin errores en logs
sudo journalctl -u rag-worker -n 20 --no-pager
# No debe haber errores

# Proceso corriendo
ps aux | grep node
# Debe mostrar: node index.js
```

### **En Supabase:**
```sql
-- Verificar que se crearon chunks
SELECT COUNT(*) FROM course_content_chunks
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Ver últimos chunks creados
SELECT 
  id,
  content,
  metadata->>'pageStart' as page_start,
  metadata->>'pageEnd' as page_end,
  metadata->>'material_id' as material_id
FROM course_content_chunks
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Resultado Esperado

Al procesar un PDF de 100 páginas, deberías ver:
- ✅ Chunks creados en Supabase
- ✅ Páginas reales (1-100, no números raros)
- ✅ Sin error "Invalid string length"
- ✅ Tiempo de procesamiento: ~5-10 minutos

---

## 💰 Costos Reales de Uso

### **Ejemplo: Procesar 5 archivos en 1 mes**

```
Tiempo total encendida: 5 horas (1h por archivo)
Costo VM: 5h × $0.040 = $0.20
Costo Disco: $5.00 (siempre)
Costo Supabase: $15.00
Total: $20.20/mes

Ahorro vs Cloud Run: $9.80/mes
```

---

## ⚠️ Solución de Problemas

### **Servicio no inicia:**
```bash
# Ver errores
sudo journalctl -u rag-worker -n 50

# Verificar permisos
ls -la /opt/rag-worker/functions/rag-worker/

# Verificar .env
cat /opt/rag-worker/functions/rag-worker/.env
```

### **Error de conexión a Supabase:**
```bash
# Probar conectividad
curl -I https://mckfscukxcqwntpjagar.supabase.co

# Verificar service key
grep SUPABASE_SERVICE_KEY /opt/rag-worker/functions/rag-worker/.env
```

### **Error de Gemini API:**
```bash
# Verificar API key
grep GEMINI_API_KEY /opt/rag-worker/functions/rag-worker/.env

# Probar API key (opcional)
curl https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY
```

---

## 🎉 ¡Listo!

Una vez completados estos pasos, tendrás:
- ✅ VM configurada y funcionando
- ✅ Procesamiento de PDFs hasta 900 MB
- ✅ Páginas reales capturadas
- ✅ Costo optimizado ($20.80/mes)

---

## 📝 Comandos Rápidos de Referencia

```powershell
# Encender VM
Start-RagWorker

# Ver estado
Status-RagWorker

# Conectarse
Connect-RagWorker

# Ver logs
Logs-RagWorker

# Apagar VM
Stop-RagWorker

# Ayuda
Info-RagWorker
```

---

**Próximo paso:** Esperar que terminen de instalarse las dependencias (~3 minutos más)
