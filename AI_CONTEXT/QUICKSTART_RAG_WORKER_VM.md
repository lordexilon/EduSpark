# 🚀 Guía Rápida: Configurar RAG Worker VM

**VM:** rag-worker-vm  
**IP Externa:** 34.133.217.99  
**Estado:** ✅ RUNNING

---

## ⚡ Inicio Rápido (5 minutos)

### **Paso 1: Conectarse a la VM**

```bash
gcloud compute ssh rag-worker-vm \
  --zone=us-central1-a \
  --project=eduspark-py
```

---

### **Paso 2: Copiar Script de Setup**

```bash
# Desde tu máquina local (PowerShell)
gcloud compute scp scripts/setup-vm.sh rag-worker-vm:/tmp/ `
  --zone=us-central1-a `
  --project=eduspark-py
```

---

### **Paso 3: Ejecutar Setup**

```bash
# Dentro de la VM
sudo bash /tmp/setup-vm.sh
```

**Esto instalará:**
- ✅ Node.js 20
- ✅ Git
- ✅ Dependencias del sistema
- ✅ Servicio systemd

---

### **Paso 4: Configurar Variables de Entorno**

```bash
# Editar .env
sudo nano /opt/rag-worker/functions/rag-worker/.env
```

**Contenido:**
```env
SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSy...
NODE_ENV=production
```

**Guardar:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### **Paso 5: Iniciar Servicio**

```bash
# Habilitar inicio automático
sudo systemctl enable rag-worker

# Iniciar servicio
sudo systemctl start rag-worker

# Verificar estado
sudo systemctl status rag-worker
```

**Salida esperada:**
```
● rag-worker.service - RAG Worker Service
   Loaded: loaded
   Active: active (running)
```

---

### **Paso 6: Ver Logs**

```bash
# Logs en tiempo real
sudo journalctl -u rag-worker -f
```

**Salida esperada:**
```
[RAG Worker] Iniciando procesamiento...
[RAG Worker] Conectado a Supabase
[RAG Worker] Monitoreando jobs...
```

---

## ✅ Verificación

### **Comprobar que todo funciona:**

```bash
# 1. Servicio activo
sudo systemctl is-active rag-worker
# Debe mostrar: active

# 2. Sin errores en logs
sudo journalctl -u rag-worker -n 20 --no-pager
# No debe haber errores

# 3. Proceso corriendo
ps aux | grep node
# Debe mostrar: node index.js
```

---

## 🔧 Comandos Útiles

### **Gestión del Servicio:**

```bash
# Ver estado
sudo systemctl status rag-worker

# Reiniciar
sudo systemctl restart rag-worker

# Detener
sudo systemctl stop rag-worker

# Ver logs
sudo journalctl -u rag-worker -f
```

### **Monitoreo:**

```bash
# Uso de CPU/RAM
htop

# Espacio en disco
df -h

# Procesos
ps aux | grep node
```

---

## 🐛 Solución de Problemas

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

---

## 📊 Próximos Pasos

1. ✅ VM configurada y funcionando
2. 🧪 Probar con un archivo pequeño
3. 🚀 Procesar Harrison 21ª
4. 📈 Monitorear performance
5. 💰 Activar Committed Use Discount

---

## 📝 Información de la VM

```yaml
Nombre: rag-worker-vm
Zona: us-central1-a
IP Externa: 34.133.217.99
IP Interna: 10.128.0.2
Machine Type: e2-standard-2 (2 vCPU, 8 GB RAM)
Disco: 50 GB SSD
Estado: RUNNING
```

---

## 🔗 Enlaces Útiles

- **Google Cloud Console:** https://console.cloud.google.com/compute/instances
- **Supabase Dashboard:** https://supabase.com/dashboard/project/mckfscukxcqwntpjagar
- **Documentación Completa:** `AI_CONTEXT/GUIA_IMPLEMENTACION_VM_RAG_WORKER.md`

---

**¿Listo para comenzar?** Ejecuta el Paso 1 y sigue la guía. 🚀
