// pages/BulkSuspendReactivatePage.tsx
// Página para suspender/reactivar usuarios masivamente mediante documento de identidad

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserInstitution } from '@/hooks/useUserInstitution';
import {
  bulkSuspendReactivateService,
  SuspendReactivateUserData,
  SuspendReactivateResult,
} from '@/services/bulkSuspendReactivateService';
import { paymentService, PaymentStatus } from '@/services/paymentService';
import { institutionService } from '@/services/institutionService';
import { supabase } from '@/lib/supabase';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import {
  IconUpload,
  IconFileText,
  IconUsers,
  IconCheck,
  IconX,
  IconXCircle,
  IconDownload,
  IconAlertTriangle,
  IconBan,
  IconCheckCircle,
  IconDollarSign,
} from '@/components/Common/Icons';
import AdminRoute from '@/components/Common/AdminRoute';

const BulkSuspendReactivatePage: React.FC = () => {
  const { user } = useAuth();
  const { institution } = useUserInstitution();
  const isSupervisor = user?.role?.name === 'supervisor';
  const [csvText, setCsvText] = useState('');
  const [users, setUsers] = useState<SuspendReactivateUserData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<SuspendReactivateResult | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<Map<string, PaymentStatus>>(new Map());
  const [loadingPaymentInfo, setLoadingPaymentInfo] = useState(false);
  const [processingMode, setProcessingMode] = useState<'suspend_reactivate' | 'payments'>(
    'payments'
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleParseCSV = () => {
    try {
      const parsedUsers = bulkSuspendReactivateService.parseSuspendReactivateCSV(csvText);
      if (parsedUsers.length === 0) {
        alert('No se encontraron usuarios válidos en el CSV');
        return;
      }

      processParsedUsers(parsedUsers);
    } catch (error: any) {
      alert('Error parseando CSV: ' + error.message);
    }
  };

  const handleExcelFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea un archivo Excel
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      alert('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setLoadingPaymentInfo(true);
      const parsedUsers = await bulkSuspendReactivateService.parseExcelFile(file);

      if (parsedUsers.length === 0) {
        alert('No se encontraron usuarios válidos en el archivo Excel');
        return;
      }

      processParsedUsers(parsedUsers);
    } catch (error: any) {
      alert('Error parseando archivo Excel: ' + error.message);
      console.error('Error:', error);
    } finally {
      setLoadingPaymentInfo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processParsedUsers = async (parsedUsers: SuspendReactivateUserData[]) => {
    // Si es supervisor, validar que todos los usuarios pertenezcan a su institución
    if (isSupervisor && institution) {
      // Obtener los documentos de identidad de los usuarios parseados
      const identityDocuments = parsedUsers.map((u) => u.identity_document).filter(Boolean);

      if (identityDocuments.length > 0) {
        // Buscar usuarios por documento de identidad
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select(
            `
            id,
            identity_document,
            user_institutions!inner(institution_id)
          `
          )
          .in('identity_document', identityDocuments)
          .eq('user_institutions.institution_id', institution.id);

        if (usersError) {
          console.error('Error validando usuarios por institución:', usersError);
          alert('Error al validar usuarios. Por favor, intenta nuevamente.');
          return;
        }

        // Crear un mapa de documentos válidos
        const validDocuments = new Set((usersData || []).map((u: any) => u.identity_document));

        // Filtrar usuarios que no pertenecen a la institución
        const usersFromOtherInstitution = parsedUsers.filter(
          (u) => u.identity_document && !validDocuments.has(u.identity_document)
        );

        if (usersFromOtherInstitution.length > 0) {
          alert(
            `Error: ${usersFromOtherInstitution.length} usuario(s) no pertenecen a tu institución "${institution.name}":\n\n` +
              usersFromOtherInstitution.map((u) => `- ${u.identity_document}`).join('\n')
          );

          // Continuar solo con los usuarios válidos
          parsedUsers = parsedUsers.filter(
            (u) => !u.identity_document || validDocuments.has(u.identity_document)
          );
        }
      }
    }

    // Validar cada usuario
    const validUsers: SuspendReactivateUserData[] = [];
    const invalidUsers: Array<{ identity_document: string; errors: string[] }> = [];

    parsedUsers.forEach((user) => {
      const validation = bulkSuspendReactivateService.validateSuspendReactivateData(user);
      if (validation.valid) {
        validUsers.push(user);
      } else {
        invalidUsers.push({
          identity_document: user.identity_document || 'sin documento',
          errors: validation.errors,
        });
      }
    });

    if (invalidUsers.length > 0) {
      const errorMsg =
        `Se encontraron ${invalidUsers.length} usuario(s) con errores:\n\n` +
        invalidUsers.map((u) => `- ${u.identity_document}: ${u.errors.join(', ')}`).join('\n');
      alert(errorMsg);
    }

    if (validUsers.length > 0) {
      setUsers([...users, ...validUsers]);
      setCsvText('');
      alert(`Se agregaron ${validUsers.length} usuario(s) válido(s) a la lista de procesamiento`);

      // Cargar información de pagos para los nuevos usuarios
      loadPaymentInfoForUsers(validUsers);
    }
  };

  const handleProcess = async () => {
    if (users.length === 0) {
      alert('No hay usuarios para procesar');
      return;
    }

    // Determinar acción basada en paid o is_active
    const suspendCount = users.filter((u) => {
      // Si tiene campo paid, usar ese
      if (u.paid !== undefined) {
        const paid = typeof u.paid === 'string' ? u.paid.toLowerCase() : String(u.paid);
        return (
          paid === 'false' ||
          paid === '0' ||
          paid === 'no' ||
          paid === 'no pagado' ||
          paid === 'unpaid' ||
          paid === 'sin pago' ||
          paid === 'pendiente' ||
          paid === 'pending'
        );
      }
      // Si no, usar is_active
      const status =
        typeof u.is_active === 'string' ? u.is_active.toLowerCase() : String(u.is_active);
      return status === 'false' || status === '0' || status === 'suspender' || status === 'suspend';
    }).length;

    const reactivateCount = users.length - suspendCount;

    const modeText =
      processingMode === 'payments'
        ? 'Procesar pagos y actualizar estados'
        : 'Suspender/Reactivar usuarios';

    if (
      !confirm(
        `¿Estás seguro de ${modeText.toLowerCase()} para ${users.length} usuario(s)?\n\n` +
          `- Suspender: ${suspendCount}\n` +
          `- Reactivar: ${reactivateCount}\n\n` +
          (processingMode === 'payments'
            ? 'Se registrarán los pagos y se actualizará el estado automáticamente.'
            : 'Se actualizará el estado de los usuarios.')
      )
    ) {
      return;
    }

    try {
      setProcessing(true);
      setResult(null);

      // Si es supervisor, validar nuevamente antes de procesar
      if (isSupervisor && institution) {
        const identityDocuments = users.map((u) => u.identity_document).filter(Boolean);

        if (identityDocuments.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select(
              `
              id,
              identity_document,
              user_institutions!inner(institution_id)
            `
            )
            .in('identity_document', identityDocuments)
            .eq('user_institutions.institution_id', institution.id);

          const validDocuments = new Set((usersData || []).map((u: any) => u.identity_document));
          const invalidUsers = users.filter(
            (u) => u.identity_document && !validDocuments.has(u.identity_document)
          );

          if (invalidUsers.length > 0) {
            alert(
              `Error: No puedes procesar ${invalidUsers.length} usuario(s) que no pertenecen a tu institución.`
            );
            setProcessing(false);
            return;
          }
        }
      }

      let processResult: SuspendReactivateResult;

      if (processingMode === 'payments') {
        // Procesar pagos y actualizar estados automáticamente
        processResult = await bulkSuspendReactivateService.processPaymentsFromExcel(
          users,
          isSupervisor && institution ? institution.id : undefined
        );
      } else {
        // Solo suspender/reactivar sin procesar pagos
        processResult = await bulkSuspendReactivateService.bulkSuspendReactivateUsers(
          users,
          isSupervisor && institution ? institution.id : undefined
        );
      }

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
          setPaymentInfo(new Map());
        }
      } else {
        alert('❌ No se pudo procesar ningún usuario. Revisa los errores.');
      }
    } catch (error: any) {
      console.error('Error procesando usuarios:', error);
      alert('Error al procesar usuarios: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveUser = (index: number) => {
    setUsers(users.filter((_, i) => i !== index));
  };

  const downloadTemplate = async () => {
    try {
      // Importar librería xlsx dinámicamente con fallback para diferentes formatos de módulo
      const xlsxModule = await import('xlsx');
      const XLSX = xlsxModule.default || xlsxModule;

      if (!XLSX || !XLSX.utils) {
        throw new Error('Estructura de la librería Excel no válida');
      }

      // Crear datos según el modo
      let data: any[];
      let fileName: string;

      if (processingMode === 'payments') {
        // Plantilla para procesar pagos
        data = [
          {
            identity_document: '12345678',
            paid: 'true',
            payment_date: '2025-01-15',
            amount: 50.0,
          },
          {
            identity_document: '87654321',
            paid: 'false',
            payment_date: '',
            amount: '',
          },
          {
            identity_document: '11223344',
            paid: 'si',
            payment_date: '2025-01-20',
            amount: 50.0,
          },
          {
            identity_document: '44332211',
            paid: 'no',
            payment_date: '',
            amount: '',
          },
          {
            identity_document: '99887766',
            paid: 'pagado',
            payment_date: '2025-01-25',
            amount: 50.0,
          },
        ];
        fileName = 'plantilla_pagos_mensualidad.xlsx';
      } else {
        // Plantilla para solo suspender/reactivar
        data = [
          {
            identity_document: '12345678',
            is_active: 'false',
          },
          {
            identity_document: '87654321',
            is_active: 'true',
          },
          {
            identity_document: '11223344',
            is_active: 'suspender',
          },
          {
            identity_document: '44332211',
            is_active: 'reactivar',
          },
        ];
        fileName = 'plantilla_suspender_reactivar_usuarios.xlsx';
      }

      // Crear workbook y worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Ajustar ancho de columnas
      const colWidths =
        processingMode === 'payments'
          ? [
              { wch: 20 }, // identity_document
              { wch: 15 }, // paid
              { wch: 15 }, // payment_date
              { wch: 12 }, // amount
            ]
          : [
              { wch: 20 }, // identity_document
              { wch: 15 }, // is_active
            ];
      ws['!cols'] = colWidths;

      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Datos');

      // Crear hoja de instrucciones
      const instructionsData =
        processingMode === 'payments'
          ? [
              ['INSTRUCCIONES PARA PLANTILLA DE PAGOS'],
              [''],
              ['Columnas requeridas:'],
              ['- identity_document: Documento de identidad del usuario (requerido)'],
              ['- paid: Indica si pagó la mensualidad (requerido)'],
              [''],
              ['Valores aceptados para "paid":'],
              ['- Pagó: true, 1, si, yes, pagado, paid, pago, sí'],
              ['- No pagó: false, 0, no, no pagado, unpaid, sin pago, pendiente, pending'],
              [''],
              ['Columnas opcionales:'],
              ['- payment_date: Fecha del pago (formato: YYYY-MM-DD)'],
              ['- amount: Monto pagado (número decimal)'],
              [''],
              ['Ejemplos:'],
              ['12345678 | true  | 2025-01-15 | 50.00'],
              ['87654321 | false |             |'],
              ['11223344 | si    | 2025-01-20 | 50.00'],
              [''],
              ['NOTA: Si paid = true/si/pagado → Usuario se activa/reactiva automáticamente'],
              ['      Si paid = false/no/no pagado → Usuario se suspende automáticamente'],
            ]
          : [
              ['INSTRUCCIONES PARA PLANTILLA DE SUSPENDER/REACTIVAR'],
              [''],
              ['Columnas requeridas:'],
              ['- identity_document: Documento de identidad del usuario (requerido)'],
              ['- is_active: Estado del usuario (requerido)'],
              [''],
              ['Valores aceptados para "is_active":'],
              ['- Activar/Reactivar: true, 1, activo, active, reactivar, reactivate'],
              ['- Suspender: false, 0, suspendido, suspended, suspender, suspend'],
              [''],
              ['Ejemplos:'],
              ['12345678 | false'],
              ['87654321 | true'],
              ['11223344 | suspender'],
              ['44332211 | reactivar'],
            ];

      const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
      wsInstructions['!cols'] = [{ wch: 80 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

      // Descargar archivo
      XLSX.writeFile(wb, fileName);

      alert(`✅ Plantilla Excel descargada: ${fileName}`);
    } catch (error: any) {
      console.error('Error generando plantilla Excel:', error);
      // Fallback a CSV si falla Excel
      const template =
        processingMode === 'payments'
          ? `identity_document,paid,payment_date,amount
12345678,true,2025-01-15,50.00
87654321,false,,
11223344,si,2025-01-20,50.00
44332211,no,,`
          : `identity_document,is_active
12345678,false
87654321,true
11223344,suspender
44332211,reactivar`;

      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const fileName =
        processingMode === 'payments'
          ? 'plantilla_pagos_mensualidad.csv'
          : 'plantilla_suspender_reactivar_usuarios.csv';
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(
        'Se descargó la plantilla en formato CSV. Para Excel, asegúrate de tener la librería xlsx instalada.'
      );
    }
  };

  const getStatusLabel = (status: boolean | string): string => {
    if (typeof status === 'boolean') {
      return status ? 'Reactivar' : 'Suspender';
    }
    const s = String(status).toLowerCase();
    if (s === 'true' || s === '1' || s === 'reactivar' || s === 'reactivate') {
      return 'Reactivar';
    }
    return 'Suspender';
  };

  const getStatusIcon = (status: boolean | string) => {
    const isActive =
      typeof status === 'boolean'
        ? status
        : !['false', '0', 'suspender', 'suspend'].includes(String(status).toLowerCase());

    return isActive ? (
      <IconCheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <IconBan className="w-5 h-5 text-red-600" />
    );
  };

  // Cargar información de pagos para usuarios
  const loadPaymentInfoForUsers = async (usersToLoad: SuspendReactivateUserData[]) => {
    setLoadingPaymentInfo(true);
    const newPaymentInfo = new Map(paymentInfo);

    try {
      await Promise.all(
        usersToLoad.map(async (user) => {
          if (user.identity_document) {
            try {
              const status = await paymentService.getPaymentStatusByIdentityDocument(
                user.identity_document
              );
              newPaymentInfo.set(user.identity_document, status);
            } catch (error) {
              console.warn(`Error cargando info de pago para ${user.identity_document}:`, error);
            }
          }
        })
      );

      setPaymentInfo(newPaymentInfo);
    } catch (error) {
      console.error('Error cargando información de pagos:', error);
    } finally {
      setLoadingPaymentInfo(false);
    }
  };

  // Cargar información de pagos cuando se agregan usuarios
  useEffect(() => {
    if (users.length > 0 && paymentInfo.size === 0) {
      loadPaymentInfoForUsers(users);
    }
  }, [users.length]);

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Suspender/Reactivar Usuarios Masivamente
            </h1>
            <p className="mt-2 text-gray-600">
              Importa un archivo CSV con documentos de identidad para suspender o reactivar usuarios
            </p>
          </div>

          {/* Modo de procesamiento */}
          <Card className="p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">Modo de Procesamiento</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="processingMode"
                  value="payments"
                  checked={processingMode === 'payments'}
                  onChange={(e) => setProcessingMode(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium">Procesar Pagos (Recomendado)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="processingMode"
                  value="suspend_reactivate"
                  checked={processingMode === 'suspend_reactivate'}
                  onChange={(e) => setProcessingMode(e.target.value as any)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium">Solo Suspender/Reactivar</span>
              </label>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {processingMode === 'payments'
                ? 'Registra los pagos y actualiza automáticamente el estado: si pagó → activo, si no pagó → suspendido'
                : 'Actualiza solo el estado sin registrar pagos'}
            </p>
          </Card>

          {/* Importar desde Excel/CSV */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Importar desde Excel o CSV</h2>

            {/* Importar desde Excel */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Importar archivo Excel (.xlsx, .xls)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFile}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              >
                <IconUpload className="w-5 h-5" />
                {loadingPaymentInfo ? 'Procesando...' : 'Seleccionar archivo Excel'}
              </label>
              <p className="text-xs text-gray-600 mt-2">
                El archivo Excel debe tener columnas: <code>identity_document</code> (o
                documento/ci/dni) y <code>paid</code> (o pagado/pago/mensualidad). Valores para
                paid: <code>true/false</code>, <code>si/no</code>, <code>pagado/no pagado</code>,{' '}
                <code>1/0</code>
              </p>
            </div>

            {/* O importar desde CSV */}
            <div className="border-t pt-4">
              <div className="mb-4">
                <Button
                  onClick={downloadTemplate}
                  variant="secondary"
                  className="flex items-center gap-2 mb-2"
                >
                  <IconDownload className="w-5 h-5" />
                  Descargar Plantilla Excel
                </Button>
                <p className="text-sm text-gray-600">
                  Descarga la plantilla Excel (.xlsx) con el formato correcto y ejemplos. Incluye
                  hoja de instrucciones detalladas.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pegar contenido CSV
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="identity_document,paid o identity_document,is_active"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={10}
                />
              </div>
              <div className="mt-4">
                <Button onClick={handleParseCSV} className="flex items-center gap-2">
                  <IconFileText className="w-5 h-5" />
                  Parsear CSV y Agregar a Lista
                </Button>
              </div>
            </div>
          </Card>

          {/* Lista de usuarios a procesar */}
          {users.length > 0 && (
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Usuarios a Procesar ({users.length})</h2>
                <Button
                  onClick={handleProcess}
                  disabled={processing}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
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
                {users.map((user, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(user.is_active)}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          Documento: {user.identity_document}
                        </div>
                        <div className="text-sm text-gray-600">
                          Acción:{' '}
                          {(() => {
                            // Si tiene campo paid, mostrar información de pago
                            if (user.paid !== undefined) {
                              const paid =
                                typeof user.paid === 'string'
                                  ? user.paid.toLowerCase()
                                  : String(user.paid);
                              const isPaid =
                                paid === 'true' ||
                                paid === '1' ||
                                paid === 'si' ||
                                paid === 'pagado' ||
                                paid === 'paid' ||
                                paid === 'pago' ||
                                paid === 'sí';
                              return isPaid ? '✅ Pagó - Reactivar' : '❌ No pagó - Suspender';
                            }
                            // Si no, usar is_active
                            return getStatusLabel(user.is_active);
                          })()}
                        </div>
                        {user.payment_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            Fecha pago: {user.payment_date}
                            {user.amount && ` • Monto: $${user.amount}`}
                          </div>
                        )}
                        {user.identity_document && paymentInfo.has(user.identity_document) && (
                          <div className="mt-1">
                            {(() => {
                              const paymentStatus = paymentInfo.get(user.identity_document)!;
                              if (paymentStatus.error) {
                                return (
                                  <span className="text-xs text-gray-500">
                                    Sin información de pago
                                  </span>
                                );
                              }
                              if (paymentStatus.has_unpaid_payments) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs">
                                    <IconDollarSign className="w-3 h-3" />
                                    {paymentStatus.unpaid_payments_count} pago(s) pendiente(s)
                                  </span>
                                );
                              }
                              if (paymentStatus.has_subscription) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                                    <IconCheckCircle className="w-3 h-3" />
                                    Al día con pagos
                                  </span>
                                );
                              }
                              return (
                                <span className="text-xs text-gray-500">
                                  Sin suscripción activa
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveUser(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
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
              <h2 className="text-xl font-semibold mb-4">Resultados de Procesamiento</h2>
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
                    .filter((r) => !r.success)
                    .map((resultItem, index) => (
                      <div key={index} className="p-2 bg-red-50 rounded text-sm">
                        <div className="font-medium">{resultItem.identity_document}</div>
                        <div className="text-red-600">{resultItem.error}</div>
                      </div>
                    ))}
                </div>
              )}
              {result.success_count > 0 && (
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                  <h3 className="font-medium text-green-600">Usuarios procesados exitosamente:</h3>
                  {result.results
                    .filter((r) => r.success)
                    .map((resultItem, index) => (
                      <div key={index} className="p-2 bg-green-50 rounded text-sm">
                        <div className="font-medium">{resultItem.identity_document}</div>
                        <div className="text-green-600">{resultItem.message}</div>
                        {resultItem.previous_status !== undefined &&
                          resultItem.new_status !== undefined && (
                            <div className="text-xs text-gray-600 mt-1">
                              Estado anterior:{' '}
                              {resultItem.previous_status ? 'Activo' : 'Suspendido'} → Estado nuevo:{' '}
                              {resultItem.new_status ? 'Activo' : 'Suspendido'}
                            </div>
                          )}
                      </div>
                    ))}
                </div>
              )}
            </Card>
          )}

          {/* Información importante */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <IconAlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">ℹ️ Información</h3>
                <p className="text-sm text-blue-800">
                  Los usuarios se identifican mediante su <strong>documento de identidad</strong>{' '}
                  (campo único). Asegúrate de que el documento de identidad esté correctamente
                  registrado en el sistema.
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  <strong>Valores aceptados para is_active:</strong> <code>true/false</code>,{' '}
                  <code>1/0</code>,<code>suspender/reactivar</code>, <code>suspend/reactivate</code>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminRoute>
  );
};

export default BulkSuspendReactivatePage;
