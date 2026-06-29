import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Control, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { invoicesService } from '../../services/invoices.service';
import { customersService } from '../../services/customers.service';
import { ordersService } from '../../services/orders.service';
import { formatCurrency } from '../../lib/utils';
import VoiceInputButton from '../../components/ui/VoiceInputButton';

const schema = z.object({
  customer_id: z.string().min(1, 'Select a customer'),
  order_id: z.string().optional(),
  product_name: z.string().min(2, 'Product name is required'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1),
  unit: z.string().default('pcs'),
  unit_price: z.coerce.number().min(0),
  tax_percentage: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0),
  advance_paid: z.coerce.number().min(0),
  invoice_date: z.string().min(1),
  terms: z.string().optional(),
  status: z.enum(['unpaid', 'partial', 'paid']),
});

type FormData = z.infer<typeof schema>;

function TotalsPreview({ control }: { control: Control<any> }) {
  const values = useWatch({ control, name: ['quantity', 'unit_price', 'tax_percentage', 'discount', 'advance_paid'] });
  const subtotal = (Number(values[0]) || 0) * (Number(values[1]) || 0);
  const taxAmount = subtotal * (Number(values[2]) || 0) / 100;
  const total = subtotal + taxAmount - (Number(values[3]) || 0);
  const remaining = Math.max(0, total - (Number(values[4]) || 0));

  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
      {Number(values[2]) > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax ({values[2]}%)</span><span>{formatCurrency(taxAmount)}</span></div>}
      {Number(values[3]) > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatCurrency(Number(values[3]))}</span></div>}
      <div className="flex justify-between font-bold border-t border-gray-200 dark:border-slate-600 pt-2"><span>Total Amount</span><span className="text-primary-700 dark:text-primary-400">{formatCurrency(total)}</span></div>
      <div className="flex justify-between text-green-600"><span>Total Received</span><span>-{formatCurrency(Number(values[4]))}</span></div>
      <div className={`flex justify-between font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}><span>Balance Due</span><span>{formatCurrency(remaining)}</span></div>
    </div>
  );
}

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { data: customers = [] } = useQuery({ queryKey: ['customers-list'], queryFn: () => customersService.getAll() });
  const { data: orders = [] } = useQuery({ queryKey: ['orders-list'], queryFn: () => ordersService.getAll() });
  const { data: invoice } = useQuery({ queryKey: ['invoice', id], queryFn: () => invoicesService.getById(id!), enabled: isEdit });

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'unpaid', quantity: 1, unit_price: 0, tax_percentage: 0, discount: 0, advance_paid: 0, unit: 'pcs', invoice_date: new Date().toISOString().split('T')[0] },
  });

  useEffect(() => {
    if (invoice) {
      const { id: _id, created_at, updated_at, created_by, invoice_number, customer, order, subtotal, tax_amount, total_amount, remaining_amount, ...rest } = invoice;
      reset(rest as FormData);
    }
  }, [invoice, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const subtotal = Number(data.quantity) * Number(data.unit_price);
      const taxAmount = subtotal * Number(data.tax_percentage) / 100;
      const total = subtotal + taxAmount - Number(data.discount);
      const remaining = Math.max(0, total - Number(data.advance_paid));
      const payload = { 
        ...data, 
        subtotal, 
        tax_amount: taxAmount, 
        total_amount: total, 
        remaining_amount: remaining, 
        order_id: data.order_id || null,
        description: data.description || null,
        terms: data.terms || null
      };
      return isEdit ? invoicesService.update(id!, payload) : invoicesService.create(payload as Parameters<typeof invoicesService.create>[0]);
    },
    onSuccess: (result) => {
      toast.success(isEdit ? 'Invoice updated!' : 'Invoice created!');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      navigate(`/invoices/${result.id}`);
    },
    onError: () => toast.error('Failed to save invoice'),
  });

  const customerId = watch('customer_id');

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400"><ArrowBackIcon /></button>
        <h1 className="page-title">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Customer *</label>
              <select {...register('customer_id')} className="form-select">
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
              </select>
              {errors.customer_id?.message && <p className="form-error">{String(errors.customer_id.message)}</p>}
            </div>
            <div>
              <label className="form-label">Related Order (optional)</label>
              <select {...register('order_id')} className="form-select">
                <option value="">None</option>
                {orders.filter(o => !customerId || o.customer_id === customerId).map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.product_name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Product Name *</label>
                <VoiceInputButton onTranscript={(text) => setValue('product_name', text)} />
              </div>
              <input {...register('product_name')} className="form-input" placeholder="e.g., MS Gate 6ft x 4ft" />
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Description</label>
                <VoiceInputButton onTranscript={(text) => setValue('description', text)} />
              </div>
              <textarea {...register('description')} className="form-input" rows={2} placeholder="Product description..." />
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
            <div>
              <label className="form-label">Unit Price (₹)</label>
              <input {...register('unit_price')} type="number" min="0" step="0.01" className="form-input" />
            </div>
            <div>
              <label className="form-label">Tax (%)</label>
              <input {...register('tax_percentage')} type="number" min="0" max="100" className="form-input" />
            </div>
            <div>
              <label className="form-label">Discount (₹)</label>
              <input {...register('discount')} type="number" min="0" className="form-input" />
            </div>
            <div>
              <label className="form-label">Total Received (₹)</label>
              <input {...register('advance_paid')} type="number" min="0" step="0.01" className="form-input" placeholder="Enter total amount received so far" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Advance + all subsequent payments received</p>
            </div>
            <div>
              <label className="form-label">Invoice Date</label>
              <input {...register('invoice_date')} type="date" className="form-input" />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select {...register('status')} className="form-select">
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <TotalsPreview control={control} />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Terms & Conditions</label>
              <VoiceInputButton onTranscript={(text) => setValue('terms', text)} />
            </div>
            <textarea {...register('terms')} className="form-input" rows={2} placeholder="Payment terms, bank details..." />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
