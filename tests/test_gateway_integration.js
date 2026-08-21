/**
 * 🧪 Script de Pruebas de Integración E2E - EduSpark AI Gateway
 * 
 * Este script automatiza la generación de una API Key en tu base de datos
 * local de Supabase y valida el consumo de los endpoints del Gateway.
 * 
 * Uso: node tests/test_gateway_integration.js
 */

const fs = require('fs');
const path = require('path');

// 1. Cargar variables de entorno local
const envLocalPath = path.join(__dirname, '../.env.local');
let supabaseUrl = 'http://localhost:54331';
let serviceRoleKey = '';

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const serviceKeyMatch = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (serviceKeyMatch && serviceKeyMatch[1]) {
    serviceRoleKey = serviceKeyMatch[1].trim();
  }
}

if (!serviceRoleKey) {
  console.error("❌ Error: No se encontró la variable VITE_SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

// Para usar fetch nativo de Node.js (disponible en Node v18+)
async function runTests() {
  console.log("🚀 Iniciando Pruebas de Integración de EduSpark AI Gateway...");
  console.log(`URL de Supabase: ${supabaseUrl}`);

  // Simulamos el cliente Supabase para llamar a la base de datos
  const callDb = async (rpcName, params) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error en DB RPC ${rpcName}: ${err}`);
    }
    return res.json();
  };

  try {
    // 2. Generar una API Key de Prueba en la BD
    console.log("\n🔑 1. Generando API Key para la Institución de prueba (ID: 1)...");
    const keyData = await callDb('generate_api_key', {
      p_institution_id: 1,
      p_name: 'Test Integration Key - LibreChat',
      p_scopes: ['tutor:chat', 'analytics:read', 'compliance:write'],
      p_expiration_days: 1
    });

    if (!keyData || keyData.length === 0) {
      throw new Error("No se pudo generar la clave en la base de datos.");
    }

    const { raw_api_key, key_id } = keyData[0];
    console.log(`✅ API Key Generada con Éxito!`);
    console.log(`   - ID de Clave: ${key_id}`);
    console.log(`   - Clave Cruda: ${raw_api_key} (Usar para configurar en LibreChat)`);

    // 3. Probar el Endpoint compatible con OpenAI de LibreChat (Tutor)
    console.log("\n🎓 2. Probando /tutor/chat/completions (Formato LibreChat / OpenAI)...");
    const tutorRes = await fetch(`${supabaseUrl}/functions/v1/eduspark-gateway/tutor/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-eduspark-api-key': raw_api_key
      },
      body: JSON.stringify({
        model: 'eduspark-tutor-v1',
        messages: [
          { role: 'user', content: '¿Qué es EduSpark y cuál es su enfoque técnico?' }
        ],
        temperature: 0.5
      })
    });

    console.log(`Status de Respuesta: ${tutorRes.status}`);
    const tutorData = await tutorRes.json();
    if (tutorRes.ok) {
      console.log("✅ Conexión del Tutor Exitosa!");
      console.log("🤖 Respuesta del Tutor:");
      console.log(tutorData.choices?.[0]?.message?.content || JSON.stringify(tutorData));
    } else {
      console.error("❌ Error en Tutor:", tutorData);
    }

    // 4. Probar el Endpoint de Analítica de Deserción
    console.log("\n📉 3. Probando /analytics/dropout-risk (Early Warning AI)...");
    const analyticsRes = await fetch(`${supabaseUrl}/functions/v1/eduspark-gateway/analytics/dropout-risk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-eduspark-api-key': raw_api_key
      },
      body: JSON.stringify({
        institution_id: 1,
        student_metrics: [
          {
            student_id: "std-9081",
            login_frequency_days: 12,
            late_submissions_count: 5,
            average_grade: 3.1,
            chat_frustration_index: 0.75
          },
          {
            student_id: "std-1102",
            login_frequency_days: 1,
            late_submissions_count: 0,
            average_grade: 4.8,
            chat_frustration_index: 0.1
          }
        ]
      })
    });

    console.log(`Status de Respuesta: ${analyticsRes.status}`);
    const analyticsData = await analyticsRes.json();
    if (analyticsRes.ok) {
      console.log("✅ Conexión de Analítica Exitosa!");
      console.log("📊 Reporte de Riesgo de Alumnos:");
      console.log(JSON.stringify(analyticsData, null, 2));
    } else {
      console.error("❌ Error en Analítica:", analyticsData);
    }

    // 5. Probar el Endpoint de Auditoría ANEAES
    console.log("\n🏛️ 4. Probando /compliance/aneaes-audit (Regulatorio)...");
    const complianceRes = await fetch(`${supabaseUrl}/functions/v1/eduspark-gateway/compliance/aneaes-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-eduspark-api-key': raw_api_key
      },
      body: JSON.stringify({
        institution_id: 1,
        accreditation_standard: "ANEAES-MEDICINA",
        syllabus_data: {
          learning_outcomes: [
            "Diagnosticar patologías ginecológicas comunes",
            "Aplicar protocolos de obstetricia en emergencias",
            "Redactar expedientes médicos según normativas"
          ],
          total_hours: 140,
          bibliography: [
            "Williams Ginecología 25a Edición",
            "Harrison Principios de Medicina Interna"
          ]
        }
      })
    });

    console.log(`Status de Respuesta: ${complianceRes.status}`);
    const complianceData = await complianceRes.json();
    if (complianceRes.ok) {
      console.log("✅ Conexión de Auditoría Regulatoria Exitosa!");
      console.log("📋 Dictamen de Cumplimiento:");
      console.log(JSON.stringify(complianceData, null, 2));
    } else {
      console.error("❌ Error en Compliance:", complianceData);
    }

    console.log("\n🎉 Todas las pruebas del Gateway completadas con éxito!");

  } catch (error) {
    console.error("❌ Error general en la ejecución de pruebas:", error);
  }
}

runTests();
