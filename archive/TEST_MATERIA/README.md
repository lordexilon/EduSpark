# 🧪 Carpeta de Pruebas - MATEMÁTICA PARA LA EMPRESA I

Esta carpeta contiene los archivos y recursos necesarios para probar la plataforma EduSpark con la materia **MATEMÁTICA PARA LA EMPRESA I**.

## 📚 Materia Seleccionada: **MATEMÁTICA PARA LA EMPRESA I**

Hemos elegido **MATEMÁTICA PARA LA EMPRESA I** como materia de prueba porque:
- ✅ **Estructura curricular clara** con 4 unidades bien definidas
- ✅ **Enfoque teórico-práctico** ideal para RAG contextual
- ✅ **Progresión lógica** desde fundamentos hasta aplicaciones
- ✅ **Contenido empresarial** que permite generar embeddings significativos
- ✅ **Objetivos específicos** que facilitan la evaluación de respuestas

## 📋 Estructura Curricular

### **Unidad Nº 1: EXPRESIONES ALGEBRAICAS**
- Conceptos y procedimientos básicos del Álgebra
- Operaciones básicas (suma, resta, multiplicación, división, potenciación, radicación)
- Descomposición factorial y construcción de polinomios

### **Unidad Nº 2: ECUACIONES LINEALES – SISTEMAS DE ECUACIONES**
- Procedimientos para efectuar ecuaciones lineales
- Resolución de sistemas de ecuaciones lineales con dos incógnitas
- Demostración analítica y gráfica de ejercicios

### **Unidad Nº 3: PROGRESIONES ARITMÉTICAS Y GEOMÉTRICAS**
- Definición de progresiones aritméticas y geométricas
- Aplicación de fórmulas en resolución de problemas
- Modelización matemática de situaciones empresariales

### **Unidad Nº 4: TEORÍA DE CONJUNTOS**
- Clasificación de conjuntos y sus operaciones
- Resolución de problemas matemáticos con operaciones de conjuntos
- Utilización de conceptos en resolución de problemas empresariales

## 📁 Estructura de Archivos

```
TEST_MATERIA/
├── README.md                    # Este archivo
├── contenido_curso/             # Contenido estructurado del curso
│   ├── unidad_1_expresiones_algebraicas.md
│   ├── unidad_2_ecuaciones_lineales.md
│   ├── unidad_3_progresiones.md
│   └── unidad_4_teoria_conjuntos.md
├── datos_prueba/               # Datos para testing
│   ├── preguntas_estudiantes.json
│   ├── respuestas_esperadas.json
│   └── casos_empresariales.json
├── scripts_ingesta/            # Scripts para cargar datos (Node.js)
│   ├── procesar_contenido.js
│   └── generar_embeddings.js
├── server/                     # Servidor Express.js
│   ├── server.js
│   ├── package.json
│   └── routes/
│       └── tutor.js
└── resultados_pruebas/         # Resultados de las pruebas
    ├── logs_conversaciones.json
    └── metricas_rendimiento.json
```

## 🚀 **Configuración para tu Stack (Vite + Express.js)**

### **1. Instalación del Servidor**
```bash
cd TEST_MATERIA/server
npm install
```

### **1.1 Scripts de Node.js (Opcional)**
Si quieres ejecutar los scripts directamente:
```bash
# Procesar contenido
node scripts_ingesta/procesar_contenido.js

# Generar embeddings
node scripts_ingesta/generar_embeddings.js
```

### **2. Variables de Entorno**
Crear archivo `.env` en la carpeta `server/`:
```env
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### **3. Configuración del Cliente (Vite)**
En tu archivo `src/config.js`:
```javascript
export const SERVER_CONFIG = {
  IP: 'localhost',
  PORT: 3001,
  BASE_URL: 'http://localhost:3001/api'
};
```

## 🎯 Objetivos de las Pruebas

1. **Validar RAG**: Verificar que las respuestas sean precisas y contextuales
2. **Probar Detección de Intención**: Confirmar que clasifica correctamente las consultas
3. **Evaluar Análisis de Tono**: Verificar respuestas empáticas apropiadas
4. **Medir Rendimiento**: Tiempo de respuesta y calidad de las respuestas
5. **Validar Integración**: Frontend ↔ n8n ↔ Supabase

## 🔧 **Endpoints del Servidor**

### **Procesamiento de Contenido**
```bash
# Procesar contenido del curso
POST http://localhost:3001/api/tutor/procesar-contenido

# Generar embeddings
POST http://localhost:3001/api/tutor/generar-embeddings

# Verificar estado
GET http://localhost:3001/api/tutor/estado

# Probar embedding individual
POST http://localhost:3001/api/tutor/probar-embedding
Body: { "texto": "¿Qué es una variable en álgebra?" }
```

### **Ejemplo de Uso desde el Cliente**
```javascript
// En tu aplicación Vite
const procesarContenido = async () => {
  const response = await fetch('http://localhost:3001/api/tutor/procesar-contenido', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return await response.json();
};

const generarEmbeddings = async () => {
  const response = await fetch('http://localhost:3001/api/tutor/generar-embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return await response.json();
};
```

## 📊 **Flujo de Trabajo**

### **Fase 1: Preparación**
1. **Iniciar servidor**: `npm start` en `server/`
2. **Procesar contenido**: `POST /api/tutor/procesar-contenido`
3. **Generar embeddings**: `POST /api/tutor/generar-embeddings`

### **Fase 2: Integración**
1. **Cargar datos en Supabase** usando `datos_supabase.json`
2. **Configurar n8n workflow** con el webhook
3. **Conectar frontend** con el servidor

### **Fase 3: Pruebas**
1. **Probar detección de intención**
2. **Probar análisis de tono**
3. **Probar respuestas contextuales**
4. **Probar casos empresariales**

## 🎯 **Ventajas de esta Implementación**

- ✅ **Compatible con tu stack**: Vite + Express.js
- ✅ **Solo Node.js**: No requiere Python ni dependencias externas
- ✅ **API REST**: Fácil integración con frontend
- ✅ **Procesamiento asíncrono**: No bloquea el servidor
- ✅ **Manejo de errores**: Respuestas consistentes
- ✅ **Logging**: Seguimiento de operaciones
- ✅ **CORS configurado**: Para desarrollo local

## 🚀 **Próximos Pasos**

1. **Instalar dependencias** del servidor
2. **Configurar variables** de entorno
3. **Ejecutar procesamiento** de contenido
4. **Generar embeddings** con Google AI
5. **Cargar datos** en Supabase
6. **Configurar n8n** workflow
7. **Probar integración** completa

---

**Estado**: 🟡 Listo para implementación
**Última actualización**: $(date)
**Stack**: Vite + Express.js + Node.js