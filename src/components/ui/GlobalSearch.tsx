import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DescriptionIcon from '@mui/icons-material/Description';
import InventoryIcon from '@mui/icons-material/Inventory';
import EngineeringIcon from '@mui/icons-material/Engineering';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { useUIStore } from '../../store/uiStore';
import { supabase } from '../../lib/supabase';
import type { SearchResult } from '../../types';

export default function GlobalSearch() {
  const { setSearchOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setSearchOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const q = query.trim();
        const [customers, orders, quotations, workers, inventory] = await Promise.all([
          supabase.from('customers').select('id, name, mobile, city').ilike('name', `%${q}%`).limit(3),
          supabase.from('orders').select('id, order_number, product_name, status').or(`order_number.ilike.%${q}%,product_name.ilike.%${q}%`).limit(3),
          supabase.from('quotations').select('id, quotation_number, product_name, status').or(`quotation_number.ilike.%${q}%,product_name.ilike.%${q}%`).limit(3),
          supabase.from('workers').select('id, name, worker_id').or(`name.ilike.%${q}%,worker_id.ilike.%${q}%`).limit(3),
          supabase.from('inventory').select('id, name, category').ilike('name', `%${q}%`).limit(3),
        ]);

        const searchResults: SearchResult[] = [
          ...(customers.data || []).map(c => ({
            id: c.id, type: 'customer' as const,
            title: c.name, subtitle: `Customer · ${c.mobile}`, url: `/customers/${c.id}`
          })),
          ...(orders.data || []).map(o => ({
            id: o.id, type: 'order' as const,
            title: `${o.order_number} — ${o.product_name}`, subtitle: `Order · ${o.status}`, url: `/orders/${o.id}`
          })),
          ...(quotations.data || []).map(q => ({
            id: q.id, type: 'quotation' as const,
            title: `${q.quotation_number} — ${q.product_name}`, subtitle: `Quotation · ${q.status}`, url: `/quotations/${q.id}`
          })),
          ...(workers.data || []).map(w => ({
            id: w.id, type: 'worker' as const,
            title: w.name, subtitle: `Worker · ${w.worker_id}`, url: `/workers/${w.id}`
          })),
          ...(inventory.data || []).map(i => ({
            id: i.id, type: 'inventory' as const,
            title: i.name, subtitle: `Inventory · ${i.category}`, url: `/inventory`
          })),
        ];

        setResults(searchResults);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const typeIcons: Record<string, React.ElementType> = {
    customer: PeopleIcon,
    order: ShoppingCartIcon,
    quotation: DescriptionIcon,
    inventory: InventoryIcon,
    worker: EngineeringIcon,
    invoice: RequestQuoteIcon,
  };

  const typeColors: Record<string, string> = {
    customer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    order: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    quotation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    inventory: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    worker: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    invoice: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        onClick={() => setSearchOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="modal-content max-w-xl p-0 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <SearchIcon className="text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search customers, orders, quotations..."
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 text-sm outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <CloseIcon style={{ fontSize: 18 }} />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                No results found for "{query}"
              </div>
            )}

            {!isLoading && results.length > 0 && results.map(result => {
              const Icon = typeIcons[result.type] || SearchIcon;
              return (
                <button
                  key={result.id}
                  onClick={() => { navigate(result.url); setSearchOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[result.type]}`}>
                    <Icon style={{ fontSize: 16 }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{result.subtitle}</p>
                  </div>
                </button>
              );
            })}

            {!query && (
              <div className="px-4 py-6 text-center">
                <SearchIcon className="text-gray-300 dark:text-slate-600" style={{ fontSize: 40 }} />
                <p className="mt-2 text-sm text-gray-400">Type to search across all modules</p>
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 flex items-center gap-4 text-xs text-gray-400">
            <span>Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded">ESC</kbd> to close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
