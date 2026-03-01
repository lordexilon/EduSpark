// src/pages/AdminDevicesReportPage.tsx
import React, { useEffect, useState } from 'react';
import { adminService, UserDeviceReport } from '@/services/adminService';
import DeviceTable from '@/components/Admin/DeviceTable';
import { useAuth } from '@/hooks/useAuth';

const AdminDevicesReportPage: React.FC = () => {
    const { user } = useAuth();
    const [report, setReport] = useState<UserDeviceReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAdminCampus = user?.role?.name === 'admin-campus';

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                const data = isAdminCampus
                    ? await adminService.getDevicesReportCampus()
                    : await adminService.getDevicesReportAdmin();
                setReport(data);
            } catch (e: any) {
                console.error('❌ Error al cargar reporte de dispositivos', e);
                setError(e.message ?? 'Error inesperado');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [isAdminCampus]);

    // Métricas rápidas
    const totalUsers = report.length;
    const totalDevices = report.reduce((sum, u) => sum + u.total_devices_count, 0);
    const activeDevices = report.reduce((sum, u) => sum + u.active_devices_count, 0);
    const alerts = report.filter(u => u.active_devices_count > 2).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                <span className="ml-4 text-gray-600">Cargando reporte...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600">
                <p>❌ {error}</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header con métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm text-gray-500">Usuarios</h3>
                    <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm text-gray-500">Dispositivos totales</h3>
                    <p className="text-2xl font-bold">{totalDevices}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm text-gray-500">Dispositivos activos</h3>
                    <p className="text-2xl font-bold">{activeDevices}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                    <h3 className="text-sm text-gray-500">Alertas (≥3 dispositivos)</h3>
                    <p className="text-2xl font-bold text-red-600">{alerts}</p>
                </div>
            </div>

            {/* Tabla con filtros y exportación */}
            <DeviceTable data={report} isAdminCampus={isAdminCampus} />
        </div>
    );
};

export default AdminDevicesReportPage;
