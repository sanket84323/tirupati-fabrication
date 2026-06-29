import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CallIcon from '@mui/icons-material/Call';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PersonIcon from '@mui/icons-material/Person';
import { customersService } from '../../services/customers.service';
import { openWhatsApp, makeCall } from '../../lib/utils';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';

export default function CustomerListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuthStore();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersService.getAll(search),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.delete(id),
    onSuccess: () => {
      toast.success('Customer deleted');
      qc.invalidateQueries({ queryKey: ['customers'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete customer'),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{customers.length} total customers</p>
        </div>
        <button onClick={() => navigate('/customers/new')} className="btn-primary">
          <AddIcon style={{ fontSize: 18 }} /> New Customer
        </button>
      </div>

      <div className="card p-5">
        {/* Search */}
        <div className="relative mb-5">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
          <input
            type="text"
            placeholder="Search by name, mobile, city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input pl-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={PersonIcon}
            title="No customers found"
            description={search ? 'Try a different search term' : 'Start by adding your first customer'}
            action={!search ? <button onClick={() => navigate('/customers/new')} className="btn-primary"><AddIcon style={{ fontSize: 16 }} /> Add Customer</button> : undefined}
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, i) => (
                  <motion.tr
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <td>
                      <Link to={`/customers/${customer.id}`} className="font-medium text-primary-700 dark:text-primary-400 hover:underline">
                        {customer.name}
                      </Link>
                    </td>
                    <td>{customer.mobile}</td>
                    <td>{customer.city || '—'}</td>
                    <td>
                      <span className={`badge ${customer.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => makeCall(customer.mobile)} className="btn-icon text-blue-600 dark:text-blue-400" title="Call">
                          <CallIcon style={{ fontSize: 16 }} />
                        </button>
                        <button onClick={() => openWhatsApp(customer.whatsapp || customer.mobile)} className="btn-icon text-green-600 dark:text-green-400" title="WhatsApp">
                          <WhatsAppIcon style={{ fontSize: 16 }} />
                        </button>
                        <button onClick={() => navigate(`/customers/${customer.id}/edit`)} className="btn-icon text-gray-600 dark:text-gray-400" title="Edit">
                          <EditIcon style={{ fontSize: 16 }} />
                        </button>
                        {profile?.role === 'owner' && (
                          <button onClick={() => setDeleteId(customer.id)} className="btn-icon text-red-600 dark:text-red-400" title="Delete">
                            <DeleteIcon style={{ fontSize: 16 }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Customer"
        message="Are you sure? This will also delete all related orders and quotations."
        confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
