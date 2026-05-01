import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices, getUnits, createPayment } from '../../services/api';
import './Billing.css';

const PaymentEntry = () => {
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [mode, setMode] = useState('Online');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [unitOptions, setUnitOptions] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [loading, setLoading] = useState(false);
  const [unitSearchLoading, setUnitSearchLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const searchUnits = async () => {
      const query = unitSearchTerm.trim();
      if (!query) {
        setUnitOptions([]);
        setSelectedUnitId('');
        setInvoices([]);
        setInvoiceId('');
        return;
      }

      setUnitSearchLoading(true);
      try {
        const response = await getUnits({ search: query, limit: 20 });
        const matches = response.data.results || response.data || [];
        setUnitOptions(matches);

        const exactMatch = matches.find(
          (unit) => unit.unit_number?.toLowerCase() === query.toLowerCase()
        );

        if (exactMatch) {
          setSelectedUnitId(exactMatch.id);
        } else {
          setSelectedUnitId('');
          setInvoiceId('');
          setInvoices([]);
        }
      } catch (err) {
        console.error(err);
        setError('Unable to search units.');
      } finally {
        setUnitSearchLoading(false);
      }
    };

    const timer = setTimeout(searchUnits, 250);
    return () => clearTimeout(timer);
  }, [unitSearchTerm]);

  useEffect(() => {
    const fetchUnitInvoices = async () => {
      if (!selectedUnitId) {
        setInvoices([]);
        setInvoiceId('');
        return;
      }

      setInvoiceLoading(true);
      try {
        const response = await getInvoices({ unit: selectedUnitId, limit: 100 });
        const all = response.data.results || response.data || [];
        setInvoices(all.filter((inv) => inv.status !== 'Paid' && inv.status !== 'Cancelled'));
        setInvoiceId('');
      } catch (err) {
        console.error(err);
        setError('Unable to load invoices for selected unit.');
      } finally {
        setInvoiceLoading(false);
      }
    };

    fetchUnitInvoices();
  }, [selectedUnitId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const paidInvoiceId = invoiceId;
      await createPayment({
        invoice: invoiceId,
        amount,
        payment_date: paymentDate,
        mode,
        reference_number: referenceNumber,
      });
      setMessage('Payment recorded successfully.');
      setInvoices((prev) => prev.filter((item) => String(item.id) !== String(paidInvoiceId)));
      setInvoiceId('');
      setAmount('');
      setPaymentDate('');
      setMode('Online');
      setReferenceNumber('');
    } catch (err) {
      setError(err.response?.data || 'Unable to record payment.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <h1>Record Payment</h1>
          <p>Select an outstanding invoice and record the payment details.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate('/invoices')}>
            View Invoices
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{JSON.stringify(error)}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="billing-form" onSubmit={handleSubmit}>
        <label>
          Unit Number
          <input
            type="text"
            value={unitSearchTerm}
            onChange={(e) => setUnitSearchTerm(e.target.value)}
            placeholder="Search unit number (e.g. A-101)"
            list="unit-number-options"
            autoComplete="off"
            required
          />
          <datalist id="unit-number-options">
            {unitOptions.map((unit) => (
              <option key={unit.id} value={unit.unit_number}>
                {unit.block ? `Block ${unit.block}` : ''}
              </option>
            ))}
          </datalist>
        </label>

        {unitSearchLoading && <p className="billing-help-text">Searching units...</p>}
        {!!unitSearchTerm && !selectedUnitId && !unitSearchLoading && (
          <p className="billing-help-text">Select a valid unit number from suggestions.</p>
        )}

        <label>
          Invoice
          <select
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            required
            disabled={!selectedUnitId || invoiceLoading}
          >
            <option value="">{selectedUnitId ? 'Select invoice' : 'Select unit first'}</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                #{invoice.invoice_number || invoice.id} — {invoice.unit?.unit_number || '—'} / {invoice.member?.owner_name || '—'} / Due {invoice.due_date}
              </option>
            ))}
          </select>
        </label>

        {invoiceLoading && <p className="billing-help-text">Loading invoices for selected unit...</p>}
        {!invoiceLoading && selectedUnitId && invoices.length === 0 && (
          <p className="billing-help-text">No pending invoices found for selected unit.</p>
        )}

        {invoiceId && (() => {
          const selected = invoices.find((inv) => String(inv.id) === String(invoiceId));
          if (!selected) return null;
          const outstanding = (Number(selected.total_amount) - Number(selected.paid_amount)).toFixed(2);
          return (
            <div className="billing-outstanding-info">
              <span>Outstanding Balance:</span>
              <strong> INR {outstanding}</strong>
              <span style={{ marginLeft: '1rem', color: '#666', fontSize: '0.875rem' }}>
                (Total INR {Number(selected.total_amount).toFixed(2)} − Paid INR {Number(selected.paid_amount).toFixed(2)})
              </span>
            </div>
          );
        })()}

        <label>
          Amount
          <input
            type="number"
            name="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0.01"
            required
          />
        </label>

        <label>
          Payment Date
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
        </label>

        <label>
          Payment Mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="Online">Online</option>
            <option value="Transfer">Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
          </select>
        </label>

        <label>
          Reference Number
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="Optional"
          />
        </label>

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={loading || !invoiceId}>
            {loading ? 'Saving...' : 'Record Payment'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/invoices')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentEntry;
