import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createMaintenanceTemplate,
  updateMaintenanceTemplate,
  getMaintenanceTemplate,
} from '../../services/api';
import './Billing.css';

const initialState = {
  unit_type: 'Flat',
  occupancy_status: 'Owner Occupied',
  base_amount: '',
  billing_frequency: 'Monthly',
  due_day: 10,
  penalty_rate: '0.00',
  penalty_type: 'Percentage',
  is_active: true,
};

const MaintenanceTemplateForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (id) {
      setLoading(true);
      getMaintenanceTemplate(id)
        .then((response) => {
          const data = response.data;
          setTemplate({
            unit_type: data.unit_type,
            occupancy_status: data.occupancy_status || 'Owner Occupied',
            base_amount: data.base_amount,
            billing_frequency: data.billing_frequency,
            due_day: data.due_day,
            penalty_rate: data.penalty_rate,
            penalty_type: data.penalty_type,
            is_active: data.is_active,
          });
        })
        .catch((err) => {
          console.error(err);
          setError('Unable to load template details.');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setTemplate((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      const payload = {
        unit_type: template.unit_type,
        occupancy_status: template.occupancy_status,
        base_amount: template.base_amount,
        billing_frequency: template.billing_frequency,
        due_day: Number(template.due_day),
        penalty_rate: template.penalty_rate,
        penalty_type: template.penalty_type,
        is_active: template.is_active,
      };

      if (id) {
        await updateMaintenanceTemplate(id, payload);
        setSuccessMessage('Template updated successfully.');
      } else {
        await createMaintenanceTemplate(payload);
        setSuccessMessage('Template created successfully.');
        setTemplate(initialState);
      }
      setTimeout(() => navigate('/maintenance-templates'), 800);
    } catch (err) {
      setError(err.response?.data || 'Unable to save template.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-page">
      <div className="billing-header">
        <h1>{id ? 'Edit Maintenance Template' : 'New Maintenance Template'}</h1>
      </div>

      {error && <div className="alert alert-error">{JSON.stringify(error)}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <form className="billing-form" onSubmit={handleSubmit}>
        <label>
          Unit Type
          <select name="unit_type" value={template.unit_type} onChange={handleChange}>
            <option value="Flat">Flat</option>
            <option value="Office">Office</option>
            <option value="Shop">Shop</option>
            <option value="Penthouse">Penthouse</option>
          </select>
        </label>

        <label>
          Occupancy
          <select name="occupancy_status" value={template.occupancy_status} onChange={handleChange}>
            <option value="Owner Occupied">Owner Occupied</option>
            <option value="Rented">Rented</option>
          </select>
        </label>

        <label>
          Base Amount
          <input
            type="number"
            name="base_amount"
            value={template.base_amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </label>

        <label>
          Billing Frequency
          <select name="billing_frequency" value={template.billing_frequency} onChange={handleChange}>
            <option value="Monthly">Monthly</option>
            <option value="Annual">Annual</option>
          </select>
        </label>

        <label>
          Due Day
          <input
            type="number"
            name="due_day"
            value={template.due_day}
            onChange={handleChange}
            min="1"
            max="31"
            required
          />
        </label>

        <label>
          Penalty Rate
          <input
            type="number"
            name="penalty_rate"
            value={template.penalty_rate}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
          />
        </label>

        <label>
          Penalty Type
          <select name="penalty_type" value={template.penalty_type} onChange={handleChange}>
            <option value="Percentage">Percentage</option>
            <option value="Fixed">Fixed</option>
          </select>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            name="is_active"
            checked={template.is_active}
            onChange={handleChange}
          />
          Active Template
        </label>

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={loading}>
            {id ? 'Save Changes' : 'Create Template'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/maintenance-templates')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MaintenanceTemplateForm;
