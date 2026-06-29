// ============================================================
// Tirupati Fabrication - Core TypeScript Types
// ============================================================

// User Roles
export type UserRole = 'owner' | 'manager' | 'worker';

// Profile
export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  mobile?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Settings
export interface Settings {
  id: string;
  shop_name: string;
  shop_address?: string;
  shop_phone?: string;
  shop_email?: string;
  shop_logo_url?: string;
  currency_symbol: string;
  currency_code: string;
  invoice_terms?: string;
  created_at: string;
  updated_at: string;
}

// Customer
export interface Customer {
  id: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type CustomerStatus = 'active' | 'inactive';

// Worker Skills
export type WorkerSkill =
  | 'arc_welding'
  | 'mig_welding'
  | 'tig_welding'
  | 'gas_cutting'
  | 'grinding'
  | 'painting'
  | 'fabrication';

// Worker
export interface Worker {
  id: string;
  worker_id: string;
  name: string;
  mobile: string;
  address?: string;
  joining_date: string;
  daily_wage: number;
  skills: WorkerSkill[];
  status: 'active' | 'inactive';
  photo_url?: string;
  user_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Inventory
export type InventoryCategory =
  | 'MS Pipe'
  | 'GI Pipe'
  | 'SS Pipe'
  | 'Steel Sheet'
  | 'Channel'
  | 'Angle'
  | 'Flat'
  | 'Round Pipe'
  | 'Welding Rod'
  | 'Welding Wire'
  | 'Gas Cylinder'
  | 'Paint'
  | 'Primer'
  | 'Grinding Wheel';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  quantity_available: number;
  minimum_stock: number;
  purchase_price: number;
  supplier?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StockHistory {
  id: string;
  inventory_id: string;
  action: 'add' | 'reduce' | 'adjust';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes?: string;
  created_by?: string;
  created_at: string;
}

// Quotation
export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected';

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  quotation_date: string;
  product_name: string;
  description?: string;
  material?: string;
  quantity: number;
  unit: string;
  material_cost: number;
  labour_cost: number;
  transport_cost: number;
  other_charges: number;
  discount: number;
  total_amount: number;
  notes?: string;
  status: QuotationStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: Customer;
}

// Order
export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  quotation_id?: string | null;
  product_name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  total_amount: number;
  advance_amount: number;
  total_received: number;
  remaining_amount: number;
  worker_id?: string | null;
  delivery_date?: string | null;
  notes?: string | null;
  status: OrderStatus;
  progress_percentage: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: Customer;
  worker?: Worker;
  workers?: Worker[];
}

export interface OrderImage {
  id: string;
  order_id: string;
  image_url: string;
  caption?: string;
  stage: 'progress' | 'completed';
  created_by?: string;
  created_at: string;
}

// Attendance
export type AttendanceStatus = 'present' | 'absent' | 'half_day';

export interface AttendanceRecord {
  id: string;
  worker_id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  // Joined
  worker?: Worker;
}

// Expense
export type ExpenseCategory =
  | 'material_purchase'
  | 'electricity'
  | 'gas_cylinder'
  | 'fuel'
  | 'tea'
  | 'transport'
  | 'machine_repair'
  | 'miscellaneous';

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque';

export interface Expense {
  id: string;
  expense_number: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  payment_method: PaymentMethod;
  description?: string;
  receipt_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Invoice
export type InvoiceStatus = 'unpaid' | 'partial' | 'paid';

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id?: string | null;
  customer_id: string;
  invoice_date: string;
  product_name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount: number;
  total_amount: number;
  advance_paid: number;
  remaining_amount: number;
  terms?: string | null;
  status: InvoiceStatus;
  pdf_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: Customer;
  order?: Order;
}

// Payment
export type PaymentStatus = 'paid' | 'partial' | 'pending';

export interface Payment {
  id: string;
  payment_number: string;
  customer_id: string;
  order_id?: string;
  invoice_id?: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  status: PaymentStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: Customer;
  order?: Order;
  invoice?: Invoice;
}

// Notification
export type NotificationType =
  | 'low_stock'
  | 'pending_payment'
  | 'delivery'
  | 'new_order'
  | 'order_complete'
  | 'payment_received';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  related_id?: string;
  related_type?: string;
  created_at: string;
}

// Dashboard Stats
export interface DashboardStats {
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  pendingPayments: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  currentProfit: number;
  lowStockItems: number;
}

// Chart Data
export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface OrderStatusData {
  status: string;
  count: number;
  color: string;
}

// Search Result
export interface SearchResult {
  id: string;
  type: 'customer' | 'order' | 'quotation' | 'worker' | 'inventory' | 'invoice';
  title: string;
  subtitle: string;
  url: string;
}

// Form Types
export type CustomerFormData = Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
export type WorkerFormData = Omit<Worker, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'user_id'>;
export type QuotationFormData = Omit<Quotation, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'customer'>;
export type OrderFormData = Omit<Order, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'customer' | 'worker'>;
export type InventoryFormData = Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
export type ExpenseFormData = Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'expense_number'>;
export type InvoiceFormData = Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'customer' | 'order'>;
export type PaymentFormData = Omit<Payment, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'customer' | 'order' | 'invoice' | 'payment_number'>;

export interface OrderProfit {
  id: string;
  order_id: string;
  material_cost: number;
  start_date?: string | null;
  end_date?: string | null;
  days_required: number;
  worker_days: Record<string, number>;
  net_profit: number;
  created_at?: string;
  updated_at?: string;
}
