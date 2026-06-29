import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import toast from 'react-hot-toast';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';

export default function TopNav() {
  const { toggleSidebar, toggleDarkMode, isDarkMode, setSearchOpen } = useUIStore();
  const { profile, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center gap-4 px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="btn-icon lg:hidden text-gray-600 dark:text-gray-300"
        aria-label="Toggle sidebar"
      >
        <MenuIcon />
      </button>

      {/* Search */}
      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex-1 max-w-xs"
      >
        <SearchIcon style={{ fontSize: 18 }} />
        <span className="hidden sm:block">Search...</span>
        <span className="ml-auto hidden sm:flex items-center gap-1 text-xs bg-gray-200 dark:bg-slate-600 px-1.5 py-0.5 rounded">
          <kbd className="font-sans">⌘K</kbd>
        </span>
      </button>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="btn-icon text-gray-600 dark:text-gray-300"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <LightModeIcon style={{ fontSize: 20 }} /> : <DarkModeIcon style={{ fontSize: 20 }} />}
        </button>

        {/* Notifications */}
        <Link to="/notifications" className="btn-icon text-gray-600 dark:text-gray-300 relative">
          <NotificationsIcon style={{ fontSize: 20 }} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Link>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile?.role || 'owner'}</p>
            </div>
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 card shadow-modal py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile?.role}</p>
              </div>
              <Link
                to="/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                onClick={() => setShowUserMenu(false)}
              >
                <PersonIcon style={{ fontSize: 18 }} />
                Profile & Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogoutIcon style={{ fontSize: 18 }} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
