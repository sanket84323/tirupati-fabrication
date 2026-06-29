import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { invoicesService } from '../../services/invoices.service';
import { formatCurrency, formatDate, getPaymentStatusColor } from '../../lib/utils';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';

const STATUS_OPTIONS = ['all', 'unpaid', 'partial', 'paid'];

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuthStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', search, status],
    queryFn: () => invoicesService.getAll(search, status),
  });

  const deleteMutation = useMutation({
    mutationFn: invoicesService.delete,
    onSuccess: () => { toast.success('Invoice deleted'); qc.invalidateQueries({ queryKey: ['invoices'] }); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const totalUnpaid = invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.remaining_amount, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Outstanding: {formatCurrency(totalUnpaid)}</p>
        </div>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary"><AddIcon style={{ fontSize: 18 }} /> New Invoice</button>
      </div>

      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
            <input type="text" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="search-input pl-10" />
          </div>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${status === s ? 'bg-primary-700 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
        ) : invoices.length === 0 ? (
          <EmptyState icon={RequestQuoteIcon} title="No invoices found" description="Create your first invoice"
            action={<button onClick={() => navigate('/invoices/new')} className="btn-primary"><AddIcon style={{ fontSize: 16 }} /> New Invoice</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Total</th>
                  <th>Advance</th>
                  <th>Remaining</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td className="font-medium text-xs">{inv.invoice_number}</td>
                    <td>{inv.customer?.name || '—'}</td>
                    <td className="max-w-[140px] truncate">{inv.product_name}</td>
                    <td className="font-semibold">{formatCurrency(inv.total_amount)}</td>
                    <td className="text-green-600 dark:text-green-400">{formatCurrency(inv.advance_paid)}</td>
                    <td className={`font-semibold ${inv.remaining_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'}`}>{formatCurrency(inv.remaining_amount)}</td>
                    <td className="text-gray-500">{formatDate(inv.invoice_date, 'DD MMM YY')}</td>
                    <td><span className={`badge ${getPaymentStatusColor(inv.status)}`}>{inv.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/invoices/${inv.id}`)} className="btn-icon text-blue-600 dark:text-blue-400"><VisibilityIcon style={{ fontSize: 16 }} /></button>
                        {profile?.role === 'owner' && (
                          <button onClick={() => setDeleteId(inv.id)} className="btn-icon text-red-600 dark:text-red-400"><DeleteIcon style={{ fontSize: 16 }} /></button>
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

      <ConfirmDialog isOpen={!!deleteId} title="Delete Invoice" message="Delete this invoice permanently?" confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} isLoading={deleteMutation.isPending} />
    </div>
  );
}
