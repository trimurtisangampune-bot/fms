import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { getInvoice, cancelInvoice, calculateInvoicePenalty, getInvoiceCancellationApprovalTasks, approveInvoiceCancellationTask, rejectInvoiceCancellationTask } from '../../services/api';
import './Billing.css';

const InvoiceDetail = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [cancellationTask, setCancellationTask] = useState(null);
  const { role } = useContext(AuthContext);
  const navigate = useNavigate();

  const canManageInvoices = role === 'Admin' || role === 'Treasurer';
  const invoicePermissionNote = 'Only Admin or Treasurer can modify invoice state.';

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const response = await getInvoice(id);
      setInvoice(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load invoice details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadCancellationTask = useCallback(async () => {
    if (!id || !canManageInvoices) return;
    try {
      const response = await getInvoiceCancellationApprovalTasks({ invoice: id, status: 'Pending' });
      const tasks = response.data || [];
      setCancellationTask(tasks.length > 0 ? tasks[0] : null);
    } catch (err) {
      console.error(err);
    }
  }, [id, canManageInvoices]);

  useEffect(() => {
    loadInvoice();
    loadCancellationTask();
  }, [loadInvoice, loadCancellationTask]);

  const handleCalculatePenalty = async () => {
    if (!invoice) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await calculateInvoicePenalty(id);
      setInvoice(response.data);
      setMessage('Penalty recalculated successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to calculate penalty.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    if (invoice.status === 'Paid' || invoice.status === 'Cancelled') {
      setError(`Cannot cancel a ${invoice.status} invoice.`);
      return;
    }
    if (!window.confirm('Submit a cancellation request for this invoice? It will require approval from the other role.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await cancelInvoice(id);
      setMessage('Cancellation request submitted for approval.');
      loadCancellationTask();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Unable to submit cancellation request.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTask = async (taskId) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await approveInvoiceCancellationTask(taskId);
      setMessage('Cancellation approved. Invoice has been cancelled.');
      await loadInvoice();
      setCancellationTask(null);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Unable to approve cancellation.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTask = async (taskId) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await rejectInvoiceCancellationTask(taskId);
      setMessage('Cancellation request rejected.');
      setCancellationTask(null);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Unable to reject cancellation.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const outstanding = invoice ? (Number(invoice.total_amount) - Number(invoice.paid_amount)).toFixed(2) : '0.00';

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <h1>Invoice Detail</h1>
          <p>Invoice #{invoice?.invoice_number || id}</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => navigate('/invoices')}>
            Back to Invoices
          </button>
          {canManageInvoices && (
            <button
              className="btn-secondary"
              onClick={handleCancel}
              disabled={!invoice || invoice.status === 'Paid' || invoice.status === 'Cancelled'}
              title={
                !invoice ? '' :
                invoice.status === 'Paid' ? 'Paid invoices cannot be cancelled' :
                invoice.status === 'Cancelled' ? 'Invoice is already cancelled' :
                'Submit cancellation request for approval'
              }
            >
              Cancel Invoice
            </button>
          )}
        </div>
      </div>
      <p className="permission-legend">Disabled actions depend on your role permissions.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {loading && <div className="loading">Loading invoice...</div>}

      {invoice && (
        <div className="invoice-detail-card">
          <div className="invoice-summary-grid">
            <div>
              <strong>Unit:</strong> {invoice.unit?.unit_number || '—'}
            </div>
            <div>
              <strong>Owner:</strong> {invoice.member?.owner_name || '—'}
            </div>
            <div>
              <strong>Period:</strong> {invoice.period_start} to {invoice.period_end}
            </div>
            <div>
              <strong>Issue Date:</strong> {invoice.issue_date}
            </div>
            <div>
              <strong>Due Date:</strong> {invoice.due_date}
            </div>
            <div>
              <strong>Status:</strong> {invoice.status}
            </div>
          </div>

          <div className="invoice-summary-grid">
            <div>
              <strong>Base Amount:</strong> INR {Number(invoice.base_amount).toFixed(2)}
            </div>
            <div>
              <strong>Total Levies:</strong> INR {Number(invoice.total_levies).toFixed(2)}
            </div>
            <div>
              <strong>Penalty:</strong> INR {Number(invoice.penalty_amount).toFixed(2)}
            </div>
            <div>
              <strong>Paid:</strong> INR {Number(invoice.paid_amount).toFixed(2)}
            </div>
            <div>
              <strong>Total Due:</strong> INR {Number(invoice.total_amount).toFixed(2)}
            </div>
            <div>
              <strong>Outstanding:</strong> INR {outstanding}
            </div>
          </div>

          <div className="section-block">
            <div className="section-header">
              <h2>Line Items</h2>
              <button
                className="btn-small btn-secondary"
                onClick={handleCalculatePenalty}
                disabled={!canManageInvoices}
                title={!canManageInvoices ? invoicePermissionNote : ''}
              >
                Recalculate Penalty
              </button>
            </div>
            {invoice.items?.length > 0 ? (
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Charge</th>
                    <th>Amount</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.levy_type}</td>
                      <td>INR {Number(item.amount).toFixed(2)}</td>
                      <td>{item.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-results">No line items available.</div>
            )}
          </div>

          <div className="section-block">
            <h2>Penalties</h2>
            {invoice.penalties?.length > 0 ? (
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.penalties.map((penalty) => (
                    <tr key={penalty.id}>
                      <td>{penalty.penalty_date}</td>
                      <td>INR {Number(penalty.penalty_amount).toFixed(2)}</td>
                      <td>{penalty.days_overdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-results">No penalties recorded.</div>
            )}
          </div>

          <div className="section-block">
            <h2>Payments</h2>
            {invoice.payments?.length > 0 ? (
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.payment_date}</td>
                      <td>INR {Number(payment.amount).toFixed(2)}</td>
                      <td>{payment.mode}</td>
                      <td>{payment.reference_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-results">No payments recorded.</div>
            )}
          </div>

          {canManageInvoices && cancellationTask && (
            <div className="section-block approval-tasks-panel">
              <h2>Pending Cancellation Request</h2>
              <p>Requested by <strong>{cancellationTask.requested_by?.username || '—'}</strong> on {new Date(cancellationTask.created_at).toLocaleString()}.</p>
              <p>Awaiting review by <strong>{cancellationTask.reviewer_role}</strong>.</p>
              {cancellationTask.reviewer_role === role && (
                <div className="header-actions" style={{ marginTop: '0.5rem' }}>
                  <button className="btn-small btn-primary" onClick={() => handleApproveTask(cancellationTask.id)}>
                    Approve Cancellation
                  </button>
                  <button className="btn-small btn-secondary" onClick={() => handleRejectTask(cancellationTask.id)}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceDetail;
