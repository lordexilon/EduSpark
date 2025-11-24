"use strict";
// functions/analyzeFile/auth.ts
// Utilidades de autenticación para Cloud Functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySupabaseToken = verifySupabaseToken;
exports.requireAuth = requireAuth;
/**
 * Verifica el token de autenticación de Supabase
 */
async function verifySupabaseToken(token) {
    try {
        // Supabase JWT tokens tienen el formato: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        // Podemos verificar el token llamando a la API de Supabase o decodificándolo
        // Opción 1: Decodificar el JWT (sin verificar la firma - solo para desarrollo)
        // En producción, deberías verificar la firma con la clave secreta de Supabase
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }
        // Decodificar el payload (sin verificar firma)
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        // Verificar que el token no haya expirado
        if (payload.exp && payload.exp < Date.now() / 1000) {
            return null;
        }
        return {
            userId: payload.sub || payload.user_id || '',
            email: payload.email || '',
        };
    }
    catch (error) {
        console.error('Error verificando token:', error);
        return null;
    }
}
/**
 * Middleware de autenticación para Cloud Functions
 */
async function requireAuth(req, res) {
    // Obtener token del header Authorization
    const authHeader = Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: 'Token de autenticación requerido. Formato: Authorization: Bearer <token>',
        });
        return null;
    }
    const token = authHeader.split('Bearer ')[1];
    const user = await verifySupabaseToken(token);
    if (!user) {
        res.status(401).json({
            success: false,
            error: 'Token de autenticación inválido o expirado',
        });
        return null;
    }
    return user;
}
//# sourceMappingURL=auth.js.map