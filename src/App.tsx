import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { queryClient } from './lib/queryClient';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { authService } from './services/auth.service';

// Layout
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// App pages
import DashboardPage from './pages/dashboard/DashboardPage';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import CustomerFormPage from './pages/customers/CustomerFormPage';
import QuotationListPage from './pages/quotations/QuotationListPage';
import QuotationDetailPage from './pages/quotations/QuotationDetailPage';
import QuotationFormPage from './pages/quotations/QuotationFormPage';
import OrderListPage from './pages/orders/OrderListPage';
import OrderDetailPage from './pages/orders/OrderDetailPage';
import OrderFormPage from './pages/orders/OrderFormPage';
import InventoryPage from './pages/inventory/InventoryPage';
import WorkerListPage from './pages/workers/WorkerListPage';
import WorkerDetailPage from './pages/workers/WorkerDetailPage';
import WorkerFormPage from './pages/workers/WorkerFormPage';
import AttendancePage from './pages/attendance/AttendancePage';
import ExpenseListPage from './pages/expenses/ExpenseListPage';
import ExpenseFormPage from './pages/expenses/ExpenseFormPage';
import PaymentListPage from './pages/payments/PaymentListPage';
import InvoiceListPage from './pages/invoices/InvoiceListPage';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import InvoiceFormPage from './pages/invoices/InvoiceFormPage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SettingsPage from './pages/settings/SettingsPage';

export default function App() {
  const { setUser, setSession, setProfile, setLoading } = useAuthStore();
  const { isDarkMode } = useUIStore();

  // Apply dark mode on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Listen to auth state changes
  useEffect(() => {
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            const profile = await authService.getProfile(session.user.id);
            setProfile(profile);
          } catch {
            // Profile may not exist yet
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setProfile, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Customers */}
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="customers/:id/edit" element={<CustomerFormPage />} />

            {/* Quotations */}
            <Route path="quotations" element={<QuotationListPage />} />
            <Route path="quotations/new" element={<QuotationFormPage />} />
            <Route path="quotations/:id" element={<QuotationDetailPage />} />
            <Route path="quotations/:id/edit" element={<QuotationFormPage />} />

            {/* Orders */}
            <Route path="orders" element={<OrderListPage />} />
            <Route path="orders/new" element={<OrderFormPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="orders/:id/edit" element={<OrderFormPage />} />

            {/* Inventory */}
            <Route path="inventory" element={<InventoryPage />} />

            {/* Workers */}
            <Route path="workers" element={<WorkerListPage />} />
            <Route path="workers/new" element={<WorkerFormPage />} />
            <Route path="workers/:id" element={<WorkerDetailPage />} />
            <Route path="workers/:id/edit" element={<WorkerFormPage />} />

            {/* Attendance */}
            <Route path="attendance" element={<AttendancePage />} />

            {/* Expenses */}
            <Route path="expenses" element={<ExpenseListPage />} />
            <Route path="expenses/new" element={<ExpenseFormPage />} />
            <Route path="expenses/:id/edit" element={<ExpenseFormPage />} />

            {/* Payments */}
            <Route path="payments" element={<PaymentListPage />} />

            {/* Invoices */}
            <Route path="invoices" element={<InvoiceListPage />} />
            <Route path="invoices/new" element={<InvoiceFormPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />

            {/* Reports */}
            <Route path="reports" element={<ReportsPage />} />

            {/* Notifications */}
            <Route path="notifications" element={<NotificationsPage />} />

            {/* Settings */}
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  );
}
