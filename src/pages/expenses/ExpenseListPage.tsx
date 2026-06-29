import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { expensesService } from '../../services/expenses.service';
import { formatCurrency, formatDate, getExpenseCategoryLabel, getPaymentMethodLabel } from '../../lib/utils';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import dayjs from 'dayjs';

const CATEGORIES = ['all', 'material_purchase', 'electricity', 'gas_cylinder', 'fuel', 'tea', 'transport', 'machine_repair', 'miscellaneous'];

export default function ExpenseListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuthStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const currentMonth = dayjs().format('YYYY-MM');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', search, category],
    queryFn: () => expensesService.getAll(search, category),
  });

  const { data: monthlyTotal = 0 } = useQuery({
    queryKey: ['expenses-monthly-total', currentMonth],
    queryFn: () => expensesService.getMonthlyTotal(currentMonth),
  });

  const deleteMutation = useMutation({
    mutationFn: expensesService.delete,
    onSuccess: () => { toast.success('Expense deleted'); qc.invalidateQueries({ queryKey: ['expenses'] }); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  const CATEGORY_COLORS: Record<string, string> = {
    material_purchase: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    electricity: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    gas_cylinder: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    fuel: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    tea: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    transport: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    machine_repair: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    miscellaneous: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">This month: {formatCurrency(monthlyTotal)}</p>
        </div>
        <button onClick={() => navigate('/expenses/new')} className="btn-primary">
          <AddIcon style={{ fontSize: 18 }} /> Add Expense
        </button>
      </div>

      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
            <input type="text" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} className="search-input pl-10" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="form-select w-auto">
            {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : getExpenseCategoryLabel(c)}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
        ) : expenses.length === 0 ? (
          <EmptyState icon={ReceiptLongIcon} title="No expenses found" description="Track your shop expenses here"
            action={<button onClick={() => navigate('/expenses/new')} className="btn-primary"><AddIcon style={{ fontSize: 16 }} /> Add Expense</button>} />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Expense #</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Payment</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, i) => (
                    <motion.tr key={expense.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <td className="text-xs text-gray-500">{expense.expense_number}</td>
                      <td>{formatDate(expense.date, 'DD MMM YY')}</td>
                      <td><span className={`badge ${CATEGORY_COLORS[expense.category] || 'bg-gray-100 text-gray-800'}`}>{getExpenseCategoryLabel(expense.category)}</span></td>
                      <td className="max-w-[180px] truncate text-gray-600 dark:text-gray-400">{expense.description || '—'}</td>
                      <td><span className="badge bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">{getPaymentMethodLabel(expense.payment_method)}</span></td>
                      <td className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(expense.amount)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/expenses/${expense.id}/edit`)} className="btn-icon text-gray-600 dark:text-gray-400"><EditIcon style={{ fontSize: 16 }} /></button>
                          {profile?.role === 'owner' && (
                            <button onClick={() => setDeleteId(expense.id)} className="btn-icon text-red-600 dark:text-red-400"><DeleteIcon style={{ fontSize: 16 }} /></button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Total:</td>
                    <td className="px-4 py-3 font-bold text-red-600 dark:text-red-400 text-lg">{formatCurrency(totalExpenses)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog isOpen={!!deleteId} title="Delete Expense" message="Delete this expense record permanently?" confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} isLoading={deleteMutation.isPending} />
    </div>
  );
}
