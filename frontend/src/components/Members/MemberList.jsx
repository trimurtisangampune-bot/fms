import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { deleteMember } from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import './MemberList.css';

/**
 * Member List Component
 * Displays a list of members with search, filter, and pagination
 */
const MemberList = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [membershipStatus, setMembershipStatus] = useState('All');
  const [occupantType, setOccupantType] = useState('All');
  const [paymentPref, setPaymentPref] = useState('All');

  // Fetch members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page,
        limit: pageSize,
      };

      if (searchTerm) params.search = searchTerm;
      if (membershipStatus !== 'All') params.membership_status = membershipStatus;
      if (occupantType !== 'All') params.occupant_type = occupantType;
      if (paymentPref !== 'All') params.payment_preference = paymentPref;
      
      const response = await api.get('members/', { params });
      setMembers(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch members');
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, membershipStatus, occupantType, paymentPref]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Delete this member?')) return;

    try {
      await deleteMember(memberId);
      setMembers((prev) => prev.filter((member) => member.id !== memberId));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Unable to delete member', err);
      alert('Unable to delete member. Please try again.');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setMembershipStatus(e.target.value);
    setPage(1);
  };

  const handleOccupantTypeChange = (e) => {
    setOccupantType(e.target.value);
    setPage(1);
  };

  const handlePaymentPrefChange = (e) => {
    setPaymentPref(e.target.value);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const invalidMembersCount = members.filter((member) => member.has_contact_validation_errors).length;

  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await api.post('members/bulk-import/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      alert(`Bulk import completed!\nSuccess: ${response.data.success}\nFailed: ${response.data.failed}`);
      fetchMembers();
    } catch (err) {
      alert(`Bulk import failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const { role } = useContext(AuthContext);
  const canCreateMember = ['Admin', 'Treasurer', 'Board Member'].includes(role);
  const canModifyMember = ['Admin', 'Treasurer', 'Board Member'].includes(role);
  const canImportMembers = role === 'Admin';
  const memberPermissionNote = 'Only Admin, Treasurer, or Board Member can create, edit, or delete members.';
  const importPermissionNote = 'Only Admin can import members.';

  return (
    <div className="member-management">
      <div className="header">
        <h1>Member Management</h1>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => navigate('/members/new')}
            disabled={!canCreateMember}
            title={!canCreateMember ? memberPermissionNote : ''}
          >
            + Add New Member
          </button>
          <label
            className="btn-secondary"
            title={!canImportMembers ? importPermissionNote : ''}
            aria-disabled={!canImportMembers}
          >
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleBulkImport}
              style={{ display: 'none' }}
              disabled={!canImportMembers}
            />
          </label>
        </div>
      </div>
      <p className="permission-legend">Disabled actions depend on your role permissions.</p>

      {error && <div className="alert alert-error">{error}</div>}
      {!error && invalidMembersCount > 0 && (
        <div className="alert alert-warning">
          {invalidMembersCount} member(s) on this page have invalid contact details. They are highlighted in the list.
        </div>
      )}

      {/* Search and Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, phone, or unit..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select value={membershipStatus} onChange={handleStatusChange} className="filter-select">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
            <option value="Left">Left</option>
          </select>

          <select value={occupantType} onChange={handleOccupantTypeChange} className="filter-select">
            <option value="All">All Types</option>
            <option value="Owner">Owner</option>
            <option value="Tenant">Tenant</option>
            <option value="Caretaker">Caretaker</option>
            <option value="Co-owner">Co-owner</option>
          </select>

          <select value={paymentPref} onChange={handlePaymentPrefChange} className="filter-select">
            <option value="All">All Payment Preferences</option>
            <option value="Online">Online Transfer</option>
            <option value="Check">Check</option>
            <option value="Cash">Cash</option>
            <option value="Auto-Debit">Auto-Debit</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="members-table-container">
        {loading && <div className="loading">Loading members...</div>}
        
        {!loading && members.length > 0 && (
          <>
            <table className="members-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Payment Preference</th>
                  <th>Validation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr
                    key={member.id}
                    className={member.has_contact_validation_errors ? 'member-row-invalid' : ''}
                  >
                    <td className="member-name">{member.owner_name}</td>
                    <td className="unit-number">{member.unit_number}</td>
                    <td>{member.occupant_type}</td>
                    <td>{member.contact_phone}</td>
                    <td>{member.contact_email}</td>
                    <td>
                      <span className={`status-badge status-${member.membership_status.toLowerCase()}`}>
                        {member.membership_status}
                      </span>
                    </td>
                    <td>{member.payment_preference}</td>
                    <td>
                      {member.has_contact_validation_errors ? (
                        <div className="validation-errors-cell">
                          {(member.contact_validation_errors || []).map((item, index) => (
                            <div key={index} className="validation-error-item">{item}</div>
                          ))}
                        </div>
                      ) : (
                        <span className="validation-ok">Valid</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-small btn-view" onClick={() => navigate(`/members/${member.id}`)}>View</button>
                        <button
                          className="btn-small btn-edit"
                          onClick={() => navigate(`/members/${member.id}/edit`)}
                          disabled={!canModifyMember}
                          title={!canModifyMember ? memberPermissionNote : ''}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-small btn-delete"
                          onClick={() => handleDeleteMember(member.id)}
                          disabled={!canModifyMember}
                          title={!canModifyMember ? memberPermissionNote : ''}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="pagination">
              <button 
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-pagination"
              >
                Previous
              </button>
              
              <span className="pagination-info">
                Page {page} of {totalPages} (Total: {totalCount} members)
              </span>
              
              <button 
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-pagination"
              >
                Next
              </button>
            </div>
          </>
        )}

        {!loading && members.length === 0 && (
          <div className="no-results">No members found</div>
        )}
      </div>
    </div>
  );
};

export default MemberList;
