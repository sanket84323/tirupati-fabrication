import { useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PrintIcon from '@mui/icons-material/Print';
import { invoicesService } from '../../services/invoices.service';
import { paymentsService } from '../../services/payments.service';
import { formatCurrency, formatDate, getPaymentStatusColor, openWhatsApp } from '../../lib/utils';
import type { InvoiceStatus } from '../../types';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesService.getById(id!),
    enabled: !!id,
  });

  // Fetch installments from the linked order (if any)
  const { data: installments = [] } = useQuery({
    queryKey: ['order-payments', invoice?.order_id],
    queryFn: () => paymentsService.getByOrderId(invoice!.order_id!),
    enabled: !!invoice?.order_id,
  });
  const totalFromInstallments = Math.round(installments.reduce((sum, p) => sum + (p.amount || 0), 0) * 100) / 100;

  const statusMutation = useMutation({
    mutationFn: (status: InvoiceStatus) => invoicesService.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status updated!');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  // Use installments total if present, fallback to saved invoice amount
  const displayTotalReceived = installments.length > 0 ? totalFromInstallments : (invoice?.advance_paid || 0);

  const [isEditingFinances, setIsEditingFinances] = useState(false);
  const [financeData, setFinanceData] = useState({
    subtotal: 0,
    total_amount: 0,
    advance_paid: 0,
  });

  useEffect(() => {
    if (invoice) {
      setFinanceData({
        subtotal: invoice.subtotal ?? 0,
        total_amount: invoice.total_amount ?? 0,
        advance_paid: displayTotalReceived,
      });
    }
  }, [invoice, displayTotalReceived]);

  const updateFinancesMutation = useMutation({
    mutationFn: (d: typeof financeData) =>
      invoicesService.update(id!, {
        subtotal: Math.round(d.subtotal * 100) / 100,
        total_amount: Math.round(d.total_amount * 100) / 100,
        advance_paid: Math.round(d.advance_paid * 100) / 100,
        remaining_amount: Math.round(Math.max(0, d.total_amount - d.advance_paid) * 100) / 100,
        status: d.advance_paid >= d.total_amount ? 'paid' : d.advance_paid > 0 ? 'partial' : 'unpaid',
      }),
    onSuccess: () => {
      toast.success('Invoice amounts updated!');
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setIsEditingFinances(false);
    },
    onError: () => toast.error('Failed to update invoice'),
  });

  const generatePDFBlob = async (): Promise<{ blob: Blob; filename: string }> => {
    if (!printRef.current) throw new Error('Print container not found');
    
    // Clone the element and append it off-screen with a fixed desktop width of 800px.
    // This ensures that the generated PDF has a premium, uniform layout regardless of the user's screen size.
    const element = printRef.current;
    const clone = element.cloneNode(true) as HTMLDivElement;
    clone.style.width = '800px';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.boxShadow = 'none';
    clone.style.borderRadius = '0';
    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, 297));
      const blob = pdf.output('blob');
      const filename = `${invoice?.invoice_number || 'Invoice'}.pdf`;
      return { blob, filename };
    } catch (err) {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
      throw err;
    }
  };

  const handleDownloadPDF = async () => {
    const toastId = toast.loading('Generating PDF...');
    try {
      const { blob, filename } = await generatePDFBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.dismiss(toastId);
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error('Failed to generate PDF');
    }
  };

  const handleSharePDF = async () => {
    if (!invoice?.customer) return;
    const toastId = toast.loading('Preparing PDF to share...');
    try {
      const { blob, filename } = await generatePDFBlob();
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${invoice.invoice_number}`,
          text: `Invoice for ${invoice.product_name} from Tirupati Fabrication.`,
        });
        toast.dismiss(toastId);
        toast.success('Shared successfully!');
      } else {
        // Fallback: Download PDF first, then redirect to WhatsApp Web / App
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        
        toast.dismiss(toastId);
        toast.success('PDF downloaded! Opening WhatsApp to share details...');
        
        // Open WhatsApp text details helper
        setTimeout(() => {
          handleWhatsAppText();
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error('Failed to share PDF');
    }
  };

  const handleWhatsAppText = () => {
    if (!invoice?.customer) return;
    const msg = `*Invoice ${invoice.invoice_number}*\n\n📦 *${invoice.product_name}*\n\n💰 Total Amount: ${formatCurrency(invoice.total_amount)}\n✅ Total Received: ${formatCurrency(invoice.advance_paid)}\n⚠️ Balance Due: ${formatCurrency(invoice.remaining_amount)}\n\n📅 Date: ${formatDate(invoice.invoice_date)}\n\nThank you for choosing Tirupati Fabrication! 🙏`;
    openWhatsApp(invoice.customer.mobile, msg);
  };


  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="skeleton h-10 w-48 rounded" />
      <div className="card p-6 space-y-6">
        <div className="flex justify-between flex-wrap gap-4">
          <div className="space-y-2"><div className="skeleton h-8 w-48 rounded" /><div className="skeleton h-4 w-32 rounded" /></div>
          <div className="skeleton h-16 w-16 rounded-xl" />
        </div>
        <div className="skeleton h-32 rounded" />
        <div className="skeleton h-24 rounded" />
      </div>
    </div>
  );
  if (!invoice) return <div>Invoice not found</div>;

  const displayRemaining = Math.round(Math.max(0, invoice.total_amount - displayTotalReceived) * 100) / 100;

  const isPaid = displayRemaining <= 0;
  const isPartial = displayRemaining > 0 && displayTotalReceived > 0;

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Top Action Bar ── */}
      <div className="flex items-start gap-3 flex-wrap no-print">
        <button onClick={() => navigate(-1)} className="btn-icon text-gray-600 dark:text-gray-400 shrink-0">
          <ArrowBackIcon />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="page-title">{invoice.invoice_number}</h1>
            <span className={`badge ${getPaymentStatusColor(invoice.status)} capitalize`}>{invoice.status}</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 truncate">
            {invoice.customer?.name} • {formatDate(invoice.invoice_date)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <button onClick={handleSharePDF} className="btn-success flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm">
            <WhatsAppIcon style={{ fontSize: 16 }} /> Share
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm">
            <PrintIcon style={{ fontSize: 16 }} /> Print
          </button>
          <button onClick={handleDownloadPDF} className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm">
            <PictureAsPdfIcon style={{ fontSize: 16 }} /> PDF
          </button>
          <button onClick={() => navigate(`/invoices/${id}/edit`)} className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm">
            <EditIcon style={{ fontSize: 16 }} /> Edit
          </button>
        </div>
      </div>

      {/* ── Status Buttons + Quick Edit Toggle ── */}
      <div className="flex gap-2 flex-wrap items-center no-print">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Mark as:</span>
        {(['unpaid', 'partial', 'paid'] as InvoiceStatus[]).map(s => (
          <button
            key={s}
            onClick={() => statusMutation.mutate(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
              invoice.status === s
                ? 'bg-primary-700 text-white border-primary-700'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => setIsEditingFinances(!isEditingFinances)}
            className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold focus:outline-none flex items-center gap-1"
          >
            ✏️ {isEditingFinances ? 'Cancel Edit' : 'Edit Amounts'}
          </button>
        </div>
      </div>

      {/* ── Quick Edit Panel ── */}
      {isEditingFinances && (
        <div className="card p-5 border border-primary-100 dark:border-primary-900/40 bg-primary-50/30 dark:bg-primary-950/10 no-print animate-fade-in">
          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Edit Invoice Amounts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Subtotal (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={financeData.subtotal}
                onChange={e => setFinanceData(f => ({ ...f, subtotal: Number(e.target.value) || 0 }))}
                className="form-input text-sm py-1.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Total Amount (₹)</label>
              <input
                type="number" min="0" step="0.01"
                value={financeData.total_amount}
                onChange={e => setFinanceData(f => ({ ...f, total_amount: Number(e.target.value) || 0 }))}
                className="form-input text-sm py-1.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">
                Total Received (₹) {installments.length > 0 && <span className="text-primary-500 lowercase">(Auto-synced)</span>}
              </label>
              <input
                type="number" min="0" step="0.01"
                value={financeData.advance_paid}
                onChange={e => setFinanceData(f => ({ ...f, advance_paid: Number(e.target.value) || 0 }))}
                disabled={installments.length > 0}
                className={`form-input text-sm py-1.5 font-semibold ${installments.length > 0 ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 cursor-not-allowed' : 'text-emerald-600 dark:text-emerald-400'}`}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase block mb-1">Balance Due (₹)</label>
              <div className={`form-input bg-gray-100 dark:bg-slate-800 text-sm py-1.5 font-bold ${
                (financeData.total_amount - financeData.advance_paid) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'
              }`}>
                ₹{(Math.round(Math.max(0, financeData.total_amount - financeData.advance_paid) * 100) / 100).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <button
              onClick={() => updateFinancesMutation.mutate(financeData)}
              disabled={updateFinancesMutation.isPending}
              className="btn-primary text-xs py-1.5 px-4"
            >
              {updateFinancesMutation.isPending ? 'Saving…' : '✓ Save Changes'}
            </button>
            <button onClick={() => setIsEditingFinances(false)} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          INVOICE DOCUMENT (this gets captured for PDF)
      ══════════════════════════════════════════ */}
      <div
        ref={printRef}
        style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: '#fff', borderRadius: '16px', overflow: 'hidden' }}
      >

        {/* ── Gold Header ── */}
        <div style={{ background: 'linear-gradient(135deg,#f5c518 0%,#e0a800 55%,#bf8c00 100%)', padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* Logo + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img
                src="/logo.png"
                alt="Tirupati Fabrication"
                crossOrigin="anonymous"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  border: '3px solid rgba(255,255,255,0.6)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  background: '#fff',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#1a1200', lineHeight: 1.2 }}>
                  Tirupati Fabrication
                </div>
                <div style={{ fontSize: '12px', color: '#4a3600', fontWeight: 500, marginTop: '2px' }}>
                  Smart Fabrication &amp; Welding Shop
                </div>
                <div style={{ fontSize: '11px', color: '#6a5000', marginTop: '2px' }}>
                  🔥 Quality Welding &amp; Custom Fabrication
                </div>
              </div>
            </div>

            {/* Invoice Title Block */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                background: '#1a1200',
                color: '#f5c518',
                padding: '8px 22px',
                borderRadius: '8px',
                fontWeight: 900,
                fontSize: '22px',
                letterSpacing: '4px',
                marginBottom: '8px',
                display: 'inline-block',
              }}>
                INVOICE
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#3a2800' }}>{invoice.invoice_number}</div>
              <div style={{ fontSize: '11px', color: '#6a5000', marginTop: '2px' }}>
                📅 {formatDate(invoice.invoice_date)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '28px' }}>

          {/* Bill To + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Bill To */}
            <div style={{ background: '#f7f8ff', border: '1px solid #e0e3f5', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9095b0', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Bill To
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#1a1200' }}>{invoice.customer?.name}</div>
              <div style={{ fontSize: '13px', color: '#444464', marginTop: '4px' }}>📞 {invoice.customer?.mobile}</div>
              {invoice.customer?.city && (
                <div style={{ fontSize: '12px', color: '#666686', marginTop: '2px' }}>📍 {invoice.customer.city}</div>
              )}
            </div>

            {/* Payment Status */}
            <div style={{
              background: isPaid ? '#f0fdf4' : isPartial ? '#fffbeb' : '#fff5f5',
              border: `1px solid ${isPaid ? '#bbf7d0' : isPartial ? '#fde68a' : '#fecaca'}`,
              borderRadius: '12px',
              padding: '16px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9095b0', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Payment Status
              </div>
              <div style={{
                display: 'inline-block',
                padding: '4px 16px',
                borderRadius: '20px',
                background: isPaid ? '#22c55e' : isPartial ? '#f59e0b' : '#ef4444',
                color: '#fff',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'capitalize',
                letterSpacing: '0.5px',
              }}>
                {invoice.status}
              </div>
              {invoice.order?.order_number && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#9095b0', textTransform: 'uppercase', letterSpacing: '1px' }}>Order Ref</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#444464' }}>{invoice.order.order_number}</div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table — horizontal scroll on small screens */}
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e0e3f5', marginBottom: '24px' }}>
            {/* Scrollable wrapper */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '420px' }}>
                <thead>
                  <tr style={{ background: '#1a1200' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#f5c518', fontWeight: 700, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Description
                    </th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', color: '#f5c518', fontWeight: 700, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Qty
                    </th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', color: '#f5c518', fontWeight: 700, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Unit Price
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#f5c518', fontWeight: 700, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#fff' }}>
                    <td style={{ padding: '14px 16px', borderTop: '1px solid #e0e3f5', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: '#1a1200', fontSize: '14px', wordBreak: 'break-word', maxWidth: '300px' }}>
                        {invoice.product_name}
                      </div>
                      {invoice.description && (
                        <div style={{ color: '#9095b0', fontSize: '11px', marginTop: '3px' }}>{invoice.description}</div>
                      )}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', color: '#444464', fontSize: '13px', borderTop: '1px solid #e0e3f5', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      {invoice.quantity} {invoice.unit}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right', color: '#444464', fontSize: '13px', borderTop: '1px solid #e0e3f5', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      {formatCurrency(invoice.unit_price)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#1a1200', fontSize: '14px', borderTop: '1px solid #e0e3f5', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                      {formatCurrency(invoice.subtotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile summary bar — shown via absolute position below table on very narrow screens */}
            <div style={{ background: '#f7f8ff', borderTop: '2px solid #e0e3f5', padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#9095b0', fontWeight: 600 }}>
                {invoice.quantity} {invoice.unit} × {formatCurrency(invoice.unit_price)}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1a1200' }}>
                Subtotal: {formatCurrency(invoice.subtotal)}
              </span>
            </div>
          </div>

          {/* ── Installments / Payment History ── */}
          {installments.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '10px',
              }}>
                <div style={{
                  width: '4px', height: '18px',
                  background: 'linear-gradient(180deg,#f5c518,#bf8c00)',
                  borderRadius: '2px',
                }} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1a1200', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Payment History
                </span>
                <span style={{
                  fontSize: '11px', background: '#fef3c7', color: '#92400e',
                  padding: '2px 8px', borderRadius: '20px', fontWeight: 700,
                }}>
                  {installments.length} installment{installments.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Installments table */}
              <div style={{ border: '1px solid #e0e3f5', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  background: '#1a1200', padding: '8px 14px',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '1px' }}>#</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '1px' }}>Method</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#f5c518', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Amount</span>
                </div>

                {/* Rows */}
                {installments.map((p, idx) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      padding: '9px 14px',
                      background: idx % 2 === 0 ? '#f7f8ff' : '#ffffff',
                      borderTop: '1px solid #e8eaf6',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#9095b0', fontWeight: 600 }}>#{idx + 1}</span>
                    <span style={{ fontSize: '12px', color: '#444464', fontWeight: 500 }}>{formatDate(p.payment_date)}</span>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, color: '#2563eb',
                      background: '#eff6ff', padding: '2px 8px', borderRadius: '20px',
                      display: 'inline-block', textTransform: 'capitalize',
                    }}>
                      {p.payment_method === 'bank_transfer' ? 'Bank' : p.payment_method.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a', textAlign: 'right' }}>
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}

                {/* Total row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  padding: '10px 14px',
                  background: '#f0fdf4',
                  borderTop: '2px solid #bbf7d0',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', gridColumn: 'span 3' }}>Total Paid via Installments</span>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#16a34a', textAlign: 'right' }}>{formatCurrency(totalFromInstallments)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Totals + Terms - stack on small, side by side on wide */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>

            {/* Terms */}
            <div style={{ flex: '1 1 220px' }}>
              {invoice.terms && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#9095b0', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                    Terms &amp; Conditions
                  </div>
                  <div style={{ fontSize: '12px', color: '#444464', lineHeight: 1.6 }}>{invoice.terms}</div>
                </div>
              )}
            </div>

            {/* Totals Box */}
            <div style={{ flex: '0 1 260px', minWidth: '220px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e0e3f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '13px', borderBottom: '1px solid #e0e3f5', background: '#f7f8ff' }}>
                <span style={{ color: '#666686' }}>Subtotal</span>
                <span style={{ fontWeight: 600, color: '#1a1200' }}>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.tax_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '13px', borderBottom: '1px solid #e0e3f5', background: '#f7f8ff' }}>
                  <span style={{ color: '#666686' }}>Tax ({invoice.tax_percentage}%)</span>
                  <span style={{ fontWeight: 600, color: '#1a1200' }}>{formatCurrency(invoice.tax_amount)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '13px', borderBottom: '1px solid #e0e3f5', background: '#f7f8ff' }}>
                  <span style={{ color: '#666686' }}>Discount</span>
                  <span style={{ fontWeight: 600, color: '#ef4444' }}>-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              {/* Total Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: '#1a1200' }}>
                <span style={{ fontWeight: 800, color: '#f5c518', fontSize: '14px' }}>Total</span>
                <span style={{ fontWeight: 900, color: '#f5c518', fontSize: '14px' }}>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {/* Total Received */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '13px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0' }}>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>Total Received</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>-{formatCurrency(displayTotalReceived)}</span>
              </div>
              {/* Balance Due */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 14px',
                fontSize: '15px',
                background: displayRemaining > 0 ? '#fff5f5' : '#f0fdf4',
                borderTop: `1px solid ${displayRemaining > 0 ? '#fecaca' : '#bbf7d0'}`,
              }}>
                <span style={{ fontWeight: 800, color: displayRemaining > 0 ? '#dc2626' : '#16a34a' }}>Balance Due</span>
                <span style={{ fontWeight: 900, color: displayRemaining > 0 ? '#dc2626' : '#16a34a' }}>
                  {formatCurrency(displayRemaining)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ borderTop: '2px solid #f5c518', paddingTop: '18px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Small logo + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="/logo.png"
                alt="Tirupati Fabrication"
                crossOrigin="anonymous"
                style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #f5c518' }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1a1200' }}>Tirupati Fabrication</div>
                <div style={{ fontSize: '10px', color: '#9095b0' }}>Quality Welding &amp; Fabrication</div>
              </div>
            </div>

            {/* PAID stamp */}
            {isPaid && (
              <div style={{
                padding: '6px 18px',
                border: '3px solid #22c55e',
                borderRadius: '6px',
                color: '#22c55e',
                fontWeight: 900,
                fontSize: '18px',
                letterSpacing: '3px',
                opacity: 0.7,
                transform: 'rotate(-5deg)',
              }}>
                PAID ✓
              </div>
            )}

            {/* Thank you */}
            <div style={{ fontSize: '11px', color: '#9095b0', textAlign: 'right' }}>
              Thank you for your business! 🙏<br />
              <span style={{ fontSize: '10px' }}>Generated on {new Date().toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
