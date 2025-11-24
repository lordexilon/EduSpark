// scripts/diagnostico-token-drive.js
// Script para diagnosticar problemas con tokens de Google Drive
// Ejecutar en la consola del navegador o como script de Node

/**
 * Diagnostica el estado de los tokens de Google Drive para un usuario
 * @param {string} userId - ID del usuario
 * @param {string} supabaseUrl - URL de Supabase
 * @param {string} supabaseKey - Service Role Key de Supabase
 */
async function diagnosticarTokenDrive(userId, supabaseUrl, supabaseKey) {
  console.log('🔍 DIAGNÓSTICO DE TOKEN DE GOOGLE DRIVE');
  console.log('==========================================');
  console.log(`Usuario ID: ${userId}`);
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Service Role Key: ${supabaseKey ? 'Configurado' : 'NO CONFIGURADO'}`);
  console.log('');

  try {
    // 1. Verificar todos los tokens del usuario
    console.log('1️⃣ Verificando todos los tokens del usuario...');
    const allTokensResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_google_tokens?user_id=eq.${userId}&select=id,service_type,expires_at,created_at,updated_at`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!allTokensResponse.ok) {
      const errorText = await allTokensResponse.text();
      console.error('❌ Error en la consulta:', {
        status: allTokensResponse.status,
        statusText: allTokensResponse.statusText,
        error: errorText,
      });
      return;
    }

    const allTokens = await allTokensResponse.json();
    console.log(`   ✅ Encontrados ${allTokens?.length || 0} token(s)`);
    
    if (allTokens && allTokens.length > 0) {
      allTokens.forEach((token, index) => {
        const expiresAt = token.expires_at ? new Date(token.expires_at) : null;
        const now = new Date();
        const isValid = !expiresAt || expiresAt > now;
        
        console.log(`   Token ${index + 1}:`);
        console.log(`     - ID: ${token.id}`);
        console.log(`     - service_type: ${token.service_type}`);
        console.log(`     - expires_at: ${token.expires_at || 'No expira'}`);
        console.log(`     - Estado: ${isValid ? '✅ Válido' : '❌ Expirado'}`);
        console.log(`     - created_at: ${token.created_at}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️ No se encontraron tokens para este usuario');
      console.log('');
    }

    // 2. Buscar token específico de Drive
    console.log('2️⃣ Buscando token de tipo "drive"...');
    const driveResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_google_tokens?user_id=eq.${userId}&service_type=eq.drive&select=access_token,refresh_token,expires_at,service_type&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (driveResponse.ok) {
      const driveTokens = await driveResponse.json();
      if (driveTokens && driveTokens.length > 0) {
        console.log('   ✅ Token de tipo "drive" encontrado');
        const token = driveTokens[0];
        console.log(`     - access_token: ${token.access_token ? 'Presente' : 'Ausente'}`);
        console.log(`     - refresh_token: ${token.refresh_token ? 'Presente' : 'Ausente'}`);
        console.log(`     - expires_at: ${token.expires_at}`);
      } else {
        console.log('   ❌ No se encontró token de tipo "drive"');
      }
    } else {
      const errorText = await driveResponse.text();
      console.error('   ❌ Error en la consulta:', {
        status: driveResponse.status,
        error: errorText,
      });
    }
    console.log('');

    // 3. Buscar token de tipo "both"
    console.log('3️⃣ Buscando token de tipo "both"...');
    const bothResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_google_tokens?user_id=eq.${userId}&service_type=eq.both&select=access_token,refresh_token,expires_at,service_type&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (bothResponse.ok) {
      const bothTokens = await bothResponse.json();
      if (bothTokens && bothTokens.length > 0) {
        console.log('   ✅ Token de tipo "both" encontrado');
        const token = bothTokens[0];
        console.log(`     - access_token: ${token.access_token ? 'Presente' : 'Ausente'}`);
        console.log(`     - refresh_token: ${token.refresh_token ? 'Presente' : 'Ausente'}`);
        console.log(`     - expires_at: ${token.expires_at}`);
      } else {
        console.log('   ❌ No se encontró token de tipo "both"');
      }
    } else {
      const errorText = await bothResponse.text();
      console.error('   ❌ Error en la consulta:', {
        status: bothResponse.status,
        error: errorText,
      });
    }
    console.log('');

    // 4. Resumen y recomendaciones
    console.log('📋 RESUMEN Y RECOMENDACIONES');
    console.log('==========================================');
    
    const hasDriveToken = allTokens?.some(t => t.service_type === 'drive');
    const hasBothToken = allTokens?.some(t => t.service_type === 'both');
    
    if (hasDriveToken || hasBothToken) {
      console.log('✅ El usuario tiene token de Google Drive');
      console.log('   - Verificar que el token no esté expirado');
      console.log('   - Si está expirado, el sistema debería refrescarlo automáticamente');
    } else {
      console.log('❌ El usuario NO tiene token de Google Drive');
      console.log('   RECOMENDACIÓN:');
      console.log('   1. Ir al perfil del usuario');
      console.log('   2. Conectar Google Drive');
      console.log('   3. Asegurarse de autorizar los permisos de Drive');
    }

  } catch (error) {
    console.error('❌ Error en el diagnóstico:', error);
    console.error('Stack:', error.stack);
  }
}

// Para usar en el navegador:
if (typeof window !== 'undefined') {
  window.diagnosticarTokenDrive = diagnosticarTokenDrive;
}

// Para usar en Node.js:
if (typeof module !== 'undefined' && module.exports) {
  module.exports = diagnosticarTokenDrive;
}

