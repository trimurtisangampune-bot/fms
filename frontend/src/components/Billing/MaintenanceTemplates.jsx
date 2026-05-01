import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMaintenanceTemplates,
  deleteMaintenanceTemplate,
} from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import './Billing.css';

const MaintenanceTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { role } = useContext(AuthContext);
  const navigate = useNavigate();

  const canManageTemplates = role === 'Admin';
  const templatePermissionNote = 'Only Admin can create, edit, or delete maintenance templates.';

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getMaintenanceTemplates({ limit: 100 });
      setTemplates(response.data.results || response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load templates.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this maintenance template?')) return;

    try {
      await deleteMaintenanceTemplate(id);
      setTemplates((prev) => prev.filter((template) => template.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete template.');
    }
  };

  return (
    <div className="billing-page">
      <div className="billing-header">
        <h1>Maintenance Templates</h1>
        <button
          className="btn-primary"
          onClick={() => navigate('/maintenance-templates/new')}
          disabled={!canManageTemplates}
          title={!canManageTemplates ? templatePermissionNote : ''}
        >
          + Create Template
        </button>
      </div>
      <p className="permission-legend">Disabled actions depend on your role permissions.</p>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading templates...</div>
      ) : templates.length > 0 ? (
        <table className="billing-table">
          <thead>
            <tr>
              <th>Unit Type</th>
              <th>Occupancy</th>
              <th>Frequency</th>
              <th>Base Amount</th>
              <th>Due Day</th>
              <th>Penalty</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td>{template.unit_type}</td>
                <td>{template.occupancy_status || 'Owner Occupied'}</td>
                <td>{template.billing_frequency}</td>
                <td>{Number(template.base_amount).toFixed(2)}</td>
                <td>{template.due_day}</td>
                <td>
                  {template.penalty_rate}% {template.penalty_type}
                </td>
                <td>{template.is_active ? 'Active' : 'Inactive'}</td>
                <td>
                  <button
                    className="btn-small btn-view"
                    onClick={() => navigate(`/maintenance-templates/${template.id}/edit`)}
                    disabled={!canManageTemplates}
                    title={!canManageTemplates ? templatePermissionNote : ''}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-small btn-delete"
                    onClick={() => handleDelete(template.id)}
                    disabled={!canManageTemplates}
                    title={!canManageTemplates ? templatePermissionNote : ''}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="no-results">No maintenance templates found.</div>
      )}
    </div>
  );
};

export default MaintenanceTemplates;
