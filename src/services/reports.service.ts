import { supabase } from '../lib/supabase';
import type { DashboardStats, MonthlyData } from '../types';
import dayjs from 'dayjs';

export const reportsService = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const today = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');

    const [
      todayOrders,
      pendingOrders,
      completedOrders,
      monthlyPayments,
      monthlyExpenses,
      lowStockItems,
      pendingPaymentOrders,
    ] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('created_at::date', today),
      supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
      supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['delivered']),
      supabase.from('payments').select('amount').gte('payment_date', monthStart).lte('payment_date', monthEnd).eq('status', 'paid'),
      supabase.from('expenses').select('amount').gte('date', monthStart).lte('date', monthEnd),
      supabase.from('inventory').select('id, quantity_available, minimum_stock'),
      supabase.from('orders').select('remaining_amount').gt('remaining_amount', 0).not('status', 'eq', 'cancelled'),
    ]);

    const monthlyRevenue = (monthlyPayments.data || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
    const monthlyExpenseTotal = (monthlyExpenses.data || []).reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
    const lowStock = (lowStockItems.data || []).filter((i: { quantity_available: number; minimum_stock: number }) => i.quantity_available <= i.minimum_stock).length;
    const pendingPaymentsCount = (pendingPaymentOrders.data || []).length;

    return {
      todayOrders: todayOrders.count || 0,
      pendingOrders: pendingOrders.count || 0,
      completedOrders: completedOrders.count || 0,
      pendingPayments: pendingPaymentsCount,
      monthlyRevenue,
      monthlyExpenses: monthlyExpenseTotal,
      currentProfit: monthlyRevenue - monthlyExpenseTotal,
      lowStockItems: lowStock,
    };
  },

  getMonthlyData: async (months = 6): Promise<MonthlyData[]> => {
    const result: MonthlyData[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = dayjs().subtract(i, 'month');
      const monthStr = monthDate.format('YYYY-MM');
      const startDate = `${monthStr}-01`;
      const endDate = monthDate.endOf('month').format('YYYY-MM-DD');

      const [payments, expenses] = await Promise.all([
        supabase.from('payments').select('amount').gte('payment_date', startDate).lte('payment_date', endDate).eq('status', 'paid'),
        supabase.from('expenses').select('amount').gte('date', startDate).lte('date', endDate),
      ]);

      const revenue = (payments.data || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
      const expense = (expenses.data || []).reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);

      result.push({
        month: monthDate.format('MMM YY'),
        revenue,
        expenses: expense,
        profit: revenue - expense,
      });
    }

    return result;
  },

  getOrdersByStatus: async () => {
    const statuses = ['pending', 'in_progress', 'ready', 'delivered', 'cancelled'];
    const colors = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444'];

    const results = await Promise.all(
      statuses.map(status =>
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', status)
      )
    );

    return statuses.map((status, i) => ({
      status: status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      count: results[i].count || 0,
      color: colors[i],
    }));
  },

  getTopCustomers: async (limit = 5) => {
    const { data, error } = await supabase
      .from('orders')
      .select('customer_id, total_amount, customer:customers(name)')
      .not('status', 'eq', 'cancelled');

    if (error) throw error;

    const customerTotals: Record<string, { name: string; total: number; orders: number }> = {};
    (data as any[] || []).forEach((o: any) => {
      const customerName = Array.isArray(o.customer)
        ? o.customer[0]?.name
        : o.customer?.name || 'Unknown';
      if (!customerTotals[o.customer_id]) {
        customerTotals[o.customer_id] = {
          name: customerName,
          total: 0,
          orders: 0,
        };
      }
      customerTotals[o.customer_id].total += o.total_amount;
      customerTotals[o.customer_id].orders += 1;
    });

    return Object.entries(customerTotals)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  },

  getSalesReport: async (from: string, to: string) => {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, customer:customers(name)')
      .gte('created_at', from)
      .lte('created_at', to)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return orders;
  },

  getExpenseReport: async (from: string, to: string) => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  },

  getInventoryReport: async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('category', { ascending: true });
    if (error) throw error;
    return data;
  },
};
