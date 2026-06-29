import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import GlobalSearch from '../ui/GlobalSearch';
import { useUIStore } from '../../store/uiStore';

export default function AppLayout() {
  const { isSearchOpen } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <Sidebar mobile />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav />

        <motion.main
          className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-thin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.main>
      </div>

      {/* Global Search Modal */}
      {isSearchOpen && <GlobalSearch />}
    </div>
  );
}
