import { supabase } from '../lib/supabase';
import type { InventoryItem, InventoryFormData, StockHistory } from '../types';

export const inventoryService = {
  getAll: async (search?: string, category?: string): Promise<InventoryItem[]> => {
    let query = supabase
      .from('inventory')
      .select('*')
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,supplier.ilike.%${search}%`);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as InventoryItem[];
  },

  getLowStock: async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .filter('quantity_available', 'lte', 'minimum_stock');
    if (error) throw error;
    // Filter in JS since Supabase doesn't support column comparisons in filter
    const allItems = data as InventoryItem[];
    return allItems.filter(item => item.quantity_available <= item.minimum_stock);
  },

  getById: async (id: string): Promise<InventoryItem> => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as InventoryItem;
  },

  create: async (item: InventoryFormData): Promise<InventoryItem> => {
    const { data, error } = await supabase
      .from('inventory')
      .insert(item)
      .select()
      .single();
    if (error) throw error;
    return data as InventoryItem;
  },

  update: async (id: string, updates: Partial<InventoryFormData>): Promise<InventoryItem> => {
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as InventoryItem;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) throw error;
  },

  adjustStock: async (
    id: string,
    action: 'add' | 'reduce' | 'adjust',
    quantity: number,
    notes?: string
  ): Promise<InventoryItem> => {
    const current = await inventoryService.getById(id);
    let newQuantity: number;

    if (action === 'add') {
      newQuantity = current.quantity_available + quantity;
    } else if (action === 'reduce') {
      newQuantity = Math.max(0, current.quantity_available - quantity);
    } else {
      newQuantity = quantity;
    }

    // Update inventory quantity
    const { data, error } = await supabase
      .from('inventory')
      .update({ quantity_available: newQuantity })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Record history
    await supabase.from('stock_history').insert({
      inventory_id: id,
      action,
      quantity,
      previous_quantity: current.quantity_available,
      new_quantity: newQuantity,
      notes,
    });

    return data as InventoryItem;
  },

  getStockHistory: async (inventoryId: string): Promise<StockHistory[]> => {
    const { data, error } = await supabase
      .from('stock_history')
      .select('*')
      .eq('inventory_id', inventoryId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as StockHistory[];
  },
};
