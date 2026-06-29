import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import EngineeringIcon from '@mui/icons-material/Engineering';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentIcon from '@mui/icons-material/Payment';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import BuildIcon from '@mui/icons-material/Build';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';

const navGroups = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Customers', icon: PeopleIcon, path: '/customers' },
      { label: 'Quotations', icon: DescriptionIcon, path: '/quotations' },
      { label: 'Orders', icon: ShoppingCartIcon, path: '/orders' },
      { label: 'Invoices', icon: RequestQuoteIcon, path: '/invoices' },
      { label: 'Payments', icon: PaymentIcon, path: '/payments' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Inventory', icon: InventoryIcon, path: '/inventory' },
      { label: 'Workers', icon: EngineeringIcon, path: '/workers' },
      { label: 'Attendance', icon: CalendarMonthIcon, path: '/attendance' },
      { label: 'Expenses', icon: ReceiptLongIcon, path: '/expenses' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', icon: BarChartIcon, path: '/reports' },
      { label: 'Settings', icon: SettingsIcon, path: '/settings' },
    ],
  },
];

interface SidebarProps {
  mobile?: boolean;
}

export default function Sidebar({ mobile = false }: SidebarProps) {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        <Link to="/dashboard" className="flex items-center gap-3" onClick={() => mobile && setSidebarOpen(false)}>
          <img
            src="/logo.png"
            alt="Tirupati Fabrication Logo"
            className="w-10 h-10 rounded-xl object-cover border-2 border-amber-400 shadow-md bg-white shrink-0"
          />
          <div>
            <p className="text-white font-bold text-sm leading-tight">Tirupati</p>
            <p className="text-primary-300 text-xs font-medium">Fabrication</p>
          </div>
        </Link>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white/70 hover:text-white transition-colors"
          >
            <CloseIcon fontSize="small" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-primary-300/60 uppercase tracking-widest px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => mobile && setSidebarOpen(false)}
                    className={cn(
                      'nav-item',
                      isActive
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-primary-100/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon style={{ fontSize: 18 }} className={isActive ? 'text-amber-400' : ''} />
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-slow" />
          <span className="text-xs text-primary-300">System Online</span>
        </div>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <>
        {/* Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-primary-900 to-primary-950 z-50 lg:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-primary-900 to-primary-950 flex-shrink-0 h-screen sticky top-0">
      {sidebarContent}
    </aside>
  );
}
