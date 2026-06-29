import { supabase } from '../lib/supabase';
import type { Invoice, InvoiceFormData } from '../types';
import { generateInvoiceNumber } from '../lib/utils';

export const invoicesService = {
  getAll: async (search?: string, status?: string): Promise<Invoice[]> => {
    let query = supabase
      .from('invoices')
      .select('*, customer:customers(id, name, mobile, city), order:orders(id, order_number)')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,product_name.ilike.%${search}%`);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Invoice[];
  },

  getById: async (id: string): Promise<Invoice> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, customer:customers(*), order:orders(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Invoice;
  },

  create: async (invoice: InvoiceFormData): Promise<Invoice> => {
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    const invoiceNumber = generateInvoiceNumber((count || 0) + 1);
    const { data, error } = await supabase
      .from('invoices')
      .insert({ ...invoice, invoice_number: invoiceNumber })
      .select('*, customer:customers(*), order:orders(*)')
      .single();
    if (error) throw error;
    return data as Invoice;
  },

  update: async (id: string, updates: Partial<InvoiceFormData>): Promise<Invoice> => {
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select('*, customer:customers(*), order:orders(*)')
      .single();
    if (error) throw error;
    return data as Invoice;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  },

  updateStatus: async (id: string, status: Invoice['status']): Promise<void> => {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (error) throw error;
  },

  createFromOrder: async (orderId: string): Promise<Invoice> => {
    const { data: order, error: oError } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('id', orderId)
      .single();
    if (oError) throw oError;

    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    const invoiceNumber = generateInvoiceNumber((count || 0) + 1);

    const subtotal = order.total_amount;
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        order_id: orderId,
        customer_id: order.customer_id,
        product_name: order.product_name,
        description: order.description,
        quantity: order.quantity,
        unit: order.unit,
        unit_price: subtotal / order.quantity,
        subtotal,
        tax_percentage: 0,
        tax_amount: 0,
        discount: 0,
        total_amount: subtotal,
        advance_paid: order.advance_amount || 0,
        remaining_amount: order.remaining_amount || subtotal,
        status: order.remaining_amount <= 0 ? 'paid' : order.advance_amount > 0 ? 'partial' : 'unpaid',
      })
      .select('*, customer:customers(*), order:orders(*)')
      .single();
    if (error) throw error;
    return data as Invoice;
  },
};
