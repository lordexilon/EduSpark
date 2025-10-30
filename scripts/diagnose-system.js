// =====================================================
// Script de diagnóstico del sistema EduSpark
// Ejecutar en la consola del navegador para verificar el estado
// =====================================================

console.log('🔍 Diagnóstico del Sistema EduSpark');
console.log('=====================================');

// 1. Verificar variables de entorno
console.log('\n📋 Variables de Entorno:');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ No configurada');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada');

// 2. Verificar localStorage
console.log('\n💾 LocalStorage:');
const localStorageKeys = Object.keys(localStorage);
console.log('Total de claves:', localStorageKeys.length);
localStorageKeys.forEach(key => {
  if (key.includes('vite') || key.includes('eduspark')) {
    console.log(`  - ${key}: ${localStorage.getItem(key).substring(0, 50)}...`);
  }
});

// 3. Verificar sessionStorage
console.log('\n🗂️ SessionStorage:');
const sessionStorageKeys = Object.keys(sessionStorage);
console.log('Total de claves:', sessionStorageKeys.length);
sessionStorageKeys.forEach(key => {
  if (key.includes('vite') || key.includes('eduspark')) {
    console.log(`  - ${key}: ${sessionStorage.getItem(key).substring(0, 50)}...`);
  }
});

// 4. Verificar caché
console.log('\n🗄️ Caché del Navegador:');
if ('caches' in window) {
  caches.keys().then(names => {
    console.log('Cachés disponibles:', names.length);
    names.forEach(name => {
      if (name.includes('vite') || name.includes('eduspark')) {
        console.log(`  - ${name}`);
      }
    });
  });
} else {
  console.log('Caché no disponible');
}

// 5. Verificar URL actual
console.log('\n🌐 Navegación:');
console.log('URL actual:', window.location.href);
console.log('Hash:', window.location.hash);
console.log('Pathname:', window.location.pathname);

// 6. Verificar errores en consola
console.log('\n⚠️ Errores Recientes:');
// Esto se ejecutará después de que se carguen los errores
setTimeout(() => {
  console.log('Revisa la consola para errores recientes');
}, 1000);

// 7. Función de limpieza
window.clearEduSparkCache = function() {
  console.log('🧹 Limpiando caché de EduSpark...');
  
  // Limpiar localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.includes('vite') || key.includes('eduspark')) {
      localStorage.removeItem(key);
      console.log(`✅ Removido: ${key}`);
    }
  });
  
  // Limpiar sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('vite') || key.includes('eduspark')) {
      sessionStorage.removeItem(key);
      console.log(`✅ Removido: ${key}`);
    }
  });
  
  // Limpiar caché
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        if (name.includes('vite') || name.includes('eduspark')) {
          caches.delete(name).then(() => {
            console.log(`✅ Caché limpiado: ${name}`);
          });
        }
      });
    });
  }
  
  console.log('🎉 Caché limpiado. Recarga la página (F5) para aplicar cambios.');
};

console.log('\n🛠️ Comandos Disponibles:');
console.log('- clearEduSparkCache(): Limpiar caché del sistema');
console.log('- location.reload(): Recargar página');

console.log('\n✅ Diagnóstico completado');
