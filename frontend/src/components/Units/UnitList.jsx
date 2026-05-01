import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { deleteUnit, bulkImportUnits } from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import './UnitManagement.css';

/**
 * Unit List Component
 * Displays a list of units with search, filter, and pagination
 */
const UnitList = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [unitTypeFilter, setUnitTypeFilter] = useState('All');
  const [blockFilter, setBlockFilter] = useState('All');
  
  // Unit data for filters
  const [blocks, setBlocks] = useState([]);
  const [unitTypes, setUnitTypes] = useState([]);

  // Fetch units
  const fetchUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page,
        limit: pageSize,
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (unitTypeFilter !== 'All') params.unit_type = unitTypeFilter;
      if (blockFilter !== 'All') params.block = blockFilter;
      
      const response = await api.get('units/', { params });
      setUnits(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch units');
      console.error('Error fetching units:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, statusFilter, unitTypeFilter, blockFilter]);

  // Fetch available filters
  const fetchFilters = useCallback(async () => {
    try {
      const response = await api.get('units/', { params: { limit: 1000 } });
      
      // Extract unique blocks and unit types
      const uniqueBlocks = [...new Set((response.data.results || []).map(u => u.block))];
      const uniqueTypes = [...new Set((response.data.results || []).map(u => u.unit_type))];
      
      setBlocks(uniqueBlocks);
      setUnitTypes(uniqueTypes);
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleDeleteUnit = async (unitId) => {
    if (!window.confirm('Delete this unit?')) return;

    try {
      await deleteUnit(unitId);
      setUnits((prev) => prev.filter((unit) => unit.id !== unitId));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Could not delete unit', err);
      alert('Unable to delete unit. Please try again.');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleUnitTypeChange = (e) => {
    setUnitTypeFilter(e.target.value);
    setPage(1);
  };

  const handleBlockChange = (e) => {
    setBlockFilter(e.target.value);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await bulkImportUnits(formData);
      
      alert(`Bulk import completed!\nCreated: ${response.data.success}\nUpdated: ${response.data.updated ?? 0}\nFailed: ${response.data.failed}`);
      fetchUnits();
    } catch (err) {
      alert(`Bulk import failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const { role } = useContext(AuthContext);
  const canCreateUnit = role === 'Admin';
  const canModifyUnit = role === 'Admin';
  const unitPermissionNote = 'Only Admin can create, edit, delete, or import units.';

  const handleDownloadTemplate = () => {
    const header = 'unit_number,block,floor,area_sqft,unit_type,status,occupancy_status,invoice_frequency';
    const sample = 'A-101,A,1,850.00,Residential,Active,Owner Occupied,Monthly';
    const csv = [header, sample].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'units_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="unit-management">
      <div className="header">
        <h1>Unit Management</h1>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={() => navigate('/units/new')}
            disabled={!canCreateUnit}
            title={!canCreateUnit ? unitPermissionNote : ''}
          >
            + Add New Unit
          </button>
          <button
            className="btn-secondary"
            onClick={handleDownloadTemplate}
            title="Download CSV template with all supported columns"
          >
            Download Template
          </button>
          <label
            className="btn-secondary"
            title={!canCreateUnit ? unitPermissionNote : ''}
            aria-disabled={!canCreateUnit}
          >
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleBulkImport}
              style={{ display: 'none' }}
              disabled={!canCreateUnit}
            />
          </label>
        </div>
      </div>
      <p className="permission-legend">Disabled actions depend on your role permissions.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Search and Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by unit number or block..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select value={statusFilter} onChange={handleStatusChange} className="filter-select">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Vacant">Vacant</option>
            <option value="Disputed">Disputed</option>
          </select>

          <select value={unitTypeFilter} onChange={handleUnitTypeChange} className="filter-select">
            <option value="All">All Types</option>
            {unitTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select value={blockFilter} onChange={handleBlockChange} className="filter-select">
            <option value="All">All Blocks</option>
            {blocks.map(block => (
              <option key={block} value={block}>{block}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Units Table */}
      <div className="units-table-container">
        {loading && <div className="loading">Loading units...</div>}
        
        {!loading && units.length > 0 && (
          <>
            <table className="units-table">
              <thead>
                <tr>
                  <th>Unit Number</th>
                  <th>Block</th>
                  <th>Floor</th>
                  <th>Area (sqft)</th>
                  <th>Type</th>
                  <th>Occupancy</th>
                  <th>Invoice Freq.</th>
                  <th>Status</th>
                  <th>Member</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.map(unit => (
                  <tr key={unit.id}>
                    <td className="unit-number">{unit.unit_number}</td>
                    <td>{unit.block}</td>
                    <td>{unit.floor}</td>
                    <td>{parseFloat(unit.area_sqft).toFixed(2)}</td>
                    <td>{unit.unit_type}</td>
                    <td>{unit.occupancy_status || 'Owner Occupied'}</td>
                    <td>{unit.invoice_frequency || '—'}</td>
                    <td>
                      <span className={`status-badge status-${unit.status.toLowerCase()}`}>
                        {unit.status}
                      </span>
                    </td>
                    <td>
                      {unit.primary_member ? (
                        <span className="member-name">{unit.primary_member.owner_name}</span>
                      ) : (
                        <span className="no-member">No member</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-small btn-view" onClick={() => navigate(`/units/${unit.id}`)}>View</button>
                        <button
                          className="btn-small btn-edit"
                          onClick={() => navigate(`/units/${unit.id}/edit`)}
                          disabled={!canModifyUnit}
                          title={!canModifyUnit ? unitPermissionNote : ''}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-small btn-delete"
                          onClick={() => handleDeleteUnit(unit.id)}
                          disabled={!canModifyUnit}
                          title={!canModifyUnit ? unitPermissionNote : ''}
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
                Page {page} of {totalPages} (Total: {totalCount} units)
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

        {!loading && units.length === 0 && (
          <div className="no-results">No units found</div>
        )}
      </div>
    </div>
  );
};

export default UnitList;
