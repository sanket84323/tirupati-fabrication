import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory';
import { inventoryService } from '../../services/inventory.service';
import { formatCurrency } from '../../lib/utils';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { motion as m, AnimatePresence } from 'framer-motion';
import type { InventoryItem } from '../../types';

const CATEGORIES = ['all', 'MS Pipe', 'GI Pipe', 'SS Pipe', 'Steel Sheet', 'Channel', 'Angle', 'Flat', 'Round Pipe', 'Welding Rod', 'Welding Wire', 'Gas Cylinder', 'Paint', 'Primer', 'Grinding Wheel'];

function InventoryFormModal({ item, onClose, onSave }: { item?: InventoryItem; onClose: () => void; onSave: (data: Partial<InventoryItem>) => void }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || 'MS Pipe',
    unit: item?.unit || 'pcs',
    quantity_available: item?.quantity_available || 0,
    minimum_stock: item?.minimum_stock || 5,
    purchase_price: item?.purchase_price || 0,
    supplier: item?.supplier || '',
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{item ? 'Edit Item' : 'Add Inventory Item'}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="form-label">Item Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="form-input" placeholder="e.g., MS Pipe 2 inch" />
            </div>
            <div>
              <label className="form-label">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as InventoryItem['category'] }))} className="form-select">
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Unit</label>
              <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} className="form-select">
                {['pcs', 'kg', 'meter', 'liter', 'feet', 'set', 'roll'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Quantity Available</label>
              <input type="number" value={form.quantity_available} onChange={e => setForm(p => ({ ...p, quantity_available: +e.target.value }))} className="form-input" min="0" />
            </div>
            <div>
              <label className="form-label">Minimum Stock</label>
              <input type="number" value={form.minimum_stock} onChange={e => setForm(p => ({ ...p, minimum_stock: +e.target.value }))} className="form-input" min="0" />
            </div>
            <div>
              <label className="form-label">Purchase Price (₹)</label>
              <input type="number" value={form.purchase_price} onChange={e => setForm(p => ({ ...p, purchase_price: +e.target.value }))} className="form-input" min="0" />
            </div>
            <div>
              <label className="form-label">Supplier</label>
              <input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} className="form-input" placeholder="Supplier name" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => onSave(form)} className="btn-primary flex-1">Save</button>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StockAdjustModal({ item, onClose, onAdjust }: { item: InventoryItem; onClose: () => void; onAdjust: (action: 'add' | 'reduce', qty: number, notes?: string) => void }) {
  const [action, setAction] = useState<'add' | 'reduce'>('add');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-content max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Adjust Stock</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{item.name} · Current: {item.quantity_available} {item.unit}</p>
        <div className="space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600">
            <button onClick={() => setAction('add')} className={`flex-1 py-2.5 text-sm font-medium transition-all ${action === 'add' ? 'bg-green-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}>
              <AddCircleIcon style={{ fontSize: 16, marginRight: 4 }} />Add Stock
            </button>
            <button onClick={() => setAction('reduce')} className={`flex-1 py-2.5 text-sm font-medium transition-all ${action === 'reduce' ? 'bg-red-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}>
              <RemoveCircleIcon style={{ fontSize: 16, marginRight: 4 }} />Reduce Stock
            </button>
          </div>
          <div>
            <label className="form-label">Quantity ({item.unit})</label>
            <input type="number" value={qty} onChange={e => setQty(+e.target.value)} min="1" className="form-input" />
          </div>
          <div>
            <label className="form-label">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="form-input" placeholder="Reason for adjustment..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => onAdjust(action, qty, notes)} className={`flex-1 ${action === 'add' ? 'btn-success' : 'btn-danger'}`}>Confirm</button>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const { profile } = useAuthStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', search, category],
    queryFn: () => inventoryService.getAll(search, category),
  });

  const lowStockItems = items.filter(i => i.quantity_available <= i.minimum_stock);

  const createMutation = useMutation({
    mutationFn: inventoryService.create,
    onSuccess: () => { toast.success('Item added!'); qc.invalidateQueries({ queryKey: ['inventory'] }); setShowAddModal(false); },
    onError: () => toast.error('Failed to add item'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) => inventoryService.update(id, data),
    onSuccess: () => { toast.success('Item updated!'); qc.invalidateQueries({ queryKey: ['inventory'] }); setEditItem(null); },
    onError: () => toast.error('Failed to update item'),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, action, qty, notes }: { id: string; action: 'add' | 'reduce'; qty: number; notes?: string }) =>
      inventoryService.adjustStock(id, action, qty, notes),
    onSuccess: () => { toast.success('Stock adjusted!'); qc.invalidateQueries({ queryKey: ['inventory'] }); setAdjustItem(null); },
    onError: () => toast.error('Failed to adjust stock'),
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryService.delete,
    onSuccess: () => { toast.success('Item deleted'); qc.invalidateQueries({ queryKey: ['inventory'] }); setDeleteId(null); },
    onError: () => toast.error('Failed to delete'),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{items.length} items · {lowStockItems.length} low stock</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <AddIcon style={{ fontSize: 18 }} /> Add Item
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <WarningAmberIcon className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">Low Stock Alert</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {lowStockItems.map(i => i.name).join(', ')} — need restocking
            </p>
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
            <input type="text" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} className="search-input pl-10" />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="form-select w-auto">
            {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12 rounded" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={InventoryIcon} title="No inventory items" description="Start adding your materials and supplies"
            action={<button onClick={() => setShowAddModal(true)} className="btn-primary"><AddIcon style={{ fontSize: 16 }} /> Add Item</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Available</th>
                  <th>Min. Stock</th>
                  <th>Price/Unit</th>
                  <th>Supplier</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const isLow = item.quantity_available <= item.minimum_stock;
                  return (
                    <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {isLow && <WarningAmberIcon className="text-amber-500" style={{ fontSize: 14 }} />}
                        </div>
                      </td>
                      <td><span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{item.category}</span></td>
                      <td className={`font-semibold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {item.quantity_available} {item.unit}
                      </td>
                      <td className="text-gray-500">{item.minimum_stock} {item.unit}</td>
                      <td>{item.purchase_price > 0 ? formatCurrency(item.purchase_price) : '—'}</td>
                      <td>{item.supplier || '—'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAdjustItem(item)} className="btn-icon text-green-600 dark:text-green-400" title="Adjust Stock"><AddCircleIcon style={{ fontSize: 16 }} /></button>
                          <button onClick={() => setEditItem(item)} className="btn-icon text-gray-600 dark:text-gray-400" title="Edit"><EditIcon style={{ fontSize: 16 }} /></button>
                          {profile?.role === 'owner' && (
                            <button onClick={() => setDeleteId(item.id)} className="btn-icon text-red-600 dark:text-red-400" title="Delete"><DeleteIcon style={{ fontSize: 16 }} /></button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showAddModal || editItem) && (
        <InventoryFormModal
          item={editItem || undefined}
          onClose={() => { setShowAddModal(false); setEditItem(null); }}
          onSave={(data) => editItem ? updateMutation.mutate({ id: editItem.id, data }) : createMutation.mutate(data as Parameters<typeof inventoryService.create>[0])}
        />
      )}

      {adjustItem && (
        <StockAdjustModal
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onAdjust={(action, qty, notes) => adjustMutation.mutate({ id: adjustItem.id, action, qty, notes })}
        />
      )}

      <ConfirmDialog isOpen={!!deleteId} title="Delete Item" message="Delete this inventory item permanently?" confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} isLoading={deleteMutation.isPending} />
    </div>
  );
}
