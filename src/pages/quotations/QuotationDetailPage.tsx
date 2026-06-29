import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { quotationsService } from '../../services/quotations.service';
import { ordersService } from '../../services/orders.service';
import { formatCurrency, formatDate, getQuotationStatusColor, openWhatsApp } from '../../lib/utils';

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationsService.getById(id!),
    enabled: !!id,
  });

  const convertMutation = useMutation({
    mutationFn: () => ordersService.createFromQuotation(id!),
    onSuccess: (order) => {
      toast.success('Converted to order!');
      qc.invalidateQueries({ queryKey: ['quotations'] });
      navigate(`/orders/${order.id}`);
    },
    onError: () => toast.error('Failed to convert'),
  });

  if (isLoading) return <div className="space-y-4 animate-pulse"><div className="skeleton h-10 w-48 rounded" /><div className="card p-6 space-y-4"><div className="skeleton h-6 w-64 rounded" /></div></div>;
  if (!quotation) return <div>Quotation not found</div>;

  const handleWhatsApp = () => {
    const message = `Dear ${quotation.customer?.name},\n\nQuotation for ${quotation.product_name}\nAmount: ${formatCurrency(quotation.total_amount)}\n\nThank you for your inquiry.`;
    openWhatsApp(quotation.customer?.mobile || '', message);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400"><ArrowBackIcon /></button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">{quotation.quotation_number}</h1>
              <span className={`badge ${getQuotationStatusColor(quotation.status)}`}>{quotation.status}</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Created {formatDate(quotation.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleWhatsApp} className="btn-success flex-1 sm:flex-none"><WhatsAppIcon style={{ fontSize: 16 }} /> Share</button>
          <button onClick={() => navigate(`/quotations/${id}/edit`)} className="btn-secondary flex-1 sm:flex-none"><EditIcon style={{ fontSize: 16 }} /> Edit</button>
          {quotation.status !== 'approved' && (
            <button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending} className="btn-primary flex-1 sm:flex-none">
              {convertMutation.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ShoppingCartIcon style={{ fontSize: 16 }} />}
              Convert to Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Product Details */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Product Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Product</p><p className="text-sm font-medium mt-0.5">{quotation.product_name}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Material</p><p className="text-sm font-medium mt-0.5">{quotation.material || '—'}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Quantity</p><p className="text-sm font-medium mt-0.5">{quotation.quantity} {quotation.unit}</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wider">Date</p><p className="text-sm font-medium mt-0.5">{formatDate(quotation.quotation_date)}</p></div>
              {quotation.description && (
                <div className="col-span-2"><p className="text-xs text-gray-500 uppercase tracking-wider">Description</p><p className="text-sm font-medium mt-0.5">{quotation.description}</p></div>
              )}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Cost Breakdown</h2>
            <div className="space-y-2">
              {[
                { label: 'Material Cost', value: quotation.material_cost },
                { label: 'Labour Cost', value: quotation.labour_cost },
                { label: 'Transport Cost', value: quotation.transport_cost },
                { label: 'Other Charges', value: quotation.other_charges },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                  <span className="text-sm font-medium">{formatCurrency(value)}</span>
                </div>
              ))}
              {quotation.discount > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-sm text-red-600 dark:text-red-400">Discount</span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">-{formatCurrency(quotation.discount)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 bg-primary-50 dark:bg-primary-900/20 px-3 rounded-lg mt-2">
                <span className="font-semibold text-primary-800 dark:text-primary-200">Total Amount</span>
                <span className="font-bold text-primary-800 dark:text-primary-200 text-lg">{formatCurrency(quotation.total_amount)}</span>
              </div>
            </div>
          </div>

          {quotation.notes && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Notes</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{quotation.notes}</p>
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="card p-6 h-fit">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Customer</h2>
          {quotation.customer ? (
            <div className="space-y-2">
              <Link to={`/customers/${quotation.customer_id}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">{quotation.customer.name}</Link>
              <p className="text-sm text-gray-600 dark:text-gray-400">{quotation.customer.mobile}</p>
              {quotation.customer.city && <p className="text-sm text-gray-500">{quotation.customer.city}</p>}
            </div>
          ) : <p className="text-sm text-gray-400">No customer info</p>}
        </div>
      </div>
    </div>
  );
}
