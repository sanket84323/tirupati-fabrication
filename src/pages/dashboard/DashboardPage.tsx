import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DescriptionIcon from '@mui/icons-material/Description';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { reportsService } from '../../services/reports.service';
import { ordersService } from '../../services/orders.service';
import { paymentsService } from '../../services/payments.service';
import { formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

const StatCard = ({
  title, value, subtitle, icon: Icon, iconBg, trend, trendLabel
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}) => (
  <motion.div
    whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
    className="card p-5"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {(subtitle || trendLabel) && (
          <div className="flex items-center gap-1 mt-1">
            {trend === 'up' && <TrendingUpIcon className="text-emerald-500" style={{ fontSize: 14 }} />}
            {trend === 'down' && <TrendingDownIcon className="text-red-500" style={{ fontSize: 14 }} />}
            {trendLabel && <p className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>{trendLabel}</p>}
            {subtitle && !trendLabel && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        )}
      </div>
      <div className={`${iconBg} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-3`}>
        <Icon className="text-white" style={{ fontSize: 22 }} />
      </div>
    </div>
  </motion.div>
);

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportsService.getDashboardStats,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: monthlyData } = useQuery({
    queryKey: ['monthly-data'],
    queryFn: () => reportsService.getMonthlyData(6),
  });

  const { data: orderStatusData } = useQuery({
    queryKey: ['orders-by-status'],
    queryFn: reportsService.getOrdersByStatus,
  });

  const { data: topCustomers } = useQuery({
    queryKey: ['top-customers'],
    queryFn: () => reportsService.getTopCustomers(5),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => ordersService.getAll(),
    select: data => data.slice(0, 5),
  });

  const { data: recentPayments } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: () => paymentsService.getAll(),
    select: data => data.slice(0, 5),
  });

  const statCards = stats ? [
    { title: "Today's Orders", value: stats.todayOrders, icon: ShoppingCartIcon, iconBg: 'bg-blue-500', subtitle: 'New orders today' },
    { title: 'Pending Orders', value: stats.pendingOrders, icon: AccessTimeIcon, iconBg: 'bg-amber-500', subtitle: 'In queue' },
    { title: 'Completed Orders', value: stats.completedOrders, icon: CheckCircleIcon, iconBg: 'bg-emerald-500', subtitle: 'Delivered' },
    { title: 'Pending Payments', value: stats.pendingPayments, icon: AccountBalanceWalletIcon, iconBg: 'bg-red-500', subtitle: 'Awaiting payment' },
    { title: 'Monthly Revenue', value: formatCurrency(stats.monthlyRevenue), icon: TrendingUpIcon, iconBg: 'bg-purple-500', trend: 'up' as const, trendLabel: 'This month' },
    { title: 'Monthly Expenses', value: formatCurrency(stats.monthlyExpenses), icon: TrendingDownIcon, iconBg: 'bg-orange-500', trend: 'down' as const, trendLabel: 'This month' },
    { title: 'Net Profit', value: formatCurrency(stats.currentProfit), icon: AttachMoneyIcon, iconBg: stats.currentProfit >= 0 ? 'bg-emerald-600' : 'bg-red-600', trend: stats.currentProfit >= 0 ? 'up' as const : 'down' as const, trendLabel: 'This month' },
    { title: 'Low Stock Items', value: stats.lowStockItems, icon: WarningAmberIcon, iconBg: 'bg-red-400', subtitle: 'Need restock' },
  ] : [];

  const quickActions = [
    { label: 'New Customer', icon: PersonAddIcon, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30', path: '/customers/new' },
    { label: 'New Quotation', icon: DescriptionIcon, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30', path: '/quotations/new' },
    { label: 'New Order', icon: AddShoppingCartIcon, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30', path: '/orders/new' },
    { label: 'Add Expense', icon: ReceiptLongIcon, color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30', path: '/expenses/new' },
    { label: 'New Invoice', icon: RequestQuoteIcon, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30', path: '/invoices/new' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="page-title">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {profile?.full_name?.split(' ')[0] || 'Boss'} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Here's what's happening at your shop today — {formatDate(new Date().toISOString())}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map(action => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${action.color}`}
          >
            <action.icon style={{ fontSize: 18 }} />
            {action.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-8 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <StatCard {...card} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Expenses Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Revenue vs Expenses</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last 6 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData || []} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f59e0b" fill="url(#colorExpenses)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by Status */}
        <div className="card p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-gray-900 dark:text-white">Orders by Status</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Current breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={orderStatusData || []}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={80}
                paddingAngle={3}
                dataKey="count"
                nameKey="status"
              >
                {(orderStatusData || []).map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {(orderStatusData || []).filter(s => s.count > 0).map(s => (
              <div key={s.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-gray-600 dark:text-gray-400">{s.status}</span>
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
            <Link to="/orders" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            {(recentOrders || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No orders yet</p>
            ) : (
              recentOrders?.map(order => (
                <div key={order.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/orders/${order.id}`} className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate block">
                      {order.order_number} — {order.product_name}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer?.name}</p>
                  </div>
                  <span className={`badge flex-shrink-0 ${getOrderStatusColor(order.status)}`}>
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Top Customers</h3>
            <Link to="/customers" className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">View all</Link>
          </div>
          {(topCustomers || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCustomers || []} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} />
                <Bar dataKey="total" name="Revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
