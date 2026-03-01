// services/paymentService.ts
// Servicio para gestión de pagos y suscripciones de estudiantes

import { supabase } from '@/lib/supabase';

export interface PaymentPlan {
  id: number;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentSubscription {
  id: number;
  student_id: string;
  payment_plan_id: number;
  status: 'active' | 'suspended' | 'cancelled' | 'expired';
  start_date: string;
  end_date?: string;
  next_payment_date?: string;
  auto_renew: boolean;
  suspension_reason?: string;
  created_at: string;
  updated_at: string;
  plan?: PaymentPlan;
}

export interface Payment {
  id: number;
  subscription_id: number;
  student_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_method?: string;
  payment_date?: string;
  due_date: string;
  paid_at?: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentStatus {
  has_subscription: boolean;
  subscription?: StudentSubscription;
  unpaid_payments_count: number;
  has_unpaid_payments: boolean;
  total_paid: number;
  next_payment_date?: string;
  is_payment_overdue: boolean;
  student_id?: string;
  error?: string;
}

export const paymentService = {
  // Obtener todos los planes de pago activos
  async getActivePaymentPlans(): Promise<PaymentPlan[]> {
    const { data, error } = await supabase
      .from('payment_plans')
      .select('*')
      .eq('is_active', true)
      .order('amount', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Obtener estado de pago de un estudiante por ID
  async getStudentPaymentStatus(studentId: string): Promise<PaymentStatus> {
    const { data, error } = await supabase
      .rpc('get_student_payment_status', { p_student_id: studentId });

    if (error) throw error;
    return data as PaymentStatus;
  },

  // Obtener estado de pago por documento de identidad
  async getPaymentStatusByIdentityDocument(identityDocument: string): Promise<PaymentStatus> {
    const { data, error } = await supabase
      .rpc('get_payment_status_by_identity_document', { 
        p_identity_document: identityDocument 
      });

    if (error) throw error;
    return data as PaymentStatus;
  },

  // Obtener suscripción de un estudiante
  async getStudentSubscription(studentId: string): Promise<StudentSubscription | null> {
    const { data, error } = await supabase
      .from('student_subscriptions')
      .select(`
        *,
        plan:payment_plans(*)
      `)
      .eq('student_id', studentId)
      .in('status', ['active', 'suspended'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }
    return data as StudentSubscription;
  },

  // Obtener pagos de un estudiante
  async getStudentPayments(studentId: string, status?: string): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('due_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Obtener pagos pendientes vencidos
  async getOverduePayments(studentId?: string): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select(`
        *,
        subscription:student_subscriptions(*),
        student:users(id, first_name, last_name, email, identity_document)
      `)
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Crear suscripción para un estudiante
  async createSubscription(
    studentId: string,
    paymentPlanId: number,
    startDate?: string
  ): Promise<StudentSubscription> {
    const start = startDate || new Date().toISOString().split('T')[0];
    
    // Calcular fecha de próximo pago según el ciclo
    const { data: plan } = await supabase
      .from('payment_plans')
      .select('billing_cycle')
      .eq('id', paymentPlanId)
      .single();

    if (!plan) throw new Error('Plan de pago no encontrado');

    let nextPaymentDate = new Date(start);
    switch (plan.billing_cycle) {
      case 'monthly':
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
        break;
      case 'yearly':
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
        break;
    }

    const { data, error } = await supabase
      .from('student_subscriptions')
      .insert({
        student_id: studentId,
        payment_plan_id: paymentPlanId,
        start_date: start,
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
        status: 'active'
      })
      .select(`
        *,
        plan:payment_plans(*)
      `)
      .single();

    if (error) throw error;
    return data as StudentSubscription;
  },

  // Registrar un pago
  async recordPayment(
    subscriptionId: number,
    studentId: string,
    amount: number,
    paymentDate: string,
    paymentMethod?: string,
    transactionId?: string
  ): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        subscription_id: subscriptionId,
        student_id: studentId,
        amount,
        payment_date: paymentDate,
        paid_at: new Date().toISOString(),
        status: 'paid',
        payment_method: paymentMethod,
        transaction_id: transactionId
      })
      .select()
      .single();

    if (error) throw error;

    // Actualizar próxima fecha de pago en suscripción
    const { data: subscription } = await supabase
      .from('student_subscriptions')
      .select('plan:payment_plans(billing_cycle)')
      .eq('id', subscriptionId)
      .single();

    if (subscription?.plan) {
      const nextPayment = new Date(paymentDate);
      switch (subscription.plan.billing_cycle) {
        case 'monthly':
          nextPayment.setMonth(nextPayment.getMonth() + 1);
          break;
        case 'quarterly':
          nextPayment.setMonth(nextPayment.getMonth() + 3);
          break;
        case 'yearly':
          nextPayment.setFullYear(nextPayment.getFullYear() + 1);
          break;
      }

      await supabase
        .from('student_subscriptions')
        .update({ next_payment_date: nextPayment.toISOString().split('T')[0] })
        .eq('id', subscriptionId);
    }

    return data as Payment;
  },

  // Obtener todos los estudiantes con información de pagos
  async getAllStudentsWithPaymentInfo(): Promise<Array<{
    student: any;
    payment_status: PaymentStatus;
  }>> {
    // Obtener todos los estudiantes con suscripciones
    const { data: subscriptions, error: subError } = await supabase
      .from('student_subscriptions')
      .select(`
        student_id,
        student:users(id, first_name, last_name, email, identity_document, is_active)
      `)
      .in('status', ['active', 'suspended']);

    if (subError) throw subError;

    // Para cada estudiante, obtener su estado de pago
    const results = await Promise.all(
      (subscriptions || []).map(async (sub) => {
        const paymentStatus = await this.getStudentPaymentStatus(sub.student_id);
        return {
          student: sub.student,
          payment_status: paymentStatus
        };
      })
    );

    return results;
  }
};

