// =====================================================
// Script para probar el Tutor Virtual
// Ejecutar en la consola del navegador en /teacher/tutor
// =====================================================

console.log('🧪 Probando Tutor Virtual');
console.log('==========================');

// Función para probar la API key
function testAPIKey() {
  console.log('\n🔑 Probando API Key:');
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Configurada' : '❌ No configurada');
  
  if (process.env.GEMINI_API_KEY) {
    const key = process.env.GEMINI_API_KEY;
    console.log('Valor:', key.substring(0, 10) + '...' + key.substring(key.length - 4));
  }
}

// Función para probar Supabase
async function testSupabase() {
  console.log('\n🗄️ Probando Supabase:');
  try {
    // Simular consulta a cursos
    const response = await fetch('https://mckfscukxcqwntpjagar.supabase.co/rest/v1/courses?select=id,title,description&limit=1', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8'
      }
    });
    
    if (response.ok) {
      console.log('✅ Supabase: Conexión exitosa');
      const data = await response.json();
      console.log('Cursos disponibles:', data.length);
    } else {
      console.log('❌ Supabase: Error', response.status);
    }
  } catch (error) {
    console.log('❌ Supabase: Error de conexión', error.message);
  }
}

// Función para probar Gemini API
async function testGemini() {
  console.log('\n🤖 Probando Gemini API:');
  try {
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDmbEdVTtQSaYInAsuCbplkSs_PFZSo2sc';
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Responde solo 'Hola' en español"
          }]
        }]
      })
    });
    
    if (response.ok) {
      console.log('✅ Gemini API: Conexión exitosa');
      const data = await response.json();
      console.log('Respuesta:', data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta');
    } else {
      console.log('❌ Gemini API: Error', response.status);
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.log('❌ Gemini API: Error de conexión', error.message);
  }
}

// Función para probar el Tutor Virtual
function testTutorVirtual() {
  console.log('\n🎓 Probando Tutor Virtual:');
  
  // Verificar si el componente está montado
  const tutorElement = document.querySelector('[data-testid="tutor-virtual"]') || 
                      document.querySelector('.tutor-virtual') ||
                      document.querySelector('main');
  
  if (tutorElement) {
    console.log('✅ Tutor Virtual: Componente encontrado');
  } else {
    console.log('❌ Tutor Virtual: Componente no encontrado');
  }
  
  // Verificar si hay errores en la consola
  const originalError = console.error;
  let errorCount = 0;
  console.error = function(...args) {
    errorCount++;
    originalError.apply(console, args);
  };
  
  setTimeout(() => {
    console.error = originalError;
    if (errorCount === 0) {
      console.log('✅ Tutor Virtual: Sin errores detectados');
    } else {
      console.log(`⚠️ Tutor Virtual: ${errorCount} errores detectados`);
    }
  }, 2000);
}

// Ejecutar todas las pruebas
async function runAllTests() {
  testAPIKey();
  await testSupabase();
  await testGemini();
  testTutorVirtual();
  
  console.log('\n🎯 Resumen:');
  console.log('- Si todas las pruebas muestran ✅, el Tutor Virtual debería funcionar');
  console.log('- Si hay ❌, revisa la configuración correspondiente');
  console.log('- Prueba hacer una consulta en el chat del Tutor Virtual');
}

// Ejecutar pruebas
runAllTests();

// Función para forzar recarga
window.reloadTutor = function() {
  console.log('🔄 Recargando Tutor Virtual...');
  location.reload();
};

console.log('\n🛠️ Comandos disponibles:');
console.log('- reloadTutor(): Recargar página');
