import { supabase } from '../lib/supabase';
import type { Customer, CustomerFormData } from '../types';

export const customersService = {
  getAll: async (search?: string): Promise<Customer[]> => {
    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile.ilike.%${search}%,city.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Customer[];
  },

  getById: async (id: string): Promise<Customer> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Customer;
  },

  create: async (customer: CustomerFormData): Promise<Customer> => {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  },

  update: async (id: string, updates: Partial<CustomerFormData>): Promise<Customer> => {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  },

  getStats: async (customerId: string) => {
    const [quotations, orders, payments] = await Promise.all([
      supabase.from('quotations').select('id, total_amount, status').eq('customer_id', customerId),
      supabase.from('orders').select('id, total_amount, status, remaining_amount').eq('customer_id', customerId),
      supabase.from('payments').select('id, amount').eq('customer_id', customerId),
    ]);

    const totalOrders = orders.data?.length || 0;
    const totalRevenue = orders.data?.reduce((sum, o) => sum + o.total_amount, 0) || 0;
    const outstandingBalance = orders.data?.reduce((sum, o) => sum + (o.remaining_amount || 0), 0) || 0;

    return { totalOrders, totalRevenue, outstandingBalance, quotationCount: quotations.data?.length || 0 };
  },
};
