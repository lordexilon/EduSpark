# 🚀 Guía de Instalación: Scripts de PowerShell para RAG Worker

**Tiempo:** 2 minutos  
**Dificultad:** Fácil

---

## 📋 Paso 1: Instalar Scripts

### **Opción A: Instalación Automática** ⭐ (RECOMENDADO)

```powershell
# Copiar el contenido del script al perfil de PowerShell
$scriptPath = "scripts\rag-worker-vm.ps1"
$profileContent = Get-Content $scriptPath -Raw

# Agregar al perfil
Add-Content $PROFILE $profileContent

# Recargar perfil
. $PROFILE
```

### **Opción B: Instalación Manual**

1. Abrir el perfil de PowerShell:
```powershell
notepad $PROFILE
```

2. Si el archivo no existe, crearlo:
```powershell
New-Item -Path $PROFILE -Type File -Force
notepad $PROFILE
```

3. Copiar todo el contenido de `scripts\rag-worker-vm.ps1`

4. Pegar en el archivo del perfil

5. Guardar y cerrar

6. Recargar el perfil:
```powershell
. $PROFILE
```

---

## ✅ Paso 2: Verificar Instalación

```powershell
# Ejecutar comando de ayuda
Info-RagWorker
```

**Salida esperada:**
```
═══════════════════════════════════════════════════════
          RAG WORKER VM - INFORMACIÓN
═══════════════════════════════════════════════════════

📊 Comandos Disponibles:
  Start-RagWorker    - Encender la VM
  Stop-RagWorker     - Apagar la VM
  Status-RagWorker   - Ver estado de la VM
  ...
```

---

## 🎯 Paso 3: Uso Diario

### **Workflow Completo:**

```powershell
# 1. Verificar estado
Status-RagWorker

# 2. Encender VM
Start-RagWorker
# ⏳ Esperar 2 minutos

# 3. Verificar que esté encendida
Status-RagWorker
# Debe mostrar: ✅ Estado: RUNNING

# 4. Procesar archivos desde el frontend
# (Subir PDFs normalmente)

# 5. Verificar logs (opcional)
Logs-RagWorker
# Ctrl+C para salir

# 6. Apagar VM cuando termine
Stop-RagWorker
```

---

## 📊 Comandos Disponibles

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `Start-RagWorker` | Encender la VM | `Start-RagWorker` |
| `Stop-RagWorker` | Apagar la VM | `Stop-RagWorker` |
| `Status-RagWorker` | Ver estado | `Status-RagWorker` |
| `Connect-RagWorker` | SSH a la VM | `Connect-RagWorker` |
| `Logs-RagWorker` | Ver logs en tiempo real | `Logs-RagWorker` |
| `Info-RagWorker` | Mostrar ayuda | `Info-RagWorker` |

---

## 💰 Ahorro de Costos

### **Ejemplo Real:**

**Escenario: Procesas 5 archivos en 1 mes**

```
Tiempo total encendida: 5 horas
Costo VM: 5h × $0.040 = $0.20
Costo Disco: $5.00
Costo Supabase: $15.00
Total: $20.20/mes

Ahorro vs 24/7: $29/mes (59%)
```

---

## ⚠️ Consideraciones

### **1. Tiempo de Inicio:**
```
La VM tarda ~2 minutos en iniciar
Planifica este tiempo antes de procesar
```

### **2. IP Externa:**
```
La IP puede cambiar al apagar/encender
Esto NO afecta el funcionamiento
```

### **3. Disco:**
```
El disco SIEMPRE se cobra ($5/mes)
Incluso cuando la VM está apagada
```

---

## 🔧 Solución de Problemas

### **Error: "No se reconoce el comando"**

```powershell
# Verificar que el perfil se cargó
. $PROFILE

# Verificar que las funciones existen
Get-Command *RagWorker*
```

### **Error al encender/apagar:**

```powershell
# Verificar autenticación de gcloud
gcloud auth list

# Verificar proyecto
gcloud config get-value project
```

---

## 📝 Próximos Pasos

1. ✅ Instalar scripts
2. ✅ Probar encender/apagar VM
3. ✅ Configurar la VM (siguiente guía)
4. ✅ Procesar primer archivo

---

## 🎯 Resumen

**Instalación:**
```powershell
# 1. Agregar al perfil
Add-Content $PROFILE (Get-Content scripts\rag-worker-vm.ps1 -Raw)

# 2. Recargar
. $PROFILE

# 3. Verificar
Info-RagWorker
```

**Uso Diario:**
```powershell
Start-RagWorker   # Encender
# Esperar 2 minutos
# Procesar archivos
Stop-RagWorker    # Apagar
```

**Ahorro:**
```
$20.20/mes vs $49.20/mes
Ahorro: $29/mes (59%)
```

---

**¿Listo para instalar?** Ejecuta los comandos del Paso 1. 🚀
