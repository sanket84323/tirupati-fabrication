import { supabase } from '../lib/supabase';
import type { Quotation, QuotationFormData } from '../types';
import { generateQuotationNumber } from '../lib/utils';

export const quotationsService = {
  getAll: async (search?: string, status?: string): Promise<Quotation[]> => {
    let query = supabase
      .from('quotations')
      .select('*, customer:customers(id, name, mobile, city)')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`quotation_number.ilike.%${search}%,product_name.ilike.%${search}%`);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Quotation[];
  },

  getById: async (id: string): Promise<Quotation> => {
    const { data, error } = await supabase
      .from('quotations')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Quotation;
  },

  create: async (quotation: QuotationFormData): Promise<Quotation> => {
    const { count } = await supabase.from('quotations').select('*', { count: 'exact', head: true });
    const quotationNumber = generateQuotationNumber((count || 0) + 1);
    const { data, error } = await supabase
      .from('quotations')
      .insert({ ...quotation, quotation_number: quotationNumber })
      .select('*, customer:customers(*)')
      .single();
    if (error) throw error;
    return data as Quotation;
  },

  update: async (id: string, updates: Partial<QuotationFormData>): Promise<Quotation> => {
    const { data, error } = await supabase
      .from('quotations')
      .update(updates)
      .eq('id', id)
      .select('*, customer:customers(*)')
      .single();
    if (error) throw error;
    return data as Quotation;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('quotations').delete().eq('id', id);
    if (error) throw error;
  },

  duplicate: async (id: string): Promise<Quotation> => {
    const original = await quotationsService.getById(id);
    const { count } = await supabase.from('quotations').select('*', { count: 'exact', head: true });
    const quotationNumber = generateQuotationNumber((count || 0) + 1);
    const { id: _id, created_at, updated_at, customer, quotation_number: _qn, ...rest } = original;
    const { data, error } = await supabase
      .from('quotations')
      .insert({ ...rest, quotation_number: quotationNumber, status: 'draft' })
      .select('*, customer:customers(*)')
      .single();
    if (error) throw error;
    return data as Quotation;
  },

  convertToOrder: async (quotationId: string): Promise<void> => {
    const { error } = await supabase
      .from('quotations')
      .update({ status: 'approved' })
      .eq('id', quotationId);
    if (error) throw error;
  },
};
