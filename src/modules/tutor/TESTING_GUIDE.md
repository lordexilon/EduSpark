# Guía de Testing - Audio-Tutor Multi-Agente

## Resumen

Esta guía describe cómo ejecutar y mantener los tests del sistema Audio-Tutor Multi-Agente, incluyendo tests unitarios, de integración y end-to-end.

## Estructura de Tests

```
tests/
├── setup.ts                    # Configuración global de Jest
├── test-setup.ts              # Utilidades y datos de prueba
├── agents/                    # Tests unitarios de agentes
│   ├── VoiceAgent.test.ts
│   ├── RAGAgent.test.ts
│   └── ContextAgent.test.ts
├── integration/               # Tests de integración
│   └── AgentSystem.test.ts
└── e2e/                      # Tests end-to-end
    └── PersonalizationE2E.test.ts
```

## Tipos de Tests

### 1. Tests Unitarios
**Propósito**: Probar componentes individuales en aislamiento

**Cobertura**:
- VoiceAgent: Síntesis y reconocimiento de voz
- RAGAgent: Consultas y personalización
- ContextAgent: Gestión de memoria y contexto

**Ejecutar**:
```bash
npm run test:unit
```

### 2. Tests de Integración
**Propósito**: Probar la interacción entre múltiples componentes

**Cobertura**:
- Flujo completo de conversación
- Personalización por estilo pedagógico
- Personalización por perfil de estudiante
- Persistencia de memoria
- Manejo de errores

**Ejecutar**:
```bash
npm run test:integration
```

### 3. Tests End-to-End (E2E)
**Propósito**: Probar el sistema completo con datos reales

**Cobertura**:
- Escenarios de personalización completos
- Persistencia entre sesiones
- Múltiples estudiantes en el mismo curso
- Configuración de voces
- Escalas de calificación
- Rendimiento y latencia

**Ejecutar**:
```bash
npm run test:e2e
```

## Configuración

### Variables de Entorno

Crear archivo `.env.test`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/test
NODE_ENV=test
```

### Base de Datos de Prueba

Los tests utilizan una base de datos de prueba separada. Asegúrate de que:

1. Las tablas estén creadas (ver `sql_scripts/`)
2. Las políticas RLS estén configuradas
3. Tengas acceso de escritura para crear datos de prueba

## Ejecución de Tests

### Comando Básico
```bash
npm test
```

### Tests Específicos
```bash
# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e

# Todos los tests
npm run test:all
```

### Modo Watch
```bash
npm run test:watch
```

### Con Cobertura
```bash
npm run test:coverage
```

### Para CI/CD
```bash
npm run test:ci
```

## Script de Ejecución Completa

El script `scripts/run-tests.js` ejecuta todos los tests en secuencia:

```bash
node scripts/run-tests.js
```

**Características**:
- Verificación de dependencias
- Configuración automática del entorno
- Ejecución secuencial de todos los tests
- Generación de reporte de cobertura
- Limpieza automática de archivos temporales
- Reporte detallado de resultados

## Datos de Prueba

### Estudiantes de Prueba
- **student-visual-001**: Estilo de aprendizaje visual
- **student-auditory-002**: Estilo de aprendizaje auditivo
- **student-kinesthetic-003**: Estilo de aprendizaje kinestésico

### Docentes de Prueba
- **teacher-socratic-001**: Metodología socrática
- **teacher-direct-002**: Metodología directa
- **teacher-constructivist-003**: Metodología constructivista

### Cursos de Prueba
- **course-biology-001**: Biología General (Socrático)
- **course-chemistry-002**: Química Orgánica (Directo)
- **course-physics-003**: Física Experimental (Constructivista)

## Escenarios de Prueba

### 1. Personalización por Estilo Pedagógico

#### Socrático
- **Entrada**: "¿Qué es la fotosíntesis?"
- **Esperado**: Preguntas guiadas, fomento de reflexión
- **Verificación**: `appliedStyle: 'socratico'`

#### Directo
- **Entrada**: "Explica la síntesis de proteínas"
- **Esperado**: Explicación clara y estructurada
- **Verificación**: `appliedStyle: 'directo'`

#### Constructivista
- **Entrada**: "¿Cómo funciona un laboratorio?"
- **Esperado**: Construcción del conocimiento, conexiones
- **Verificación**: `appliedStyle: 'constructivista'`

### 2. Personalización por Perfil de Estudiante

#### Visual
- **Entrada**: "¿Qué es la célula?"
- **Esperado**: Referencias a diagramas, explicaciones visuales
- **Verificación**: `learningStyle: 'visual'`

#### Auditivo
- **Entrada**: "¿Qué es la química?"
- **Esperado**: Analogías sonoras, explicaciones verbales
- **Verificación**: `learningStyle: 'auditory'`

#### Kinestésico
- **Entrada**: "¿Qué es la física?"
- **Esperado**: Referencias a experimentos, actividades prácticas
- **Verificación**: `learningStyle: 'kinesthetic'`

### 3. Persistencia de Memoria

#### Flujo de Conversación
1. Estudiante se presenta
2. Hace pregunta sobre el curso
3. Cierra sesión
4. Reabre sesión
5. Hace referencia a conversación anterior

#### Verificación
- Conversación se mantiene entre sesiones
- Contexto se preserva
- Resumen se genera correctamente

## Métricas de Calidad

### Cobertura de Código
- **Objetivo**: > 80%
- **Comando**: `npm run test:coverage`
- **Reporte**: `coverage/index.html`

### Tiempo de Respuesta
- **Objetivo**: < 3 segundos
- **Medición**: Tests de rendimiento
- **Verificación**: Tests E2E

### Tasa de Éxito
- **Objetivo**: 100% de tests pasando
- **Medición**: Script de ejecución completa
- **Verificación**: Reporte de resultados

## Troubleshooting

### Problemas Comunes

#### 1. Tests Fallan por Variables de Entorno
**Síntoma**: Error de autenticación o conexión
**Solución**: Verificar archivo `.env.test`

#### 2. Tests Fallan por Base de Datos
**Síntoma**: Error de conexión a Supabase
**Solución**: Verificar URL y clave de Supabase

#### 3. Tests Fallan por n8n
**Síntoma**: Error de webhook
**Solución**: Verificar URL de n8n o usar mocks

#### 4. Tests Fallan por Timeout
**Síntoma**: Tests se agotan por tiempo
**Solución**: Aumentar timeout en `jest.config.js`

### Debugging

#### Habilitar Logs Detallados
```bash
DEBUG=* npm test
```

#### Ejecutar Test Específico
```bash
npx jest tests/agents/VoiceAgent.test.ts --verbose
```

#### Ver Cobertura Detallada
```bash
npm run test:coverage
open coverage/index.html
```

## Mejores Prácticas

### 1. Escribir Tests
- Un test por funcionalidad
- Nombres descriptivos
- Arrange-Act-Assert pattern
- Limpiar datos después de cada test

### 2. Mantener Tests
- Actualizar tests cuando cambie el código
- Revisar cobertura regularmente
- Mantener datos de prueba actualizados
- Documentar cambios importantes

### 3. Ejecutar Tests
- Ejecutar tests antes de commits
- Usar modo watch durante desarrollo
- Ejecutar suite completa antes de releases
- Monitorear métricas de calidad

## Integración Continua

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:ci
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:unit"
    }
  }
}
```

## Reportes

### Cobertura de Código
- **Archivo**: `coverage/index.html`
- **Métricas**: Líneas, funciones, ramas, declaraciones
- **Objetivo**: > 80% en todas las métricas

### Resultados de Tests
- **Consola**: Output detallado durante ejecución
- **Archivo**: `test-results.json` (si se configura)
- **Métricas**: Tests pasando, fallando, tiempo total

### Logs de Debug
- **Archivo**: `test-debug.log` (si se configura)
- **Contenido**: Logs detallados de ejecución
- **Uso**: Debugging de problemas específicos

## Conclusión

El sistema de testing del Audio-Tutor Multi-Agente proporciona:

- **Cobertura completa** de funcionalidades
- **Validación de personalización** pedagógica
- **Verificación de persistencia** de memoria
- **Métricas de calidad** detalladas
- **Herramientas de debugging** robustas

Siguiendo esta guía, puedes mantener la calidad y confiabilidad del sistema de manera efectiva.
