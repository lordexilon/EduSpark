import http from 'k6/http';
import { check } from 'k6';
import { CONFIG } from '../config.js';

export function login(email, password) {
    const payload = JSON.stringify({
        email: email,
        password: password,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'apikey': CONFIG.SUPABASE_ANON_KEY,
        },
    };

    const res = http.post(`${CONFIG.SUPABASE_URL}${CONFIG.AUTH_ENDPOINT}`, payload, params);

    check(res, {
        'login exitoso': (r) => r.status === 200,
        'tiene access_token': (r) => r.json().access_token !== undefined,
    });

    return res.json().access_token;
}
