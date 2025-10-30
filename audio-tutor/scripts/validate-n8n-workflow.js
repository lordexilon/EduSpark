#!/usr/bin/env node

// =====================================================
// Script de Validación del Workflow n8n
// =====================================================

const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
  workflowFile: 'n8n-workflows/rag-student-query-personalized.json',
  testDataFile: 'tests/test-setup.ts'
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

// Función para validar estructura del workflow
function validateWorkflowStructure(workflowData) {
  log(`${colors.blue}🔍 Validando estructura del workflow...${colors.reset}`);
  
  const errors = [];
  const warnings = [];
  
  // Validar campos requeridos
  const requiredFields = ['name', 'nodes', 'connections', 'versionId'];
  requiredFields.forEach(field => {
    if (!workflowData[field]) {
      errors.push(`Campo requerido faltante: ${field}`);
    }
  });
  
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
  requiredNodes.forEach(requiredNode => {
    if (!nodeNames.includes(requiredNode)) {
      errors.push(`Nodo requerido faltante: ${requiredNode}`);
    }
  });
  
  // Validar conexiones
  const connectionCount = Object.keys(workflowData.connections).length;
  if (connectionCount < requiredNodes.length - 1) {
    warnings.push(`Pocas conexiones: ${connectionCount} (esperado: ${requiredNodes.length - 1})`);
  }
  
  // Validar tipos de nodos
  const nodeTypes = {
    'Webhook Trigger': 'n8n-nodes-base.webhook',
    'Normalize Inputs': 'n8n-nodes-base.code',
    'Load Pedagogical Context': 'n8n-nodes-base.supabase',
    'Load Student Profile': 'n8n-nodes-base.supabase',
    'Load Conversation Context': 'n8n-nodes-base.supabase',
    'Merge Personalization Context': 'n8n-nodes-base.code',
    'Load Course Materials': 'n8n-nodes-base.supabase',
    'Prepare Vector Search': 'n8n-nodes-base.code',
    'Generate Query Embedding': 'n8n-nodes-base.httpRequest',
    'Vector Search': 'n8n-nodes-base.code',
    'Generate Answer': 'n8n-nodes-base.googleGemini',
    'Format Response': 'n8n-nodes-base.code',
    'Return Response': 'n8n-nodes-base.respondToWebhook'
  };
  
  Object.entries(nodeTypes).forEach(([nodeName, expectedType]) => {
    const node = workflowData.nodes.find(n => n.name === nodeName);
    if (node && node.type !== expectedType) {
      warnings.push(`Tipo de nodo incorrecto para ${nodeName}: ${node.type} (esperado: ${expectedType})`);
    }
  });
  
  return { errors, warnings };
}

// Función para validar configuración de nodos
function validateNodeConfiguration(workflowData) {
  log(`${colors.blue}🔧 Validando configuración de nodos...${colors.reset}`);
  
  const errors = [];
  const warnings = [];
  
  // Validar Webhook Trigger
  const webhookNode = workflowData.nodes.find(n => n.name === 'Webhook Trigger');
  if (webhookNode) {
    if (webhookNode.parameters.httpMethod !== 'POST') {
      warnings.push('Webhook Trigger debería usar método POST');
    }
    if (!webhookNode.parameters.path) {
      errors.push('Webhook Trigger requiere path');
    }
  }
  
  // Validar nodos de Supabase
  const supabaseNodes = workflowData.nodes.filter(n => n.type === 'n8n-nodes-base.supabase');
  supabaseNodes.forEach(node => {
    if (!node.parameters.table) {
      errors.push(`Nodo ${node.name} requiere tabla`);
    }
    if (!node.parameters.operation) {
      errors.push(`Nodo ${node.name} requiere operación`);
    }
  });
  
  // Validar nodo de Gemini
  const geminiNode = workflowData.nodes.find(n => n.name === 'Generate Answer');
  if (geminiNode) {
    if (!geminiNode.parameters.model) {
      errors.push('Nodo Generate Answer requiere modelo');
    }
    if (!geminiNode.parameters.prompt) {
      errors.push('Nodo Generate Answer requiere prompt');
    }
  }
  
  // Validar nodos de código
  const codeNodes = workflowData.nodes.filter(n => n.type === 'n8n-nodes-base.code');
  codeNodes.forEach(node => {
    if (!node.parameters.jsCode) {
      errors.push(`Nodo ${node.name} requiere código JavaScript`);
    }
  });
  
  return { errors, warnings };
}

// Función para validar flujo de datos
function validateDataFlow(workflowData) {
  log(`${colors.blue}🔄 Validando flujo de datos...${colors.reset}`);
  
  const errors = [];
  const warnings = [];
  
  // Validar que el flujo comience con Webhook Trigger
  const webhookNode = workflowData.nodes.find(n => n.name === 'Webhook Trigger');
  if (webhookNode) {
    const webhookConnections = workflowData.connections[webhookNode.name];
    if (!webhookConnections || webhookConnections.main.length === 0) {
      errors.push('Webhook Trigger debe tener conexiones de salida');
    }
  }
  
  // Validar que el flujo termine con Return Response
  const returnNode = workflowData.nodes.find(n => n.name === 'Return Response');
  if (returnNode) {
    const returnConnections = workflowData.connections[returnNode.name];
    if (returnConnections && returnConnections.main.length > 0) {
      warnings.push('Return Response no debería tener conexiones de salida');
    }
  }
  
  // Validar conexiones críticas
  const criticalConnections = [
    ['Webhook Trigger', 'Normalize Inputs'],
    ['Normalize Inputs', 'Load Pedagogical Context'],
    ['Normalize Inputs', 'Load Student Profile'],
    ['Normalize Inputs', 'Load Conversation Context'],
    ['Load Pedagogical Context', 'Merge Personalization Context'],
    ['Load Student Profile', 'Merge Personalization Context'],
    ['Load Conversation Context', 'Merge Personalization Context'],
    ['Merge Personalization Context', 'Load Course Materials'],
    ['Load Course Materials', 'Prepare Vector Search'],
    ['Prepare Vector Search', 'Generate Query Embedding'],
    ['Generate Query Embedding', 'Vector Search'],
    ['Vector Search', 'Generate Answer'],
    ['Generate Answer', 'Format Response'],
    ['Format Response', 'Return Response']
  ];
  
  criticalConnections.forEach(([from, to]) => {
    const fromNode = workflowData.nodes.find(n => n.name === from);
    const toNode = workflowData.nodes.find(n => n.name === to);
    
    if (!fromNode || !toNode) {
      errors.push(`Nodos requeridos para conexión: ${from} -> ${to}`);
      return;
    }
    
    const connections = workflowData.connections[from];
    if (!connections || !connections.main.some(conn => conn.node === to)) {
      errors.push(`Conexión faltante: ${from} -> ${to}`);
    }
  });
  
  return { errors, warnings };
}

// Función para validar personalización
function validatePersonalization(workflowData) {
  log(`${colors.blue}🎯 Validando funcionalidades de personalización...${colors.reset}`);
  
  const errors = [];
  const warnings = [];
  
  // Validar nodo de configuración pedagógica
  const pedNode = workflowData.nodes.find(n => n.name === 'Load Pedagogical Context');
  if (pedNode) {
    if (pedNode.parameters.table !== 'course_pedagogical_settings') {
      errors.push('Load Pedagogical Context debe usar tabla course_pedagogical_settings');
    }
  }
  
  // Validar nodo de perfil de estudiante
  const profileNode = workflowData.nodes.find(n => n.name === 'Load Student Profile');
  if (profileNode) {
    if (profileNode.parameters.table !== 'student_learning_profiles') {
      errors.push('Load Student Profile debe usar tabla student_learning_profiles');
    }
  }
  
  // Validar nodo de contexto de conversación
  const convNode = workflowData.nodes.find(n => n.name === 'Load Conversation Context');
  if (convNode) {
    if (convNode.parameters.table !== 'tutor_conversations') {
      errors.push('Load Conversation Context debe usar tabla tutor_conversations');
    }
  }
  
  // Validar nodo de materiales del curso
  const materialsNode = workflowData.nodes.find(n => n.name === 'Load Course Materials');
  if (materialsNode) {
    if (materialsNode.parameters.table !== 'course_materials') {
      errors.push('Load Course Materials debe usar tabla course_materials');
    }
  }
  
  // Validar nodo de combinación de contexto
  const mergeNode = workflowData.nodes.find(n => n.name === 'Merge Personalization Context');
  if (mergeNode) {
    const code = mergeNode.parameters.jsCode;
    if (!code.includes('pedagogicalSettings')) {
      errors.push('Merge Personalization Context debe manejar pedagogicalSettings');
    }
    if (!code.includes('studentProfile')) {
      errors.push('Merge Personalization Context debe manejar studentProfile');
    }
    if (!code.includes('systemPrompt')) {
      errors.push('Merge Personalization Context debe generar systemPrompt');
    }
  }
  
  // Validar nodo de respuesta formateada
  const formatNode = workflowData.nodes.find(n => n.name === 'Format Response');
  if (formatNode) {
    const code = formatNode.parameters.jsCode;
    if (!code.includes('personalization')) {
      errors.push('Format Response debe incluir metadatos de personalización');
    }
    if (!code.includes('appliedStyle')) {
      errors.push('Format Response debe incluir appliedStyle');
    }
    if (!code.includes('learningStyle')) {
      errors.push('Format Response debe incluir learningStyle');
    }
  }
  
  return { errors, warnings };
}

// Función para validar credenciales
function validateCredentials(workflowData) {
  log(`${colors.blue}🔐 Validando configuración de credenciales...${colors.reset}`);
  
  const errors = [];
  const warnings = [];
  
  // Validar credenciales de Supabase
  const supabaseNodes = workflowData.nodes.filter(n => n.type === 'n8n-nodes-base.supabase');
  supabaseNodes.forEach(node => {
    if (!node.credentials || !node.credentials.supabaseApi) {
      errors.push(`Nodo ${node.name} requiere credenciales de Supabase`);
    }
  });
  
  // Validar credenciales de Gemini
  const geminiNode = workflowData.nodes.find(n => n.name === 'Generate Answer');
  if (geminiNode) {
    if (!geminiNode.credentials || !geminiNode.credentials.googleGeminiApi) {
      errors.push('Nodo Generate Answer requiere credenciales de Google Gemini');
    }
  }
  
  // Validar credenciales de OpenAI
  const openaiNode = workflowData.nodes.find(n => n.name === 'Generate Query Embedding');
  if (openaiNode) {
    if (!openaiNode.credentials || !openaiNode.credentials.openAiApi) {
      errors.push('Nodo Generate Query Embedding requiere credenciales de OpenAI');
    }
  }
  
  return { errors, warnings };
}

// Función para generar reporte de validación
function generateValidationReport(results) {
  log(`${colors.blue}================================================${colors.reset}`);
  log(`${colors.bright}📋 Reporte de Validación del Workflow${colors.reset}`);
  log(`${colors.blue}================================================${colors.reset}`);
  
  const { structure, configuration, dataFlow, personalization, credentials } = results;
  
  // Resumen general
  const totalErrors = structure.errors.length + configuration.errors.length + 
                     dataFlow.errors.length + personalization.errors.length + 
                     credentials.errors.length;
  const totalWarnings = structure.warnings.length + configuration.warnings.length + 
                       dataFlow.warnings.length + personalization.warnings.length + 
                       credentials.warnings.length;
  
  log(`${colors.bright}Resumen:${colors.reset}`);
  log(`Errores: ${totalErrors > 0 ? colors.red : colors.green}${totalErrors}${colors.reset}`);
  log(`Advertencias: ${totalWarnings > 0 ? colors.yellow : colors.green}${totalWarnings}${colors.reset}`);
  
  // Detalles por categoría
  const categories = [
    { name: 'Estructura', results: structure },
    { name: 'Configuración', results: configuration },
    { name: 'Flujo de Datos', results: dataFlow },
    { name: 'Personalización', results: personalization },
    { name: 'Credenciales', results: credentials }
  ];
  
  categories.forEach(category => {
    log(`${colors.blue}${category.name}:${colors.reset}`);
    
    if (category.results.errors.length > 0) {
      category.results.errors.forEach(error => {
        log(`  ${colors.red}❌ ${error}${colors.reset}`);
      });
    }
    
    if (category.results.warnings.length > 0) {
      category.results.warnings.forEach(warning => {
        log(`  ${colors.yellow}⚠️ ${warning}${colors.reset}`);
      });
    }
    
    if (category.results.errors.length === 0 && category.results.warnings.length === 0) {
      log(`  ${colors.green}✅ Sin problemas${colors.reset}`);
    }
  });
  
  log(`${colors.blue}================================================${colors.reset}`);
  
  if (totalErrors === 0) {
    log(`${colors.green}🎉 ¡Workflow validado exitosamente!${colors.reset}`);
    if (totalWarnings > 0) {
      log(`${colors.yellow}⚠️ Revisa las advertencias para optimización${colors.reset}`);
    }
  } else {
    log(`${colors.red}❌ Workflow tiene errores que deben corregirse${colors.reset}`);
  }
  
  return totalErrors === 0;
}

// Función principal
async function main() {
  log(`${colors.bright}${colors.blue}🔍 Iniciando validación del workflow n8n${colors.reset}`);
  log(`${colors.blue}================================================${colors.reset}`);
  
  try {
    // Cargar workflow
    if (!fs.existsSync(CONFIG.workflowFile)) {
      throw new Error(`Archivo de workflow no encontrado: ${CONFIG.workflowFile}`);
    }
    
    const workflowData = JSON.parse(fs.readFileSync(CONFIG.workflowFile, 'utf8'));
    
    // Ejecutar validaciones
    const results = {
      structure: validateWorkflowStructure(workflowData),
      configuration: validateNodeConfiguration(workflowData),
      dataFlow: validateDataFlow(workflowData),
      personalization: validatePersonalization(workflowData),
      credentials: validateCredentials(workflowData)
    };
    
    // Generar reporte
    const isValid = generateValidationReport(results);
    
    if (isValid) {
      process.exit(0);
    } else {
      process.exit(1);
    }
    
  } catch (error) {
    log(`${colors.red}❌ Error durante la validación: ${error.message}${colors.reset}`);
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
  validateWorkflowStructure,
  validateNodeConfiguration,
  validateDataFlow,
  validatePersonalization,
  validateCredentials
};
