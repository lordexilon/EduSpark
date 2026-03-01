// pages/UserSuspensionManagementPage.tsx
// Página para gestionar suspensiones/reactivaciones de usuarios masivamente

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userSuspensionService, UserSuspensionData, SuspensionResult } from '@/services/userSuspensionService';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import { IconUpload, IconFileText, IconUsers, IconX, IconCheck, IconXCircle, IconDownload, IconAlertCircle, IconBan, IconCheckCircle } from '@/components/Common/Icons';

const UserSuspensionManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [csvText, setCsvText] = useState('');
  const [users, setUsers] = useState<UserSuspensionData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<SuspensionResult | null>(null);

  const handleParseCSV = () => {
    try {
      const parsedUsers = userSuspensionService.parseCSV(csvText);
      if (parsedUsers.length === 0) {
        alert('No se encontraron usuarios válidos en el CSV');
        return;
      }

      // Validar cada usuario
      const validUsers: UserSuspensionData[] = [];
      const invalidUsers: Array<{ documento: string; errors: string[] }> = [];

      parsedUsers.forEach(userData => {
        const validation = userSuspensionService.validateSuspensionData(userData);
        if (validation.valid) {
          validUsers.push(userData);
        } else {
          invalidUsers.push({ documento: userData.documento_identidad, errors: validation.errors });
        }
      });

      if (invalidUsers.length > 0) {
        const errorMsg = `Se encontraron ${invalidUsers.length} registro(s) con errores:\n\n` +
          invalidUsers.map(u => `- ${u.documento}: ${u.errors.join(', ')}`).join('\n');
        alert(errorMsg);
      }

      if (validUsers.length > 0) {
        setUsers([...users, ...validUsers]);
        setCsvText('');
        alert(`Se agregaron ${validUsers.length} registro(s) válido(s) a la lista`);
      }
    } catch (error: any) {
      alert('Error parseando CSV: ' + error.message);
    }
  };

  const handleProcess = async () => {
    if (users.length === 0) {
      alert('No hay usuarios para procesar');
      return;
    }

    const suspendCount = users.filter(u => !u.is_active).length;
    const reactivateCount = users.filter(u => u.is_active).length;

    if (!confirm(
      `¿Estás seguro de procesar ${users.length} usuario(s)?\n\n` +
      `- Suspender: ${suspendCount}\n` +
      `- Reactivar: ${reactivateCount}`
    )) {
      return;
    }

    try {
      setProcessing(true);
      setResult(null);

      const processResult = await userSuspensionService.bulkSuspendReactivate(users);

      setResult(processResult);

      if (processResult.success_count > 0) {
        alert(
          `✅ Procesamiento completado:\n\n` +
          `- Total: ${processResult.total}\n` +
          `- Exitosos: ${processResult.success_count}\n` +
          `- Fallidos: ${processResult.failed_count}`
        );
        
        // Limpiar lista si todo fue exitoso
        if (processResult.failed_count === 0) {
          setUsers([]);
        }
      } else {
        alert('❌ No se pudo procesar ningún usuario. Revisa los errores.');
      }
    } catch (error: any) {
      console.error('Error procesando suspensiones:', error);
      alert('Error al procesar suspensiones: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveUser = (index: number) => {
    setUsers(users.filter((_, i) => i !== index));
  };

  const downloadTemplate = () => {
    const template = `documento_identidad,is_active
12345678,false
87654321,true
11223344,false`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_suspension_usuarios.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Suspensiones de Usuarios</h1>
          <p className="mt-2 text-gray-600">
            Suspende o reactiva usuarios masivamente mediante importación desde CSV usando documento de identidad
          </p>
        </div>

        {/* Importar CSV */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Importar desde CSV</h2>
          <div className="mb-4">
            <Button
              onClick={downloadTemplate}
              variant="secondary"
              className="flex items-center gap-2 mb-2"
            >
              <IconDownload className="w-5 h-5" />
              Descargar Plantilla CSV
            </Button>
            <p className="text-sm text-gray-600">
              Descarga la plantilla CSV con el formato correcto para suspender/reactivar usuarios
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pegar contenido CSV
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="documento_identidad,is_active&#10;12345678,false&#10;87654321,true"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={10}
            />
            <p className="text-xs text-gray-500 mt-2">
              <strong>Formato:</strong> documento_identidad,is_active<br />
              <strong>is_active:</strong> true = reactivar, false = suspender<br />
              <strong>Columnas alternativas:</strong> documento, dni, cedula, identidad (para documento) | activo, active, estado, status (para estado)
            </p>
          </div>
          <div className="mt-4">
            <Button onClick={handleParseCSV} className="flex items-center gap-2">
              <IconFileText className="w-5 h-5" />
              Parsear CSV y Agregar a Lista
            </Button>
          </div>
        </Card>

        {/* Lista de usuarios a procesar */}
        {users.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Usuarios a Procesar ({users.length})
              </h2>
              <Button
                onClick={handleProcess}
                disabled={processing}
                className={`flex items-center gap-2 ${
                  users.filter(u => !u.is_active).length > 0
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <IconUpload className="w-5 h-5" />
                    Procesar {users.length} Usuario(s)
                  </>
                )}
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map((userData, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    userData.is_active
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex-1 flex items-center gap-3">
                    {userData.is_active ? (
                      <IconCheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <IconBan className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        Documento: {userData.documento_identidad}
                      </div>
                      <div className={`text-sm ${userData.is_active ? 'text-green-700' : 'text-red-700'}`}>
                        {userData.is_active ? '✅ Reactivar' : '❌ Suspender'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveUser(index)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Resultados de procesamiento */}
        {result && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resultados del Procesamiento</h2>
            <div className="mb-4">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="font-medium">Total:</span> {result.total}
                </div>
                <div className="text-sm text-green-600">
                  <span className="font-medium">Exitosos:</span> {result.success_count}
                </div>
                <div className="text-sm text-red-600">
                  <span className="font-medium">Fallidos:</span> {result.failed_count}
                </div>
              </div>
            </div>
            {result.failed_count > 0 && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                <h3 className="font-medium text-red-600">Usuarios con errores:</h3>
                {result.results
                  .filter(r => !r.success)
                  .map((resultItem, index) => (
                    <div key={index} className="p-2 bg-red-50 rounded text-sm">
                      <div className="font-medium">{resultItem.documento_identidad}</div>
                      <div className="text-red-600">{resultItem.error}</div>
                    </div>
                  ))}
              </div>
            )}
            {result.success_count > 0 && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                <h3 className="font-medium text-green-600">Usuarios procesados exitosamente:</h3>
                {result.results
                  .filter(r => r.success)
                  .map((resultItem, index) => (
                    <div key={index} className="p-2 bg-green-50 rounded text-sm">
                      <div className="font-medium">{resultItem.documento_identidad}</div>
                      <div className="text-green-700">
                        {resultItem.action === 'suspendido' ? '❌ Suspendido' : '✅ Reactivado'}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        )}

        {/* Información importante */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <IconAlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">ℹ️ Información</h3>
              <p className="text-sm text-blue-800">
                <strong>Formato CSV:</strong> El archivo debe tener al menos una columna con el documento de identidad 
                (puede llamarse: documento, dni, cedula, identidad) y opcionalmente una columna con el estado 
                (activo, active, estado, status). Si no hay columna de estado, se asume suspender (false).
              </p>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Valores de estado:</strong> true, 1, si, yes, activo, reactivar = Reactivar | 
                false, 0, no, suspendido = Suspender
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserSuspensionManagementPage;

