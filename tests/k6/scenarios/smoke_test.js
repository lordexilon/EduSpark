import http from 'k6/http';
import { group, sleep } from 'k6';
import { login } from '../utils/auth.js';
import { CONFIG } from '../config.js';

export const options = {
    stages: [
        { duration: '2m', target: 100 },  // 0 a 100 usuarios en 2 minutos (calentamiento)
        { duration: '3m', target: 500 },  // Subir a 500 usuarios en los siguientes 3 minutos
        { duration: '5m', target: 1000 }, // Alcanzar el pico de 1,000
        { duration: '2m', target: 0 },    // Bajada gradual para ver la recuperación
    ],
};

export default function () {
    group('Flujo de Carga Ligera (500 Usuarios)', () => {
        // 1. Simular Login
        const token = login(CONFIG.TEST_USER.email, CONFIG.TEST_USER.password);

        if (token) {
            const authParams = {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': CONFIG.SUPABASE_ANON_KEY,
                },
            };

            // 2. Simular búsqueda vectorial (Caché Semántico)
            // Asumiendo un endpoint de búsqueda que pasa por el caché
            const searchRes = http.get(`${CONFIG.BASE_URL}/api/search?q=anatomia`, authParams);

            // 3. Simular navegación a cursos
            const coursesRes = http.get(`${CONFIG.SUPABASE_URL}/rest/v1/courses?select=*`, authParams);

            sleep(Math.random() * 3 + 2); // Simular tiempo de lectura (2-5 segundos)
        }
    });
}
