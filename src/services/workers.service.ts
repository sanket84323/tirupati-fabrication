import { supabase } from '../lib/supabase';
import type { Worker, WorkerFormData } from '../types';
import { generateWorkerId } from '../lib/utils';

export const workersService = {
  getAll: async (search?: string, status?: string): Promise<Worker[]> => {
    let query = supabase
      .from('workers')
      .select('*')
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile.ilike.%${search}%,worker_id.ilike.%${search}%`);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Worker[];
  },

  getById: async (id: string): Promise<Worker> => {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Worker;
  },

  create: async (worker: Omit<WorkerFormData, 'worker_id'>): Promise<Worker> => {
    const { count } = await supabase.from('workers').select('*', { count: 'exact', head: true });
    const workerId = generateWorkerId((count || 0) + 1);
    const { data, error } = await supabase
      .from('workers')
      .insert({ ...worker, worker_id: workerId })
      .select()
      .single();
    if (error) throw error;
    return data as Worker;
  },

  update: async (id: string, updates: Partial<WorkerFormData>): Promise<Worker> => {
    const { data, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Worker;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('workers').delete().eq('id', id);
    if (error) throw error;
  },

  uploadPhoto: async (workerId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `avatars/worker-${workerId}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  },

  getAssignedOrders: async (workerId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, product_name, status, delivery_date, customer:customers(name)')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};
