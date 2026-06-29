import { supabase } from '../lib/supabase';
import type { Payment, PaymentFormData } from '../types';
import { generatePaymentNumber } from '../lib/utils';
import dayjs from 'dayjs';

export const paymentsService = {
  getAll: async (search?: string, status?: string): Promise<Payment[]> => {
    let query = supabase
      .from('payments')
      .select('*, customer:customers(id, name, mobile), order:orders(id, order_number), invoice:invoices(id, invoice_number)')
      .order('payment_date', { ascending: false });

    if (search) {
      query = query.or(`payment_number.ilike.%${search}%,reference_number.ilike.%${search}%`);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Payment[];
  },

  getByOrderId: async (orderId: string): Promise<Payment[]> => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('payment_date', { ascending: true });
    if (error) throw error;
    return data as Payment[];
  },

  getById: async (id: string): Promise<Payment> => {
    const { data, error } = await supabase
      .from('payments')
      .select('*, customer:customers(*), order:orders(*), invoice:invoices(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Payment;
  },

  create: async (payment: PaymentFormData): Promise<Payment> => {
    const { count } = await supabase.from('payments').select('*', { count: 'exact', head: true });
    const paymentNumber = generatePaymentNumber((count || 0) + 1);
    const { data, error } = await supabase
      .from('payments')
      .insert({ ...payment, payment_number: paymentNumber })
      .select('*, customer:customers(*), order:orders(*)')
      .single();
    if (error) throw error;

    // Recalculate total_received as sum of ALL installments for this order
    if (payment.order_id) {
      const { data: order } = await supabase
        .from('orders')
        .select('total_amount, advance_amount')
        .eq('id', payment.order_id)
        .single();

      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('order_id', payment.order_id);

      if (order && allPayments) {
        const totalReceived = Math.round(allPayments.reduce((sum, p) => sum + (p.amount || 0), 0) * 100) / 100;
        const remaining = Math.round(Math.max(0, order.total_amount - totalReceived) * 100) / 100;
        await supabase
          .from('orders')
          .update({ total_received: totalReceived, remaining_amount: remaining })
          .eq('id', payment.order_id);
          
        // Sync linked invoices
        const { data: linkedInvoices } = await supabase
          .from('invoices')
          .select('id, total_amount')
          .eq('order_id', payment.order_id);
          
        if (linkedInvoices) {
          for (const inv of linkedInvoices) {
             const invRemaining = Math.round(Math.max(0, inv.total_amount - totalReceived) * 100) / 100;
             const invStatus = totalReceived >= inv.total_amount ? 'paid' : totalReceived > 0 ? 'partial' : 'unpaid';
             await supabase
               .from('invoices')
               .update({ advance_paid: totalReceived, remaining_amount: invRemaining, status: invStatus })
               .eq('id', inv.id);
          }
        }
      }
    }

    return data as Payment;
  },

  update: async (id: string, updates: Partial<PaymentFormData>): Promise<Payment> => {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select('*, customer:customers(*)')
      .single();
    if (error) throw error;
    return data as Payment;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;
  },

  deleteAndRecalculate: async (id: string, orderId: string, orderTotalAmount: number): Promise<void> => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;

    // Recalculate total_received from remaining installments
    const { data: remaining } = await supabase
      .from('payments')
      .select('amount')
      .eq('order_id', orderId);

    const totalReceived = Math.round((remaining || []).reduce((sum, p) => sum + (p.amount || 0), 0) * 100) / 100;
    const remainingAmount = Math.round(Math.max(0, orderTotalAmount - totalReceived) * 100) / 100;
    await supabase
      .from('orders')
      .update({ total_received: totalReceived, remaining_amount: remainingAmount })
      .eq('id', orderId);
      
    // Sync linked invoices
    const { data: linkedInvoices } = await supabase
      .from('invoices')
      .select('id, total_amount')
      .eq('order_id', orderId);
      
    if (linkedInvoices) {
      for (const inv of linkedInvoices) {
         const invRemaining = Math.round(Math.max(0, inv.total_amount - totalReceived) * 100) / 100;
         const invStatus = totalReceived >= inv.total_amount ? 'paid' : totalReceived > 0 ? 'partial' : 'unpaid';
         await supabase
           .from('invoices')
           .update({ advance_paid: totalReceived, remaining_amount: invRemaining, status: invStatus })
           .eq('id', inv.id);
      }
    }
  },

  getOutstanding: async (): Promise<Payment[]> => {
    const { data, error } = await supabase
      .from('payments')
      .select('*, customer:customers(name, mobile)')
      .eq('status', 'pending')
      .order('payment_date', { ascending: true });
    if (error) throw error;
    return data as Payment[];
  },

  getMonthlyTotal: async (month: string): Promise<number> => {
    const startDate = `${month}-01`;
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .eq('status', 'paid');
    if (error) throw error;
    return (data as { amount: number }[]).reduce((sum, p) => sum + p.amount, 0);
  },
};
