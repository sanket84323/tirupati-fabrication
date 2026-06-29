import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// Format currency
export const formatCurrency = (amount: number, symbol = '₹'): string => {
  const rounded = Math.round((amount || 0) * 100) / 100;
  return `${symbol}${rounded.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

// Format date
export const formatDate = (date: string | Date, format = 'DD MMM YYYY'): string => {
  return dayjs(date).format(format);
};

// Format relative time
export const formatRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow();
};

// Generate unique sequential number
export const generateNumber = (prefix: string, count: number): string => {
  const paddedCount = String(count).padStart(4, '0');
  const year = dayjs().format('YY');
  return `${prefix}-${year}-${paddedCount}`;
};

// Generate quotation number
export const generateQuotationNumber = (count: number): string =>
  generateNumber('QT', count);

// Generate order number
export const generateOrderNumber = (count: number): string =>
  generateNumber('ORD', count);

// Generate expense number
export const generateExpenseNumber = (count: number): string =>
  generateNumber('EXP', count);

// Generate invoice number
export const generateInvoiceNumber = (count: number): string =>
  generateNumber('INV', count);

// Generate payment number
export const generatePaymentNumber = (count: number): string =>
  generateNumber('PAY', count);

// Generate worker ID
export const generateWorkerId = (count: number): string =>
  `TF-W${String(count).padStart(3, '0')}`;

// Calculate total for quotation
export const calculateQuotationTotal = (
  materialCost: number,
  labourCost: number,
  transportCost: number,
  otherCharges: number,
  discount: number
): number => {
  const subtotal = materialCost + labourCost + transportCost + otherCharges;
  return Math.max(0, subtotal - discount);
};

// Get order status color
export const getOrderStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    ready: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Get quotation status color
export const getQuotationStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Get payment status color
export const getPaymentStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    pending: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// Get expense category label
export const getExpenseCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    material_purchase: 'Material Purchase',
    electricity: 'Electricity',
    gas_cylinder: 'Gas Cylinder',
    fuel: 'Fuel',
    tea: 'Tea & Refreshments',
    transport: 'Transport',
    machine_repair: 'Machine Repair',
    miscellaneous: 'Miscellaneous',
  };
  return labels[category] || category;
};

// Get worker skill label
export const getSkillLabel = (skill: string): string => {
  const labels: Record<string, string> = {
    arc_welding: 'Arc Welding',
    mig_welding: 'MIG Welding',
    tig_welding: 'TIG Welding',
    gas_cutting: 'Gas Cutting',
    grinding: 'Grinding',
    painting: 'Painting',
    fabrication: 'Fabrication',
  };
  return labels[skill] || skill;
};

// Format order status label
export const getOrderStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    ready: 'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
};

// Open WhatsApp
export const openWhatsApp = (phone: string, message?: string): void => {
  const cleanPhone = phone.replace(/\D/g, '');
  const url = message
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${cleanPhone}`;
  window.open(url, '_blank');
};

// Make phone call
export const makeCall = (phone: string): void => {
  window.location.href = `tel:${phone}`;
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

// Calculate attendance salary
export const calculateSalary = (
  workingDays: number,
  halfDays: number,
  dailyWage: number
): number => {
  return (workingDays + halfDays * 0.5) * dailyWage;
};

// Format payment method
export const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    cash: 'Cash',
    upi: 'UPI',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
  };
  return labels[method] || method;
};

// Debounce
export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Class name utility
export const cn = (...classes: (string | undefined | false | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Check if stock is low
export const isLowStock = (available: number, minimum: number): boolean => {
  return available <= minimum;
};

// Get month name
export const getMonthName = (monthIndex: number): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex] || '';
};

// Get last N months
export const getLastNMonths = (n: number): string[] => {
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(dayjs().subtract(i, 'month').format('MMM YYYY'));
  }
  return months;
};
