import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createUnit, updateUnit, getUnit } from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import './UnitManagement.css';

const unitTypeOptions = ['Flat', 'Villa', 'Shop', 'Office', 'Parking'];
const statusOptions = ['Active', 'Inactive', 'Vacant', 'Disputed'];
const occupancyOptions = ['Owner Occupied', 'Rented'];
const invoiceFrequencyOptions = ['', 'Monthly', 'Annual'];

const UnitForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { role } = useContext(AuthContext);
  const canSetInvoiceFrequency = ['Admin', 'Treasurer'].includes(role);
  const [formData, setFormData] = useState({
    unit_number: '',
    block: '',
    floor: '',
    area_sqft: '',
    unit_type: unitTypeOptions[0],
    status: statusOptions[0],
    occupancy_status: occupancyOptions[0],
    invoice_frequency: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    const fetchUnit = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getUnit(id);
        setFormData({
          unit_number: response.data.unit_number || '',
          block: response.data.block || '',
          floor: response.data.floor || '',
          area_sqft: response.data.area_sqft || '',
          unit_type: response.data.unit_type || unitTypeOptions[0],
          status: response.data.status || statusOptions[0],
          occupancy_status: response.data.occupancy_status || occupancyOptions[0],
          invoice_frequency: response.data.invoice_frequency || '',
        });
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not load unit details');
      } finally {
        setLoading(false);
      }
    };

    fetchUnit();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        floor: Number(formData.floor),
      };

      if (isEdit) {
        await updateUnit(id, payload);
      } else {
        await createUnit(payload);
      }

      navigate('/units');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          err.message ||
          'Unable to save unit.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unit-form">
      <div className="header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>{isEdit ? 'Edit Unit' : 'Create Unit'}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Unit Number
          <input
            name="unit_number"
            value={formData.unit_number}
            onChange={handleChange}
            placeholder="A-101"
            required
          />
        </label>

        <label>
          Block
          <input
            name="block"
            value={formData.block}
            onChange={handleChange}
            placeholder="Block A"
            required
          />
        </label>

        <label>
          Floor
          <input
            name="floor"
            type="number"
            min="0"
            value={formData.floor}
            onChange={handleChange}
            placeholder="1"
            required
          />
        </label>

        <label>
          Area (sqft)
          <input
            name="area_sqft"
            value={formData.area_sqft}
            onChange={handleChange}
            placeholder="1200.00"
            required
          />
        </label>

        <label>
          Unit Type
          <select name="unit_type" value={formData.unit_type} onChange={handleChange}>
            {unitTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select name="status" value={formData.status} onChange={handleChange}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Occupancy
          <select name="occupancy_status" value={formData.occupancy_status} onChange={handleChange}>
            {occupancyOptions.map((occupancy) => (
              <option key={occupancy} value={occupancy}>
                {occupancy}
              </option>
            ))}
          </select>
        </label>

        <label
          title={!canSetInvoiceFrequency ? 'Only Admin or Treasurer can set invoice frequency.' : ''}
        >
          Invoice Frequency
          <select
            name="invoice_frequency"
            value={formData.invoice_frequency}
            onChange={handleChange}
            disabled={!canSetInvoiceFrequency}
          >
            <option value="">Use template default</option>
            {invoiceFrequencyOptions.filter(Boolean).map((freq) => (
              <option key={freq} value={freq}>
                {freq}
              </option>
            ))}
          </select>
          <small style={{ color: '#6b7280' }}>
            {canSetInvoiceFrequency
              ? 'Override the template billing cycle for this unit.'
              : 'Only Admin or Treasurer can change this.'}
          </small>
        </label>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Unit' : 'Create Unit'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/units')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default UnitForm;
