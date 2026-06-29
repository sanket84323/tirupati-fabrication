import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EngineeringIcon from '@mui/icons-material/Engineering';
import CallIcon from '@mui/icons-material/Call';
import { workersService } from '../../services/workers.service';
import { getSkillLabel } from '../../lib/utils';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';

export default function WorkerListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuthStore();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['workers', search],
    queryFn: () => workersService.getAll(search, 'active'),
  });

  const deleteMutation = useMutation({
    mutationFn: workersService.delete,
    onSuccess: () => { toast.success('Worker removed'); qc.invalidateQueries({ queryKey: ['workers'] }); setDeleteId(null); },
    onError: () => toast.error('Failed to remove worker'),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Workers</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{workers.length} active workers</p>
        </div>
        {profile?.role === 'owner' && (
          <button onClick={() => navigate('/workers/new')} className="btn-primary"><AddIcon style={{ fontSize: 18 }} /> Add Worker</button>
        )}
      </div>

      <div className="card p-5">
        <div className="relative mb-5">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
          <input type="text" placeholder="Search workers..." value={search} onChange={e => setSearch(e.target.value)} className="search-input pl-10" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
          </div>
        ) : workers.length === 0 ? (
          <EmptyState icon={EngineeringIcon} title="No workers found" description="Add your first worker"
            action={<button onClick={() => navigate('/workers/new')} className="btn-primary"><AddIcon style={{ fontSize: 16 }} /> Add Worker</button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers.map((worker, i) => (
              <motion.div key={worker.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                className="card p-5 hover:shadow-card-hover transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {worker.photo_url ? <img src={worker.photo_url} alt={worker.name} className="w-full h-full object-cover" /> :
                      <span className="text-primary-700 dark:text-primary-400 font-bold text-lg">{worker.name.charAt(0)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/workers/${worker.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate block">
                      {worker.name}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{worker.worker_id}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">₹{worker.daily_wage}/day</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {(worker.skills || []).slice(0, 3).map(s => (
                    <span key={s} className="badge bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs">{getSkillLabel(s)}</span>
                  ))}
                  {(worker.skills || []).length > 3 && <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 text-xs">+{worker.skills.length - 3}</span>}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                  <a href={`tel:${worker.mobile}`} className="btn-icon text-blue-600 dark:text-blue-400 flex-1 justify-center border border-gray-200 dark:border-slate-600 rounded-lg py-1.5">
                    <CallIcon style={{ fontSize: 16 }} />
                  </a>
                  <button onClick={() => navigate(`/workers/${worker.id}/edit`)} className="btn-icon text-gray-600 dark:text-gray-400 flex-1 justify-center border border-gray-200 dark:border-slate-600 rounded-lg py-1.5">
                    <EditIcon style={{ fontSize: 16 }} />
                  </button>
                  {profile?.role === 'owner' && (
                    <button onClick={() => setDeleteId(worker.id)} className="btn-icon text-red-600 dark:text-red-400 flex-1 justify-center border border-gray-200 dark:border-slate-600 rounded-lg py-1.5">
                      <DeleteIcon style={{ fontSize: 16 }} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog isOpen={!!deleteId} title="Remove Worker" message="Are you sure you want to remove this worker?"
        confirmLabel="Remove" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} isLoading={deleteMutation.isPending} />
    </div>
  );
}
