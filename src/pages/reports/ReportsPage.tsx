import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import BarChartIcon from '@mui/icons-material/BarChart';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import { reportsService } from '../../services/reports.service';
import { formatCurrency } from '../../lib/utils';

const EXPENSE_COLORS: Record<string, string> = {
  material_purchase: '#3b82f6', electricity: '#f59e0b', gas_cylinder: '#f97316',
  fuel: '#ef4444', tea: '#d97706', transport: '#8b5cf6', machine_repair: '#6b7280', miscellaneous: '#94a3b8',
};

export default function ReportsPage() {
  const [period, setPeriod] = useState<3 | 6 | 12>(6);
  const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));

  const { data: monthlyData } = useQuery({
    queryKey: ['monthly-data', period],
    queryFn: () => reportsService.getMonthlyData(period),
  });

  const { data: orderStatusData } = useQuery({
    queryKey: ['orders-by-status'],
    queryFn: reportsService.getOrdersByStatus,
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportsService.getDashboardStats,
  });

  const { data: expenseCategoryData } = useQuery({
    queryKey: ['expense-report', dateFrom, dateTo],
    queryFn: () => reportsService.getExpenseReport(dateFrom, dateTo),
    select: (data) => {
      const totals: Record<string, number> = {};
      (data || []).forEach((e: { category: string; amount: number }) => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
      });
      return Object.entries(totals).map(([name, value]) => ({ name, value }));
    },
  });

  const currentMonthRevenue = monthlyData?.[monthlyData.length - 1]?.revenue || 0;
  const currentMonthExpenses = monthlyData?.[monthlyData.length - 1]?.expenses || 0;
  const currentMonthProfit = currentMonthRevenue - currentMonthExpenses;
  const profitMargin = currentMonthRevenue > 0 ? ((currentMonthProfit / currentMonthRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Business insights at a glance</p>
        </div>
        <div className="flex gap-2">
          {([3, 6, 12] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p ? 'bg-primary-700 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
              {p}M
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'This Month Revenue', value: formatCurrency(stats?.monthlyRevenue || 0), color: 'text-blue-600 dark:text-blue-400' },
          { label: 'This Month Expenses', value: formatCurrency(stats?.monthlyExpenses || 0), color: 'text-red-600 dark:text-red-400' },
          { label: 'Net Profit', value: formatCurrency(stats?.currentProfit || 0), color: (stats?.currentProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600' },
          { label: 'Profit Margin', value: `${profitMargin}%`, color: 'text-purple-600 dark:text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue vs Expenses */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Revenue vs Expenses — Last {period} Months</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData || []} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={orderStatusData || []} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="status" label={(entry: any) => `${entry.status}: ${entry.count}`} labelLine={false}>
                {(orderStatusData || []).map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Categories */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Expense by Category</h3>
            <div className="flex items-center gap-2 text-xs">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input text-xs py-1" />
              <span className="text-gray-400">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input text-xs py-1" />
            </div>
          </div>
          {expenseCategoryData && expenseCategoryData.length > 0 ? (
            <div className="space-y-3">
              {expenseCategoryData.sort((a, b) => b.value - a.value).map(({ name, value }) => {
                const total = expenseCategoryData.reduce((s, e) => s + e.value, 0);
                const pct = total > 0 ? (value / total * 100).toFixed(1) : '0';
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{name.replace('_', ' ')}</span>
                      <span className="font-medium">{formatCurrency(value)} <span className="text-gray-400 text-xs">({pct}%)</span></span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: EXPENSE_COLORS[name] || '#6b7280' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-center text-gray-400 py-8 text-sm">No expense data for this period</p>}
        </div>
      </div>

      {/* Profit trend */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-5">Profit Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthlyData || []}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} />
            <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#profitGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
