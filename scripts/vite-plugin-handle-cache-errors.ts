import type { Plugin } from 'vite';
import { existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Función para limpiar directorios temporales de Vite
 * Evita errores EPERM en Windows
 */
function cleanTempDirs() {
  const cacheDirs = ['.vite-cache', '.vite-temp', 'node_modules/.vite'];
  
  for (const cacheDir of cacheDirs) {
    if (existsSync(cacheDir)) {
      try {
        // Buscar y eliminar directorios temporales deps_temp_* y deps
        const entries = readdirSync(cacheDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && (entry.name.startsWith('deps_temp_') || entry.name === 'deps')) {
            const tempPath = join(cacheDir, entry.name);
            try {
              rmSync(tempPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            } catch (error: any) {
              // Ignorar errores EPERM silenciosamente - son comunes en Windows
              // cuando Vite está optimizando dependencias en paralelo
              if (error?.code !== 'EPERM' && error?.code !== 'EBUSY' && error?.code !== 'ENOENT') {
                // Solo mostrar advertencia para errores no esperados
                console.warn(`[vite-plugin-handle-cache-errors] No se pudo eliminar ${tempPath}: ${error.message}`);
              }
            }
          }
        }
      } catch (error: any) {
        // Ignorar errores silenciosamente - el directorio podría no existir o estar bloqueado
      }
    }
  }
}

/**
 * Plugin para manejar errores de permisos (EPERM) en Windows
 * cuando Vite intenta eliminar directorios temporales de caché
 */
export function handleCacheErrors(): Plugin {
  return {
    name: 'handle-cache-errors',
    // Limpiar directorios temporales antes de la optimización
    buildStart() {
      cleanTempDirs();
    },
    // Limpiar también durante la configuración del servidor
    configureServer(server) {
      cleanTempDirs();
      // Interceptar errores de EPERM durante el desarrollo
      const originalListen = server.listen.bind(server);
      server.listen = function(port?: number, isRestart?: boolean) {
        try {
          return originalListen(port, isRestart);
        } catch (error: any) {
          if (error?.code === 'EPERM' && error?.message?.includes('rmdir')) {
            console.warn('[vite-plugin-handle-cache-errors] Error de permisos detectado, limpiando caché...');
            cleanTempDirs();
            // Reintentar después de limpiar
            return originalListen(port, isRestart);
          }
          throw error;
        }
      };
    },
  };
}

