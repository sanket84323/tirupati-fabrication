import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CallIcon from '@mui/icons-material/Call';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { workersService } from '../../services/workers.service';
import { formatDate, getSkillLabel } from '../../lib/utils';

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: worker, isLoading } = useQuery({
    queryKey: ['worker', id],
    queryFn: () => workersService.getById(id!),
    enabled: !!id,
  });

  const { data: assignedOrders = [] } = useQuery({
    queryKey: ['worker-orders', id],
    queryFn: () => workersService.getAssignedOrders(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="space-y-4 animate-pulse"><div className="skeleton h-10 w-48 rounded" /></div>;
  if (!worker) return <div>Worker not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400"><ArrowBackIcon /></button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">{worker.name}</h1>
              <span className={`badge ${worker.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600'}`}>{worker.status}</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{worker.worker_id}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`tel:${worker.mobile}`} className="btn-secondary flex-1 sm:flex-none"><CallIcon style={{ fontSize: 16 }} /> Call</a>
          <button onClick={() => navigate(`/workers/${id}/edit`)} className="btn-primary flex-1 sm:flex-none"><EditIcon style={{ fontSize: 16 }} /> Edit</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          {/* Photo + Info */}
          <div className="card p-5">
            <div className="w-24 h-24 rounded-2xl bg-primary-100 dark:bg-primary-900/30 mx-auto mb-4 overflow-hidden flex items-center justify-center">
              {worker.photo_url ? <img src={worker.photo_url} alt={worker.name} className="w-full h-full object-cover" /> :
                <span className="text-4xl">👷</span>}
            </div>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Mobile</p><p className="text-sm font-medium">{worker.mobile}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Joining Date</p><p className="text-sm font-medium">{formatDate(worker.joining_date)}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Daily Wage</p><p className="text-sm font-bold text-primary-700 dark:text-primary-400">₹{worker.daily_wage}/day</p></div>
              {worker.address && <div><p className="text-xs text-gray-500 uppercase tracking-wider">Address</p><p className="text-sm font-medium">{worker.address}</p></div>}
            </div>
          </div>

          {/* Skills */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {(worker.skills || []).map(skill => (
                <span key={skill} className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{getSkillLabel(skill)}</span>
              ))}
              {(!worker.skills || worker.skills.length === 0) && <p className="text-sm text-gray-400">No skills listed</p>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">{assignedOrders.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total Orders</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{(assignedOrders as { status: string }[]).filter((o) => o.status === 'delivered').length}</p>
              <p className="text-xs text-gray-500 mt-1">Completed</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{(assignedOrders as { status: string }[]).filter((o) => ['pending', 'in_progress'].includes(o.status)).length}</p>
              <p className="text-xs text-gray-500 mt-1">Active Jobs</p>
            </div>
          </div>

          {/* Assigned Orders */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Assigned Orders</h3>
              <Link to="/attendance" className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline">
                <CalendarMonthIcon style={{ fontSize: 14 }} /> View Attendance
              </Link>
            </div>
            {assignedOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No orders assigned</p>
            ) : (
              <div className="space-y-2">
                {(assignedOrders as any[]).map((order) => {
                  const customerName = Array.isArray(order.customer)
                    ? order.customer[0]?.name
                    : order.customer?.name;
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                      <div>
                        <Link to={`/orders/${order.id}`} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">{order.order_number}</Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.product_name} · {customerName}</p>
                      </div>
                      <div className="text-right">
                        <span className={`badge text-xs ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          order.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>{order.status.replace('_', ' ')}</span>
                        {order.delivery_date && <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.delivery_date, 'DD MMM')}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
