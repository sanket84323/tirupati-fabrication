import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { expensesService } from '../../services/expenses.service';
import { getExpenseCategoryLabel } from '../../lib/utils';
import VoiceInputButton from '../../components/ui/VoiceInputButton';

const EXPENSE_CATEGORIES = ['material_purchase', 'electricity', 'gas_cylinder', 'fuel', 'tea', 'transport', 'machine_repair', 'miscellaneous'] as const;

const schema = z.object({
  date: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque']),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ExpenseFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');

  const { data: expense } = useQuery({
    queryKey: ['expense', id],
    queryFn: () => expensesService.getById(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: new Date().toISOString().split('T')[0], category: 'miscellaneous', payment_method: 'cash' },
  });

  useEffect(() => {
    if (expense) {
      const { id: _id, expense_number, created_at, updated_at, created_by, receipt_url, ...rest } = expense;
      reset(rest as FormData);
      if (expense.receipt_url) setReceiptPreview(expense.receipt_url);
    }
  }, [expense, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const result = isEdit
        ? await expensesService.update(id!, data)
        : await expensesService.create(data);
      if (receiptFile) {
        const receiptUrl = await expensesService.uploadReceipt(result.id, receiptFile);
        await expensesService.update(result.id, { receipt_url: receiptUrl });
      }
      return result;
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Expense updated!' : 'Expense recorded!');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      navigate('/expenses');
    },
    onError: () => toast.error('Failed to save expense'),
  });

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400"><ArrowBackIcon /></button>
        <h1 className="page-title">{isEdit ? 'Edit Expense' : 'Add Expense'}</h1>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Date *</label>
            <input {...register('date')} type="date" className="form-input" />
          </div>
          <div>
            <label className="form-label">Amount (₹) *</label>
            <input {...register('amount')} type="number" min="1" step="0.01" className="form-input" placeholder="0" />
            {errors.amount?.message && <p className="form-error">{String(errors.amount.message)}</p>}
          </div>
          <div>
            <label className="form-label">Category *</label>
            <select {...register('category')} className="form-select">
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{getExpenseCategoryLabel(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Payment Method</label>
            <select {...register('payment_method')} className="form-select">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Description</label>
              <VoiceInputButton onTranscript={(text) => setValue('description', text)} />
            </div>
            <textarea {...register('description')} className="form-input" rows={2} placeholder="What was this expense for?" />
          </div>

          {/* Receipt Upload */}
          <div className="col-span-2">
            <label className="form-label">Receipt (optional)</label>
            {receiptPreview && (
              <div className="mb-2 w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600">
                <img src={receiptPreview} alt="Receipt" className="w-full h-full object-cover" />
              </div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary w-full">
              <CloudUploadIcon style={{ fontSize: 16 }} /> {receiptPreview ? 'Change Receipt' : 'Upload Receipt'}
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (f) { setReceiptFile(f); if (f.type.startsWith('image/')) setReceiptPreview(URL.createObjectURL(f)); }
            }} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isEdit ? 'Update Expense' : 'Record Expense'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
