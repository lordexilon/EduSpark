/**
 * Device Fingerprinting Utility
 * Genera identificadores únicos de dispositivos para el sistema de límite de sesiones
 * Implementa privacidad por diseño: solo información técnica, sin datos personales
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

export interface DeviceInfo {
    fingerprint: string;
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
    userAgent: string;
}

/**
 * Obtiene el fingerprint único del dispositivo y metadatos técnicos
 * @returns {Promise<DeviceInfo>} Información del dispositivo
 */
export const getDeviceFingerprint = async (): Promise<DeviceInfo> => {
    try {
        // Inicializar FingerprintJS
        const fp = await FingerprintJS.load();
        const result = await fp.get();

        // Obtener user agent
        const ua = navigator.userAgent;

        // Detectar tipo de dispositivo
        const isMobile = /Mobile|Android|iPhone/i.test(ua);
        const isTablet = /iPad|Tablet/i.test(ua);
        let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';

        if (isTablet) {
            deviceType = 'tablet';
        } else if (isMobile) {
            deviceType = 'mobile';
        }

        // Detectar navegador
        let browser = 'Unknown';
        let browserVersion = '';

        if (ua.includes('Edg/')) {
            browser = 'Edge';
            browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || '';
        } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
            browser = 'Chrome';
            browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
        } else if (ua.includes('Firefox/')) {
            browser = 'Firefox';
            browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || '';
        } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
            browser = 'Safari';
            browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || '';
        } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
            browser = 'Opera';
            browserVersion = ua.match(/(?:Opera|OPR)\/([\d.]+)/)?.[1] || '';
        }

        // Formatear versión del navegador (solo major.minor)
        const browserVersionShort = browserVersion.split('.').slice(0, 2).join('.');
        const browserFull = browserVersion ? `${browser} ${browserVersionShort}` : browser;

        // Detectar sistema operativo
        // IMPORTANTE: Windows debe verificarse ANTES que Linux
        // porque algunos navegadores en Windows incluyen "Linux" en el UA
        let os = 'Unknown';
        let osVersion = '';

        if (ua.includes('Windows NT 10.0')) {
            os = 'Windows';
            osVersion = '10/11';
        } else if (ua.includes('Windows NT 6.3')) {
            os = 'Windows';
            osVersion = '8.1';
        } else if (ua.includes('Windows NT 6.2')) {
            os = 'Windows';
            osVersion = '8';
        } else if (ua.includes('Windows NT 6.1')) {
            os = 'Windows';
            osVersion = '7';
        } else if (ua.includes('Windows')) {
            // Fallback para otras versiones de Windows
            os = 'Windows';
        } else if (ua.includes('Mac OS X')) {
            os = 'macOS';
            const match = ua.match(/Mac OS X ([\d_]+)/);
            if (match) {
                osVersion = match[1].replace(/_/g, '.');
            }
        } else if (ua.includes('Android')) {
            os = 'Android';
            const match = ua.match(/Android ([\d.]+)/);
            if (match) {
                osVersion = match[1];
            }
        } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
            os = 'iOS';
            const match = ua.match(/OS ([\d_]+)/);
            if (match) {
                osVersion = match[1].replace(/_/g, '.');
            }
        } else if (ua.includes('Linux')) {
            // Linux debe ir AL FINAL para evitar falsos positivos
            os = 'Linux';
        }

        const osFull = osVersion ? `${os} ${osVersion}` : os;

        // Generar nombre descriptivo del dispositivo
        // Solo mostramos navegador y tipo, el OS puede ser impreciso en algunos casos
        const deviceTypeLabel = deviceType === 'desktop' ? 'Computadora' :
            deviceType === 'mobile' ? 'Móvil' : 'Tablet';
        const deviceName = `${browser} (${deviceTypeLabel})`;

        return {
            fingerprint: result.visitorId,
            deviceName,
            deviceType,
            browser: browserFull,
            os: osFull,
            userAgent: ua
        };
    } catch (error) {
        console.error('Error generando device fingerprint:', error);

        // Fallback: usar información básica del navegador
        const ua = navigator.userAgent;
        const isMobile = /Mobile|Android|iPhone/i.test(ua);
        const isTablet = /iPad|Tablet/i.test(ua);
        const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
        const deviceTypeLabel = deviceType === 'desktop' ? 'Computadora' :
            deviceType === 'mobile' ? 'Móvil' : 'Tablet';

        return {
            fingerprint: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            deviceName: `Navegador (${deviceTypeLabel})`,
            deviceType,
            browser: 'Unknown',
            os: 'Unknown',
            userAgent: ua
        };
    }
};

/**
 * Obtiene la IP pública del usuario (aproximada)
 * Usa servicio externo gratuito
 * @returns {Promise<string>} Dirección IP
 */
export const getUserIP = async (): Promise<string> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error obteniendo IP');
        }

        const data = await response.json();
        return data.ip || '0.0.0.0';
    } catch (error) {
        console.warn('No se pudo obtener IP pública:', error);
        return '0.0.0.0'; // Fallback
    }
};

/**
 * Valida si un fingerprint es válido
 * @param fingerprint - Fingerprint a validar
 * @returns {boolean} True si es válido
 */
export const isValidFingerprint = (fingerprint: string): boolean => {
    if (!fingerprint || typeof fingerprint !== 'string') {
        return false;
    }

    // FingerprintJS genera IDs de 20 caracteres alfanuméricos
    // Fallback genera IDs con prefijo "fallback_"
    return fingerprint.length >= 10 && /^[a-zA-Z0-9_]+$/.test(fingerprint);
};

/**
 * Obtiene información resumida del dispositivo actual (sin fingerprint)
 * Útil para mostrar al usuario sin hacer tracking
 * @returns {Omit<DeviceInfo, 'fingerprint'>} Información del dispositivo
 */
export const getCurrentDeviceInfo = (): Omit<DeviceInfo, 'fingerprint'> => {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const isTablet = /iPad|Tablet/i.test(ua);
    const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

    let browser = 'Navegador';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    let os = 'Sistema';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux'; // Linux al final

    const deviceTypeLabel = deviceType === 'desktop' ? 'Computadora' :
        deviceType === 'mobile' ? 'Móvil' : 'Tablet';

    return {
        deviceName: `${browser} (${deviceTypeLabel})`,
        deviceType,
        browser,
        os,
        userAgent: ua
    };
};
