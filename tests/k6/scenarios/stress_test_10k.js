import http from 'k6/http';
import { group, sleep } from 'k6';
import { login } from '../utils/auth.js';
import { CONFIG } from '../config.js';

/**
 * ESCENARIO DE ESTRÉS EXTREMO: 10,000 USUARIOS
 * 
 * Este script utiliza un ramp-up muy largo (45 minutos) para permitir
 * que la infraestructura serverless y el auto-escalado de base de datos
 * reaccionen sin bloquear el servicio por picos de tráfico.
 */

export const options = {
    stages: [
        { duration: '5m', target: 500 },   // Calentamiento inicial y Cold Starts
        { duration: '10m', target: 2000 }, // Carga Media: Evaluando límites de conexiones simples
        { duration: '10m', target: 5000 }, // Presión Alta: Evaluando escalado de Cloud Functions
        { duration: '10m', target: 10000 },// ESTRÉS MÁXIMO: 10,000 usuarios concurrentes
        { duration: '5m', target: 10000 }, // Sostener carga máxima para ver fatiga
        { duration: '5m', target: 0 },     // Recuperación y limpieza de conexiones
    ],
    thresholds: {
        http_req_failed: ['rate<0.05'],     // Menos del 5% de errores
        http_req_duration: ['p(95)<2000'],  // 95% de las peticiones deben durar menos de 2s
    },
};

export default function () {
    group('Flujo de Estrés Real (10k)', () => {
        // 1. Simular Login (Crucial para probar Supabase Auth y Pooler)
        const token = login(CONFIG.TEST_USER.email, CONFIG.TEST_USER.password);

        if (token) {
            const authParams = {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                },
            };

            // 2. Operación de Lectura Intensiva (Usa caché semántico si el endpoint lo soporta)
            const searchRes = http.get(`${CONFIG.BASE_URL}/api/search?q=medicina`, authParams);

            // 3. Consulta de base de datos directa (Prueba de Supavisor)
            const coursesRes = http.get(`${CONFIG.SUPABASE_URL}/rest/v1/profiles?select=id,full_name&limit=1`, authParams);

            // Simular comportamiento humano aleatorio (Think time)
            sleep(Math.random() * 5 + 5);
        }
    });
}
