import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { ordersService } from '../../services/orders.service';
import { formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel } from '../../lib/utils';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_OPTIONS = ['all', 'pending', 'in_progress', 'ready', 'delivered', 'cancelled'];
const STATUS_LABELS: Record<string, string> = { all: 'All', pending: 'Pending', in_progress: 'In Progress', ready: 'Ready', delivered: 'Delivered', cancelled: 'Cancelled' };

export default function OrderListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', search, status],
    queryFn: () => ordersService.getAll(search, status),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{orders.length} orders</p>
        </div>
        <button onClick={() => navigate('/orders/new')} className="btn-primary">
          <AddIcon style={{ fontSize: 18 }} /> New Order
        </button>
      </div>

      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
            <input type="text" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="search-input pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${status === s ? 'bg-primary-700 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded" />)}</div>
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingCartIcon} title="No orders found" description="Create your first order"
            action={<button onClick={() => navigate('/orders/new')} className="btn-primary"><AddIcon style={{ fontSize: 16 }} /> New Order</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Order #</th>
                  <th>Product</th>
                  <th>Workers</th>
                  <th>Amount</th>
                  <th>Delivery</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td className="font-semibold text-gray-900 dark:text-white">
                      <Link to={`/orders/${order.id}`} className="hover:underline text-primary-600 dark:text-primary-400">
                        {order.customer?.name || '—'}
                      </Link>
                    </td>
                    <td className="text-gray-500 font-medium">{order.order_number}</td>
                    <td className="max-w-[140px] truncate">{order.product_name}</td>
                    <td>{order.workers && order.workers.length > 0 ? order.workers.map(w => w.name).join(', ') : <span className="text-gray-400 text-xs">Unassigned</span>}</td>
                    <td className="font-semibold">{formatCurrency(order.total_amount)}</td>
                    <td className="text-gray-500">{order.delivery_date ? formatDate(order.delivery_date, 'DD MMM') : '—'}</td>
                    <td>
                      <div className="w-20">
                        <div className="progress-bar">
                          <div className="progress-bar-fill bg-primary-600" style={{ width: `${order.progress_percentage}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 text-center">{order.progress_percentage}%</p>
                      </div>
                    </td>
                    <td><span className={`badge ${getOrderStatusColor(order.status)}`}>{getOrderStatusLabel(order.status)}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/orders/${order.id}`)} className="btn-icon text-blue-600 dark:text-blue-400"><VisibilityIcon style={{ fontSize: 16 }} /></button>
                        <button onClick={() => navigate(`/orders/${order.id}/edit`)} className="btn-icon text-gray-600 dark:text-gray-400"><EditIcon style={{ fontSize: 16 }} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
