# ⚡ Pasos Inmediatos para Habilitar Firestore

## 🔴 ACCIÓN REQUERIDA (Haz esto ahora):

### 1. Habilitar Firestore Database

**Abre este enlace:**
👉 https://console.firebase.google.com/project/eduspark-py/firestore

**Pasos:**
1. Si ves "Create database", haz clic
2. Selecciona **"Start in production mode"** (o test mode para desarrollo)
3. Elige ubicación: **`us-central1`** (o `southamerica-east1` para latinoamérica)
4. Haz clic en **"Enable"**
5. Espera 1-2 minutos

### 2. Habilitar Cloud Firestore API

**Abre este enlace:**
👉 https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=eduspark-py

**Pasos:**
1. Haz clic en **"Enable"**
2. Espera 1-2 minutos

---

## ✅ Cuando termines, avísame y continuamos con:

- Desplegar índices de Firestore
- Instalar dependencias de Cloud Functions
- Compilar Cloud Functions
- Desplegar Cloud Functions

---

## 🔍 Verificar que Firestore está habilitado:

Después de habilitar, puedes verificar ejecutando:

```bash
firebase firestore:databases:list
```

Si ves tu base de datos, ¡está listo!

