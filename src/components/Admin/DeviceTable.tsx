// src/components/Admin/DeviceTable.tsx
import React, { useState } from 'react';
import { UserDeviceReport, DeviceReport } from '@/services/adminService';
import DeviceDetailsModal from './DeviceDetailsModal';
import { downloadCSV } from '@/utils/download';

interface Props {
    data: UserDeviceReport[];
    isAdminCampus: boolean;
}

const DeviceTable: React.FC<Props> = ({ data, isAdminCampus }) => {
    const [selectedUser, setSelectedUser] = useState<UserDeviceReport | null>(null);
    const [filterInst, setFilterInst] = useState<string>('all');

    const filtered = filterInst === 'all' ? data : data.filter(u => u.institution_name === filterInst);

    const institutions = Array.from(new Set(data.map(u => u.institution_name).filter(Boolean)));

    const handleExport = () => {
        const rows: string[][] = [
            ['Usuario', 'Email', 'Institución', 'Activos', 'Totales', 'Último acceso']
        ];
        filtered.forEach(u => {
            rows.push([
                u.user_name,
                u.user_email,
                u.institution_name ?? '',
                u.active_devices_count.toString(),
                u.total_devices_count.toString(),
                u.last_access
            ]);
        });
        downloadCSV(rows, 'reporte-dispositivos.csv');
    };

    return (
        <div className="bg-white rounded-xl shadow p-4">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-2 md:space-y-0">
                {isAdminCampus ? null : (
                    <select
                        className="border rounded p-2"
                        value={filterInst}
                        onChange={e => setFilterInst(e.target.value)}
                    >
                        <option value="all">Todas las instituciones</option>
                        {institutions.map(inst => (
                            <option key={inst} value={inst}>{inst}</option>
                        ))}
                    </select>
                )}
                <button
                    onClick={handleExport}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                    Exportar CSV
                </button>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2">Usuario</th>
                            <th className="p-2">Email</th>
                            {isAdminCampus ? null : <th className="p-2">Institución</th>}
                            <th className="p-2">Activos / Totales</th>
                            <th className="p-2">Último acceso</th>
                            <th className="p-2">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(u => (
                            <tr key={u.user_id} className="border-b hover:bg-gray-50">
                                <td className="p-2">{u.user_name}</td>
                                <td className="p-2">{u.user_email}</td>
                                {isAdminCampus ? null : <td className="p-2">{u.institution_name}</td>}
                                <td className="p-2">{u.active_devices_count} / {u.total_devices_count}</td>
                                <td className="p-2">{new Date(u.last_access).toLocaleString()}</td>
                                <td className="p-2">
                                    <button
                                        onClick={() => setSelectedUser(u)}
                                        className="text-indigo-600 hover:underline"
                                    >
                                        Ver detalle
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal detalle */}
            {selectedUser && (
                <DeviceDetailsModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    isAdminCampus={isAdminCampus}
                />
            )}
        </div>
    );
};

export default DeviceTable;
