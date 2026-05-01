import React, { useCallback, useEffect, useState } from 'react';
import { getPaymentCommunicationLogs } from '../../services/api';
import '../Billing/Billing.css';

const CommunicationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [channel, setChannel] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ordering: '-sent_at', limit: 300 };
      if (channel) params.channel = channel;
      if (deliveryStatus) params.delivery_status = deliveryStatus;

      const response = await getPaymentCommunicationLogs(params);
      setLogs(response.data.results || response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load communication logs.');
    } finally {
      setLoading(false);
    }
  }, [channel, deliveryStatus]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <h1>Communication Logs</h1>
          <p>Track payment receipt delivery attempts sent to owners by Email, WhatsApp, and SMS.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="billing-form" style={{ marginBottom: '1rem' }}>
        <label>
          Channel
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">All</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </label>

        <label>
          Delivery Status
          <select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value)}>
            <option value="">All</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
          </select>
        </label>

        <div className="form-actions">
          <button className="btn-primary" type="button" onClick={loadLogs} disabled={loading}>
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
        </div>
      </div>

      <table className="billing-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Sent At</th>
            <th>Payment #</th>
            <th>Invoice #</th>
            <th>Unit</th>
            <th>Owner</th>
            <th>Channel</th>
            <th>Status</th>
            <th>Recipient</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 && (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center', color: '#6b7280' }}>
                {loading ? 'Loading logs...' : 'No communication logs found.'}
              </td>
            </tr>
          )}
          {logs.map((log, idx) => (
            <tr key={log.id}>
              <td>{idx + 1}</td>
              <td>{formatDateTime(log.sent_at)}</td>
              <td>{log.receipt_number || log.payment_id}</td>
              <td>{log.invoice_number || log.invoice_id}</td>
              <td>{log.unit_number || '—'}</td>
              <td>{log.owner_name || '—'}</td>
              <td style={{ textTransform: 'capitalize' }}>{log.channel}</td>
              <td>
                <span className={`status-badge status-${(log.delivery_status || '').toLowerCase()}`}>
                  {log.delivery_status}
                </span>
              </td>
              <td>{log.recipient || '—'}</td>
              <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>{log.detail || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CommunicationLogs;