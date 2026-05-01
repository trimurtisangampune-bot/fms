import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './Users/UserManagement.css';

const Dashboard = () => {
  const { role, user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-card">
      <div className="header">
        <div>
          <h1>{role === 'Admin' ? 'Admin Dashboard' : 'Member Dashboard'}</h1>
          <span className="dashboard-role-badge">Role: {role || 'Guest'}</span>
        </div>
      </div>

      <div className="dashboard-content">
        <p>Welcome back{user?.first_name ? `, ${user.first_name}` : ''}.</p>
        {role === 'Admin' ? (
          <>
            <p>This area gives you access to system management and user administration.</p>
            <div className="dashboard-links">
              <a className="btn-primary" href="/users">Manage Users</a>
              <a className="btn-primary" href="/units">Manage Units</a>
              <a className="btn-primary" href="/members">Manage Members</a>
            </div>
          </>
        ) : (
          <>
            <p>Your role is <strong>{role || 'User'}</strong>. You can access the unit and member sections for operational work.</p>
            <div className="dashboard-links">
              <a className="btn-primary" href="/units">View Units</a>
              <a className="btn-primary" href="/members">View Members</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
