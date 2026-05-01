import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import {
  getInvoices,
  getPayments,
  cancelInvoice,
  getInvoiceCancellationApprovalTasks,
  approveInvoiceCancellationTask,
  rejectInvoiceCancellationTask,
} from '../../services/api';
import './Billing.css';

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancellationTasks, setCancellationTasks] = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [paymentsPopup, setPaymentsPopup] = useState({ invoiceId: null, payments: [], loading: false, error: null });
  const { role } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const approvalPanelRef = useRef(null);

  const canManageInvoices = role === 'Admin' || role === 'Treasurer';
  const invoicePermissionNote = 'Only Admin or Treasurer can generate or cancel invoices.';

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const params = { limit: 100 };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      const response = await getInvoices(params);
      const fetchedInvoices = response.data.results || response.data || [];
      setInvoices(fetchedInvoices);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load invoices.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  const fetchCancellationTasks = useCallback(async () => {
    if (!canManageInvoices) {
      setCancellationTasks([]);
      return;
    }
    setTaskLoading(true);
    try {
      const response = await getInvoiceCancellationApprovalTasks({ scope: 'mine', status: 'Pending' });
      setCancellationTasks(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setTaskLoading(false);
    }
  }, [canManageInvoices]);

  const loadPaymentsForInvoice = useCallback(async (invoiceId) => {
    setPaymentsPopup((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getPayments({ invoice: invoiceId });
      const payments = response.data.results || response.data || [];
      setPaymentsPopup({ invoiceId, payments, loading: false, error: null });
    } catch (err) {
      setPaymentsPopup((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.detail || 'Unable to load payments.',
      }));
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchCancellationTasks();
  }, [fetchCancellationTasks]);

  useEffect(() => {
    if (location.hash === '#approval-tasks' && canManageInvoices) {
      const timer = setTimeout(() => {
        approvalPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.hash, canManageInvoices, cancellationTasks.length]);

  const handleCancel = async (invoiceId, invoiceStatus) => {
    if (invoiceStatus === 'Paid' || invoiceStatus === 'Cancelled') {
      setError(`Cannot cancel a ${invoiceStatus} invoice.`);
      return;
    }
    if (!window.confirm('Submit a cancellation request for this invoice? It will require approval from the other role.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await cancelInvoice(invoiceId);
      setMessage('Cancellation request submitted for approval.');
      fetchCancellationTasks();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Unable to submit cancellation request.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTask = async (taskId) => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await approveInvoiceCancellationTask(taskId);
      setMessage('Cancellation approved. Invoice has been cancelled.');
      await fetchInvoices();
      await fetchCancellationTasks();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Unable to approve task.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTask = async (taskId) => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      await rejectInvoiceCancellationTask(taskId);
      setMessage('Cancellation request rejected.');
      await fetchCancellationTasks();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Unable to reject task.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <h1>Invoices</h1>
          <p>View generated maintenance invoices and drill into details.</p>
        </div>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => navigate('/invoices/generate')}
            disabled={!canManageInvoices}
            title={!canManageInvoices ? invoicePermissionNote : ''}
          >
            Generate Invoices
          </button>
        </div>
      </div>
      <p className="permission-legend">Disabled actions depend on your role permissions.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by unit or owner..."
          />
        </div>
        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {canManageInvoices && (
        <div id="approval-tasks" ref={approvalPanelRef} className="approval-tasks-panel">
          <div className="section-header">
            <h2>Invoice Cancellation Approvals ({cancellationTasks.length})</h2>
            {taskLoading && <span className="loading-inline">Refreshing...</span>}
          </div>
          {cancellationTasks.length > 0 ? (
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Task #</th>
                  <th>Invoice #</th>
                  <th>Unit</th>
                  <th>Requested By</th>
                  <th>Requested At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cancellationTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.id}</td>
                    <td>{task.invoice_snapshot?.invoice_id || task.invoice || '—'}</td>
                    <td>{task.invoice_snapshot?.unit_number || '—'}</td>
                    <td>{task.requested_by?.username || '—'}</td>
                    <td>{new Date(task.created_at).toLocaleString()}</td>
                    <td>
                      <button className="btn-small btn-primary" onClick={() => handleApproveTask(task.id)}>
                        Approve
                      </button>
                      <button className="btn-small btn-secondary" onClick={() => handleRejectTask(task.id)}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-results">No pending invoice cancellation approvals.</div>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading invoices...</div>
      ) : invoices.length > 0 ? (
        <table className="billing-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Unit</th>
              <th>Owner</th>
              <th>Period</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number || invoice.id}</td>
                <td>{invoice.unit?.unit_number || '—'}</td>
                <td>{invoice.member?.owner_name || '—'}</td>
                <td>{invoice.period_start} to {invoice.period_end}</td>
                <td>{invoice.due_date}</td>
                <td>INR {Number(invoice.total_amount).toFixed(2)}</td>
                <td><span className={`status-badge status-${invoice.status.toLowerCase()}`}>{invoice.status}</span></td>
                <td>
                  <button className="btn-small btn-view" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    View
                  </button>
                  {invoice.status === 'Paid' && (
                    <button className="btn-small btn-link" onClick={() => loadPaymentsForInvoice(invoice.id)}>
                      Payments
                    </button>
                  )}
                  {canManageInvoices && (
                    <button
                      className="btn-small btn-secondary"
                      onClick={() => handleCancel(invoice.id, invoice.status)}
                      disabled={invoice.status === 'Paid' || invoice.status === 'Cancelled'}
                      title={invoice.status === 'Paid' ? 'Paid invoices cannot be cancelled' : invoice.status === 'Cancelled' ? 'Already cancelled' : 'Cancel this invoice'}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="no-results">No invoices found.</div>
      )}

      {paymentsPopup.invoiceId && (
        <div className="modal-overlay" onClick={() => setPaymentsPopup({ invoiceId: null, payments: [], loading: false, error: null })}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Payments for Invoice</h2>
              <button
                className="modal-close"
                onClick={() => setPaymentsPopup({ invoiceId: null, payments: [], loading: false, error: null })}
              >
                ×
              </button>
            </div>

            {paymentsPopup.loading ? (
              <div className="loading">Loading payments...</div>
            ) : paymentsPopup.error ? (
              <div className="alert alert-error">{paymentsPopup.error}</div>
            ) : paymentsPopup.payments.length > 0 ? (
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsPopup.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td>INR {Number(payment.amount).toFixed(2)}</td>
                      <td>{payment.reference || '—'}</td>
                      <td>{payment.recorded_by?.username || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-results">No payments found for this invoice.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
