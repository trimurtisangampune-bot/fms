import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateInvoices } from '../../services/api';
import './Billing.css';

const InvoiceGeneration = () => {
  const [generationFrequency, setGenerationFrequency] = useState('Monthly');
  const [monthlyYear, setMonthlyYear] = useState('');
  const [monthlyMonth, setMonthlyMonth] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [unitNumbers, setUnitNumbers] = useState('');
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const getCurrentFinancialYearStart = () => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  };

  const getFinancialYearOptions = () => {
    const currentStartYear = getCurrentFinancialYearStart();
    const options = [];
    for (let year = currentStartYear - 3; year <= currentStartYear + 5; year += 1) {
      options.push(`${year}/${String((year + 1) % 100).padStart(2, '0')}`);
    }
    return options;
  };

  const financialYearOptions = getFinancialYearOptions();

  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-').map(Number);
    const monthName = new Date(year, month - 1, day).toLocaleString('en-US', { month: 'short' });
    return `${monthName} ${String(day).padStart(2, '0')}, ${year}`;
  };

  const getBillingPeriod = () => {
    if (generationFrequency === 'Monthly') {
      if (!monthlyYear || !monthlyMonth) {
        throw new Error('Please select both year and month for monthly generation.');
      }

      const year = Number(monthlyYear);
      const month = Number(monthlyMonth);
      const lastDay = new Date(year, month, 0).getDate();
      const monthText = String(month).padStart(2, '0');

      return {
        start: `${year}-${monthText}-01`,
        end: `${year}-${monthText}-${String(lastDay).padStart(2, '0')}`,
      };
    }

    const match = /^(\d{4})\/(\d{2})$/.exec(financialYear.trim());
    if (!match) {
      throw new Error('Financial year must be in format YYYY/YY, for example 2024/25.');
    }

    const startYear = Number(match[1]);
    const endYearSuffix = Number(match[2]);
    const expectedSuffix = (startYear + 1) % 100;

    if (endYearSuffix !== expectedSuffix) {
      throw new Error('Financial year is invalid. Example valid values: 2024/25, 2025/26.');
    }

    return {
      start: `${startYear}-04-01`,
      end: `${startYear + 1}-03-31`,
    };
  };

  const getPreviewRange = () => {
    try {
      const { start, end } = getBillingPeriod();
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    } catch (_err) {
      return null;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { start, end } = getBillingPeriod();

      const payload = {
        generation_frequency: generationFrequency,
        billing_period_start: start,
        billing_period_end: end,
        force_regenerate: forceRegenerate,
      };

      if (unitNumbers.trim()) {
        payload.unit_numbers = unitNumbers.split(',').map((v) => v.trim().toUpperCase()).filter(Boolean);
      }

      const response = await generateInvoices(payload);
      setMessage(
        `${generationFrequency} invoices generated: ${response.data.created}. Skipped: ${response.data.skipped}.`
      );
      setMonthlyYear('');
      setMonthlyMonth('');
      setFinancialYear('');
      setUnitNumbers('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to generate invoices.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-page">
      <div className="billing-header">
        <h1>Generate Maintenance Invoices</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="billing-form" onSubmit={handleSubmit}>
        <label>
          Invoice Frequency To Generate
          <select
            value={generationFrequency}
            onChange={(e) => {
              const value = e.target.value;
              setGenerationFrequency(value);
              if (value === 'Annual' && !financialYear) {
                const startYear = getCurrentFinancialYearStart();
                setFinancialYear(`${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`);
              }
              setError(null);
              setMessage(null);
            }}
            required
          >
            <option value="Monthly">Monthly</option>
            <option value="Annual">Annual</option>
          </select>
        </label>

        {generationFrequency === 'Monthly' ? (
          <>
            <label>
              Billing Year
              <input
                type="number"
                min="2000"
                max="2100"
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(e.target.value)}
                placeholder="e.g. 2026"
                required
              />
            </label>

            <label>
              Billing Month
              <select
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(e.target.value)}
                required
              >
                <option value="">Select month</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </label>

            <p className="billing-help-text">
              Billing period: {getPreviewRange() || 'Select year and month to preview billing range.'}
            </p>
          </>
        ) : (
          <>
            <label>
              Financial Year
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                required
              >
                <option value="">Select financial year</option>
                {financialYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <p className="billing-help-text">
              Billing period: {getPreviewRange() || 'Select a financial year to preview billing range.'}
            </p>
          </>
        )}

        <label>
          Unit Numbers (optional, comma-separated)
          <input
            type="text"
            value={unitNumbers}
            onChange={(e) => setUnitNumbers(e.target.value)}
            placeholder="e.g. A-101, B-202, C-303"
          />
          <span className="field-hint">Leave blank to generate for all units</span>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={forceRegenerate}
            onChange={(e) => setForceRegenerate(e.target.checked)}
          />
          Force regenerate existing invoices
        </label>

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Invoices'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/invoices')}>
            View Invoices
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvoiceGeneration;
