#!/usr/bin/env node

// =====================================================
// Script para probar la API de Gemini
// =====================================================

console.log('🧪 Probando API de Gemini...\n');

async function testGeminiAPI() {
  try {
    // Resolver API key directamente
    const key = process.env.VITE_GEMINI_API_KEY || 
                process.env.GEMINI_API_KEY || 
                'AIzaSyDmbEdVTtQSaYInAsuCbplkSs_PFZSo2sc';
    const missing = !key || key === 'PLACEHOLDER_API_KEY' || key === 'undefined';
    
    console.log('🔑 API Key Status:');
    console.log(`- Configurada: ${!missing ? '✅' : '❌'}`);
    console.log(`- Key: ${key ? key.substring(0, 10) + '...' : 'No encontrada'}`);
    console.log(`- Longitud: ${key ? key.length : 0} caracteres\n`);

    if (missing || !key) {
      console.error('❌ No se pudo obtener la API key');
      return;
    }

    console.log('🌐 Probando conexión con Gemini API...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Hola, ¿puedes responder con un simple "Hola" para confirmar que la API funciona?'
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 50,
          }
        })
      }
    );

    console.log(`📊 Status Code: ${response.status}`);
    console.log(`📊 Status Text: ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${errorText}`);
      return;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      console.log('✅ ¡API funcionando correctamente!');
      console.log(`🤖 Respuesta: ${text}`);
    } else {
      console.error('❌ No se recibió respuesta válida');
      console.log('📄 Datos recibidos:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error probando API:', error.message);
  }
}

testGeminiAPI();
