-- ============================================================
-- Tirupati Fabrication - Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('owner', 'manager', 'worker')),
  mobile TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SETTINGS TABLE (shop-wide settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_name TEXT NOT NULL DEFAULT 'Tirupati Fabrication',
  shop_address TEXT,
  shop_phone TEXT,
  shop_email TEXT,
  shop_logo_url TEXT,
  currency_symbol TEXT DEFAULT '₹',
  currency_code TEXT DEFAULT 'INR',
  invoice_terms TEXT DEFAULT 'Payment due within 30 days. Thank you for your business.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (shop_name, currency_symbol) VALUES ('Tirupati Fabrication', '₹') ON CONFLICT DO NOTHING;

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS workers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  worker_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_wage NUMERIC(10,2) NOT NULL DEFAULT 0,
  skills TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  photo_url TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVENTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  quantity_available NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(10,2) NOT NULL DEFAULT 5,
  purchase_price NUMERIC(10,2) DEFAULT 0,
  supplier TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STOCK HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('add', 'reduce', 'adjust')),
  quantity NUMERIC(10,2) NOT NULL,
  previous_quantity NUMERIC(10,2) NOT NULL,
  new_quantity NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUOTATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS quotations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quotation_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_name TEXT NOT NULL,
  description TEXT,
  material TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  material_cost NUMERIC(10,2) DEFAULT 0,
  labour_cost NUMERIC(10,2) DEFAULT 0,
  transport_cost NUMERIC(10,2) DEFAULT 0,
  other_charges NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  quotation_id UUID REFERENCES quotations(id),
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(10,2) DEFAULT 0,
  total_received NUMERIC(10,2) DEFAULT 0,
  remaining_amount NUMERIC(10,2) DEFAULT 0,
  worker_id UUID REFERENCES workers(id),
  delivery_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'ready', 'delivered', 'cancelled')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDER WORKERS JOIN TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_workers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, worker_id)
);

-- ============================================================
-- ORDER IMAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  stage TEXT DEFAULT 'progress' CHECK (stage IN ('progress', 'completed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, date)
);

-- ============================================================
-- EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  expense_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN (
    'material_purchase', 'electricity', 'gas_cylinder', 'fuel',
    'tea', 'transport', 'machine_repair', 'miscellaneous'
  )),
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque')),
  description TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax_percentage NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance_paid NUMERIC(10,2) DEFAULT 0,
  remaining_amount NUMERIC(10,2) DEFAULT 0,
  terms TEXT,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  order_id UUID REFERENCES orders(id),
  invoice_id UUID REFERENCES invoices(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque')),
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'partial', 'pending')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('low_stock', 'pending_payment', 'delivery', 'new_order', 'order_complete', 'payment_received')),
  is_read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  related_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Function to handle new user signup and create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owners and managers can view all profiles" ON profiles FOR SELECT USING (get_user_role() IN ('owner', 'manager'));
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Owners can manage all profiles" ON profiles FOR ALL USING (get_user_role() = 'owner');

-- SETTINGS policies
CREATE POLICY "Anyone can view settings" ON settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only owners can manage settings" ON settings FOR ALL USING (get_user_role() = 'owner');

-- CUSTOMERS policies
CREATE POLICY "Authenticated users can view customers" ON customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners and managers can manage customers" ON customers FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- WORKERS policies
CREATE POLICY "Authenticated users can view workers" ON workers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners can manage workers" ON workers FOR ALL USING (get_user_role() = 'owner');
CREATE POLICY "Workers can view own record" ON workers FOR SELECT USING (user_id = auth.uid());

-- INVENTORY policies
CREATE POLICY "Authenticated users can view inventory" ON inventory FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners and managers can manage inventory" ON inventory FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- STOCK HISTORY policies
CREATE POLICY "Authenticated users can view stock history" ON stock_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners and managers can add stock history" ON stock_history FOR INSERT WITH CHECK (get_user_role() IN ('owner', 'manager'));

-- QUOTATIONS policies
CREATE POLICY "Authenticated users can view quotations" ON quotations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners and managers can manage quotations" ON quotations FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- ORDERS policies
CREATE POLICY "Owners and managers can view all orders" ON orders FOR SELECT USING (get_user_role() IN ('owner', 'manager'));
CREATE POLICY "Workers can view assigned orders" ON orders FOR SELECT USING (
  get_user_role() = 'worker' AND worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);
CREATE POLICY "Owners and managers can manage orders" ON orders FOR ALL USING (get_user_role() IN ('owner', 'manager'));
CREATE POLICY "Workers can update assigned orders" ON orders FOR UPDATE USING (
  get_user_role() = 'worker' AND worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);

-- ORDER WORKERS policies
CREATE POLICY "Authenticated users can view order assignments" ON order_workers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners and managers can manage order assignments" ON order_workers FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- ORDER IMAGES policies
CREATE POLICY "Authenticated users can view order images" ON order_images FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can add order images" ON order_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Owners and managers can manage order images" ON order_images FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- ATTENDANCE policies
CREATE POLICY "Owners and managers can view all attendance" ON attendance FOR SELECT USING (get_user_role() IN ('owner', 'manager'));
CREATE POLICY "Workers can view own attendance" ON attendance FOR SELECT USING (
  get_user_role() = 'worker' AND worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
);
CREATE POLICY "Owners and managers can manage attendance" ON attendance FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- EXPENSES policies
CREATE POLICY "Owners and managers can view expenses" ON expenses FOR SELECT USING (get_user_role() IN ('owner', 'manager'));
CREATE POLICY "Owners and managers can manage expenses" ON expenses FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- INVOICES policies
CREATE POLICY "Owners and managers can view invoices" ON invoices FOR SELECT USING (get_user_role() IN ('owner', 'manager'));
CREATE POLICY "Owners and managers can manage invoices" ON invoices FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- PAYMENTS policies
CREATE POLICY "Owners and managers can view payments" ON payments FOR SELECT USING (get_user_role() IN ('owner', 'manager'));
CREATE POLICY "Owners and managers can manage payments" ON payments FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- NOTIFICATIONS policies
CREATE POLICY "Authenticated users can view notifications" ON notifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Owners can manage notifications" ON notifications FOR ALL USING (get_user_role() = 'owner');

-- ============================================================
-- STORAGE BUCKETS SETUP
-- Run these separately in Supabase Dashboard > Storage
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('order-photos', 'order-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- ============================================================
-- SAMPLE SEED DATA (Optional - for testing)
-- ============================================================
-- Uncomment to insert sample inventory categories
/*
INSERT INTO inventory (name, category, unit, quantity_available, minimum_stock, purchase_price) VALUES
('MS Pipe 2"', 'MS Pipe', 'meter', 50, 10, 120),
('GI Pipe 1"', 'GI Pipe', 'meter', 30, 5, 95),
('Steel Sheet 3mm', 'Steel Sheet', 'kg', 200, 50, 85),
('MS Angle 50x50', 'Angle', 'meter', 40, 10, 75),
('Welding Rod 3.15mm', 'Welding Rod', 'kg', 25, 10, 180),
('MIG Wire 0.8mm', 'Welding Wire', 'kg', 15, 5, 350),
('Grinding Wheel 4"', 'Grinding Wheel', 'pcs', 20, 10, 45),
('Red Oxide Primer', 'Primer', 'liter', 10, 3, 220),
('Enamel Paint', 'Paint', 'liter', 8, 3, 280)
ON CONFLICT DO NOTHING;
*/

-- ============================================================
-- ORDER PROFITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_profits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  material_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  transport_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  days_required INTEGER NOT NULL DEFAULT 0,
  worker_days JSONB NOT NULL DEFAULT '{}'::jsonb,
  net_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_profits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Owners and managers can manage order_profits" ON order_profits FOR ALL USING (get_user_role() IN ('owner', 'manager'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
