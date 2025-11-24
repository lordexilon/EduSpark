// src/components/Admin/DeviceDetailsModal.tsx
import React from 'react';
import { UserDeviceReport, DeviceReport } from '../../services/adminService';
import { adminService } from '../../services/adminService';

interface Props {
    user: UserDeviceReport;
    onClose: () => void;
    isAdminCampus: boolean;
}

const DeviceDetailsModal: React.FC<Props> = ({ user, onClose, isAdminCampus }) => {
    const handleRevoke = async (deviceId: string) => {
        if (!window.confirm('¿Cerrar sesión de este dispositivo?')) return;
        let justification: string | undefined;
        if (isAdminCampus) {
            justification = prompt('Justificación (obligatoria para admin‑campus):') ?? '';
            if (!justification) {
                alert('Debe proporcionar una justificación.');
                return;
            }
        }
        try {
            await adminService.revokeDevice(user.user_id, deviceId, justification);
            alert('Sesión cerrada exitosamente');
            // Recargar datos (simplemente refrescar página)
            window.location.reload();
        } catch (e: any) {
            console.error(e);
            alert('Error al cerrar sesión');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 overflow-y-auto max-h-[80vh]">
                <h2 className="text-xl font-bold mb-4">Dispositivos de {user.user_name}</h2>
                <table className="min-w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2">Nombre</th>
                            <th className="p-2">Tipo</th>
                            <th className="p-2">Navegador</th>
                            <th className="p-2">OS</th>
                            <th className="p-2">IP</th>
                            <th className="p-2">Última actividad</th>
                            <th className="p-2">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {user.devices.map((d: DeviceReport) => (
                            <tr key={d.id} className="border-b hover:bg-gray-50">
                                <td className="p-2">{d.device_name}</td>
                                <td className="p-2">{d.device_type}</td>
                                <td className="p-2">{d.browser}</td>
                                <td className="p-2">{d.os}</td>
                                <td className="p-2">{d.ip_address}</td>
                                <td className="p-2">{new Date(d.last_activity_at).toLocaleString()}</td>
                                <td className="p-2">
                                    <button
                                        onClick={() => handleRevoke(d.id)}
                                        className="text-red-600 hover:underline"
                                    >
                                        Cerrar sesión
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-end mt-4 space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeviceDetailsModal;
