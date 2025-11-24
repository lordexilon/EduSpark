// pages/StudentPaymentManagementPage.tsx
// Página para gestión de pagos y suscripciones de estudiantes

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { paymentService, PaymentStatus, Payment, StudentSubscription, PaymentPlan } from '../services/paymentService';
import Card from '../components/Card';
import Button from '../components/Button';
import { IconDollarSign, IconCheckCircle, IconXCircle, IconAlertTriangle, IconRefreshCw, IconBan, IconCheck } from '../components/Icons';
import AdminRoute from '../components/AdminRoute';

const StudentPaymentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentsWithPayments, setStudentsWithPayments] = useState<Array<{
    student: any;
    payment_status: PaymentStatus;
  }>>([]);
  const [overduePayments, setOverduePayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'active' | 'suspended'>('all');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentPayments, setStudentPayments] = useState<Payment[]>([]);
  const [studentSubscription, setStudentSubscription] = useState<StudentSubscription | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar estudiantes con información de pagos
      const students = await paymentService.getAllStudentsWithPaymentInfo();
      setStudentsWithPayments(students);
      
      // Cargar pagos vencidos
      const overdue = await paymentService.getOverduePayments();
      setOverduePayments(overdue);
    } catch (error: any) {
      console.error('Error cargando datos de pagos:', error);
      alert('Error al cargar información de pagos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetails = async (studentId: string) => {
    try {
      const [subscription, payments] = await Promise.all([
        paymentService.getStudentSubscription(studentId),
        paymentService.getStudentPayments(studentId)
      ]);
      
      setStudentSubscription(subscription);
      setStudentPayments(payments);
      setSelectedStudent(studentId);
    } catch (error: any) {
      console.error('Error cargando detalles del estudiante:', error);
      alert('Error al cargar detalles: ' + error.message);
    }
  };

  const getFilteredStudents = () => {
    if (filter === 'all') return studentsWithPayments;
    if (filter === 'overdue') {
      return studentsWithPayments.filter(s => s.payment_status.has_unpaid_payments);
    }
    if (filter === 'active') {
      return studentsWithPayments.filter(s => 
        s.payment_status.subscription?.status === 'active' && 
        !s.payment_status.has_unpaid_payments
      );
    }
    if (filter === 'suspended') {
      return studentsWithPayments.filter(s => 
        s.payment_status.subscription?.status === 'suspended' ||
        !s.student.is_active
      );
    }
    return studentsWithPayments;
  };

  const getStatusBadge = (paymentStatus: PaymentStatus) => {
    if (paymentStatus.error) {
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
          Sin información
        </span>
      );
    }
    
    if (paymentStatus.has_unpaid_payments) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
          ⚠️ {paymentStatus.unpaid_payments_count} pago(s) pendiente(s)
        </span>
      );
    }
    
    if (paymentStatus.subscription?.status === 'suspended') {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
          Suspendido
        </span>
      );
    }
    
    if (paymentStatus.has_subscription && paymentStatus.subscription?.status === 'active') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
          ✓ Al día
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
        Sin suscripción
      </span>
    );
  };

  if (loading) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Pagos de Estudiantes</h1>
                <p className="mt-2 text-gray-600">
                  Administra suscripciones, pagos y vincula con suspensión/reactivación
                </p>
              </div>
              <Button
                onClick={loadData}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <IconRefreshCw className="w-5 h-5" />
                Actualizar
              </Button>
            </div>
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Estudiantes</p>
                  <p className="text-2xl font-bold text-gray-900">{studentsWithPayments.length}</p>
                </div>
                <IconDollarSign className="w-8 h-8 text-blue-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pagos Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{overduePayments.length}</p>
                </div>
                <IconAlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Al Día</p>
                  <p className="text-2xl font-bold text-green-600">
                    {studentsWithPayments.filter(s => 
                      s.payment_status.has_subscription && 
                      !s.payment_status.has_unpaid_payments &&
                      s.payment_status.subscription?.status === 'active'
                    ).length}
                  </p>
                </div>
                <IconCheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Suspendidos</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {studentsWithPayments.filter(s => 
                      s.payment_status.subscription?.status === 'suspended' ||
                      !s.student.is_active
                    ).length}
                  </p>
                </div>
                <IconBan className="w-8 h-8 text-yellow-600" />
              </div>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filtrar:</span>
              <Button
                variant={filter === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={filter === 'overdue' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter('overdue')}
              >
                Pagos Vencidos
              </Button>
              <Button
                variant={filter === 'active' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter('active')}
              >
                Al Día
              </Button>
              <Button
                variant={filter === 'suspended' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter('suspended')}
              >
                Suspendidos
              </Button>
            </div>
          </Card>

          {/* Lista de estudiantes */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Estudiantes ({getFilteredStudents().length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {getFilteredStudents().map((item, index) => (
                <div
                  key={item.student.id || index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => loadStudentDetails(item.student.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {item.student.first_name} {item.student.last_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {item.student.email}
                        {item.student.identity_document && (
                          <span className="ml-2">• CI: {item.student.identity_document}</span>
                        )}
                      </div>
                      {item.payment_status.subscription && (
                        <div className="text-xs text-gray-500 mt-1">
                          Plan: {item.payment_status.subscription.plan?.name || 'N/A'} • 
                          Próximo pago: {item.payment_status.next_payment_date || 'N/A'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(item.payment_status)}
                      {!item.student.is_active && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          Usuario suspendido
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Detalles del estudiante seleccionado */}
          {selectedStudent && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Detalles de Pago</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentPayments([]);
                    setStudentSubscription(null);
                  }}
                >
                  Cerrar
                </Button>
              </div>

              {studentSubscription && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Suscripción</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Plan:</span>
                      <span className="ml-2 font-medium">{studentSubscription.plan?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Estado:</span>
                      <span className={`ml-2 font-medium ${
                        studentSubscription.status === 'active' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {studentSubscription.status === 'active' ? 'Activa' : 'Suspendida'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Fecha inicio:</span>
                      <span className="ml-2 font-medium">{studentSubscription.start_date}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Próximo pago:</span>
                      <span className="ml-2 font-medium">{studentSubscription.next_payment_date || 'N/A'}</span>
                    </div>
                    {studentSubscription.suspension_reason && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Razón suspensión:</span>
                        <span className="ml-2 font-medium text-yellow-600">
                          {studentSubscription.suspension_reason}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Historial de Pagos</h3>
                <div className="space-y-2">
                  {studentPayments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay pagos registrados</p>
                  ) : (
                    studentPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            ${payment.amount} {payment.currency}
                          </div>
                          <div className="text-sm text-gray-600">
                            Vencimiento: {payment.due_date}
                            {payment.payment_date && ` • Pagado: ${payment.payment_date}`}
                          </div>
                        </div>
                        <div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status === 'paid' ? 'Pagado' :
                             payment.status === 'pending' ? 'Pendiente' :
                             payment.status === 'failed' ? 'Fallido' :
                             payment.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Información */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <IconAlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">ℹ️ Información</h3>
                <p className="text-sm text-blue-800">
                  Los estudiantes con pagos vencidos pueden ser suspendidos automáticamente.
                  Al reactivar un estudiante, su suscripción también se reactiva si estaba suspendida por falta de pago.
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  <strong>Nota:</strong> Esta funcionalidad está preparada para integración futura con pasarelas de pago.
                  Los pagos pueden registrarse manualmente o mediante webhooks de sistemas de pago.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminRoute>
  );
};

export default StudentPaymentManagementPage;

