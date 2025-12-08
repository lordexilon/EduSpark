# 🚀 Guía de Implementación: RAG Worker en Compute Engine

**Fecha:** 2025-12-08  
**VM:** e2-standard-2 (2 vCPU, 8 GB RAM)  
**Costo:** ~$29/mes (con committed use 1 año)

---

## 📋 Resumen de la Solución

### **Arquitectura:**
```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Cloud Run)                                    │
│  └─> Crea job en Firestore                              │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Compute Engine VM (rag-worker-vm)                       │
│  ├─ Monitorea Firestore cada 30s                        │
│  ├─ Procesa PDFs página por página                      │
│  ├─ Genera embeddings con Gemini                        │
│  └─ Guarda en Supabase                                  │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Supabase (course_content_chunks)                        │
│  └─> Tutor IA + A2A Agents consumen                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Paso 1: Crear la VM

### **Comando:**
```bash
gcloud compute instances create rag-worker-vm \
  --project=eduspark-py \
  --zone=us-central1-a \
  --machine-type=e2-standard-2 \
  --subnet=default \
  --maintenance-policy=MIGRATE \
  --service-account=eduspark-py@appspot.gserviceaccount.com \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --create-disk=auto-delete=yes,boot=yes,device-name=rag-worker-vm,image=projects/ubuntu-os-cloud/global/images/ubuntu-2204-jammy-v20241115,mode=rw,size=50,type=pd-balanced \
  --labels=purpose=rag-worker
```

### **Verificar creación:**
```bash
gcloud compute instances list --project=eduspark-py
```

---

## 🔧 Paso 2: Conectarse a la VM

```bash
gcloud compute ssh rag-worker-vm \
  --zone=us-central1-a \
  --project=eduspark-py
```

---

## 🔧 Paso 3: Configurar la VM

### **Copiar el script de setup:**
```bash
# Desde tu máquina local
gcloud compute scp scripts/setup-vm.sh rag-worker-vm:/tmp/ \
  --zone=us-central1-a \
  --project=eduspark-py
```

### **Ejecutar el setup:**
```bash
# Dentro de la VM
sudo bash /tmp/setup-vm.sh
```

---

## 🔧 Paso 4: Configurar Variables de Entorno

### **Editar archivo .env:**
```bash
# Dentro de la VM
sudo nano /opt/rag-worker/functions/rag-worker/.env
```

### **Contenido del .env:**
```env
SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSy...
NODE_ENV=production
```

---

## 🔧 Paso 5: Iniciar el Servicio

```bash
# Habilitar inicio automático
sudo systemctl enable rag-worker

# Iniciar servicio
sudo systemctl start rag-worker

# Verificar estado
sudo systemctl status rag-worker

# Ver logs en tiempo real
sudo journalctl -u rag-worker -f
```

---

## 📊 Monitoreo y Logs

### **Ver logs:**
```bash
# Últimas 100 líneas
sudo journalctl -u rag-worker -n 100

# Logs en tiempo real
sudo journalctl -u rag-worker -f

# Logs desde hace 1 hora
sudo journalctl -u rag-worker --since "1 hour ago"
```

### **Verificar uso de recursos:**
```bash
# CPU y RAM
htop

# Espacio en disco
df -h

# Procesos
ps aux | grep node
```

---

## 🔄 Deployment de Actualizaciones

### **Desde tu máquina local:**
```bash
# Ejecutar script de deploy
bash scripts/deploy-to-vm.sh
```

### **Manualmente:**
```bash
# 1. Copiar archivos
gcloud compute scp --recurse functions/rag-worker/* \
  rag-worker-vm:/opt/rag-worker/functions/rag-worker/ \
  --zone=us-central1-a

# 2. SSH a la VM
gcloud compute ssh rag-worker-vm --zone=us-central1-a

# 3. Instalar dependencias
cd /opt/rag-worker/functions/rag-worker
npm install

# 4. Reiniciar servicio
sudo systemctl restart rag-worker

# 5. Verificar logs
sudo journalctl -u rag-worker -f
```

---

## 🐛 Solución de Problemas

### **Servicio no inicia:**
```bash
# Ver logs de error
sudo journalctl -u rag-worker -n 50

# Verificar permisos
ls -la /opt/rag-worker/functions/rag-worker/

# Verificar variables de entorno
cat /opt/rag-worker/functions/rag-worker/.env
```

### **Error de memoria:**
```bash
# Ver uso de memoria
free -h

# Ver procesos que consumen RAM
ps aux --sort=-%mem | head -10
```

### **Error de conexión a Supabase:**
```bash
# Verificar conectividad
curl -I https://mckfscukxcqwntpjagar.supabase.co

# Verificar service key
echo $SUPABASE_SERVICE_KEY
```

---

## 💰 Costos

### **Configuración Actual:**
```
VM: e2-standard-2
├── vCPU: 2 cores
├── RAM: 8 GB
├── Disk: 50 GB SSD
└── Region: us-central1

Costos:
├── On-demand: $48/mes
├── 1-year commit: $29/mes (40% descuento)
└── 3-year commit: $21/mes (57% descuento)

Total con Supabase:
├── Supabase Small: $15/mes
├── VM (1-year): $29/mes
└── Total: $44/mes
```

---

## 🔐 Seguridad

### **Firewall Rules:**
```bash
# Solo permitir SSH desde tu IP
gcloud compute firewall-rules create allow-ssh-from-my-ip \
  --allow tcp:22 \
  --source-ranges=TU_IP/32 \
  --target-tags=rag-worker
```

### **Backup Automático:**
```bash
# Crear snapshot diario
gcloud compute disks snapshot rag-worker-vm \
  --zone=us-central1-a \
  --snapshot-names=rag-worker-backup-$(date +%Y%m%d)
```

---

## ✅ Checklist de Implementación

- [ ] VM creada y funcionando
- [ ] Node.js 20 instalado
- [ ] Código del worker deployado
- [ ] Variables de entorno configuradas
- [ ] Servicio systemd habilitado
- [ ] Logs verificados
- [ ] Procesamiento de test exitoso
- [ ] Monitoreo configurado
- [ ] Backup configurado

---

## 📝 Próximos Pasos

1. **Probar con Harrison 21ª:**
   - Subir PDF
   - Monitorear logs
   - Verificar chunks en Supabase

2. **Optimizar Performance:**
   - Ajustar batch size
   - Configurar rate limiting
   - Optimizar uso de memoria

3. **Configurar Alertas:**
   - Cloud Monitoring
   - Email notifications
   - Slack integration

---

**Última actualización:** 2025-12-08  
**Autor:** Sistema EduSpark
