import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFormatSettings, saveFormatSettings } from '../../services/api';
import './AdminSettings.css';

const defaultForm = {
  invoice_number_format: 'INV-[fiscal_year]-[seq]',
  invoice_seq_digits: 4,
  invoice_seq_start: 1,
  invoice_seq_next: 1,
  receipt_number_format: 'RCPT-[fiscal_year]-[seq]',
  receipt_seq_digits: 4,
  receipt_seq_start: 1,
  receipt_seq_next: 1,
};

const FormatSettings = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getFormatSettings();
        setFormData({ ...defaultForm, ...response.data });
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load format settings.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const fiscalYear = useMemo(() => {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
    return `${startYear}-${endYearShort}`;
  }, []);

  const buildPreview = (kind) => {
    const now = new Date();
    const format = kind === 'invoice' ? formData.invoice_number_format : formData.receipt_number_format;
    const digits = Number(kind === 'invoice' ? formData.invoice_seq_digits : formData.receipt_seq_digits) || 1;
    const seq = Number(kind === 'invoice' ? formData.invoice_seq_next : formData.receipt_seq_next) || 1;

    return String(format || '')
      .replace(/\[Unit_Number\]/g, 'A-101')
      .replace(/\[year\]/g, String(now.getFullYear()))
      .replace(/\[month\]/g, String(now.getMonth() + 1).padStart(2, '0'))
      .replace(/\[day\]/g, String(now.getDate()).padStart(2, '0'))
      .replace(/\[fiscal_year\]/g, fiscalYear)
      .replace(/\[seq\]/g, String(seq).padStart(Math.max(1, digits), '0'));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        invoice_number_format: formData.invoice_number_format,
        invoice_seq_digits: Number(formData.invoice_seq_digits),
        invoice_seq_start: Number(formData.invoice_seq_start),
        receipt_number_format: formData.receipt_number_format,
        receipt_seq_digits: Number(formData.receipt_seq_digits),
        receipt_seq_start: Number(formData.receipt_seq_start),
      };

      const response = await saveFormatSettings(payload);
      setFormData((prev) => ({ ...prev, ...response.data }));
      setMessage('Format settings saved successfully.');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const details = Object.entries(data)
          .map(([field, issues]) => `${field}: ${Array.isArray(issues) ? issues.join(', ') : issues}`)
          .join(' | ');
        setError(details || 'Unable to save format settings.');
      } else {
        setError('Unable to save format settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="settings-page"><div className="loading">Loading format settings...</div></div>;
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Format Settings</h1>
          <p>Configure invoice and receipt numbering formats using supported placeholders.</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="settings-form" onSubmit={handleSubmit}>
        <section className="settings-card">
          <h2>Invoice Number</h2>
          <div className="settings-grid">
            <label>
              Format
              <input
                name="invoice_number_format"
                value={formData.invoice_number_format}
                onChange={handleChange}
                placeholder="INV-[fiscal_year]-[seq]"
              />
            </label>
            <label>
              Sequence Digits
              <input
                name="invoice_seq_digits"
                type="number"
                min="1"
                max="12"
                value={formData.invoice_seq_digits}
                onChange={handleChange}
              />
            </label>
            <label>
              Sequence Start
              <input
                name="invoice_seq_start"
                type="number"
                min="1"
                value={formData.invoice_seq_start}
                onChange={handleChange}
              />
            </label>
            <label>
              Next Sequence (Read Only)
              <input name="invoice_seq_next" value={formData.invoice_seq_next} readOnly />
            </label>
          </div>
          <p className="settings-help">Preview: {buildPreview('invoice')}</p>
        </section>

        <section className="settings-card">
          <h2>Receipt Number</h2>
          <div className="settings-grid">
            <label>
              Format
              <input
                name="receipt_number_format"
                value={formData.receipt_number_format}
                onChange={handleChange}
                placeholder="RCPT-[fiscal_year]-[seq]"
              />
            </label>
            <label>
              Sequence Digits
              <input
                name="receipt_seq_digits"
                type="number"
                min="1"
                max="12"
                value={formData.receipt_seq_digits}
                onChange={handleChange}
              />
            </label>
            <label>
              Sequence Start
              <input
                name="receipt_seq_start"
                type="number"
                min="1"
                value={formData.receipt_seq_start}
                onChange={handleChange}
              />
            </label>
            <label>
              Next Sequence (Read Only)
              <input name="receipt_seq_next" value={formData.receipt_seq_next} readOnly />
            </label>
          </div>
          <p className="settings-help">Preview: {buildPreview('receipt')}</p>
        </section>

        <section className="settings-card">
          <h2>Supported Placeholders</h2>
          <p className="settings-help">Use these placeholders in your format templates: [Unit_Number], [year], [month], [day], [fiscal_year], [seq]</p>
          <p className="settings-help">[seq] is required in both invoice and receipt formats to keep values unique.</p>
        </section>

        <div className="settings-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Format Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormatSettings;
