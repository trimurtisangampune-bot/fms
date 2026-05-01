import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createUser, updateUser, getUser } from '../../services/api';
import './UserManagement.css';

const roleOptions = ['Admin', 'Treasurer', 'Auditor', 'Board Member', 'Member'];

const UserForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'Member',
    portal_access: true,
    member: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;

    const loadUser = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getUser(id);
        const user = response.data;

        setFormData({
          username: user.username || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          password: '',
          role: user.profile?.role || 'Member',
          portal_access: user.profile?.portal_access ?? true,
          member: user.profile?.member || '',
        });
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load user');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        profile: {
          role: formData.role,
          portal_access: formData.portal_access,
          member: formData.member || null,
        },
      };

      if (isEdit) {
        if (formData.password) payload.password = formData.password;
        await updateUser(id, payload);
      } else {
        payload.username = formData.username;
        payload.password = formData.password;
        await createUser(payload);
      }

      navigate('/users');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          err.message ||
          'Unable to save user.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-form">
      <div className="header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>{isEdit ? 'Edit User' : 'Create User'}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form-grid">
        {!isEdit && (
          <label>
            Username
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username"
              required
            />
          </label>
        )}

        <label>
          First Name
          <input
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="First name"
          />
        </label>

        <label>
          Last Name
          <input
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Last name"
          />
        </label>

        <label>
          Email
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={isEdit ? 'Leave blank to keep current password' : 'Password'}
            {...(!isEdit && { required: true })}
          />
        </label>

        <label>
          Role
          <select name="role" value={formData.role} onChange={handleChange}>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox-field">
          <input
            name="portal_access"
            type="checkbox"
            checked={formData.portal_access}
            onChange={handleChange}
          />
          Portal access enabled
        </label>

        <label>
          Linked Member
          <input
            name="member"
            value={formData.member}
            onChange={handleChange}
            placeholder="Optional member ID"
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save User'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/users')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
