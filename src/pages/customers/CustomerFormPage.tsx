import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { customersService } from '../../services/customers.service';
import type { CustomerFormData } from '../../types';
import VoiceInputButton from '../../components/ui/VoiceInputButton';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Enter valid mobile number'),
  whatsapp: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

type FormData = z.infer<typeof schema>;

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersService.getById(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'active' },
  });

  useEffect(() => {
    if (customer) reset(customer as FormData);
  }, [customer, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => isEdit
      ? customersService.update(id!, data as CustomerFormData)
      : customersService.create(data as CustomerFormData),
    onSuccess: (result) => {
      toast.success(isEdit ? 'Customer updated!' : 'Customer created!');
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate(`/customers/${result.id}`);
    },
    onError: () => toast.error('Failed to save customer'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400">
          <ArrowBackIcon />
        </button>
        <h1 className="page-title">{isEdit ? 'Edit Customer' : 'New Customer'}</h1>
      </div>

      <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Customer Name *</label>
              <VoiceInputButton onTranscript={(text) => setValue('name', text)} />
            </div>
            <input {...register('name')} className="form-input" placeholder="e.g., Rajesh Sharma" />
            {errors.name?.message && <p className="form-error">{String(errors.name.message)}</p>}
          </div>

          <div>
            <label className="form-label">Mobile Number *</label>
            <input {...register('mobile')} className="form-input" placeholder="9876543210" />
            {errors.mobile?.message && <p className="form-error">{String(errors.mobile.message)}</p>}
          </div>

          <div>
            <label className="form-label">WhatsApp Number</label>
            <input {...register('whatsapp')} className="form-input" placeholder="Same as mobile if same" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">City</label>
              <VoiceInputButton onTranscript={(text) => setValue('city', text)} />
            </div>
            <input {...register('city')} className="form-input" placeholder="e.g., Pune" />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Address</label>
              <VoiceInputButton onTranscript={(text) => setValue('address', text)} />
            </div>
            <textarea {...register('address')} className="form-input" rows={2} placeholder="Full address..." />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Notes</label>
              <VoiceInputButton onTranscript={(text) => setValue('notes', text)} />
            </div>
            <textarea {...register('notes')} className="form-input" rows={2} placeholder="Any special notes about this customer..." />
          </div>

          <div>
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-select">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {isEdit ? 'Update Customer' : 'Create Customer'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
