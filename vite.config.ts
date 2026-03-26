import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleCacheErrors } from './scripts/vite-plugin-handle-cache-errors';

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
    plugins: [
      react(),
      handleCacheErrors(), // Maneja errores EPERM en Windows
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(
        process.env.VITE_GEMINI_API_KEY
        || env.VITE_GEMINI_API_KEY
        || env.GEMINI_API_KEY
        || process.env.GEMINI_API_KEY
        || ''
      ),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(
        process.env.VITE_GEMINI_API_KEY
        || env.VITE_GEMINI_API_KEY
        || env.GEMINI_API_KEY
        || process.env.GEMINI_API_KEY
        || ''
      ),
    },
    // Configuración de build para evitar problemas de caché
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('@supabase/supabase-js')) return 'vendor-supabase';
              if (id.includes('@tiptap/')) return 'vendor-tiptap';
              if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('xlsx')) return 'vendor-xlsx';
              if (id.includes('jspdf')) return 'vendor-jspdf';
              return 'vendor-misc';
            }

            // App domain chunks (helps reduce giant app chunk)
            if (id.includes('/src/services/')) {
              if (id.includes('google')) return 'app-google-services';
              if (id.includes('tutor')) return 'app-tutor-services';
              if (id.includes('supabase')) return 'app-supabase-services';
              return 'app-services';
            }
            if (id.includes('/src/modules/tutor/')) return 'app-tutor-module';
            if (id.includes('/src/pages/Admin/')) return 'app-pages-admin';
            if (id.includes('/src/pages/Teacher/')) return 'app-pages-teacher';
            if (id.includes('/src/pages/Student/')) return 'app-pages-student';
            if (id.includes('/src/pages/Common/')) return 'app-pages-common';

            return undefined;
          }
        }
      },
      // Aumentar límite de advertencia de chunk
      chunkSizeWarningLimit: 1000
    },
    // Configuración de caché
    cacheDir: '.vite-temp',
    optimizeDeps: {
      force: false,
      holdUntilCrawlEnd: false,
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tiptap/react',
        '@tiptap/starter-kit',
        '@tiptap/extension-image',
        '@tiptap/extension-link',
        '@tiptap/extension-text-style',
        '@tiptap/extension-color',
        '@tiptap/extension-text-align',
        '@tiptap/extension-underline',
        'lucide-react'
      ],
      exclude: ['@tailwindcss/*'],
      esbuildOptions: {
        target: 'es2020'
      }
    },
    // Manejar errores de permisos en Windows de manera más silenciosa
    clearScreen: false,
    logLevel: 'warn'
  };
});
