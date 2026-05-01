import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotificationSettings, saveNotificationSettings } from '../../services/api';
import './AdminSettings.css';

const defaultForm = {
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_use_tls: true,
  smtp_use_ssl: false,
  default_from_email: '',
  twilio_account_sid: '',
  twilio_auth_token: '',
  twilio_sms_from: '',
  twilio_whatsapp_from: '',
};

const AdminSettings = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getNotificationSettings();
        setFormData({ ...defaultForm, ...response.data });
      } catch (err) {
        setError(err.response?.data?.detail || 'Unable to load notification settings.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        ...formData,
        smtp_port: Number(formData.smtp_port || 587),
      };
      await saveNotificationSettings(payload);
      setMessage('Notification settings saved successfully.');
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const details = Object.entries(data)
          .map(([field, issues]) => `${field}: ${Array.isArray(issues) ? issues.join(', ') : issues}`)
          .join(' | ');
        setError(details || 'Unable to save notification settings.');
      } else {
        setError('Unable to save notification settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="settings-page"><div className="loading">Loading settings...</div></div>;
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Admin Settings</h1>
          <p>Manage SMTP, SMS, and WhatsApp delivery providers used for receipt sharing.</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form className="settings-form" onSubmit={handleSubmit}>
        <section className="settings-card">
          <h2>SMTP Email</h2>
          <div className="settings-grid">
            <label>
              SMTP Host
              <input name="smtp_host" value={formData.smtp_host} onChange={handleChange} placeholder="smtp.example.com" />
            </label>
            <label>
              SMTP Port
              <input name="smtp_port" type="number" value={formData.smtp_port} onChange={handleChange} placeholder="587" />
            </label>
            <label>
              SMTP Username
              <input name="smtp_username" value={formData.smtp_username} onChange={handleChange} placeholder="username" />
            </label>
            <label>
              SMTP Password
              <input name="smtp_password" type="password" value={formData.smtp_password} onChange={handleChange} placeholder="password" />
            </label>
            <label>
              Default From Email
              <input name="default_from_email" type="email" value={formData.default_from_email} onChange={handleChange} placeholder="no-reply@example.com" />
            </label>
          </div>
          <div className="settings-toggles">
            <label className="checkbox-inline">
              <input name="smtp_use_tls" type="checkbox" checked={formData.smtp_use_tls} onChange={handleChange} />
              Use TLS
            </label>
            <label className="checkbox-inline">
              <input name="smtp_use_ssl" type="checkbox" checked={formData.smtp_use_ssl} onChange={handleChange} />
              Use SSL
            </label>
          </div>
        </section>

        <section className="settings-card">
          <h2>Twilio SMS / WhatsApp</h2>
          <div className="settings-grid">
            <label>
              Twilio Account SID
              <input name="twilio_account_sid" value={formData.twilio_account_sid} onChange={handleChange} placeholder="AC..." />
            </label>
            <label>
              Twilio Auth Token
              <input name="twilio_auth_token" type="password" value={formData.twilio_auth_token} onChange={handleChange} placeholder="Auth token" />
            </label>
            <label>
              SMS From Number
              <input name="twilio_sms_from" value={formData.twilio_sms_from} onChange={handleChange} placeholder="+15551234567" />
            </label>
            <label>
              WhatsApp From Number
              <input name="twilio_whatsapp_from" value={formData.twilio_whatsapp_from} onChange={handleChange} placeholder="+15551234567" />
            </label>
          </div>
          <p className="settings-help">Use the plain number for WhatsApp. The system adds the required Twilio WhatsApp prefix automatically.</p>
        </section>

        <div className="settings-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;