import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { ordersService } from '../../services/orders.service';
import { customersService } from '../../services/customers.service';
import { workersService } from '../../services/workers.service';
import { paymentsService } from '../../services/payments.service';
import { formatCurrency, formatDate } from '../../lib/utils';
import VoiceInputButton from '../../components/ui/VoiceInputButton';

const schema = z.object({
  customer_id: z.string().min(1, 'Select a customer'),
  product_name: z.string().min(2, 'Product name is required'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1),
  unit: z.string().default('pcs'),
  total_amount: z.coerce.number().min(0),
  advance_amount: z.coerce.number().min(0),
  total_received: z.coerce.number().min(0),
  worker_id: z.string().optional(),
  worker_ids: z.array(z.string()).default([]),
  delivery_date: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'ready', 'delivered', 'cancelled']),
  progress_percentage: z.coerce.number().min(0).max(100),
});

type FormData = z.infer<typeof schema>;

export default function OrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [installmentForm, setInstallmentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as 'cash' | 'upi' | 'bank_transfer' | 'cheque',
    notes: '',
  });

  // Quick Customer State
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    mobile: '',
    whatsapp: '',
    city: '',
    address: '',
    notes: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Quick Worker State
  const [newWorker, setNewWorker] = useState({
    name: '',
    mobile: '',
    daily_wage: 500,
    joining_date: new Date().toISOString().split('T')[0],
    address: '',
    skills: [] as string[],
    status: 'active' as 'active' | 'inactive'
  });

  const { data: customers = [] } = useQuery({ queryKey: ['customers-list'], queryFn: () => customersService.getAll() });
  const { data: workers = [] } = useQuery({ queryKey: ['workers-list'], queryFn: () => workersService.getAll(undefined, 'active') });
  const { data: order } = useQuery({ queryKey: ['order', id], queryFn: () => ordersService.getById(id!), enabled: isEdit });
  const { data: installments = [] } = useQuery({
    queryKey: ['order-payments', id],
    queryFn: () => paymentsService.getByOrderId(id!),
    enabled: isEdit && !!id,
  });
  const totalFromInstallments = Math.round(installments.reduce((sum, p) => sum + (p.amount || 0), 0) * 100) / 100;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'pending', quantity: 1, total_amount: 0, advance_amount: 0, total_received: 0, progress_percentage: 0, unit: 'pcs', worker_ids: [] },
  });

  const totalAmount = watch('total_amount');
  const advanceAmount = watch('advance_amount');
  const totalReceived = watch('total_received');
  const remaining = Math.max(0, (Number(totalAmount) || 0) - (Number(totalReceived) || 0));

  const prevAdvanceRef = useRef(advanceAmount);
  useEffect(() => {
    if (advanceAmount !== prevAdvanceRef.current) {
      if (!isEdit || totalReceived === prevAdvanceRef.current) {
        setValue('total_received', advanceAmount || 0);
      }
      prevAdvanceRef.current = advanceAmount;
    }
  }, [advanceAmount, totalReceived, setValue, isEdit]);

  useEffect(() => {
    if (order) {
      const { id: _id, created_at, updated_at, customer, worker, workers: orderWorkers, order_number, quotation_id, remaining_amount, ...rest } = order;
      reset({ 
        ...rest, 
        total_received: order.total_received ?? order.advance_amount ?? 0,
        worker_ids: orderWorkers?.map(w => w.id) || (order.worker_id ? [order.worker_id] : [])
      });
    }
  }, [order, reset]);

  const quickCustomerMutation = useMutation({
    mutationFn: (data: any) => customersService.create(data),
    onSuccess: (result) => {
      toast.success('Customer created!');
      qc.invalidateQueries({ queryKey: ['customers-list'] });
      setValue('customer_id', result.id); // Auto-select newly created customer
      setIsCustomerModalOpen(false);
      setNewCustomer({
        name: '',
        mobile: '',
        whatsapp: '',
        city: '',
        address: '',
        notes: '',
        status: 'active'
      });
    },
    onError: () => toast.error('Failed to create customer'),
  });

  const quickWorkerMutation = useMutation({
    mutationFn: (data: any) => workersService.create(data),
    onSuccess: (result) => {
      toast.success('Worker created!');
      qc.invalidateQueries({ queryKey: ['workers-list'] });
      const currentWorkerIds = watch('worker_ids') || [];
      setValue('worker_ids', [...currentWorkerIds, result.id]); // Add newly created worker to active list
      setIsWorkerModalOpen(false);
      setNewWorker({
        name: '',
        mobile: '',
        daily_wage: 500,
        joining_date: new Date().toISOString().split('T')[0],
        address: '',
        skills: [],
        status: 'active'
      });
    },
    onError: () => toast.error('Failed to create worker'),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        ...data,
        total_amount: Math.round(Number(data.total_amount) * 100) / 100,
        advance_amount: Math.round(Number(data.advance_amount) * 100) / 100,
        total_received: Math.round(Number(data.total_received) * 100) / 100,
        remaining_amount: Math.round(Math.max(0, Number(data.total_amount) - Number(data.total_received)) * 100) / 100,
        worker_id: data.worker_ids?.[0] || null,
        worker_ids: data.worker_ids || [],
        delivery_date: data.delivery_date || null,
        description: data.description || null,
        notes: data.notes || null,
      };
      return isEdit ? ordersService.update(id!, payload) : ordersService.create(payload as any);
    },
    onSuccess: (result) => {
      toast.success(isEdit ? 'Order updated!' : 'Order created!');
      qc.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/orders/${result.id}`);
    },
    onError: () => toast.error('Failed to save order'),
  });

  const addInstallmentMutation = useMutation({
    mutationFn: () => {
      if (!order || !installmentForm.amount || Number(installmentForm.amount) <= 0)
        throw new Error('Enter a valid amount');
      return paymentsService.create({
        customer_id: order.customer_id,
        order_id: id!,
        amount: Number(installmentForm.amount),
        payment_date: installmentForm.payment_date,
        payment_method: installmentForm.payment_method,
        notes: installmentForm.notes || undefined,
        status: 'paid',
      });
    },
    onSuccess: () => {
      toast.success('Installment added!');
      qc.invalidateQueries({ queryKey: ['order-payments', id] });
      qc.invalidateQueries({ queryKey: ['order', id] });
      setShowAddInstallment(false);
      setInstallmentForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', notes: '' });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add installment'),
  });

  const deleteInstallmentMutation = useMutation({
    mutationFn: (paymentId: string) =>
      paymentsService.deleteAndRecalculate(paymentId, id!, order?.total_amount || 0),
    onSuccess: () => {
      toast.success('Installment removed');
      qc.invalidateQueries({ queryKey: ['order-payments', id] });
      qc.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: () => toast.error('Failed to delete installment'),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400"><ArrowBackIcon /></button>
        <h1 className="page-title">{isEdit ? 'Edit Order' : 'New Order'}</h1>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white pb-3 border-b border-gray-100 dark:border-slate-700">Order Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0">Customer *</label>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold flex items-center gap-1 focus:outline-none"
                >
                  + Add Customer
                </button>
              </div>
              <select {...register('customer_id')} className="form-select">
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
              </select>
              {errors.customer_id?.message && <p className="form-error">{String(errors.customer_id.message)}</p>}
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Product Name *</label>
                <VoiceInputButton onTranscript={(text) => setValue('product_name', text)} />
              </div>
              <input {...register('product_name')} className="form-input" placeholder="e.g., MS Gate 6ft x 4ft" />
              {errors.product_name?.message && <p className="form-error">{String(errors.product_name.message)}</p>}
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Description</label>
                <VoiceInputButton onTranscript={(text) => setValue('description', text)} />
              </div>
              <textarea {...register('description')} className="form-input" rows={2} placeholder="Specifications, design details..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Quantity</label>
                <input {...register('quantity')} type="number" min="1" className="form-input" />
              </div>
              <div>
                <label className="form-label">Unit</label>
                <select {...register('unit')} className="form-select">
                  {['pcs', 'kg', 'meter', 'feet', 'sq.ft', 'set'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="form-label mb-0">Assign Workers</label>
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold flex items-center gap-1 focus:outline-none"
                >
                  + Add Worker
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-40 overflow-y-auto p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-800/30 scrollbar-thin">
                {workers.map(w => {
                  const selectedWorkerIds: string[] = watch('worker_ids') || [];
                  const isChecked = selectedWorkerIds.includes(w.id);
                  return (
                    <label key={w.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-all ${
                      isChecked
                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const next = isChecked 
                            ? selectedWorkerIds.filter((id: string) => id !== w.id) 
                            : [...selectedWorkerIds, w.id];
                          setValue('worker_ids', next);
                        }}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 animate-fade-in"
                      />
                      <span className="text-xs font-medium truncate">{w.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="form-label">Delivery Date</label>
              <input {...register('delivery_date')} type="date" className="form-input" />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select {...register('status')} className="form-select">
                {[['pending','Pending'],['in_progress','In Progress'],['ready','Ready'],['delivered','Delivered'],['cancelled','Cancelled']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="form-label">Progress ({watch('progress_percentage')}%)</label>
                <input {...register('progress_percentage')} type="range" min="0" max="100" step="5" className="w-full accent-primary-600 mt-2 cursor-pointer" />
              </div>
            )}
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white pb-3 border-b border-gray-100 dark:border-slate-700">Financial Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Total Cost (₹) *</label>
              <input {...register('total_amount')} type="number" min="0" step="0.01" className="form-input" />
              {errors.total_amount?.message && <p className="form-error">{String(errors.total_amount.message)}</p>}
            </div>
            <div>
              <label className="form-label">Advance Received (₹)</label>
              <input {...register('advance_amount')} type="number" min="0" step="0.01" className="form-input" />
            </div>
            <div>
              <label className="form-label">Total Received (₹)</label>
              <input {...register('total_received')} type="number" min="0" step="0.01" className="form-input text-emerald-600 dark:text-emerald-400 font-semibold" />
            </div>
            <div>
              <label className="form-label">Remaining Amount (₹)</label>
              <div className="form-input bg-gray-50 dark:bg-slate-700 font-semibold text-primary-700 dark:text-primary-400">
                ₹{(Math.round(remaining * 100) / 100).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Installments — only in edit mode */}
        {isEdit && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  💳 Payment Installments
                  {installments.length > 0 && (
                    <span className="text-xs bg-primary-100 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full font-bold">
                      {installments.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Payments received, sorted by date · Total auto-synced to order</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInstallment(!showAddInstallment)}
                className="btn-primary text-xs py-1.5 px-3"
              >
                {showAddInstallment ? '✕ Cancel' : '+ Add Payment'}
              </button>
            </div>

            {/* Add Installment Form */}
            {showAddInstallment && (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-4 animate-fade-in">
                <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-3">New Payment Entry</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Amount (₹) *</label>
                    <input
                      type="number" min="1" step="0.01"
                      value={installmentForm.amount}
                      onChange={e => setInstallmentForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="Enter amount"
                      className="form-input text-sm py-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Payment Date *</label>
                    <input
                      type="date"
                      value={installmentForm.payment_date}
                      onChange={e => setInstallmentForm(f => ({ ...f, payment_date: e.target.value }))}
                      className="form-input text-sm py-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Method</label>
                    <select
                      value={installmentForm.payment_method}
                      onChange={e => setInstallmentForm(f => ({ ...f, payment_method: e.target.value as typeof f.payment_method }))}
                      className="form-input text-sm py-2"
                    >
                      <option value="cash">💵 Cash</option>
                      <option value="upi">📱 UPI</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                      <option value="cheque">🧾 Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      value={installmentForm.notes}
                      onChange={e => setInstallmentForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Reference, remarks..."
                      className="form-input text-sm py-2"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-3">
                  <button
                    type="button"
                    onClick={() => addInstallmentMutation.mutate()}
                    disabled={addInstallmentMutation.isPending || !installmentForm.amount}
                    className="btn-primary text-xs py-1.5 px-4"
                  >
                    {addInstallmentMutation.isPending ? 'Saving…' : '✓ Save Payment'}
                  </button>
                  <button type="button" onClick={() => setShowAddInstallment(false)} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
                </div>
              </div>
            )}

            {/* Installments list */}
            {installments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <div className="text-3xl mb-2">💸</div>
                <p>No payments recorded yet.</p>
                <p className="text-xs mt-1">Click <strong>"+ Add Payment"</strong> to record the first installment.</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                {/* Header */}
                <div className="grid grid-cols-12 bg-gray-100 dark:bg-slate-700/60 px-4 py-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="col-span-3">Date</div>
                  <div className="col-span-3">Method</div>
                  <div className="col-span-3">Notes</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-1"></div>
                </div>

                {installments.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`grid grid-cols-12 items-center px-4 py-3 text-sm border-t border-gray-100 dark:border-slate-700/50 ${
                      idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/60 dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="col-span-3 text-gray-700 dark:text-gray-300 font-medium">{formatDate(p.payment_date)}</div>
                    <div className="col-span-3">
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium capitalize">
                        {p.payment_method === 'cash' ? '💵' : p.payment_method === 'upi' ? '📱' : p.payment_method === 'bank_transfer' ? '🏦' : '🧾'}
                        {p.payment_method.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="col-span-3 text-gray-400 text-xs truncate">{p.notes || '—'}</div>
                    <div className="col-span-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Remove this installment?'))
                            deleteInstallmentMutation.mutate(p.id);
                        }}
                        className="text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {/* Total Received */}
                <div className="grid grid-cols-12 items-center px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border-t-2 border-emerald-200 dark:border-emerald-800">
                  <div className="col-span-9 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Received</div>
                  <div className="col-span-2 text-right font-black text-emerald-700 dark:text-emerald-400 text-base">{formatCurrency(totalFromInstallments)}</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Balance Due */}
                <div className={`grid grid-cols-12 items-center px-4 py-3 border-t ${
                  (Number(totalAmount) - totalFromInstallments) > 0
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                }`}>
                  <div className={`col-span-9 text-xs font-bold uppercase tracking-wider ${
                    (Number(totalAmount) - totalFromInstallments) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'
                  }`}>Balance Due</div>
                  <div className={`col-span-2 text-right font-black text-base ${
                    (Number(totalAmount) - totalFromInstallments) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.max(0, Number(totalAmount) - totalFromInstallments))}
                  </div>
                  <div className="col-span-1"></div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0">Notes</label>
            <VoiceInputButton onTranscript={(text) => setValue('notes', text)} />
          </div>
          <textarea {...register('notes')} className="form-input" rows={2} placeholder="Any special instructions..." />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isEdit ? 'Update Order' : 'Create Order'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      {isCustomerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCustomerModalOpen(false)}>
          <div className="modal-content max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsCustomerModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <CloseIcon style={{ fontSize: 20 }} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Add Customer</h2>
            <div className="space-y-4">
              <div>
                <label className="form-label">Customer Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Rajesh Sharma"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Mobile Number *</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={newCustomer.mobile}
                  onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">City</label>
                <input
                  type="text"
                  placeholder="e.g., Pune"
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Address</label>
                <textarea
                  placeholder="Full address..."
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="form-input"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newCustomer.name || !newCustomer.mobile) {
                      toast.error('Name and Mobile are required!');
                      return;
                    }
                    quickCustomerMutation.mutate(newCustomer);
                  }}
                  disabled={quickCustomerMutation.isPending}
                  className="btn-primary w-full"
                >
                  {quickCustomerMutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Add Customer'}
                </button>
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="btn-secondary w-full">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Worker Modal */}
      {isWorkerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsWorkerModalOpen(false)}>
          <div className="modal-content max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsWorkerModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <CloseIcon style={{ fontSize: 20 }} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Add Worker</h2>
            <div className="space-y-4">
              <div>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  placeholder="Worker's name"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Mobile *</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={newWorker.mobile}
                  onChange={(e) => setNewWorker({ ...newWorker, mobile: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Daily Wage (₹)</label>
                <input
                  type="number"
                  placeholder="500"
                  value={newWorker.daily_wage}
                  onChange={(e) => setNewWorker({ ...newWorker, daily_wage: Number(e.target.value) || 0 })}
                  className="form-input"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newWorker.name || !newWorker.mobile) {
                      toast.error('Name and Mobile are required!');
                      return;
                    }
                    quickWorkerMutation.mutate(newWorker);
                  }}
                  disabled={quickWorkerMutation.isPending}
                  className="btn-primary w-full"
                >
                  {quickWorkerMutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Add Worker'}
                </button>
                <button type="button" onClick={() => setIsWorkerModalOpen(false)} className="btn-secondary w-full">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
