// src/components/Admin/DeviceTable.tsx
import React, { useState } from 'react';
import { UserDeviceReport, DeviceReport } from '@/services/adminService';
import DeviceDetailsModal from './DeviceDetailsModal';
import * as XLSX from 'xlsx';

interface Props {
  data: UserDeviceReport[];
  isAdminCampus: boolean;
}

const DeviceTable: React.FC<Props> = ({ data, isAdminCampus }) => {
  const [selectedUser, setSelectedUser] = useState<UserDeviceReport | null>(null);
  const [filterInst, setFilterInst] = useState<string>('all');

  // Estados para la ordenación
  type SortField = 'usuario' | 'email' | 'institucion' | 'activos' | 'acceso' | '';
  const [sortField, setSortField] = useState<SortField>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const filtered =
    filterInst === 'all' ? data : data.filter((u) => u.institution_name === filterInst);

  // Aplicar ordenación
  const sortedData = [...filtered].sort((a, b) => {
    if (!sortField) return 0;

    let comparison = 0;
    switch (sortField) {
      case 'usuario':
        comparison = a.user_name.localeCompare(b.user_name);
        break;
      case 'email':
        comparison = a.user_email.localeCompare(b.user_email);
        break;
      case 'institucion':
        comparison = (a.institution_name || '').localeCompare(b.institution_name || '');
        break;
      case 'activos':
        comparison = a.active_devices_count - b.active_devices_count;
        break;
      case 'acceso':
        const dateA = a.last_access ? new Date(a.last_access).getTime() : 0;
        const dateB = b.last_access ? new Date(b.last_access).getTime() : 0;
        comparison = dateA - dateB;
        break;
    }
    return sortAsc ? comparison : -comparison;
  });

  const institutions = Array.from(new Set(data.map((u) => u.institution_name).filter(Boolean)));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExport = () => {
    const rows = sortedData.map((u) => ({
      Usuario: u.user_name,
      Email: u.user_email,
      Institución: u.institution_name ?? '',
      Activos: u.active_devices_count,
      Totales: u.total_devices_count,
      'Último acceso': u.last_access ? new Date(u.last_access).toLocaleString() : 'Sin accesos',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dispositivos');
    XLSX.writeFile(workbook, 'reporte-dispositivos.xlsx');
  };

  return (
    <div className="bg-white rounded-xl shadow p-4">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 space-y-2 md:space-y-0">
        {isAdminCampus ? null : (
          <select
            className="border rounded p-2"
            value={filterInst}
            onChange={(e) => setFilterInst(e.target.value)}
          >
            <option value="all">Todas las instituciones</option>
            {institutions.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleExport}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Exportar Excel
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto max-h-[600px] rounded-lg border border-gray-200">
        <table className="min-w-full text-left relative">
          <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th
                className="p-2 cursor-pointer hover:bg-gray-200 select-none group"
                onClick={() => handleSort('usuario')}
              >
                <div className="flex items-center gap-1">
                  Usuario{' '}
                  {sortField === 'usuario' ? (
                    <span className="text-xs text-indigo-600">{sortAsc ? '▲' : '▼'}</span>
                  ) : (
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">
                      ↕
                    </span>
                  )}
                </div>
              </th>
              <th
                className="p-2 cursor-pointer hover:bg-gray-200 select-none group"
                onClick={() => handleSort('email')}
              >
                <div className="flex items-center gap-1">
                  Email{' '}
                  {sortField === 'email' ? (
                    <span className="text-xs text-indigo-600">{sortAsc ? '▲' : '▼'}</span>
                  ) : (
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">
                      ↕
                    </span>
                  )}
                </div>
              </th>
              {isAdminCampus ? null : (
                <th
                  className="p-2 cursor-pointer hover:bg-gray-200 select-none group"
                  onClick={() => handleSort('institucion')}
                >
                  <div className="flex items-center gap-1">
                    Institución{' '}
                    {sortField === 'institucion' ? (
                      <span className="text-xs text-indigo-600">{sortAsc ? '▲' : '▼'}</span>
                    ) : (
                      <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">
                        ↕
                      </span>
                    )}
                  </div>
                </th>
              )}
              <th
                className="p-2 cursor-pointer hover:bg-gray-200 select-none group"
                onClick={() => handleSort('activos')}
              >
                <div className="flex items-center gap-1">
                  Activos / Totales{' '}
                  {sortField === 'activos' ? (
                    <span className="text-xs text-indigo-600">{sortAsc ? '▲' : '▼'}</span>
                  ) : (
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">
                      ↕
                    </span>
                  )}
                </div>
              </th>
              <th
                className="p-2 cursor-pointer hover:bg-gray-200 select-none group"
                onClick={() => handleSort('acceso')}
              >
                <div className="flex items-center gap-1">
                  Último acceso{' '}
                  {sortField === 'acceso' ? (
                    <span className="text-xs text-indigo-600">{sortAsc ? '▲' : '▼'}</span>
                  ) : (
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">
                      ↕
                    </span>
                  )}
                </div>
              </th>
              <th className="p-2 select-none text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((u) => (
              <tr key={u.user_id} className="border-b hover:bg-gray-50">
                <td className="p-2">{u.user_name}</td>
                <td className="p-2">{u.user_email}</td>
                {isAdminCampus ? null : <td className="p-2">{u.institution_name}</td>}
                <td className="p-2">
                  {u.active_devices_count} / {u.total_devices_count}
                </td>
                <td className="p-2">
                  {u.last_access ? new Date(u.last_access).toLocaleString() : 'Sin accesos'}
                </td>
                <td className="p-2">
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="text-indigo-600 hover:underline inline-flex items-center"
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
