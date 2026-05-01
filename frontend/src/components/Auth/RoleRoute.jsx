import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const RoleRoute = ({ children, allowedRoles }) => {
  const { role, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return allowedRoles.includes(role) ? children : <Navigate to="/" replace />;
};

export default RoleRoute;
