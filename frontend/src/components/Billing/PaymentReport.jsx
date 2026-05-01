import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayments, getUnits, getInvoice, verifyPayment } from '../../services/api';
import './Billing.css';

const FINANCIAL_YEARS = (() => {
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push({ label: `FY ${y}-${y + 1}`, start: `${y}-04-01`, end: `${y + 1}-03-31` });
  }
  return years;
})();

const PaymentReport = () => {
  const [filterMode, setFilterMode] = useState('unit'); // 'unit' | 'fy'
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [unitOptions, setUnitOptions] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedFY, setSelectedFY] = useState('');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unitSearchLoading, setUnitSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState(null);
  const [reportGenerated, setReportGenerated] = useState(false);

  // Invoice popup state
  const [popupInvoice, setPopupInvoice] = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupError, setPopupError] = useState(null);

  const navigate = useNavigate();

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const getUnitLabel = (unitType) => {
    switch (unitType) {
      case 'Flat':
        return 'Flat Number';
      case 'Villa':
        return 'Villa Number';
      case 'Shop':
        return 'Shop Number';
      case 'Office':
        return 'Office Number';
      case 'Parking':
        return 'Parking Number';
      default:
        return 'Unit Number';
    }
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const handleUnitSearch = async (query) => {
    setUnitSearchTerm(query);
    if (!query.trim()) {
      setUnitOptions([]);
      setSelectedUnit(null);
      return;
    }
    setUnitSearchLoading(true);
    try {
      const response = await getUnits({ search: query.trim(), limit: 20 });
      const matches = response.data.results || response.data || [];
      setUnitOptions(matches);
      const exact = matches.find(
        (u) => u.unit_number?.toLowerCase() === query.trim().toLowerCase()
      );
      if (exact) setSelectedUnit(exact);
      else setSelectedUnit(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUnitSearchLoading(false);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setActionMessage(null);
    setPayments([]);
    setReportGenerated(false);

    if (filterMode === 'unit' && !selectedUnit) {
      setError('Please select a valid unit number.');
      return;
    }
    if (filterMode === 'fy' && !selectedFY) {
      setError('Please select a financial year.');
      return;
    }

    setLoading(true);
    try {
      const params = { limit: 500, ordering: '-payment_date' };
      if (filterMode === 'unit') {
        params.unit = selectedUnit.id;
      } else {
        const fy = FINANCIAL_YEARS.find((f) => f.label === selectedFY);
        params.payment_date_after = fy.start;
        params.payment_date_before = fy.end;
      }
      const response = await getPayments(params);
      setPayments(response.data.results || response.data || []);
      setReportGenerated(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load payments.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openInvoicePopup = async (invoiceId) => {
    setPopupInvoice(null);
    setPopupError(null);
    setPopupLoading(true);
    try {
      const response = await getInvoice(invoiceId);
      setPopupInvoice(response.data);
    } catch (err) {
      setPopupError('Unable to load invoice details.');
      console.error(err);
    } finally {
      setPopupLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2);

  const handleExportPdf = () => {
    if (!reportGenerated || payments.length === 0) return;

    const reportTitle = filterMode === 'unit'
      ? `Payments Report - Unit ${selectedUnit?.unit_number || ''}`
      : `Payments Report - ${selectedFY}`;
    const generatedAt = new Date().toLocaleString();
    const rows = payments.map((payment, idx) => {
      const inv = payment.invoice_detail;
      return `
        <tr>
          <td>${payment.receipt_number || payment.id}</td>
          <td>${payment.invoice_number || payment.invoice_detail?.invoice_number || payment.invoice || '-'}</td>
          <td>${inv?.unit_number || '-'}</td>
          <td>${inv?.owner_name || '-'}</td>
          <td>${inv ? `${inv.period_start} to ${inv.period_end}` : '-'}</td>
          <td>${payment.payment_date || '-'}</td>
          <td>INR ${Number(payment.amount).toFixed(2)}</td>
          <td>${payment.mode || '-'}</td>
          <td>${payment.reference_number || '-'}</td>
        </tr>
      `;
    }).join('');

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin: 0 0 6px; font-size: 22px; }
            .meta { margin: 2px 0; color: #374151; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
            th { background: #e5e7eb; }
            tfoot td { font-weight: 700; background: #f9fafb; }
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <div class="meta">Generated on: ${generatedAt}</div>
          <div class="meta">Total Records: ${payments.length}</div>
          <div class="meta">Total Collected: INR ${totalPaid}</div>
          <table>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Invoice #</th>
                <th>Unit</th>
                <th>Owner</th>
                <th>Period</th>
                <th>Payment Date</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr>
                <td colspan="6" style="text-align:right;">Total</td>
                <td>INR ${totalPaid}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handlePrintReceipt = (payment) => {
    const inv = payment.invoice_detail;
    const amount = Number(payment.amount || 0).toFixed(2);
    const balanceDue = (Number(inv?.total_amount || 0) - Number(payment.amount || 0)).toFixed(2);
    const receiptDateTime = payment.verified_at
      ? new Date(payment.verified_at).toLocaleString()
      : '-';
    const unitLabel = getUnitLabel(inv?.unit_type);
    const receiptWindow = window.open('', '_blank', 'width=900,height=700');
    if (!receiptWindow) return;

    receiptWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt #${escapeHtml(payment.receipt_number || payment.id)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            .receipt { border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
            .header { background: #f3f4f6; padding: 16px 18px; border-bottom: 1px solid #d1d5db; }
            .header h1 { margin: 0; font-size: 20px; }
            .header p { margin: 6px 0 0; color: #374151; font-size: 13px; }
            .section { padding: 16px 18px; }
            .section + .section { border-top: 1px solid #e5e7eb; }
            .meta-grid { width: 100%; border-collapse: collapse; }
            .meta-grid td { padding: 7px 6px; vertical-align: top; }
            .meta-grid td.label { width: 170px; color: #374151; font-weight: 700; }
            .amount { font-size: 24px; font-weight: 700; color: #0f172a; }
            .footnote { margin-top: 20px; color: #6b7280; font-size: 12px; text-align: center; }
            @media print {
              @page { size: A4 portrait; margin: 12mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>Trimurti Sangam Sah. Hsg. So. Ltd.</h1>
              <p>Payment Receipt</p>
            </div>

            <div class="section">
              <div class="amount">Received with thanks, from ${escapeHtml(inv?.owner_name || '-')} the amount of: INR ${escapeHtml(amount)}</div>
            </div>

            <div class="section">
              <table class="meta-grid">
                <tr><td class="label">Receipt No</td><td>${escapeHtml(payment.receipt_number || payment.id)}</td></tr>
                <tr><td class="label">Payment Date</td><td>${escapeHtml(formatDate(payment.payment_date))}</td></tr>
                <tr><td class="label">Payment Mode</td><td>${escapeHtml(payment.mode || '-')}</td></tr>
                <tr><td class="label">Reference No</td><td>${escapeHtml(payment.reference_number || '-')}</td></tr>
                <tr><td class="label">Invoice No</td><td>${escapeHtml(payment.invoice_number || payment.invoice_detail?.invoice_number || payment.invoice || '-')}</td></tr>
                <tr><td class="label">Balance Due</td><td>INR ${escapeHtml(balanceDue)}</td></tr>
              </table>
            </div>

            <div class="section">
              <table class="meta-grid">
                <tr><td class="label">${escapeHtml(unitLabel)}</td><td>${escapeHtml(inv?.unit_number || '-')}</td></tr>
                <tr><td class="label">Owner Name</td><td>${escapeHtml(inv?.owner_name || '-')}</td></tr>
                <tr><td class="label">Billing Period</td><td>${escapeHtml(inv ? `${inv.period_start} to ${inv.period_end}` : '-')}</td></tr>
              </table>
            </div>
          </div>

          <div class="footnote">This is a system-generated receipt.</div>
          <div class="footnote">Receipt Date and Time: ${escapeHtml(receiptDateTime)}</div>

          <div class="no-print" style="margin-top:16px; text-align:right; display:flex; justify-content:flex-end; gap:10px;">
            <button onclick="window.print()" style="padding:8px 14px; border:none; border-radius:6px; background:#2563eb; color:#fff; cursor:pointer;">Print</button>
          </div>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.focus();
  };

  const handleVerifyPayment = async (paymentId) => {
    setError(null);
    setActionMessage(null);
    setVerifyingPaymentId(paymentId);
    try {
      const response = await verifyPayment(paymentId);
      const updated = response.data?.payment;
      const communication = response.data?.communication || {};

      setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, ...updated } : p)));

      const lines = ['Payment verified successfully.'];
      ['email', 'whatsapp', 'sms'].forEach((channel) => {
        if (communication[channel]) {
          lines.push(`${channel}: ${communication[channel].status} - ${communication[channel].detail}`);
        }
      });
      setActionMessage(lines.join(' | '));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to verify payment.');
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <h1>Payments Report</h1>
          <p>Generate a payment history by unit or financial year.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate('/payments/new')}>
            Record Payment
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}

      <div className="billing-form" style={{ maxWidth: '600px' }}>
        <div className="filter-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontWeight: 500 }}>
            Filter by:
            <label style={{ fontWeight: 400 }}>
              <input
                type="radio"
                name="filterMode"
                value="unit"
                checked={filterMode === 'unit'}
                onChange={() => { setFilterMode('unit'); setReportGenerated(false); setPayments([]); }}
                style={{ marginRight: '0.4rem' }}
              />
              Unit
            </label>
            <label style={{ fontWeight: 400 }}>
              <input
                type="radio"
                name="filterMode"
                value="fy"
                checked={filterMode === 'fy'}
                onChange={() => { setFilterMode('fy'); setReportGenerated(false); setPayments([]); }}
                style={{ marginRight: '0.4rem' }}
              />
              Financial Year
            </label>
          </label>
        </div>

        {filterMode === 'unit' && (
          <label>
            Unit Number
            <input
              type="text"
              value={unitSearchTerm}
              onChange={(e) => handleUnitSearch(e.target.value)}
              placeholder="Search unit number (e.g. A-101)"
              list="report-unit-options"
              autoComplete="off"
            />
            <datalist id="report-unit-options">
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.unit_number}>
                  {unit.block ? `Block ${unit.block}` : ''}
                </option>
              ))}
            </datalist>
            {unitSearchLoading && <span className="billing-help-text">Searching...</span>}
            {unitSearchTerm && !selectedUnit && !unitSearchLoading && (
              <span className="billing-help-text">Select a valid unit from suggestions.</span>
            )}
          </label>
        )}

        {filterMode === 'fy' && (
          <label>
            Financial Year
            <select value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)}>
              <option value="">— Select Financial Year —</option>
              {FINANCIAL_YEARS.map((fy) => (
                <option key={fy.label} value={fy.label}>{fy.label}</option>
              ))}
            </select>
          </label>
        )}

        <div style={{ marginTop: '1rem' }}>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {reportGenerated && (
        <div style={{ marginTop: '2rem' }}>
          <div className="section-header" style={{ marginBottom: '0.75rem' }}>
            <h2>
              {filterMode === 'unit'
                ? `Payments for Unit ${selectedUnit?.unit_number}`
                : `Payments for ${selectedFY}`}
              &nbsp;<span style={{ color: '#6b7280', fontWeight: 400, fontSize: '1rem' }}>
                ({payments.length} record{payments.length !== 1 ? 's' : ''})
              </span>
            </h2>
            {payments.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 600, color: '#1e40af' }}>
                  Total Collected: INR {totalPaid}
                </span>
                <button className="btn-small btn-primary" onClick={handleExportPdf}>
                  Export to PDF
                </button>
              </div>
            )}
          </div>

          {payments.length === 0 ? (
            <div className="no-results">No payments found for the selected criteria.</div>
          ) : (
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Invoice #</th>
                  <th>Unit</th>
                  <th>Owner</th>
                  <th>Period</th>
                  <th>Payment Date</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Action</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, idx) => {
                  const inv = payment.invoice_detail;
                  return (
                    <tr key={payment.id}>
                      <td>{payment.receipt_number || payment.id}</td>
                      <td>
                        <button
                          className="btn-link"
                          onClick={() => openInvoicePopup(payment.invoice)}
                          title="View invoice details"
                        >
                          #{payment.invoice_number || payment.invoice_detail?.invoice_number || payment.invoice}
                        </button>
                      </td>
                      <td>{inv?.unit_number || '—'}</td>
                      <td>{inv?.owner_name || '—'}</td>
                      <td>{inv ? `${inv.period_start} to ${inv.period_end}` : '—'}</td>
                      <td>{payment.payment_date}</td>
                      <td>INR {Number(payment.amount).toFixed(2)}</td>
                      <td>{payment.mode}</td>
                      <td>{payment.reference_number || '—'}</td>
                      <td>
                        <span className={`status-badge status-${(payment.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                          {payment.status || 'Payment Received'}
                        </span>
                      </td>
                      <td>
                        {(payment.status || 'Payment Received') === 'Payment Received' ? (
                          <button
                            className="btn-small btn-primary"
                            onClick={() => handleVerifyPayment(payment.id)}
                            disabled={verifyingPaymentId === payment.id}
                          >
                            {verifyingPaymentId === payment.id ? 'Verifying...' : 'Verify Payment'}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {(payment.status || '') === 'Payment Verified' ? (
                          <button className="btn-link" onClick={() => handlePrintReceipt(payment)}>
                            Receipt
                          </button>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>Receipt</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ textAlign: 'right', fontWeight: 600 }}>Total</td>
                  <td style={{ fontWeight: 600 }}>INR {totalPaid}</td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Invoice Popup */}
      {(popupLoading || popupInvoice || popupError) && (
        <div className="modal-overlay" onClick={() => { setPopupInvoice(null); setPopupError(null); }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invoice Details</h2>
              <button className="modal-close" onClick={() => { setPopupInvoice(null); setPopupError(null); }}>✕</button>
            </div>
            {popupLoading && <div className="loading">Loading invoice...</div>}
            {popupError && <div className="alert alert-error">{popupError}</div>}
            {popupInvoice && (
              <div>
                <div className="invoice-summary-grid">
                  <div><strong>Invoice #:</strong> {popupInvoice.invoice_number || popupInvoice.id}</div>
                  <div><strong>Unit:</strong> {popupInvoice.unit?.unit_number || '—'}</div>
                  <div><strong>Owner:</strong> {popupInvoice.member?.owner_name || '—'}</div>
                  <div><strong>Period:</strong> {popupInvoice.period_start} to {popupInvoice.period_end}</div>
                  <div><strong>Due Date:</strong> {popupInvoice.due_date}</div>
                  <div><strong>Status:</strong> <span className={`status-badge status-${popupInvoice.status.toLowerCase()}`}>{popupInvoice.status}</span></div>
                </div>
                <div className="invoice-summary-grid" style={{ marginTop: '0.75rem' }}>
                  <div><strong>Base Amount:</strong> INR {Number(popupInvoice.base_amount).toFixed(2)}</div>
                  <div><strong>Total Levies:</strong> INR {Number(popupInvoice.total_levies).toFixed(2)}</div>
                  <div><strong>Penalty:</strong> INR {Number(popupInvoice.penalty_amount).toFixed(2)}</div>
                  <div><strong>Total Due:</strong> INR {Number(popupInvoice.total_amount).toFixed(2)}</div>
                  <div><strong>Paid:</strong> INR {Number(popupInvoice.paid_amount).toFixed(2)}</div>
                  <div><strong>Outstanding:</strong> INR {(Number(popupInvoice.total_amount) - Number(popupInvoice.paid_amount)).toFixed(2)}</div>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <button className="btn-secondary" onClick={() => navigate(`/invoices/${popupInvoice.id}`)}>
                    Open Full Invoice
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentReport;
