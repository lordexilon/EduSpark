#!/usr/bin/env node

// =====================================================
// Script de Migración del Workflow n8n
// =====================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración
const CONFIG = {
  n8nUrl: process.env.N8N_URL || 'http://localhost:5678',
  n8nApiKey: process.env.N8N_API_KEY || '',
  workflowFile: 'n8n-workflows/rag-student-query-personalized.json',
  backupDir: 'n8n-workflows/backups'
};

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Función para logging
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para crear backup
function createBackup(workflowData) {
  log(`${colors.blue}💾 Creando backup del workflow...${colors.reset}`);
  
  // Crear directorio de backup si no existe
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }
  
  // Crear archivo de backup con timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(CONFIG.backupDir, `workflow-backup-${timestamp}.json`);
  
  fs.writeFileSync(backupFile, JSON.stringify(workflowData, null, 2));
  
  log(`${colors.green}✅ Backup creado: ${backupFile}${colors.reset}`);
  return backupFile;
}

// Función para validar workflow
function validateWorkflow(workflowData) {
  log(`${colors.blue}🔍 Validando workflow...${colors.reset}`);
  
  const requiredFields = ['name', 'nodes', 'connections'];
  const missingFields = requiredFields.filter(field => !workflowData[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
  }
  
  // Validar nodos requeridos
  const requiredNodes = [
    'Webhook Trigger',
    'Normalize Inputs',
    'Load Pedagogical Context',
    'Load Student Profile',
    'Load Conversation Context',
    'Merge Personalization Context',
    'Load Course Materials',
    'Prepare Vector Search',
    'Generate Query Embedding',
    'Vector Search',
    'Generate Answer',
    'Format Response',
    'Return Response'
  ];
  
  const nodeNames = workflowData.nodes.map(node => node.name);
  const missingNodes = requiredNodes.filter(nodeName => !nodeNames.includes(nodeName));
  
  if (missingNodes.length > 0) {
    throw new Error(`Nodos requeridos faltantes: ${missingNodes.join(', ')}`);
  }
  
  log(`${colors.green}✅ Workflow validado correctamente${colors.reset}`);
  return true;
}

// Función para actualizar workflow en n8n
async function updateWorkflowInN8n(workflowData) {
  log(`${colors.blue}🔄 Actualizando workflow en n8n...${colors.reset}`);
  
  if (!CONFIG.n8nApiKey) {
    log(`${colors.yellow}⚠️ N8N_API_KEY no configurado. Saltando actualización automática.${colors.reset}`);
    log(`${colors.yellow}   Importa manualmente el workflow desde: ${CONFIG.workflowFile}${colors.reset}`);
    return false;
  }
  
  try {
    // Buscar workflow existente
    const searchResponse = await fetch(`${CONFIG.n8nUrl}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.n8nApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!searchResponse.ok) {
      throw new Error(`Error buscando workflows: ${searchResponse.statusText}`);
    }
    
    const workflows = await searchResponse.json();
    const existingWorkflow = workflows.data.find(w => w.name === 'RAG Student Query - Personalized');
    
    if (existingWorkflow) {
      // Actualizar workflow existente
      const updateResponse = await fetch(`${CONFIG.n8nUrl}/api/v1/workflows/${existingWorkflow.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${CONFIG.n8nApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Error actualizando workflow: ${updateResponse.statusText}`);
      }
      
      log(`${colors.green}✅ Workflow actualizado exitosamente${colors.reset}`);
    } else {
      // Crear nuevo workflow
      const createResponse = await fetch(`${CONFIG.n8nUrl}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.n8nApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      });
      
      if (!createResponse.ok) {
        throw new Error(`Error creando workflow: ${createResponse.statusText}`);
      }
      
      log(`${colors.green}✅ Workflow creado exitosamente${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    log(`${colors.red}❌ Error actualizando workflow en n8n: ${error.message}${colors.reset}`);
    return false;
  }
}

// Función para verificar dependencias
function checkDependencies() {
  log(`${colors.blue}🔍 Verificando dependencias...${colors.reset}`);
  
  // Verificar archivo de workflow
  if (!fs.existsSync(CONFIG.workflowFile)) {
    throw new Error(`Archivo de workflow no encontrado: ${CONFIG.workflowFile}`);
  }
  
  // Verificar n8n está ejecutándose
  try {
    execSync(`curl -s ${CONFIG.n8nUrl}/health`, { stdio: 'pipe' });
    log(`${colors.green}✅ n8n está ejecutándose${colors.reset}`);
  } catch (error) {
    log(`${colors.yellow}⚠️ n8n no está ejecutándose en ${CONFIG.n8nUrl}${colors.reset}`);
    log(`${colors.yellow}   Asegúrate de que n8n esté ejecutándose antes de continuar${colors.reset}`);
  }
  
  return true;
}

// Función para mostrar resumen de cambios
function showMigrationSummary(workflowData) {
  log(`${colors.blue}================================================${colors.reset}`);
  log(`${colors.bright}📋 Resumen de Migración del Workflow${colors.reset}`);
  log(`${colors.blue}================================================${colors.reset}`);
  
  log(`Nombre: ${workflowData.name}`);
  log(`Versión: ${workflowData.versionId}`);
  log(`Nodos: ${workflowData.nodes.length}`);
  log(`Conexiones: ${Object.keys(workflowData.connections).length}`);
  
  log(`${colors.blue}================================================${colors.reset}`);
  log(`${colors.bright}🆕 Nuevas Funcionalidades${colors.reset}`);
  log(`${colors.blue}================================================${colors.reset}`);
  
  log(`${colors.green}✅ Personalización pedagógica por docente${colors.reset}`);
  log(`${colors.green}✅ Perfil de aprendizaje del estudiante${colors.reset}`);
  log(`${colors.green}✅ Contexto de conversación persistente${colors.reset}`);
  log(`${colors.green}✅ Búsqueda vectorial mejorada${colors.reset}`);
  log(`${colors.green}✅ Respuestas contextuales personalizadas${colors.reset}`);
  log(`${colors.green}✅ Metadatos de personalización${colors.reset}`);
  
  log(`${colors.blue}================================================${colors.reset}`);
  log(`${colors.bright}🔧 Configuración Requerida${colors.reset}`);
  log(`${colors.blue}================================================${colors.reset}`);
  
  log(`${colors.yellow}1. Credenciales de Supabase configuradas${colors.reset}`);
  log(`${colors.yellow}2. Credenciales de OpenAI para embeddings${colors.reset}`);
  log(`${colors.yellow}3. Credenciales de Google Gemini${colors.reset}`);
  log(`${colors.yellow}4. Tablas de base de datos creadas${colors.reset}`);
  log(`${colors.yellow}5. Políticas RLS configuradas${colors.reset}`);
  
  log(`${colors.blue}================================================${colors.reset}`);
}

// Función para generar documentación de migración
function generateMigrationDocs(workflowData) {
  log(`${colors.blue}📝 Generando documentación de migración...${colors.reset}`);
  
  const migrationDoc = `# Migración del Workflow n8n - Audio-Tutor Multi-Agente

## Resumen
Este documento describe la migración del workflow n8n para incluir personalización pedagógica completa.

## Cambios Principales

### 1. Nuevos Nodos
- **Load Pedagogical Context**: Carga configuración pedagógica del curso
- **Load Student Profile**: Carga perfil de aprendizaje del estudiante
- **Load Conversation Context**: Carga contexto de conversación persistente
- **Merge Personalization Context**: Combina todos los contextos de personalización

### 2. Nodos Modificados
- **Normalize Inputs**: Validación mejorada de entrada
- **Prepare Vector Search**: Enriquecimiento de consulta con contexto personalizado
- **Vector Search**: Búsqueda vectorial con personalización
- **Generate Answer**: Generación de respuesta con prompt personalizado
- **Format Response**: Respuesta con metadatos de personalización

### 3. Funcionalidades Nuevas
- Personalización por estilo pedagógico (socrático, directo, constructivista)
- Adaptación por perfil de aprendizaje (visual, auditivo, kinestésico)
- Contexto de conversación persistente
- Metadatos de personalización en respuestas
- Configuración de voz personalizada

## Configuración Post-Migración

### 1. Credenciales Requeridas
- Supabase API (para base de datos)
- OpenAI API (para embeddings)
- Google Gemini API (para generación)

### 2. Variables de Entorno
\`\`\`bash
N8N_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
\`\`\`

### 3. Base de Datos
Asegúrate de que las siguientes tablas existan:
- \`course_pedagogical_settings\`
- \`student_learning_profiles\`
- \`tutor_conversations\`
- \`course_materials\`

### 4. Políticas RLS
Configura las políticas de seguridad para:
- Estudiantes: acceso a sus propios perfiles
- Docentes: gestión de configuración de sus cursos
- Administradores: acceso completo

## Testing

### 1. Pruebas de Personalización
\`\`\`bash
# Test con estudiante visual + docente socrático
curl -X POST ${N8N_URL}/webhook/rag-student-query-personalized \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "¿Qué es la fotosíntesis?",
    "context": {
      "studentId": "student-visual-001",
      "courseId": "course-biology-001",
      "conversationId": "test-conv-001"
    }
  }'
\`\`\`

### 2. Verificación de Respuesta
La respuesta debe incluir:
- \`personalization.appliedStyle\`: Estilo pedagógico aplicado
- \`personalization.learningStyle\`: Estilo de aprendizaje del estudiante
- \`personalization.examplesIncluded\`: Si se incluyeron ejemplos
- \`personalization.questionsEncouraged\`: Si se fomentan preguntas

## Rollback

Si necesitas revertir la migración:
1. Restaura el backup del workflow anterior
2. Verifica que las funcionalidades básicas funcionen
3. Identifica y corrige problemas específicos
4. Reintenta la migración gradualmente

## Soporte

Para problemas o preguntas:
- Revisa los logs de n8n
- Verifica la configuración de credenciales
- Consulta la documentación de la API
- Contacta al equipo de desarrollo

---
Fecha de migración: ${new Date().toISOString()}
Versión del workflow: ${workflowData.versionId}
`;

  const docFile = 'n8n-workflows/MIGRATION_GUIDE.md';
  fs.writeFileSync(docFile, migrationDoc);
  
  log(`${colors.green}✅ Documentación generada: ${docFile}${colors.reset}`);
}

// Función principal
async function main() {
  log(`${colors.bright}${colors.blue}🚀 Iniciando migración del workflow n8n${colors.reset}`);
  log(`${colors.blue}================================================${colors.reset}`);
  
  try {
    // Verificar dependencias
    checkDependencies();
    
    // Cargar workflow
    log(`${colors.blue}📂 Cargando workflow...${colors.reset}`);
    const workflowData = JSON.parse(fs.readFileSync(CONFIG.workflowFile, 'utf8'));
    
    // Crear backup
    createBackup(workflowData);
    
    // Validar workflow
    validateWorkflow(workflowData);
    
    // Mostrar resumen
    showMigrationSummary(workflowData);
    
    // Actualizar en n8n
    const updated = await updateWorkflowInN8n(workflowData);
    
    // Generar documentación
    generateMigrationDocs(workflowData);
    
    if (updated) {
      log(`${colors.green}🎉 ¡Migración completada exitosamente!${colors.reset}`);
    } else {
      log(`${colors.yellow}⚠️ Migración completada con advertencias${colors.reset}`);
      log(`${colors.yellow}   Revisa los pasos manuales requeridos${colors.reset}`);
    }
    
  } catch (error) {
    log(`${colors.red}❌ Error durante la migración: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log(`${colors.red}❌ Error fatal: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  main,
  createBackup,
  validateWorkflow,
  updateWorkflowInN8n,
  generateMigrationDocs
};
