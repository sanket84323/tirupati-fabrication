import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import PaletteIcon from '@mui/icons-material/Palette';
import StorageIcon from '@mui/icons-material/Storage';
import LogoutIcon from '@mui/icons-material/Logout';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { supabase } from '../../lib/supabase';

export default function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useUIStore();
  const [activeTab, setActiveTab] = useState('profile');

  const { register: regProfile, handleSubmit: submitProfile } = useForm({
    defaultValues: { full_name: profile?.full_name || '', mobile: profile?.mobile || '' },
  });

  const { register: regPassword, handleSubmit: submitPassword, reset: resetPass } = useForm<{ password: string; confirmPassword: string }>();

  const profileMutation = useMutation({
    mutationFn: async (data: { full_name: string; mobile: string }) => {
      if (!profile) return;
      const { error } = await supabase.from('profiles').update(data).eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Profile updated!'); qc.invalidateQueries({ queryKey: ['profile'] }); },
    onError: () => toast.error('Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { password: string; confirmPassword: string }) => {
      if (data.password !== data.confirmPassword) throw new Error('Passwords do not match');
      await authService.resetPassword(data.password);
    },
    onSuccess: () => { toast.success('Password updated!'); resetPass(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleLogout = async () => {
    await authService.signOut();
    logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const TABS = [
    { id: 'profile', label: 'Profile', icon: PersonIcon },
    { id: 'appearance', label: 'Appearance', icon: PaletteIcon },
    { id: 'security', label: 'Security', icon: LockIcon },
    { id: 'data', label: 'Data', icon: StorageIcon },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <h1 className="page-title">Settings</h1>

      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            <tab.icon style={{ fontSize: 16 }} />
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Profile Information</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-700 flex items-center justify-center text-white text-2xl font-bold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{profile?.full_name}</p>
              <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
            </div>
          </div>
          <form onSubmit={submitProfile(d => profileMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="form-label">Full Name</label>
              <input {...regProfile('full_name')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Mobile</label>
              <input {...regProfile('mobile')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Role</label>
              <div className="form-input bg-gray-50 dark:bg-slate-700 cursor-not-allowed capitalize">{profile?.role}</div>
            </div>
            <button type="submit" disabled={profileMutation.isPending} className="btn-primary">
              {profileMutation.isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save Profile
            </button>
          </form>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Appearance</h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              {isDarkMode ? <DarkModeIcon className="text-primary-400" /> : <LightModeIcon className="text-amber-500" />}
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{isDarkMode ? 'Dark Mode' : 'Light Mode'}</p>
                <p className="text-xs text-gray-500">Toggle between light and dark theme</p>
              </div>
            </div>
            <button onClick={toggleDarkMode}
              className={`relative w-12 h-6 rounded-full transition-colors ${isDarkMode ? 'bg-primary-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Change Password</h2>
          <form onSubmit={submitPassword(d => passwordMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="form-label">New Password</label>
              <input {...regPassword('password', { required: true, minLength: 8 })} type="password" className="form-input" placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              <input {...regPassword('confirmPassword', { required: true })} type="password" className="form-input" placeholder="Repeat password" />
            </div>
            <button type="submit" disabled={passwordMutation.isPending} className="btn-primary">
              {passwordMutation.isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Update Password
            </button>
          </form>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-5">
            <h3 className="font-medium text-red-600 dark:text-red-400 mb-3">Danger Zone</h3>
            <button onClick={handleLogout} className="btn-danger">
              <LogoutIcon style={{ fontSize: 16 }} /> Logout from all devices
            </button>
          </div>
        </div>
      )}

      {/* Data Tab */}
      {activeTab === 'data' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-900 dark:text-white">Data & Privacy</h2>
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
              <p className="font-medium text-gray-900 dark:text-white text-sm">Data Storage</p>
              <p className="text-xs text-gray-500 mt-1">All data is securely stored in Supabase (PostgreSQL) with Row Level Security enabled. Your data is private and encrypted.</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
              <p className="font-medium text-gray-900 dark:text-white text-sm">File Storage</p>
              <p className="text-xs text-gray-500 mt-1">Photos, receipts and documents are stored in Supabase Storage buckets with secure access policies.</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="font-medium text-amber-800 dark:text-amber-400 text-sm">⚠️ Data Export</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">To export your data, please contact your system administrator or use the Supabase dashboard directly.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
