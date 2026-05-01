import React, { useCallback, useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUnit, setUnitInvoiceFrequency } from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import './UnitDetail.css';

/**
 * Unit Detail Component
 * Shows detailed information about a unit and its members
 */
const UnitDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const unitId = id;
  const [unit, setUnit] = useState(null);
  const [members, setMembers] = useState([]);
  const [occupants, setOccupants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [freqEdit, setFreqEdit] = useState(false);
  const [freqValue, setFreqValue] = useState('');
  const [freqSaving, setFreqSaving] = useState(false);
  const [freqError, setFreqError] = useState(null);
  const { role } = useContext(AuthContext);

  const canModifyUnit = role === 'Admin';
  const canSetFrequency = ['Admin', 'Treasurer'].includes(role);
  const canManageMembers = ['Admin', 'Treasurer', 'Board Member'].includes(role);
  const canManageOccupants = role === 'Admin';
  const unitPermissionNote = 'Only Admin can edit this unit.';
  const memberPermissionNote = 'Only Admin, Treasurer, or Board Member can manage members.';
  const occupantPermissionNote = 'Only Admin can manage occupants.';

  const fetchUnitDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getUnit(unitId);
      setUnit(response.data);
      setFreqValue(response.data.invoice_frequency || '');
      setMembers(response.data.members || []);
      setOccupants(response.data.occupants || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch unit details');
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchUnitDetails();
  }, [fetchUnitDetails]);

  if (loading) return <div className="loading">Loading unit details...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!unit) return <div className="alert alert-error">Unit not found</div>;

  return (
    <div className="unit-detail">
      <div className="header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <h1>Unit {unit.unit_number}</h1>
        <button
          className="btn-edit"
          onClick={() => navigate(`/units/${unitId}/edit`)}
          disabled={!canModifyUnit}
          title={!canModifyUnit ? unitPermissionNote : ''}
        >
          Edit Unit
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
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({members.length})
        </button>
        <button 
          className={`tab ${activeTab === 'occupants' ? 'active' : ''}`}
          onClick={() => setActiveTab('occupants')}
        >
          Occupants ({occupants.length})
        </button>
        <button 
          className={`tab ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          Ledger
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="details-section">
            <div className="info-grid">
              <div className="info-item">
                <label>Unit Number</label>
                <span>{unit.unit_number}</span>
              </div>
              <div className="info-item">
                <label>Block</label>
                <span>{unit.block}</span>
              </div>
              <div className="info-item">
                <label>Floor</label>
                <span>{unit.floor}</span>
              </div>
              <div className="info-item">
                <label>Area (sqft)</label>
                <span>{parseFloat(unit.area_sqft).toFixed(2)}</span>
              </div>
              <div className="info-item">
                <label>Unit Type</label>
                <span>{unit.unit_type}</span>
              </div>
              <div className="info-item">
                <label>Status</label>
                <span className={`status-badge status-${unit.status.toLowerCase()}`}>
                  {unit.status}
                </span>
              </div>
              <div className="info-item">
                <label>Occupancy</label>
                <span>{unit.occupancy_status || 'Owner Occupied'}</span>
              </div>
              <div className="info-item">
                <label>Invoice Frequency</label>
                {freqEdit ? (
                  <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <select
                      value={freqValue}
                      onChange={(e) => setFreqValue(e.target.value)}
                      style={{ fontSize: '0.9rem' }}
                    >
                      <option value=''>Template default</option>
                      <option value='Monthly'>Monthly</option>
                      <option value='Annual'>Annual</option>
                    </select>
                    <button
                      className='btn-small btn-primary'
                      disabled={freqSaving}
                      onClick={async () => {
                        setFreqSaving(true);
                        setFreqError(null);
                        try {
                          await setUnitInvoiceFrequency(unitId, freqValue);
                          setUnit((prev) => ({ ...prev, invoice_frequency: freqValue }));
                          setFreqEdit(false);
                        } catch (e) {
                          setFreqError(e.response?.data?.error || 'Save failed');
                        } finally {
                          setFreqSaving(false);
                        }
                      }}
                    >
                      {freqSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      className='btn-small btn-secondary'
                      onClick={() => { setFreqEdit(false); setFreqValue(unit.invoice_frequency || ''); setFreqError(null); }}
                    >
                      Cancel
                    </button>
                    {freqError && <span style={{ color: 'red', fontSize: '0.8rem' }}>{freqError}</span>}
                  </span>
                ) : (
                  <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {unit.invoice_frequency || 'Template default'}
                    <button
                      className='btn-small btn-edit'
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      disabled={!canSetFrequency}
                      title={!canSetFrequency ? 'Only Admin or Treasurer can change invoice frequency.' : ''}
                      onClick={() => setFreqEdit(true)}
                    >
                      Edit
                    </button>
                  </span>
                )}
              </div>
              <div className="info-item">
                <label>Created By</label>
                <span>{unit.created_by?.first_name} {unit.created_by?.last_name}</span>
              </div>
              <div className="info-item">
                <label>Created At</label>
                <span>{new Date(unit.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="members-section">
            <div className="section-header">
              <h3>Members</h3>
              <button
                className="btn-small btn-primary"
                disabled={!canManageMembers}
                title={!canManageMembers ? memberPermissionNote : ''}
              >
                + Add Member
              </button>
            </div>
            
            {members.length > 0 ? (
              <div className="members-list">
                {members.map(member => (
                  <div key={member.id} className="member-card">
                    <div className="member-header">
                      <h4>{member.owner_name}</h4>
                      {member.is_primary_contact && <span className="badge primary-badge">Primary Contact</span>}
                    </div>
                    <div className="member-details">
                      <p><strong>Type:</strong> {member.occupant_type}</p>
                      <p><strong>Status:</strong> {member.membership_status}</p>
                      <p><strong>Phone:</strong> {member.contact_phone}</p>
                      <p><strong>Email:</strong> {member.contact_email}</p>
                      <p><strong>Payment Preference:</strong> {member.payment_preference}</p>
                    </div>
                    <div className="member-actions">
                      <button className="btn-small btn-view">View Details</button>
                      <button
                        className="btn-small btn-edit"
                        disabled={!canManageMembers}
                        title={!canManageMembers ? memberPermissionNote : ''}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-small btn-delete"
                        disabled={!canManageMembers}
                        title={!canManageMembers ? memberPermissionNote : ''}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-items">No members assigned to this unit</div>
            )}
          </div>
        )}

        {/* Occupants Tab */}
        {activeTab === 'occupants' && (
          <div className="occupants-section">
            <div className="section-header">
              <h3>Occupants</h3>
              <button
                className="btn-small btn-primary"
                disabled={!canManageOccupants}
                title={!canManageOccupants ? occupantPermissionNote : ''}
              >
                + Add Occupant
              </button>
            </div>
            
            {occupants.length > 0 ? (
              <table className="occupants-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relation</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {occupants.map(occupant => (
                    <tr key={occupant.id}>
                      <td>{occupant.name}</td>
                      <td>{occupant.relation}</td>
                      <td>{occupant.occupant_type}</td>
                      <td>{occupant.contact_phone}</td>
                      <td>
                        <button
                          className="btn-small btn-edit"
                          disabled={!canManageOccupants}
                          title={!canManageOccupants ? occupantPermissionNote : ''}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-small btn-delete"
                          disabled={!canManageOccupants}
                          title={!canManageOccupants ? occupantPermissionNote : ''}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-items">No occupants recorded</div>
            )}
          </div>
        )}

        {/* Ledger Tab */}
        {activeTab === 'ledger' && (
          <div className="ledger-section">
            <h3>Financial Ledger</h3>
            <div className="ledger-summary">
              <div className="ledger-item">
                <label>Total Invoiced</label>
                <span className="amount">INR 0.00</span>
              </div>
              <div className="ledger-item">
                <label>Total Paid</label>
                <span className="amount">INR 0.00</span>
              </div>
              <div className="ledger-item">
                <label>Outstanding</label>
                <span className="amount outstanding">INR 0.00</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitDetail;
