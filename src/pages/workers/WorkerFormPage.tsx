import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { workersService } from '../../services/workers.service';
import { getSkillLabel } from '../../lib/utils';
import type { WorkerSkill } from '../../types';
import VoiceInputButton from '../../components/ui/VoiceInputButton';

const SKILLS: WorkerSkill[] = ['arc_welding', 'mig_welding', 'tig_welding', 'gas_cutting', 'grinding', 'painting', 'fabrication'];

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().min(10, 'Enter valid mobile number'),
  address: z.string().optional(),
  joining_date: z.string().min(1, 'Joining date is required'),
  daily_wage: z.coerce.number().min(0),
  skills: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive']),
});

type FormData = z.infer<typeof schema>;

export default function WorkerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const { data: worker } = useQuery({ queryKey: ['worker', id], queryFn: () => workersService.getById(id!), enabled: isEdit });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'active', skills: [], joining_date: new Date().toISOString().split('T')[0] },
  });

  const selectedSkills = watch('skills') as string[];

  useEffect(() => {
    if (worker) {
      const { id: _id, created_at, updated_at, worker_id, user_id, photo_url, ...rest } = worker;
      reset(rest as FormData);
      if (photo_url) setPhotoPreview(photo_url);
    }
  }, [worker, reset]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  const toggleSkill = (skill: string) => {
    const current = selectedSkills || [];
    setValue('skills', current.includes(skill) ? current.filter(s => s !== skill) : [...current, skill]);
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      let photoUrl = worker?.photo_url;
      const workerData = { ...data, skills: data.skills as WorkerSkill[] };
      const result = isEdit ? await workersService.update(id!, workerData) : await workersService.create(workerData);
      if (photoFile) {
        photoUrl = await workersService.uploadPhoto(result.id, photoFile);
        await workersService.update(result.id, { photo_url: photoUrl });
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(isEdit ? 'Worker updated!' : 'Worker added!');
      qc.invalidateQueries({ queryKey: ['workers'] });
      navigate(`/workers/${result.id}`);
    },
    onError: () => toast.error('Failed to save worker'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400"><ArrowBackIcon /></button>
        <h1 className="page-title">{isEdit ? 'Edit Worker' : 'Add Worker'}</h1>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
        <div className="card p-6 space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
              {photoPreview ? <img src={photoPreview} alt="Worker" className="w-full h-full object-cover" /> :
                <span className="text-2xl text-gray-400">👷</span>}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary">
              <CloudUploadIcon style={{ fontSize: 16 }} /> Upload Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Full Name *</label>
                <VoiceInputButton onTranscript={(text) => setValue('name', text)} />
              </div>
              <input {...register('name')} className="form-input" placeholder="Worker's full name" />
              {errors.name?.message && <p className="form-error">{String(errors.name.message)}</p>}
            </div>
            <div>
              <label className="form-label">Mobile *</label>
              <input {...register('mobile')} className="form-input" placeholder="9876543210" />
              {errors.mobile?.message && <p className="form-error">{String(errors.mobile.message)}</p>}
            </div>
            <div>
              <label className="form-label">Daily Wage (₹)</label>
              <input {...register('daily_wage')} type="number" min="0" className="form-input" placeholder="500" />
            </div>
            <div>
              <label className="form-label">Joining Date</label>
              <input {...register('joining_date')} type="date" className="form-input" />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select {...register('status')} className="form-select">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Address</label>
                <VoiceInputButton onTranscript={(text) => setValue('address', text)} />
              </div>
              <textarea {...register('address')} className="form-input" rows={2} placeholder="Worker's address..." />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map(skill => (
              <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedSkills?.includes(skill) ? 'bg-primary-700 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}>
                {getSkillLabel(skill)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isEdit ? 'Update Worker' : 'Add Worker'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
