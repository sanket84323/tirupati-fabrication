import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { quotationsService } from '../../services/quotations.service';
import { customersService } from '../../services/customers.service';
import { calculateQuotationTotal, formatCurrency } from '../../lib/utils';
import VoiceInputButton from '../../components/ui/VoiceInputButton';

const schema = z.object({
  customer_id: z.string().min(1, 'Select a customer'),
  quotation_date: z.string().min(1, 'Date is required'),
  product_name: z.string().min(2, 'Product name is required'),
  description: z.string().optional(),
  material: z.string().optional(),
  quantity: z.coerce.number().min(1),
  unit: z.string().default('pcs'),
  material_cost: z.coerce.number().min(0),
  labour_cost: z.coerce.number().min(0),
  transport_cost: z.coerce.number().min(0),
  other_charges: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected']),
});

type FormData = z.infer<typeof schema>;

function TotalCalculator({ control }: { control: Control<any> }) {
  const values = useWatch({ control, name: ['material_cost', 'labour_cost', 'transport_cost', 'other_charges', 'discount'] });
  const total = calculateQuotationTotal(
    Number(values[0]) || 0, Number(values[1]) || 0, Number(values[2]) || 0, Number(values[3]) || 0, Number(values[4]) || 0
  );
  return (
    <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 text-center">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Amount</p>
      <p className="text-3xl font-bold text-primary-700 dark:text-primary-400 mt-1">{formatCurrency(total)}</p>
    </div>
  );
}

export default function QuotationFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    mobile: '',
    whatsapp: '',
    city: '',
    address: '',
    notes: '',
    status: 'active' as 'active' | 'inactive'
  });

  const { data: customers = [] } = useQuery({ queryKey: ['customers-list'], queryFn: () => customersService.getAll() });
  const { data: quotation } = useQuery({ queryKey: ['quotation', id], queryFn: () => quotationsService.getById(id!), enabled: isEdit });

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'draft', quantity: 1, material_cost: 0, labour_cost: 0, transport_cost: 0, other_charges: 0, discount: 0, unit: 'pcs', quotation_date: new Date().toISOString().split('T')[0] },
  });

  useEffect(() => {
    if (quotation) {
      const { id: _id, created_at, updated_at, customer, quotation_number, ...rest } = quotation;
      reset(rest as FormData);
    }
  }, [quotation, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const matCost = Number(data.material_cost) || 0;
      const labCost = Number(data.labour_cost) || 0;
      const transCost = Number(data.transport_cost) || 0;
      const otherCost = Number(data.other_charges) || 0;
      const disc = Number(data.discount) || 0;
      const total = calculateQuotationTotal(matCost, labCost, transCost, otherCost, disc);
      const payload = { ...data, total_amount: total };
      return isEdit ? quotationsService.update(id!, payload) : quotationsService.create(payload as Parameters<typeof quotationsService.create>[0]);
    },
    onSuccess: (result) => {
      toast.success(isEdit ? 'Quotation updated!' : 'Quotation created!');
      qc.invalidateQueries({ queryKey: ['quotations'] });
      navigate(`/quotations/${result.id}`);
    },
    onError: () => toast.error('Failed to save quotation'),
  });

  const quickCustomerMutation = useMutation({
    mutationFn: (data: typeof newCustomer) => customersService.create(data as any),
    onSuccess: (result) => {
      toast.success('Customer created!');
      qc.invalidateQueries({ queryKey: ['customers-list'] });
      setValue('customer_id', result.id);
      setIsCustomerModalOpen(false);
      setNewCustomer({ name: '', mobile: '', whatsapp: '', city: '', address: '', notes: '', status: 'active' });
    },
    onError: () => toast.error('Failed to create customer'),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400"><ArrowBackIcon /></button>
        <h1 className="page-title">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-3">Basic Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Customer *</label>
                <button type="button" onClick={() => setIsCustomerModalOpen(true)} className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold focus:outline-none">
                  + Add Customer
                </button>
              </div>
              <select {...register('customer_id')} className="form-select">
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
              </select>
              {errors.customer_id?.message && <p className="form-error">{String(errors.customer_id.message)}</p>}
            </div>
            <div>
              <label className="form-label">Quotation Date *</label>
              <input {...register('quotation_date')} type="date" className="form-input" />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select {...register('status')} className="form-select">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
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
              <textarea {...register('description')} className="form-input" rows={2} placeholder="Product specifications, design details..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Material</label>
                <VoiceInputButton onTranscript={(text) => setValue('material', text)} />
              </div>
              <input {...register('material')} className="form-input" placeholder="e.g., MS Pipe, Steel Sheet" />
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
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-3">Cost Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Material Cost (₹)', key: 'material_cost' },
              { label: 'Labour Cost (₹)', key: 'labour_cost' },
              { label: 'Transport Cost (₹)', key: 'transport_cost' },
              { label: 'Other Charges (₹)', key: 'other_charges' },
              { label: 'Discount (₹)', key: 'discount' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                <input {...register(key as keyof FormData)} type="number" min="0" step="0.01" className="form-input" defaultValue="0" />
              </div>
            ))}
            <div className="sm:col-span-1">
              <TotalCalculator control={control} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0">Notes / Terms</label>
            <VoiceInputButton onTranscript={(text) => setValue('notes', text)} />
          </div>
          <textarea {...register('notes')} className="form-input" rows={3} placeholder="Payment terms, special conditions..." />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isEdit ? 'Update Quotation' : 'Create Quotation'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </form>
      
      {/* ── Quick Add Customer Modal ── */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white">Quick Add Customer</h3>
              <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CloseIcon />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="form-label text-xs">Full Name *</label>
                <input
                  type="text" required
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="form-input text-sm py-2"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div>
                <label className="form-label text-xs">Mobile Number *</label>
                <input
                  type="tel" required
                  value={newCustomer.mobile}
                  onChange={e => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                  className="form-input text-sm py-2"
                  placeholder="10-digit number"
                />
              </div>
              <div>
                <label className="form-label text-xs">City/Village</label>
                <input
                  type="text"
                  value={newCustomer.city}
                  onChange={e => setNewCustomer({ ...newCustomer, city: e.target.value })}
                  className="form-input text-sm py-2"
                  placeholder="e.g. Pune"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex gap-3 justify-end">
              <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  if (!newCustomer.name || !newCustomer.mobile) {
                    toast.error('Name and mobile are required');
                    return;
                  }
                  quickCustomerMutation.mutate(newCustomer);
                }}
                disabled={quickCustomerMutation.isPending}
                className="btn-primary text-sm py-2 px-6"
              >
                {quickCustomerMutation.isPending ? 'Saving...' : 'Save & Select'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
