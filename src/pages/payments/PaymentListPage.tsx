import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import PaymentIcon from '@mui/icons-material/Payment';
import { paymentsService } from '../../services/payments.service';
import { customersService } from '../../services/customers.service';
import { ordersService } from '../../services/orders.service';
import { formatCurrency, formatDate, getPaymentMethodLabel, getPaymentStatusColor } from '../../lib/utils';
import EmptyState from '../../components/ui/EmptyState';
import { motion as m, AnimatePresence } from 'framer-motion';
import type { PaymentFormData } from '../../types';

function AddPaymentModal({ onClose, onSave }: { onClose: () => void; onSave: (data: PaymentFormData) => void }) {
  const { data: customers = [] } = useQuery({ queryKey: ['customers-list'], queryFn: () => customersService.getAll() });
  const { data: orders = [] } = useQuery({ queryKey: ['orders-list'], queryFn: () => ordersService.getAll() });
  const [form, setForm] = useState<Partial<PaymentFormData>>({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    status: 'paid',
    amount: 0,
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Record Payment</h3>
        <div className="space-y-4">
          <div>
            <label className="form-label">Customer *</label>
            <select value={form.customer_id || ''} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))} className="form-select">
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Related Order (optional)</label>
            <select value={form.order_id || ''} onChange={e => setForm(p => ({ ...p, order_id: e.target.value || undefined }))} className="form-select">
              <option value="">None</option>
              {orders.filter(o => !form.customer_id || o.customer_id === form.customer_id).map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.product_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Amount (₹) *</label>
              <input type="number" min="1" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: +e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Date *</label>
              <input type="date" value={form.payment_date} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="form-label">Payment Method</label>
              <select value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value as PaymentFormData['payment_method'] }))} className="form-select">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as PaymentFormData['status'] }))} className="form-select">
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Reference Number</label>
              <input value={form.reference_number || ''} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} className="form-input" placeholder="UPI transaction ID, cheque no..." />
            </div>
            <div className="col-span-2">
              <label className="form-label">Notes</label>
              <input value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="form-input" placeholder="Optional notes..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => form.customer_id && form.amount ? onSave(form as PaymentFormData) : toast.error('Fill required fields')} className="btn-primary flex-1">Save Payment</button>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function PaymentListPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', search],
    queryFn: () => paymentsService.getAll(search),
  });

  const createMutation = useMutation({
    mutationFn: paymentsService.create,
    onSuccess: () => { toast.success('Payment recorded!'); qc.invalidateQueries({ queryKey: ['payments'] }); setShowAddModal(false); },
    onError: () => toast.error('Failed to record payment'),
  });

  const totalReceived = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{payments.length} payment records</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary"><AddIcon style={{ fontSize: 18 }} /> Record Payment</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalReceived)}</p>
          <p className="text-xs text-gray-500 mt-1">Total Received</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-gray-500 mt-1">Total Pending</p>
        </div>
      </div>

      <div className="card p-5">
        <div className="relative mb-5">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
          <input type="text" placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="search-input pl-10" />
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
        ) : payments.length === 0 ? (
          <EmptyState icon={PaymentIcon} title="No payments recorded" description="Record your first payment"
            action={<button onClick={() => setShowAddModal(true)} className="btn-primary"><AddIcon style={{ fontSize: 16 }} /> Record Payment</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Customer</th>
                  <th>Order</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td className="text-xs text-gray-500">{p.payment_number}</td>
                    <td className="font-medium">{p.customer?.name || '—'}</td>
                    <td>{(p.order as { order_number: string } | undefined)?.order_number || '—'}</td>
                    <td className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(p.amount)}</td>
                    <td>{formatDate(p.payment_date, 'DD MMM YY')}</td>
                    <td><span className="badge bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">{getPaymentMethodLabel(p.payment_method)}</span></td>
                    <td><span className={`badge ${getPaymentStatusColor(p.status)}`}>{p.status}</span></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddPaymentModal onClose={() => setShowAddModal(false)} onSave={data => createMutation.mutate(data)} />
      )}
    </div>
  );
}
