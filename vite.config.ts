import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
      // Configuración para evitar problemas de caché
      hmr: {
        overlay: true,
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
        timeout: 30000,  // Timeout más largo para HMR
        reloadDelay: 100,  // Pequeño delay para recargas
        reloadOnConfigChange: true
      },
      // Forzar recarga completa en lugar de HMR para evitar problemas
      watch: {
        usePolling: false,
        interval: 1000
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(
        env.GEMINI_API_KEY 
        || env.VITE_GEMINI_API_KEY 
        || process.env?.VITE_GEMINI_API_KEY 
        || process.env?.GEMINI_API_KEY 
        || ''
      ),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || process.env?.VITE_SUPABASE_URL || 'https://mckfscukxcqwntpjagar.supabase.co'),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8'),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(
        env.VITE_GEMINI_API_KEY 
        || env.GEMINI_API_KEY 
        || process.env?.VITE_GEMINI_API_KEY 
        || process.env?.GEMINI_API_KEY 
        || ''
      ),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || process.env?.VITE_SUPABASE_URL || 'https://mckfscukxcqwntpjagar.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8'),
    },
    // Configuración de build para evitar problemas de caché
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            supabase: ['@supabase/supabase-js']
          }
        }
      }
    },
    // Configuración de caché
    cacheDir: '.vite-cache',
    optimizeDeps: {
      force: false
    }
  };
});
