import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CallIcon from '@mui/icons-material/Call';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { customersService } from '../../services/customers.service';
import { ordersService } from '../../services/orders.service';
import { quotationsService } from '../../services/quotations.service';
import { formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel, getQuotationStatusColor, makeCall, openWhatsApp } from '../../lib/utils';
import type { Profile } from '../../types';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [orderEditData, setOrderEditData] = useState({
    total_amount: 0,
    advance_amount: 0,
    total_received: 0,
    product_name: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    whatsapp: '',
    city: '',
    address: '',
    notes: '',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    if (selectedOrder) {
      setOrderEditData({
        total_amount: selectedOrder.total_amount || 0,
        advance_amount: selectedOrder.advance_amount || 0,
        total_received: selectedOrder.total_received || selectedOrder.advance_amount || 0,
        product_name: selectedOrder.product_name || ''
      });
      setIsEditingOrder(false);
    }
  }, [selectedOrder]);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersService.getById(id!),
    enabled: !!id,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['customer-orders', id],
    queryFn: () => ordersService.getAll(undefined, undefined),
    select: data => data.filter(o => o.customer_id === id).slice(0, 10),
    enabled: !!id,
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['customer-quotations', id],
    queryFn: () => quotationsService.getAll(),
    select: data => data.filter(q => q.customer_id === id).slice(0, 10),
    enabled: !!id,
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        mobile: customer.mobile,
        whatsapp: customer.whatsapp || '',
        city: customer.city || '',
        address: customer.address || '',
        notes: customer.notes || '',
        status: (customer.status as 'active' | 'inactive') || 'active'
      });
    }
  }, [customer]);

  const updateCustomerMutation = useMutation({
    mutationFn: (updatedData: any) => customersService.update(id!, updatedData),
    onSuccess: () => {
      toast.success('Customer profile updated!');
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsEditingInfo(false);
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });

  const outstandingBalance = Math.round(orders.reduce((sum, o) => sum + (o.remaining_amount || 0), 0) * 100) / 100;
  const totalRevenue = Math.round(orders.reduce((sum, o) => sum + o.total_amount, 0) * 100) / 100;
  const totalReceived = Math.round(orders.reduce((sum, o) => sum + (o.total_received || o.advance_amount || 0), 0) * 100) / 100;

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, updates }: { orderId: string; updates: any }) => {
      const payload = {
        ...updates,
        total_amount: Math.round(Number(updates.total_amount) * 100) / 100,
        advance_amount: Math.round(Number(updates.advance_amount) * 100) / 100,
        total_received: Math.round(Number(updates.total_received) * 100) / 100,
        remaining_amount: Math.round(Math.max(0, Number(updates.total_amount) - Number(updates.total_received)) * 100) / 100
      };
      return ordersService.update(orderId, payload);
    },
    onSuccess: () => {
      toast.success('Order finances updated!');
      queryClient.invalidateQueries({ queryKey: ['customer-orders', id] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      setIsEditingOrder(false);
      setSelectedOrder(null);
    },
    onError: () => {
      toast.error('Failed to update order finances');
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="card p-6 space-y-4">
          <div className="skeleton h-6 w-64 rounded" />
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton h-4 w-32 rounded" />
        </div>
      </div>
    );
  }

  if (!customer) return <div className="text-gray-500">Customer not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400">
            <ArrowBackIcon />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">{customer.name}</h1>
              <span className={`badge ${customer.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600'}`}>
                {customer.status}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Customer since {formatDate(customer.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => makeCall(customer.mobile)} className="btn-secondary flex-1 sm:flex-none">
            <CallIcon style={{ fontSize: 16 }} /> Call
          </button>
          <button onClick={() => openWhatsApp(customer.whatsapp || customer.mobile)} className="btn-success flex-1 sm:flex-none">
            <WhatsAppIcon style={{ fontSize: 16 }} /> WhatsApp
          </button>
          <button onClick={() => navigate(`/customers/${id}/edit`)} className="btn-primary flex-1 sm:flex-none">
            <EditIcon style={{ fontSize: 16 }} /> Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="card p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Customer Information</h2>
            {!isEditingInfo ? (
              <button
                onClick={() => setIsEditingInfo(true)}
                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold flex items-center gap-1 focus:outline-none"
              >
                <EditIcon style={{ fontSize: 14 }} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateCustomerMutation.mutate(formData)}
                  disabled={updateCustomerMutation.isPending}
                  className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded focus:outline-none"
                  title="Save Changes"
                >
                  <SaveIcon style={{ fontSize: 16 }} />
                </button>
                <button
                  onClick={() => {
                    setIsEditingInfo(false);
                    setFormData({
                      name: customer.name,
                      mobile: customer.mobile,
                      whatsapp: customer.whatsapp || '',
                      city: customer.city || '',
                      address: customer.address || '',
                      notes: customer.notes || '',
                      status: (customer.status as 'active' | 'inactive') || 'active'
                    });
                  }}
                  className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded focus:outline-none"
                  title="Cancel"
                >
                  <CloseIcon style={{ fontSize: 16 }} />
                </button>
              </div>
            )}
          </div>

          {isEditingInfo ? (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-gray-400 font-medium block">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input text-sm py-1.5 px-2.5 mt-0.5"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium block">Mobile</label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="form-input text-sm py-1.5 px-2.5 mt-0.5"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium block">WhatsApp</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="form-input text-sm py-1.5 px-2.5 mt-0.5"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium block">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="form-input text-sm py-1.5 px-2.5 mt-0.5"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium block">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="form-input text-sm py-1.5 px-2.5 mt-0.5"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium block">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input text-sm py-1.5 px-2.5 mt-0.5"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 font-medium block">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="form-select text-sm py-1.5 px-2.5 mt-0.5"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mobile</p>
                <p className="text-sm font-medium mt-0.5">{customer.mobile}</p>
              </div>
              {customer.whatsapp && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">WhatsApp</p>
                  <p className="text-sm font-medium mt-0.5">{customer.whatsapp}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium mt-0.5">{customer.email}</p>
                </div>
              )}
              {(customer.address || customer.city) && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Address</p>
                  <div className="flex items-start gap-1 mt-0.5">
                    <LocationOnIcon className="text-gray-400 mt-0.5" style={{ fontSize: 14 }} />
                    <p className="text-sm font-medium">{[customer.address, customer.city].filter(Boolean).join(', ')}</p>
                  </div>
                </div>
              )}
              {customer.notes && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</p>
                  <p className="text-sm mt-0.5 text-gray-600 dark:text-gray-400">{customer.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4 h-fit">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">{orders.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Orders</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Value</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalReceived)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Received</p>
          </div>
          <div className="card p-4 text-center">
            <p className={`text-2xl font-bold ${outstandingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'}`}>
              {formatCurrency(outstandingBalance)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Outstanding</p>
          </div>

          {/* Recent Orders */}
          <div className="col-span-3 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Order History</h3>
              <Link to={`/orders?customer=${id}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View all</Link>
            </div>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No orders yet</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Product</th>
                      <th>Total Cost</th>
                      <th>Remaining</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/20" onClick={() => setSelectedOrder(order)}>
                        <td>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                            className="font-medium text-primary-600 dark:text-primary-400 hover:underline focus:outline-none text-left"
                          >
                            {order.order_number}
                          </button>
                        </td>
                        <td>{order.product_name}</td>
                        <td className="font-medium">{formatCurrency(order.total_amount)}</td>
                        <td className={`font-medium ${order.remaining_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {formatCurrency(order.remaining_amount)}
                        </td>
                        <td>
                          <span className={`badge ${getOrderStatusColor(order.status)}`}>
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="text-gray-500">{formatDate(order.created_at, 'DD MMM YY')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quotations */}
          {quotations.length > 0 && (
            <div className="col-span-3 card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quotation History</h3>
              <div className="space-y-2">
                {quotations.map(q => (
                  <div key={q.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                    <Link to={`/quotations/${q.id}`} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                      {q.quotation_number}
                    </Link>
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 mx-4 truncate">{q.product_name}</span>
                    <span className="text-sm font-medium">{formatCurrency(q.total_amount)}</span>
                    <span className={`badge ml-3 ${getQuotationStatusColor(q.status)}`}>{q.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content max-w-md p-6 relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors focus:outline-none"
            >
              <CloseIcon style={{ fontSize: 20 }} />
            </button>

            <div className="space-y-5">
              <div className="flex items-start justify-between pr-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedOrder.order_number}</h2>
                    <span className={`badge ${getOrderStatusColor(selectedOrder.status)}`}>
                      {getOrderStatusLabel(selectedOrder.status)}
                    </span>
                  </div>
                  {!isEditingOrder ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Product: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedOrder.product_name}</span>
                    </p>
                  ) : (
                    <div className="mt-1.5">
                      <label className="text-[10px] text-gray-400 font-semibold block uppercase">Product Name</label>
                      <input
                        type="text"
                        value={orderEditData.product_name}
                        onChange={(e) => setOrderEditData({ ...orderEditData, product_name: e.target.value })}
                        className="form-input text-xs py-1 px-2.5 mt-0.5"
                      />
                    </div>
                  )}
                </div>

                {!isEditingOrder && (
                  <button
                    onClick={() => setIsEditingOrder(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-0.5 focus:outline-none"
                  >
                    <EditIcon style={{ fontSize: 13 }} /> Edit
                  </button>
                )}
              </div>

              {/* Cost Summary Card / Editing panel */}
              {isEditingOrder ? (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700 space-y-3.5">
                  <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Edit Order Finances</h3>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold block uppercase">Total Cost of Order (₹)</label>
                    <input
                      type="number"
                      value={orderEditData.total_amount}
                      onChange={(e) => setOrderEditData({ ...orderEditData, total_amount: Number(e.target.value) || 0 })}
                      className="form-input text-sm py-1.5 px-3.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold block uppercase">Advance Received (₹)</label>
                    <input
                      type="number"
                      value={orderEditData.advance_amount}
                      onChange={(e) => setOrderEditData({ ...orderEditData, advance_amount: Number(e.target.value) || 0 })}
                      className="form-input text-sm py-1.5 px-3.5 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold block uppercase">Total Received (₹)</label>
                    <input
                      type="number"
                      value={orderEditData.total_received}
                      onChange={(e) => setOrderEditData({ ...orderEditData, total_received: Number(e.target.value) || 0 })}
                      className="form-input text-sm py-1.5 px-3.5 mt-1 text-emerald-600 dark:text-emerald-400 font-semibold"
                    />
                  </div>
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-3 flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-500">Remaining Balance:</span>
                    <span className="font-bold text-sm text-primary-600">
                      {formatCurrency(Math.max(0, orderEditData.total_amount - orderEditData.total_received))}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1.5">
                    <button
                      onClick={() => updateOrderMutation.mutate({ orderId: selectedOrder.id, updates: orderEditData })}
                      disabled={updateOrderMutation.isPending}
                      className="btn-primary w-full text-xs py-1.5 flex items-center justify-center gap-1"
                    >
                      {updateOrderMutation.isPending ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <SaveIcon style={{ fontSize: 13 }} />
                      )}
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditingOrder(false)}
                      className="btn-secondary w-full text-xs py-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-gray-100 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Cost of Order</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Advance Paid</span>
                    <span className="text-sm font-semibold text-slate-500">{formatCurrency(selectedOrder.advance_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                    <span className="text-xs font-medium">Total Received</span>
                    <span className="text-sm font-semibold">{formatCurrency(selectedOrder.total_received || selectedOrder.advance_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200/60 dark:border-slate-700/60 pt-2.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Remaining Balance</span>
                    <span className={`text-base font-bold ${selectedOrder.remaining_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'}`}>
                      {formatCurrency(selectedOrder.remaining_amount)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm animate-fade-in">
                <div>
                  <p className="text-xs text-gray-400">Delivery Date</p>
                  <p className="font-medium mt-0.5">{selectedOrder.delivery_date ? formatDate(selectedOrder.delivery_date) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Progress</p>
                  <p className="font-semibold text-primary-600 mt-0.5">{selectedOrder.progress_percentage}%</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <p className="text-xs text-gray-400">Special Instructions</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 bg-gray-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-gray-100/50 dark:border-slate-800/50">{selectedOrder.notes}</p>
                </div>
              )}

              {!isEditingOrder && (
                <div className="flex items-center gap-3 pt-2">
                  <Link
                    to={`/orders/${selectedOrder.id}`}
                    className="btn-primary w-full text-center flex items-center justify-center gap-1.5"
                  >
                    View Details Page
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="btn-secondary w-full"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
