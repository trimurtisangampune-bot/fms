import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getInvoiceDeletionApprovalTasks, logout } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import './Navbar.css';

function Navbar() {
  const BRANDING_LAYOUT = 'above';
  const navigate = useNavigate();
  const { user, role } = useContext(AuthContext);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const isAdmin = role === 'Admin';
  const canManageBilling = ['Admin', 'Treasurer'].includes(role);
  const canViewInvoices = ['Admin', 'Treasurer', 'Board Member'].includes(role);
  const displayName = user?.first_name || user?.username || 'Guest';

  useEffect(() => {
    let intervalId;

    const fetchPendingApprovals = async () => {
      if (!canManageBilling) {
        setPendingApprovalCount(0);
        return;
      }

      try {
        const response = await getInvoiceDeletionApprovalTasks({ scope: 'mine', status: 'Pending' });
        setPendingApprovalCount(Array.isArray(response.data) ? response.data.length : 0);
      } catch (err) {
        setPendingApprovalCount(0);
      }
    };

    fetchPendingApprovals();
    if (canManageBilling) {
      intervalId = setInterval(fetchPendingApprovals, 30000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [canManageBilling, role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`site-header branding-${BRANDING_LAYOUT}`}>
      {BRANDING_LAYOUT === 'above' && (
        <div className="branding-banner">
          <img src="/img/society_image.jpeg" alt="Society Banner" className="branding-banner-image" />
        </div>
      )}

      <nav className="navbar">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            <span>Society FMS</span>
          </Link>
        </div>
        <ul className="navbar-nav">
          <li className="nav-item">
            <Link to="/" className="nav-link">Dashboard</Link>
          </li>
          <li className="nav-item">
            <Link to="/units" className="nav-link">Units</Link>
          </li>
          <li className="nav-item">
            <Link to="/members" className="nav-link">Members</Link>
          </li>
          {canManageBilling && (
            <li className="nav-item">
              <Link to="/maintenance-templates" className="nav-link">Maintenance Templates</Link>
            </li>
          )}
          {canViewInvoices && (
            <li className="nav-item">
              <div className="nav-link-with-badge">
                <Link to="/invoices" className="nav-link">Invoices</Link>
                {canManageBilling && pendingApprovalCount > 0 && (
                  <Link
                    to="/invoices#approval-tasks"
                    className="nav-badge-link"
                    title="Jump to pending paid invoice deletion approvals"
                  >
                    <span className="nav-badge">{pendingApprovalCount}</span>
                  </Link>
                )}
              </div>
            </li>
          )}
          {canManageBilling && (
            <li className="nav-item nav-item-dropdown">
              <span className="nav-link nav-link-parent">Payments ▾</span>
              <ul className="nav-dropdown">
                <li><Link to="/payments/new" className="nav-dropdown-link">Record Payment</Link></li>
                <li><Link to="/payments/report" className="nav-dropdown-link">Payments Report</Link></li>
              </ul>
            </li>
          )}
          {isAdmin && (
            <li className="nav-item">
              <Link to="/users" className="nav-link">Users</Link>
            </li>
          )}
          {isAdmin && (
            <li className="nav-item nav-item-dropdown">
              <span className="nav-link nav-link-parent">Admin ▾</span>
              <ul className="nav-dropdown">
                <li><Link to="/admin/communication-settings" className="nav-dropdown-link">Communication Settings</Link></li>
                <li><Link to="/admin/communication-logs" className="nav-dropdown-link">Communication Logs</Link></li>
                <li><Link to="/admin/format-settings" className="nav-dropdown-link">Format Settings</Link></li>
              </ul>
            </li>
          )}
        </ul>
        <div className="navbar-actions">
          <span className="role-badge">{displayName} — {role || 'Guest'}</span>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;