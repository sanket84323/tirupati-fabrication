import { supabase } from '../lib/supabase';
import type { Expense, ExpenseFormData } from '../types';
import { generateExpenseNumber } from '../lib/utils';
import dayjs from 'dayjs';

export const expensesService = {
  getAll: async (search?: string, category?: string, dateRange?: { from: string; to: string }): Promise<Expense[]> => {
    let query = supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (search) {
      query = query.or(`expense_number.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (dateRange) {
      query = query.gte('date', dateRange.from).lte('date', dateRange.to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Expense[];
  },

  getById: async (id: string): Promise<Expense> => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Expense;
  },

  create: async (expense: ExpenseFormData): Promise<Expense> => {
    const { count } = await supabase.from('expenses').select('*', { count: 'exact', head: true });
    const expenseNumber = generateExpenseNumber((count || 0) + 1);
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...expense, expense_number: expenseNumber })
      .select()
      .single();
    if (error) throw error;
    return data as Expense;
  },

  update: async (id: string, updates: Partial<ExpenseFormData>): Promise<Expense> => {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Expense;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  uploadReceipt: async (expenseId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `expense-receipts/${expenseId}.${ext}`;
    const { error } = await supabase.storage.from('expense-receipts').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('expense-receipts').getPublicUrl(path);
    return data.publicUrl;
  },

  getMonthlyTotal: async (month: string): Promise<number> => {
    const startDate = `${month}-01`;
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;
    return (data as { amount: number }[]).reduce((sum, e) => sum + e.amount, 0);
  },

  getCategoryTotals: async (month: string): Promise<{ category: string; total: number }[]> => {
    const startDate = `${month}-01`;
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
    const { data, error } = await supabase
      .from('expenses')
      .select('category, amount')
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;

    const totals: Record<string, number> = {};
    (data as { category: string; amount: number }[]).forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

    return Object.entries(totals).map(([category, total]) => ({ category, total }));
  },
};
