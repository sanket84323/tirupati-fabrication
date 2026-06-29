import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { ordersService } from '../../services/orders.service';
import { invoicesService } from '../../services/invoices.service';
import { paymentsService } from '../../services/payments.service';
import { formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel } from '../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', progress: 0 },
  { value: 'in_progress', label: 'In Progress', progress: 25 },
  { value: 'ready', label: 'Ready', progress: 90 },
  { value: 'delivered', label: 'Delivered', progress: 100 },
  { value: 'cancelled', label: 'Cancelled', progress: 0 },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isEditingFinances, setIsEditingFinances] = useState(false);
  const [financeData, setFinanceData] = useState({
    total_amount: 0,
    advance_amount: 0,
    total_received: 0
  });
  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [installmentForm, setInstallmentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as 'cash' | 'upi' | 'bank_transfer' | 'cheque',
    notes: '',
  });

  const [isProfitSectionOpen, setIsProfitSectionOpen] = useState(false);
  const [materialCost, setMaterialCost] = useState(0);
  const [transportCost, setTransportCost] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workerDays, setWorkerDays] = useState<Record<string, number>>({});

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersService.getById(id!),
    enabled: !!id,
  });

  const { data: profit, refetch: refetchProfit } = useQuery({
    queryKey: ['order-profit', id],
    queryFn: () => ordersService.getProfit(id!),
    enabled: !!id,
  });

  const { data: installments = [] } = useQuery({
    queryKey: ['order-payments', id],
    queryFn: () => paymentsService.getByOrderId(id!),
    enabled: !!id,
  });

  const totalFromInstallments = Math.round(installments.reduce((sum, p) => sum + (p.amount || 0), 0) * 100) / 100;

  useEffect(() => {
    if (profit) {
      setMaterialCost(profit.material_cost || 0);
      setTransportCost(profit.transport_cost || 0);
      setStartDate(profit.start_date || '');
      setEndDate(profit.end_date || '');
      setWorkerDays(profit.worker_days || {});
    } else if (order) {
      setMaterialCost(0);
      setTransportCost(0);
      setStartDate(order.created_at ? order.created_at.split('T')[0] : '');
      setEndDate(order.delivery_date || '');
      const initialWorkerDays: Record<string, number> = {};
      order.workers?.forEach(w => {
        initialWorkerDays[w.id] = 0;
      });
      setWorkerDays(initialWorkerDays);
    }
  }, [profit, order]);

  const getDaysDifference = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };
  const daysRequired = getDaysDifference(startDate, endDate);

  const workerCost = order?.workers?.reduce((sum, w) => {
    const days = workerDays[w.id] || 0;
    return sum + (Number(w.daily_wage) || 0) * days;
  }, 0) || 0;

  const netProfit = (order?.total_amount || 0) - materialCost - transportCost - workerCost;

  const saveProfitMutation = useMutation({
    mutationFn: () => {
      const payload = {
        order_id: id!,
        material_cost: materialCost,
        transport_cost: transportCost,
        start_date: startDate || null,
        end_date: endDate || null,
        days_required: daysRequired,
        worker_days: workerDays,
        net_profit: netProfit,
      };
      return ordersService.saveProfit(payload);
    },
    onSuccess: () => {
      toast.success('Profit calculation saved!');
      refetchProfit();
    },
    onError: () => {
      toast.error('Failed to save profit calculation');
    }
  });

  useEffect(() => {
    if (order) {
      setFinanceData({
        total_amount: order.total_amount || 0,
        advance_amount: order.advance_amount || 0,
        total_received: order.total_received || 0
      });
    }
  }, [order]);

  const updateFinancesMutation = useMutation({
    mutationFn: (updates: typeof financeData) => {
      const payload = {
        total_amount: Math.round(Number(updates.total_amount) * 100) / 100,
        advance_amount: Math.round(Number(updates.advance_amount) * 100) / 100,
        total_received: Math.round(Number(updates.total_received) * 100) / 100,
        remaining_amount: Math.round(Math.max(0, Number(updates.total_amount) - Number(updates.total_received)) * 100) / 100
      };
      return ordersService.update(id!, payload);
    },
    onSuccess: () => {
      toast.success('Payments updated successfully!');
      qc.invalidateQueries({ queryKey: ['order', id] });
      setIsEditingFinances(false);
    },
    onError: () => {
      toast.error('Failed to update payments');
    }
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

  const handleMarkFullyPaid = async () => {
    if (!order) return;
    try {
      const payload = {
        total_amount: Math.round(order.total_amount * 100) / 100,
        advance_amount: Math.round(order.advance_amount * 100) / 100,
        total_received: Math.round(order.total_amount * 100) / 100,
        remaining_amount: 0
      };
      await ordersService.update(id!, payload);
      toast.success('Order marked as fully paid!');
      qc.invalidateQueries({ queryKey: ['order', id] });
    } catch {
      toast.error('Failed to update payment');
    }
  };

  const { data: images = [] } = useQuery({
    queryKey: ['order-images', id],
    queryFn: () => ordersService.getImages(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, progress }: { status: string; progress: number }) =>
      ordersService.updateStatus(id!, status as Parameters<typeof ordersService.updateStatus>[1], progress),
    onSuccess: () => { toast.success('Status updated!'); qc.invalidateQueries({ queryKey: ['order', id] }); },
    onError: () => toast.error('Failed to update status'),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await ordersService.uploadImage(id!, file, undefined, 'progress');
      toast.success('Photo uploaded!');
      qc.invalidateQueries({ queryKey: ['order-images', id] });
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleCreateInvoice = async () => {
    try {
      const invoice = await invoicesService.createFromOrder(id!);
      toast.success('Invoice created!');
      navigate(`/invoices/${invoice.id}`);
    } catch { toast.error('Failed to create invoice'); }
  };

  if (isLoading) return <div className="space-y-4 animate-pulse"><div className="skeleton h-10 w-48 rounded" /><div className="card p-6 space-y-4"><div className="skeleton h-6 w-64 rounded" /></div></div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400"><ArrowBackIcon /></button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="page-title">{order.customer?.name || 'Order Details'}</h1>
              <span className={`badge ${getOrderStatusColor(order.status)}`}>{getOrderStatusLabel(order.status)}</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Order: <span className="font-semibold text-gray-700 dark:text-gray-300">{order.order_number}</span> • Created {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsProfitSectionOpen(!isProfitSectionOpen)}
            className={`btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-1.5 ${isProfitSectionOpen ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-700 border-primary-300' : ''}`}
          >
            📊 Profit
          </button>
          <button onClick={handleCreateInvoice} className="btn-success flex-1 sm:flex-none"><RequestQuoteIcon style={{ fontSize: 16 }} /> Create Invoice</button>
          <button onClick={() => navigate(`/orders/${id}/edit`)} className="btn-primary flex-1 sm:flex-none"><EditIcon style={{ fontSize: 16 }} /> Edit</button>
        </div>
      </div>

      {/* Status Banners */}
      {order.status === 'cancelled' && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-center gap-3 text-red-800 dark:text-red-300 animate-fade-in">
          <span className="text-xl">🚫</span>
          <div>
            <p className="font-semibold text-sm">Order Cancelled</p>
            <p className="text-xs mt-0.5">This order has been cancelled. Work is halted and outstanding payments are suspended.</p>
          </div>
        </div>
      )}

      {order.status === 'delivered' && order.remaining_amount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-300 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-sm">Delivered - Payment Pending</p>
              <p className="text-xs mt-0.5">This order has been delivered, but there is still an outstanding balance of <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(order.remaining_amount)}</span>. Please collect this payment!</p>
            </div>
          </div>
          <button onClick={handleCreateInvoice} className="btn-success text-xs py-1.5 px-3 self-start sm:self-auto flex items-center gap-1.5 font-semibold">
            <RequestQuoteIcon style={{ fontSize: 14 }} /> Collect Balance / Invoice
          </button>
        </div>
      )}

      {order.status === 'delivered' && order.remaining_amount <= 0 && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-xl p-4 flex items-center gap-3 text-green-800 dark:text-green-300 animate-fade-in">
          <span className="text-xl">🎉</span>
          <div>
            <p className="font-semibold text-sm">Order Completed & Fully Paid</p>
            <p className="text-xs mt-0.5">This order has been delivered successfully and all payments have been cleared. Work well done!</p>
          </div>
        </div>
      )}

      {order.status === 'ready' && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 flex items-center gap-3 text-blue-800 dark:text-blue-300 animate-fade-in">
          <span className="text-xl">✨</span>
          <div>
            <p className="font-semibold text-sm">Ready for Delivery</p>
            <p className="text-xs mt-0.5">All fabrication works are completed. Please notify the customer to arrange collection or delivery.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {isProfitSectionOpen && (
            <div className="card p-6 space-y-5 border border-primary-100 dark:border-primary-950/20 bg-slate-50/50 dark:bg-slate-900/30 animate-fade-in">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <h2 className="font-bold text-gray-900 dark:text-white">Order Profit Analysis</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 uppercase">Estimated Net Profit</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'}`}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] text-gray-500 font-semibold block uppercase">Total Order Value (₹)</label>
                  <div className="form-input bg-gray-100 dark:bg-slate-800 font-semibold mt-1">
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 font-semibold block uppercase">Task Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-input mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 font-semibold block uppercase">Task End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-input mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-slate-800/80 pt-4">
                <div>
                  <label className="text-[11px] text-gray-500 font-semibold block uppercase">Cost of Materials (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={materialCost || ''}
                    onChange={(e) => setMaterialCost(Number(e.target.value) || 0)}
                    placeholder="e.g. steel, primer, locks cost"
                    className="form-input mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 font-semibold block uppercase">Transport Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={transportCost || ''}
                    onChange={(e) => setTransportCost(Number(e.target.value) || 0)}
                    placeholder="e.g. delivery or raw material transport"
                    className="form-input mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 font-semibold block uppercase">Days Required</label>
                  <div className="form-input bg-gray-100 dark:bg-slate-800 font-medium mt-1">
                    {daysRequired > 0 ? `${daysRequired} days` : '—'}
                  </div>
                </div>
              </div>

              {/* Workers breakdown */}
              <div className="border-t border-gray-100 dark:border-slate-800/80 pt-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Worker Cost Calculation</h3>
                {order.workers && order.workers.length > 0 ? (
                  <div className="table-container bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/60 rounded-xl">
                    <table className="table min-w-full text-xs">
                      <thead>
                        <tr>
                          <th>Worker</th>
                          <th>Daily Wage</th>
                          <th className="w-28 text-center">Days Worked</th>
                          <th className="text-right">Total Wage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.workers.map(w => {
                          const days = workerDays[w.id] || 0;
                          return (
                            <tr key={w.id}>
                              <td className="font-semibold">{w.name} <span className="text-[10px] text-gray-400 font-normal">({w.worker_id})</span></td>
                              <td>{formatCurrency(w.daily_wage || 0)}/day</td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={days || ''}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setWorkerDays({ ...workerDays, [w.id]: val });
                                  }}
                                  className="form-input text-center py-1 text-xs w-20 mx-auto"
                                />
                              </td>
                              <td className="text-right font-semibold text-gray-700 dark:text-gray-300">
                                {formatCurrency((w.daily_wage || 0) * days)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>No workers assigned to this order. Assign workers to include them in the profit cost analysis.</span>
                  </div>
                )}
              </div>

              {/* Profit breakdown layout */}
              <div className="bg-white dark:bg-slate-900 p-4 border border-gray-200/80 dark:border-slate-800/60 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-center items-center shadow-sm">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total Order Income</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white mt-1 block">+{formatCurrency(order.total_amount)}</span>
                </div>
                <div className="border-y sm:border-y-0 sm:border-x border-gray-100 dark:border-slate-800 py-3 sm:py-0">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total Expenses</span>
                  <span className="text-lg font-bold text-red-600 mt-1 block">
                    -{formatCurrency(materialCost + transportCost + workerCost)}
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5 block">
                    (Material: {formatCurrency(materialCost)} + Transport: {formatCurrency(transportCost)} + Workers: {formatCurrency(workerCost)})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Net Profit</span>
                  <span className={`text-xl font-extrabold mt-1 block ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                    {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5 block">
                    {order.total_amount > 0 ? `${((netProfit / order.total_amount) * 100).toFixed(1)}% margin` : ''}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  onClick={() => saveProfitMutation.mutate()}
                  disabled={saveProfitMutation.isPending}
                  className="btn-primary text-xs py-2 px-5 flex items-center justify-center gap-1.5"
                >
                  {saveProfitMutation.isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>💾</span>
                  )}
                  Save Profit Calculation
                </button>
                <button
                  onClick={() => setIsProfitSectionOpen(false)}
                  className="btn-secondary text-xs py-2 px-5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Progress</h2>
              <span className="text-2xl font-bold text-primary-700 dark:text-primary-400">{order.progress_percentage}%</span>
            </div>
            <div className="progress-bar h-3 mb-4">
              <div className="progress-bar-fill bg-gradient-to-r from-primary-500 to-primary-700" style={{ width: `${order.progress_percentage}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(s => (
                <button key={s.value} onClick={() => statusMutation.mutate({ status: s.value, progress: s.progress })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${order.status === s.value ? 'bg-primary-700 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Order Details */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Order Details</h2>
              <div className="flex items-center gap-2">
                {!isEditingFinances && order.remaining_amount > 0 && (
                  <button
                    onClick={handleMarkFullyPaid}
                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold focus:outline-none flex items-center gap-0.5"
                  >
                    ⚡ Mark Paid
                  </button>
                )}
                <button
                  onClick={() => setIsEditingFinances(!isEditingFinances)}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold focus:outline-none"
                >
                  {isEditingFinances ? 'Cancel' : 'Update Payment'}
                </button>
              </div>
            </div>

            {isEditingFinances ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700 space-y-4 animate-fade-in mb-4">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Update Order Payments</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold block uppercase">Total Cost (₹)</label>
                    <input
                      type="number"
                      value={financeData.total_amount}
                      onChange={(e) => setFinanceData({ ...financeData, total_amount: Number(e.target.value) || 0 })}
                      className="form-input text-sm py-1.5 px-3.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold block uppercase">Advance Received (₹)</label>
                    <input
                      type="number"
                      value={financeData.advance_amount}
                      onChange={(e) => setFinanceData({ ...financeData, advance_amount: Number(e.target.value) || 0 })}
                      className="form-input text-sm py-1.5 px-3.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold block uppercase">Total Received (₹)</label>
                    <input
                      type="number"
                      value={financeData.total_received}
                      onChange={(e) => setFinanceData({ ...financeData, total_received: Number(e.target.value) || 0 })}
                      className="form-input text-sm py-1.5 px-3.5 mt-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold block uppercase">Balance Due (₹)</label>
                    <div className="form-input bg-gray-100 dark:bg-slate-800 text-sm py-1.5 px-3.5 mt-1 font-bold text-primary-700 dark:text-primary-400">
                      ₹{(Math.round(Math.max(0, financeData.total_amount - financeData.total_received) * 100) / 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => updateFinancesMutation.mutate(financeData)}
                    disabled={updateFinancesMutation.isPending}
                    className="btn-primary text-xs py-1.5 px-4"
                  >
                    Save Payments
                  </button>
                  <button
                    onClick={() => setIsEditingFinances(false)}
                    className="btn-secondary text-xs py-1.5 px-4"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div><p className="text-xs text-gray-500 uppercase tracking-wider">Product</p><p className="text-sm font-medium mt-0.5">{order.product_name}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wider">Quantity</p><p className="text-sm font-medium mt-0.5">{order.quantity} {order.unit}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wider">Delivery</p><p className="text-sm font-medium mt-0.5">{order.delivery_date ? formatDate(order.delivery_date) : '—'}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wider">Total Amount</p><p className="text-sm font-bold text-primary-700 dark:text-primary-400 mt-0.5">{formatCurrency(order.total_amount)}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wider">Advance Paid</p><p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{formatCurrency(order.advance_amount)}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wider">Total Received</p><p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(order.total_received || order.advance_amount)}</p></div>
                <div><p className="text-xs text-gray-500 uppercase tracking-wider">Remaining</p><p className={`text-sm font-bold mt-0.5 ${order.remaining_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'}`}>{formatCurrency(order.remaining_amount)}</p></div>
              </div>
            )}
            {order.description && <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700"><p className="text-xs text-gray-500 uppercase tracking-wider">Description</p><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{order.description}</p></div>}
            {order.notes && <div className="mt-3"><p className="text-xs text-gray-500 uppercase tracking-wider">Notes</p><p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{order.notes}</p></div>}
          </div>

          {/* Installments / Payments */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  💳 Payment Installments
                  {installments.length > 0 && (
                    <span className="text-xs bg-primary-100 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full font-bold">
                      {installments.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Payments received, sorted by date</p>
              </div>
              <button
                onClick={() => setShowAddInstallment(!showAddInstallment)}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                {showAddInstallment ? '✕ Cancel' : '+ Add Payment'}
              </button>
            </div>

            {/* Add installment form */}
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
                    onClick={() => addInstallmentMutation.mutate()}
                    disabled={addInstallmentMutation.isPending || !installmentForm.amount}
                    className="btn-primary text-xs py-1.5 px-4"
                  >
                    {addInstallmentMutation.isPending ? 'Saving…' : '✓ Save Payment'}
                  </button>
                  <button onClick={() => setShowAddInstallment(false)} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
                </div>
              </div>
            )}

            {/* Installments list */}
            {installments.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                <div className="text-3xl mb-2">💸</div>
                <p>No payments recorded yet.</p>
                <p className="text-xs mt-1">Click <strong>"+ Add Payment"</strong> to record the first installment.</p>
              </div>
            ) : (
              <div className="space-y-0 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                {/* Table Header */}
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
                        onClick={() => {
                          if (confirm('Remove this installment?'))
                            deleteInstallmentMutation.mutate(p.id);
                        }}
                        className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                {/* Total row */}
                <div className="grid grid-cols-12 items-center px-4 py-3 bg-emerald-50 dark:bg-emerald-950/20 border-t-2 border-emerald-200 dark:border-emerald-800">
                  <div className="col-span-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Received</div>
                  <div className="col-span-3"></div>
                  <div className="col-span-3"></div>
                  <div className="col-span-2 text-right font-black text-emerald-700 dark:text-emerald-400 text-base">{formatCurrency(totalFromInstallments)}</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Balance row */}
                <div className={`grid grid-cols-12 items-center px-4 py-3 border-t ${
                  (order.total_amount - totalFromInstallments) > 0
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                }`}>
                  <div className={`col-span-3 text-xs font-bold uppercase tracking-wider ${
                    (order.total_amount - totalFromInstallments) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'
                  }`}>Balance Due</div>
                  <div className="col-span-3"></div>
                  <div className="col-span-3"></div>
                  <div className={`col-span-2 text-right font-black text-base ${
                    (order.total_amount - totalFromInstallments) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.max(0, order.total_amount - totalFromInstallments))}
                  </div>
                  <div className="col-span-1"></div>
                </div>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Progress Photos</h2>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-secondary text-xs">
                {uploading ? <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" /> : <CloudUploadIcon style={{ fontSize: 16 }} />}
                Upload Photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
            {images.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No photos uploaded yet</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map(img => (
                  <div key={img.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700">
                    <img src={img.image_url} alt={img.caption || 'Progress photo'} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Customer</h3>
            {order.customer ? (
              <div>
                <Link to={`/customers/${order.customer_id}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">{order.customer.name}</Link>
                <p className="text-sm text-gray-500 mt-1">{order.customer.mobile}</p>
              </div>
            ) : <p className="text-sm text-gray-400">No customer</p>}
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Assigned Workers</h3>
            {order.workers && order.workers.length > 0 ? (
              <div className="space-y-3">
                {order.workers.map(w => (
                  <div key={w.id} className="pb-2.5 last:pb-0 border-b border-gray-100 dark:border-slate-700/50 last:border-0">
                    <Link to={`/workers/${w.id}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline block">
                      {w.name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">{w.worker_id}</p>
                  </div>
                ))}
              </div>
            ) : order.worker ? (
              <div>
                <Link to={`/workers/${order.worker_id}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">{order.worker.name}</Link>
                <p className="text-xs text-gray-500 mt-0.5">{order.worker.worker_id}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not assigned</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
