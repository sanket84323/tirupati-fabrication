import { supabase } from '../lib/supabase';
import type { Order, OrderFormData, OrderImage } from '../types';
import { generateOrderNumber } from '../lib/utils';

export const ordersService = {
  getAll: async (search?: string, status?: string): Promise<Order[]> => {
    let query = supabase
      .from('orders')
      .select('*, customer:customers(id, name, mobile), order_workers(worker:workers(id, name, worker_id))')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,product_name.ilike.%${search}%`);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Map order_workers to workers array
    const mapped = (data || []).map((order: any) => ({
      ...order,
      workers: order.order_workers?.map((ow: any) => ow.worker).filter(Boolean) || []
    }));
    return mapped as unknown as Order[];
  },

  getById: async (id: string): Promise<Order> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(*), order_workers(worker:workers(*))')
      .eq('id', id)
      .single();
    if (error) throw error;
    
    // Map order_workers to workers array
    const mapped = {
      ...data,
      workers: data.order_workers?.map((ow: any) => ow.worker).filter(Boolean) || []
    };
    return mapped as unknown as Order;
  },

  create: async (orderData: OrderFormData & { worker_ids?: string[] }): Promise<Order> => {
    const { worker_ids, ...order } = orderData;
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const orderNumber = generateOrderNumber((count || 0) + 1);
    
    const { data, error } = await supabase
      .from('orders')
      .insert({ ...order, order_number: orderNumber })
      .select()
      .single();
    if (error) throw error;

    // Insert order_workers assignments
    if (worker_ids && worker_ids.length > 0) {
      const assignments = worker_ids.map(workerId => ({
        order_id: data.id,
        worker_id: workerId
      }));
      const { error: assignError } = await supabase.from('order_workers').insert(assignments);
      if (assignError) throw assignError;
    }

    return ordersService.getById(data.id);
  },

  update: async (id: string, updates: Partial<OrderFormData> & { worker_ids?: string[] }): Promise<Order> => {
    const { worker_ids, ...orderUpdates } = updates;
    const { data, error } = await supabase
      .from('orders')
      .update(orderUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Update order_workers assignments if worker_ids is provided
    if (worker_ids !== undefined) {
      await supabase.from('order_workers').delete().eq('order_id', id);
      if (worker_ids.length > 0) {
        const assignments = worker_ids.map(workerId => ({
          order_id: id,
          worker_id: workerId
        }));
        const { error: assignError } = await supabase.from('order_workers').insert(assignments);
        if (assignError) throw assignError;
      }
    }

    return ordersService.getById(id);
  },

  updateStatus: async (id: string, status: Order['status'], progress?: number): Promise<void> => {
    const updates: Record<string, unknown> = { status };
    if (progress !== undefined) updates.progress_percentage = progress;
    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (error) throw error;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
  },

  // Order images
  getImages: async (orderId: string): Promise<OrderImage[]> => {
    const { data, error } = await supabase
      .from('order_images')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as OrderImage[];
  },

  uploadImage: async (orderId: string, file: File, caption?: string, stage: 'progress' | 'completed' = 'progress'): Promise<OrderImage> => {
    const ext = file.name.split('.').pop();
    const path = `order-photos/${orderId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('order-photos').upload(path, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('order-photos').getPublicUrl(path);
    const { data, error } = await supabase
      .from('order_images')
      .insert({ order_id: orderId, image_url: urlData.publicUrl, caption, stage })
      .select()
      .single();
    if (error) throw error;
    return data as OrderImage;
  },

  deleteImage: async (imageId: string): Promise<void> => {
    const { error } = await supabase.from('order_images').delete().eq('id', imageId);
    if (error) throw error;
  },

  // Create order from quotation
  createFromQuotation: async (quotationId: string): Promise<Order> => {
    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', quotationId)
      .single();
    if (qError) throw qError;

    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const orderNumber = generateOrderNumber((count || 0) + 1);

    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: quotation.customer_id,
        quotation_id: quotationId,
        product_name: quotation.product_name,
        description: quotation.description,
        quantity: quotation.quantity,
        unit: quotation.unit,
        total_amount: quotation.total_amount,
        advance_amount: 0,
        total_received: 0,
        remaining_amount: quotation.total_amount,
        notes: quotation.notes,
        status: 'pending',
      })
      .select('*, customer:customers(*), worker:workers(*)')
      .single();
    if (error) throw error;

    // Mark quotation as approved
    await supabase.from('quotations').update({ status: 'approved' }).eq('id', quotationId);

    return data as Order;
  },

  getTodayDeliveries: async (): Promise<Order[]> => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(name, mobile)')
      .eq('delivery_date', today)
      .not('status', 'eq', 'delivered')
      .not('status', 'eq', 'cancelled');
    if (error) throw error;
    return data as Order[];
  },

  getProfit: async (orderId: string): Promise<any | null> => {
    const { data, error } = await supabase
      .from('order_profits')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  saveProfit: async (profitData: any): Promise<any> => {
    const { data, error } = await supabase
      .from('order_profits')
      .upsert(profitData, { onConflict: 'order_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
