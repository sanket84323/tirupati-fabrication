import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DescriptionIcon from '@mui/icons-material/Description';
import { quotationsService } from '../../services/quotations.service';
import { ordersService } from '../../services/orders.service';
import { formatCurrency, formatDate, getQuotationStatusColor } from '../../lib/utils';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';

const STATUS_OPTIONS = ['all', 'draft', 'sent', 'approved', 'rejected'];

export default function QuotationListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuthStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations', search, status],
    queryFn: () => quotationsService.getAll(search, status),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotationsService.delete(id),
    onSuccess: () => { toast.success('Quotation deleted'); qc.invalidateQueries({ queryKey: ['quotations'] }); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => ordersService.createFromQuotation(id),
    onSuccess: (order) => {
      toast.success('Converted to order!');
      qc.invalidateQueries({ queryKey: ['quotations'] });
      setConvertId(null);
      navigate(`/orders/${order.id}`);
    },
    onError: () => toast.error('Failed to convert'),
  });

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await quotationsService.duplicate(id);
      toast.success('Quotation duplicated!');
      qc.invalidateQueries({ queryKey: ['quotations'] });
      navigate(`/quotations/${copy.id}/edit`);
    } catch { toast.error('Failed to duplicate'); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{quotations.length} quotations</p>
        </div>
        <button onClick={() => navigate('/quotations/new')} className="btn-primary">
          <AddIcon style={{ fontSize: 18 }} /> New Quotation
        </button>
      </div>

      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
            <input type="text" placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="search-input pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${status === s ? 'bg-primary-700 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
        ) : quotations.length === 0 ? (
          <EmptyState icon={DescriptionIcon} title="No quotations found" description="Create your first quotation to get started"
            action={<button onClick={() => navigate('/quotations/new')} className="btn-primary"><AddIcon style={{ fontSize: 16 }} /> New Quotation</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Quotation #</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q, i) => (
                  <motion.tr key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td><Link to={`/quotations/${q.id}`} className="font-medium text-primary-600 dark:text-primary-400 hover:underline">{q.quotation_number}</Link></td>
                    <td>{q.customer?.name || '—'}</td>
                    <td className="max-w-[160px] truncate">{q.product_name}</td>
                    <td className="font-semibold">{formatCurrency(q.total_amount)}</td>
                    <td className="text-gray-500">{formatDate(q.quotation_date, 'DD MMM YY')}</td>
                    <td><span className={`badge ${getQuotationStatusColor(q.status)}`}>{q.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/quotations/${q.id}/edit`)} className="btn-icon text-gray-600 dark:text-gray-400" title="Edit"><EditIcon style={{ fontSize: 16 }} /></button>
                        <button onClick={() => handleDuplicate(q.id)} className="btn-icon text-blue-600 dark:text-blue-400" title="Duplicate"><ContentCopyIcon style={{ fontSize: 16 }} /></button>
                        {q.status !== 'approved' && (
                          <button onClick={() => setConvertId(q.id)} className="btn-icon text-green-600 dark:text-green-400" title="Convert to Order"><ShoppingCartIcon style={{ fontSize: 16 }} /></button>
                        )}
                        {profile?.role === 'owner' && (
                          <button onClick={() => setDeleteId(q.id)} className="btn-icon text-red-600 dark:text-red-400" title="Delete"><DeleteIcon style={{ fontSize: 16 }} /></button>
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

      <ConfirmDialog isOpen={!!deleteId} title="Delete Quotation" message="Delete this quotation permanently?" confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} isLoading={deleteMutation.isPending} />
      <ConfirmDialog isOpen={!!convertId} title="Convert to Order" message="This will create a new order from this quotation and mark it as approved." confirmLabel="Convert" danger={false}
        onConfirm={() => convertId && convertMutation.mutate(convertId)} onCancel={() => setConvertId(null)} isLoading={convertMutation.isPending} />
    </div>
  );
}
