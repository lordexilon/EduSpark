/**
 * User Devices Management Page
 * Página para que los usuarios gestionen sus dispositivos activos
 * Permite ver y cerrar sesiones en otros dispositivos
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { deviceService, type UserDevice } from '../services/deviceService';
import {
    IconDevices,
    IconRefresh,
    IconTrash,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconDeviceTablet,
    IconAlertCircle,
    IconCheck,
    IconClock
} from '../components/Icons';

export const UserDevicesPage: React.FC = () => {
    const { user } = useAuth();
    const [devices, setDevices] = useState<UserDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadDevices = async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);
            const data = await deviceService.getUserDevices(user.id);
            setDevices(data);
        } catch (error: any) {
            console.error('Error cargando dispositivos:', error);
            setError(error.message || 'Error al cargar dispositivos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDevices();
    }, [user]);

    const handleRevokeDevice = async (deviceId: string, deviceName: string) => {
        if (!user) return;

        const confirmed = window.confirm(
            `¿Cerrar sesión en "${deviceName}"?\n\n` +
            'Se cerrará la sesión en ese dispositivo y deberás iniciar sesión nuevamente si quieres usarlo.'
        );

        if (!confirmed) return;

        try {
            setRevoking(deviceId);
            setError(null);
            await deviceService.revokeDevice(user.id, deviceId);

            // Recargar lista de dispositivos
            await loadDevices();

            // Mostrar mensaje de éxito
            alert(`✅ Sesión cerrada correctamente en "${deviceName}"`);
        } catch (error: any) {
            console.error('Error cerrando sesión:', error);
            setError(error.message || 'Error al cerrar sesión');
            alert(`❌ Error: ${error.message || 'No se pudo cerrar la sesión'}`);
        } finally {
            setRevoking(null);
        }
    };

    const getDeviceIcon = (type: string) => {
        switch (type) {
            case 'mobile':
                return <IconDeviceMobile className="w-8 h-8 text-blue-500" />;
            case 'tablet':
                return <IconDeviceTablet className="w-8 h-8 text-purple-500" />;
            case 'desktop':
            default:
                return <IconDeviceDesktop className="w-8 h-8 text-green-500" />;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const activeDevices = devices.filter(d => d.is_active);
    const inactiveDevices = devices.filter(d => !d.is_active);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <IconDevices className="w-8 h-8 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                Mis Dispositivos
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Gestiona los dispositivos donde has iniciado sesión
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={loadDevices}
                        disabled={loading}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <IconAlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                            <p className="font-semibold mb-1">Límite de dispositivos</p>
                            <p>
                                Puedes iniciar sesión en hasta <strong>3 dispositivos simultáneamente</strong>.
                                Si inicias sesión en un 4º dispositivo, se cerrará automáticamente la sesión del dispositivo más antiguo.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <IconAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-800 dark:text-red-200">
                                <p className="font-semibold">Error</p>
                                <p>{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && devices.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Cargando dispositivos...</p>
                    </div>
                ) : (
                    <>
                        {/* Active Devices */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <IconCheck className="w-5 h-5 text-green-500" />
                                Dispositivos Activos ({activeDevices.length}/3)
                            </h2>

                            {activeDevices.length === 0 ? (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                                    <IconDevices className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500 dark:text-gray-400">
                                        No hay dispositivos activos
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {activeDevices.map((device) => (
                                        <div
                                            key={device.id}
                                            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-all ${device.is_current
                                                    ? 'border-2 border-primary ring-2 ring-primary/20'
                                                    : 'border border-gray-200 dark:border-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-4 flex-1">
                                                    {/* Device Icon */}
                                                    <div className="flex-shrink-0">
                                                        {getDeviceIcon(device.device_type)}
                                                    </div>

                                                    {/* Device Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                                {device.device_name}
                                                            </h3>
                                                            {device.is_current && (
                                                                <span className="px-2 py-1 bg-primary text-white text-xs font-medium rounded-full">
                                                                    Este dispositivo
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                            <div>
                                                                <span className="font-medium">Navegador:</span> {device.browser}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Sistema:</span> {device.os}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Tipo:</span>{' '}
                                                                {device.device_type === 'desktop' && 'Computadora'}
                                                                {device.device_type === 'mobile' && 'Móvil'}
                                                                {device.device_type === 'tablet' && 'Tablet'}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">IP:</span> {device.ip_address}
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                            <IconClock className="w-4 h-4" />
                                                            <span>Última actividad: {formatDate(device.last_activity_at)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                {!device.is_current && (
                                                    <button
                                                        onClick={() => handleRevokeDevice(device.id, device.device_name)}
                                                        disabled={revoking === device.id}
                                                        className="btn btn-danger btn-sm ml-4 flex items-center gap-2"
                                                    >
                                                        {revoking === device.id ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                Cerrando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <IconTrash className="w-4 h-4" />
                                                                Cerrar sesión
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Inactive Devices (if any) */}
                        {inactiveDevices.length > 0 && (
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <IconClock className="w-5 h-5 text-gray-500" />
                                    Dispositivos Inactivos ({inactiveDevices.length})
                                </h2>

                                <div className="grid gap-4">
                                    {inactiveDevices.map((device) => (
                                        <div
                                            key={device.id}
                                            className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6 opacity-60"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 opacity-50">
                                                    {getDeviceIcon(device.device_type)}
                                                </div>

                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                        {device.device_name}
                                                    </h3>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                        <div>
                                                            <span className="font-medium">Navegador:</span> {device.browser}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Sistema:</span> {device.os}
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                                                        Sesión cerrada: {formatDate(device.last_activity_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                                    Los dispositivos inactivos se eliminan automáticamente después de 90 días.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
