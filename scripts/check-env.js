// =====================================================
// Script para verificar variables de entorno
// Ejecutar en la consola del navegador
// =====================================================

console.log('🔍 Verificando Variables de Entorno');
console.log('=====================================');

// Verificar variables de entorno
console.log('\n📋 Variables de Entorno:');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ No configurada');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada');

// Mostrar valores (parcialmente ocultos por seguridad)
if (process.env.GEMINI_API_KEY) {
  const key = process.env.GEMINI_API_KEY;
  console.log('GEMINI_API_KEY value:', key.substring(0, 10) + '...' + key.substring(key.length - 4));
}

if (process.env.VITE_SUPABASE_URL) {
  console.log('VITE_SUPABASE_URL value:', process.env.VITE_SUPABASE_URL);
}

if (process.env.VITE_SUPABASE_ANON_KEY) {
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  console.log('VITE_SUPABASE_ANON_KEY value:', key.substring(0, 20) + '...');
}

// Verificar si las variables están definidas correctamente
const isGeminiConfigured = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'PLACEHOLDER_API_KEY';
const isSupabaseConfigured = process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n📊 Estado de Configuración:');
console.log('Gemini API:', isGeminiConfigured ? '✅ Listo' : '❌ No configurado');
console.log('Supabase:', isSupabaseConfigured ? '✅ Listo' : '❌ No configurado');

if (isGeminiConfigured && isSupabaseConfigured) {
  console.log('\n🎉 ¡Todas las variables están configuradas correctamente!');
} else {
  console.log('\n⚠️ Algunas variables no están configuradas correctamente.');
  console.log('Solución: Reinicia el servidor con "npm run dev"');
}

// Función para forzar recarga de variables
window.reloadEnv = function() {
  console.log('🔄 Recargando variables de entorno...');
  location.reload();
};

console.log('\n🛠️ Comandos disponibles:');
console.log('- reloadEnv(): Recargar página para actualizar variables');
