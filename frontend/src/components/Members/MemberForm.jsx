import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createMember, updateMember, getMember, getUnits, getMembers } from '../../services/api';
import './MemberList.css';

const occupantTypeOptions = ['Owner', 'Tenant', 'Caretaker', 'Co-owner'];
const membershipStatusOptions = ['Active', 'Inactive', 'Suspended', 'Left'];
const paymentPreferenceOptions = ['Online', 'Check', 'Cash', 'Auto-Debit'];

const MemberForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [unitOptions, setUnitOptions] = useState([]);
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [unitHasPrimaryMember, setUnitHasPrimaryMember] = useState(false);
  const [unitPrimaryMemberId, setUnitPrimaryMemberId] = useState(null);
  const [formData, setFormData] = useState({
    unit: '',
    owner_name: '',
    occupant_type: occupantTypeOptions[0],
    contact_phone: '',
    contact_email: '',
    alternate_contact: '',
    membership_status: membershipStatusOptions[0],
    payment_preference: paymentPreferenceOptions[0],
    is_primary_contact: false,
    move_in_date: '',
    move_out_date: '',
    nominated_person_name: '',
    nominated_person_contact: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const selectedUnit = unitOptions.find((unit) => unit.id === Number(formData.unit));

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const unitsResponse = await getUnits({ page_size: 1000 });
        setUnitOptions(unitsResponse.data.results || []);
      } catch (err) {
        console.error('Unable to fetch units', err);
      }
    };

    loadUnits();
  }, []);

  // Check if selected unit already has a primary contact
  const checkUnitPrimaryMember = useCallback(async (unitId) => {
    if (!unitId) return;
    try {
      const response = await getMembers({ unit: unitId, limit: 100 });
      const members = response.data.results || [];
      const primaryMember = members.find((m) => m.is_primary_contact);
      setUnitHasPrimaryMember(!!primaryMember);
      setUnitPrimaryMemberId(primaryMember ? primaryMember.id : null);
      
      // Auto-set as primary contact when this is the first member for a unit.
      if (!isEdit && !primaryMember) {
        setFormData((prev) => ({ ...prev, is_primary_contact: true }));
      }
    } catch (err) {
      console.error('Unable to check unit members', err);
    }
  }, [isEdit]);

  // Handle unit search input
  const handleUnitSearchChange = useCallback((e) => {
    const searchValue = e.target.value;
    setUnitSearchTerm(searchValue);

    // Clear selected unit whenever user edits search text.
    setSelectedUnitId(null);
    setFormData((prev) => ({ ...prev, unit: '' }));

    if (searchValue.trim().length > 0) {
      const filtered = unitOptions.filter(
        (unit) =>
          unit.unit_number.toLowerCase().includes(searchValue.toLowerCase()) ||
          unit.block.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredUnits(filtered);
      setShowUnitSuggestions(true);

      const exactUnit = unitOptions.find(
        (unit) => unit.unit_number.toLowerCase() === searchValue.trim().toLowerCase()
      );
      if (exactUnit) {
        setSelectedUnitId(exactUnit.id);
        setFormData((prev) => ({ ...prev, unit: exactUnit.id }));
        checkUnitPrimaryMember(exactUnit.id);
      }
    } else {
      setFilteredUnits([]);
      setShowUnitSuggestions(false);
    }
  }, [unitOptions, checkUnitPrimaryMember]);

  // Handle unit selection from suggestions
  const handleUnitSelect = useCallback(
    (unit) => {
      setUnitSearchTerm(unit.unit_number);
      setSelectedUnitId(unit.id);
      setFormData((prev) => ({ ...prev, unit: unit.id }));
      setShowUnitSuggestions(false);
      
      // Check if this unit has a primary contact
      checkUnitPrimaryMember(unit.id);
    },
    [checkUnitPrimaryMember]
  );

  useEffect(() => {
    if (!isEdit) return;

    const loadMember = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getMember(id);
        const memberData = response.data;
        setFormData({
          unit: memberData.unit?.id || '',
          owner_name: memberData.owner_name || '',
          occupant_type: memberData.occupant_type || occupantTypeOptions[0],
          contact_phone: memberData.contact_phone || '',
          contact_email: memberData.contact_email || '',
          alternate_contact: memberData.alternate_contact || '',
          membership_status: memberData.membership_status || membershipStatusOptions[0],
          payment_preference: memberData.payment_preference || paymentPreferenceOptions[0],
          is_primary_contact: memberData.is_primary_contact || false,
          move_in_date: memberData.move_in_date || '',
          move_out_date: memberData.move_out_date || '',
          nominated_person_name: memberData.nominated_person_name || '',
          nominated_person_contact: memberData.nominated_person_contact || '',
          notes: memberData.notes || '',
        });
        
        if (memberData.unit) {
          setSelectedUnitId(memberData.unit.id);
          setUnitSearchTerm(memberData.unit.unit_number);
          await checkUnitPrimaryMember(memberData.unit.id);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load member details');
      } finally {
        setLoading(false);
      }
    };

    loadMember();
  }, [id, isEdit, checkUnitPrimaryMember]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'is_primary_contact') {
      // In create mode: cannot check if unit already has a primary contact.
      if (!isEdit && unitHasPrimaryMember) return;
      // In edit mode: cannot uncheck — primary contact must be transferred, not removed.
      if (isEdit && formData.is_primary_contact && !checked) return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate that a unit was selected.
    if (!formData.unit) {
      setError('Please select a unit from the dropdown suggestions.');
      setLoading(false);
      return;
    }

    if (!formData.move_in_date) {
      setError('Move-in Date is required.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        unit: Number(formData.unit),
        move_in_date: formData.move_in_date,
        move_out_date: formData.move_out_date || null,
      };

      if (isEdit) {
        await updateMember(id, payload);
      } else {
        await createMember(payload);
      }

      navigate('/members');
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 500) {
        setError('An unexpected server error occurred. Please try again or contact support.');
      } else if (data && typeof data === 'object' && !data.detail) {
        // Field-level validation errors — flatten to a readable message
        const messages = Object.entries(data)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join(' | ');
        setError(messages);
      } else {
        setError(
          data?.detail ||
            data?.non_field_errors?.[0] ||
            err.message ||
            'Unable to save member.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="member-form">
      <div className="header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>{isEdit ? 'Edit Member' : 'Create Member'}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form-grid">
        <div style={{ position: 'relative' }}>
          <label>
            Unit
            <input
              type="text"
              value={unitSearchTerm}
              onChange={handleUnitSearchChange}
              onFocus={() => unitSearchTerm && setShowUnitSuggestions(true)}
              onBlur={() => setTimeout(() => setShowUnitSuggestions(false), 150)}
              placeholder="Search unit number..."
              required
              disabled={isEdit}
            />
            {!selectedUnitId && !isEdit && (
              <div className="form-hint">Start typing to search units</div>
            )}
            {formData.unit && selectedUnit && (
              <div className="selected-unit-badge" aria-live="polite">
                Selected Unit: <strong>{selectedUnit.unit_number}</strong>
                <span>Block {selectedUnit.block}</span>
                <span>ID {selectedUnit.id}</span>
              </div>
            )}
          </label>
          
          {showUnitSuggestions && filteredUnits.length > 0 && (
            <div className="suggestions-dropdown">
              {filteredUnits.slice(0, 8).map((unit) => (
                <div
                  key={unit.id}
                  className="suggestion-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleUnitSelect(unit);
                  }}
                >
                  <strong>{unit.unit_number}</strong> - Block {unit.block}
                </div>
              ))}
            </div>
          )}
          
          {showUnitSuggestions && filteredUnits.length === 0 && unitSearchTerm && (
            <div className="suggestions-dropdown">
              <div className="suggestion-item" style={{ color: '#999' }}>
                No units found
              </div>
            </div>
          )}
        </div>

        <label>
          Owner Name
          <input
            name="owner_name"
            value={formData.owner_name}
            onChange={handleChange}
            placeholder="Owner name"
            required
          />
        </label>

        <label>
          Occupant Type
          <select name="occupant_type" value={formData.occupant_type} onChange={handleChange}>
            {occupantTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label>
          Contact Phone
          <input
            name="contact_phone"
            value={formData.contact_phone}
            onChange={handleChange}
            placeholder="Phone number"
            required
          />
        </label>

        <label>
          Contact Email
          <input
            name="contact_email"
            type="email"
            value={formData.contact_email}
            onChange={handleChange}
            placeholder="email@example.com"
            required
          />
        </label>

        <label>
          Alternate Contact
          <input
            name="alternate_contact"
            value={formData.alternate_contact}
            onChange={handleChange}
            placeholder="Alternate phone"
          />
        </label>

        <label>
          Membership Status
          <select
            name="membership_status"
            value={formData.membership_status}
            onChange={handleChange}
          >
            {membershipStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Payment Preference
          <select
            name="payment_preference"
            value={formData.payment_preference}
            onChange={handleChange}
          >
            {paymentPreferenceOptions.map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox-field">
          <input
            name="is_primary_contact"
            type="checkbox"
            checked={formData.is_primary_contact}
            onChange={handleChange}
            disabled={(!isEdit && unitHasPrimaryMember) || (isEdit && formData.is_primary_contact)}
            title={
              !isEdit && unitHasPrimaryMember
                ? 'This unit already has a primary contact'
                : isEdit && formData.is_primary_contact
                ? 'Primary contact cannot be untagged. To change, edit another member of this unit and make them Primary Contact.'
                : ''
            }
          />
          Primary Contact
          {!isEdit && formData.is_primary_contact && !unitHasPrimaryMember && (
            <span className="form-hint" style={{ marginLeft: '8px', color: '#0066cc' }}>
              (Auto-set as first contact)
            </span>
          )}
          {!isEdit && unitHasPrimaryMember && (
            <span className="form-hint" style={{ marginLeft: '8px', color: '#999' }}>
              (Unit already has a primary contact)
                      {isEdit && formData.is_primary_contact && (
                        <span className="form-hint" style={{ marginLeft: '8px', color: '#0066cc' }}>
                          (Primary contact — to transfer, edit another member of this unit)
                        </span>
                      )}
            </span>
          )}
          {isEdit && unitPrimaryMemberId !== null && unitPrimaryMemberId !== Number(id) && !formData.is_primary_contact && (
            <span className="primary-contact-warning">
              ⚠ Unit already has a primary contact. Checking this will transfer the designation to this member.
            </span>
          )}
        </label>

        <label>
          Move-in Date
          <input
            name="move_in_date"
            type="date"
            value={formData.move_in_date}
            onChange={handleChange}
          />
        </label>

        <label>
          Move-out Date
          <input
            name="move_out_date"
            type="date"
            value={formData.move_out_date}
            onChange={handleChange}
          />
        </label>

        <label>
          Nominated Person Name
          <input
            name="nominated_person_name"
            value={formData.nominated_person_name}
            onChange={handleChange}
            placeholder="Nominee name"
          />
        </label>

        <label>
          Nominated Person Contact
          <input
            name="nominated_person_contact"
            value={formData.nominated_person_contact}
            onChange={handleChange}
            placeholder="Nominee contact"
          />
        </label>

        <label>
          Notes
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Optional notes"
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Update Member' : 'Create Member'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/members')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default MemberForm;
