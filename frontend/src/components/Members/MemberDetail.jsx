import React, { useCallback, useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMember, getMemberLedger, getMemberHistory } from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import './MemberDetail.css';

/**
 * Member Detail Component
 * Shows detailed information about a member including bank details and ledger
 */
const MemberDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const memberId = id;
  const [member, setMember] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const { role } = useContext(AuthContext);

  const canModifyMember = ['Admin', 'Treasurer', 'Board Member'].includes(role);
  const memberPermissionNote = 'Only Admin, Treasurer, or Board Member can edit members.';

  const fetchMemberDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [memberRes, ledgerRes, historyRes] = await Promise.all([
        getMember(memberId),
        getMemberLedger(memberId),
        getMemberHistory(memberId),
      ]);
      
      setMember(memberRes.data);
      setLedger(ledgerRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch member details');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    fetchMemberDetails();
  }, [fetchMemberDetails]);

  if (loading) return <div className="loading">Loading member details...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!member) return <div className="alert alert-error">Member not found</div>;

  return (
    <div className="member-detail">
      <div className="header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <h1>{member.owner_name}</h1>
        <button
          className="btn-edit"
          onClick={() => navigate(`/members/${memberId}/edit`)}
          disabled={!canModifyMember}
          title={!canModifyMember ? memberPermissionNote : ''}
        >
          Edit Member
        </button>
      </div>
      <p className="permission-legend">Disabled actions depend on your role permissions.</p>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button 
          className={`tab ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          Ledger
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="details-section">
            <div className="details-grid">
              {/* Personal Information */}
              <div className="section">
                <h3>Personal Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Name</label>
                    <span>{member.owner_name}</span>
                  </div>
                  <div className="info-item">
                    <label>Unit</label>
                    <span>{member.unit.unit_number} ({member.unit.block})</span>
                  </div>
                  <div className="info-item">
                    <label>Type</label>
                    <span>{member.occupant_type}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="section">
                <h3>Contact Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Primary Phone</label>
                    <span>{member.contact_phone}</span>
                  </div>
                  <div className="info-item">
                    <label>Alternate Phone</label>
                    <span>{member.alternate_contact || 'Not provided'}</span>
                  </div>
                  <div className="info-item">
                    <label>Email</label>
                    <span>{member.contact_email}</span>
                  </div>
                </div>
              </div>

              {/* Membership Details */}
              <div className="section">
                <h3>Membership Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Status</label>
                    <span className={`status-badge status-${member.membership_status.toLowerCase()}`}>
                      {member.membership_status}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Move-in Date</label>
                    <span>{new Date(member.move_in_date).toLocaleDateString()}</span>
                  </div>
                  <div className="info-item">
                    <label>Move-out Date</label>
                    <span>{member.move_out_date ? new Date(member.move_out_date).toLocaleDateString() : 'Active'}</span>
                  </div>
                  <div className="info-item">
                    <label>Primary Contact</label>
                    <span>{member.is_primary_contact ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="section">
                <h3>Payment Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Payment Preference</label>
                    <span>{member.payment_preference}</span>
                  </div>
                  <div className="info-item">
                    <label>Bank Details</label>
                    <span className={member.has_bank_details ? 'completed' : 'incomplete'}>
                      {member.has_bank_details ? '✓ Verified' : '✗ Missing'}
                    </span>
                  </div>
                </div>

                {member.bank_account && member.has_bank_details && (
                  <div className="bank-details">
                    <h4>Bank Account Information</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Account Holder</label>
                        <span>{member.bank_account.account_holder}</span>
                      </div>
                      <div className="info-item">
                        <label>Account Number</label>
                        <span>{member.bank_account.account_no}</span>
                      </div>
                      <div className="info-item">
                        <label>IFSC Code</label>
                        <span>{member.bank_account.ifsc}</span>
                      </div>
                      <div className="info-item">
                        <label>Bank Name</label>
                        <span>{member.bank_account.bank_name}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nominee Details */}
              {(member.nominated_person_name || member.nominated_person_contact) && (
                <div className="section">
                  <h3>Nominee Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Nominee Name</label>
                      <span>{member.nominated_person_name}</span>
                    </div>
                    <div className="info-item">
                      <label>Nominee Contact</label>
                      <span>{member.nominated_person_contact}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ledger Tab */}
        {activeTab === 'ledger' && ledger && (
          <div className="ledger-section">
            <div className="ledger-summary">
              <div className="ledger-item">
                <label>Total Invoiced</label>
                <span className="amount">INR {parseFloat(ledger.total_invoiced || 0).toFixed(2)}</span>
              </div>
              <div className="ledger-item">
                <label>Total Paid</label>
                <span className="amount">INR {parseFloat(ledger.total_paid || 0).toFixed(2)}</span>
              </div>
              <div className="ledger-item">
                <label>Outstanding</label>
                <span className={`amount ${parseFloat(ledger.outstanding) > 0 ? 'outstanding' : 'paid'}`}>
                  INR {parseFloat(ledger.outstanding || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {ledger.invoices && ledger.invoices.length > 0 && (
              <div className="invoices-section">
                <h3>Recent Invoices</h3>
                <table className="invoices-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Issued Date</th>
                      <th>Due Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.invoices.map(invoice => (
                      <tr key={invoice.id}>
                        <td>{invoice.period}</td>
                        <td>{new Date(invoice.issued_date).toLocaleDateString()}</td>
                        <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                        <td>INR {parseFloat(invoice.amount).toFixed(2)}</td>
                        <td><span className={`badge badge-${invoice.status.toLowerCase()}`}>{invoice.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ledger.payments && ledger.payments.length > 0 && (
              <div className="payments-section">
                <h3>Recent Payments</h3>
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.payments.map(payment => (
                      <tr key={payment.id}>
                        <td>{new Date(payment.date).toLocaleDateString()}</td>
                        <td>INR {parseFloat(payment.amount).toFixed(2)}</td>
                        <td>{payment.mode}</td>
                        <td>{payment.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="history-section">
            <h3>Change History</h3>
            {history.length > 0 ? (
              <div className="history-list">
                {history.map((log, index) => (
                  <div key={log.id} className="history-item">
                    <div className="history-header">
                      <span className="action-badge">{log.action}</span>
                      <span className="timestamp">{new Date(log.changed_at).toLocaleString()}</span>
                      <span className="user">by {log.changed_by?.first_name}</span>
                    </div>
                    {log.description && <p>{log.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-items">No change history available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberDetail;
