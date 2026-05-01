import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, deleteUser } from '../../services/api';
import './UserManagement.css';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getUsers({ limit: 100 });
      setUsers(response.data.results || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;

    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      console.error('Unable to delete user:', err);
      alert('Unable to delete user. Please try again.');
    }
  };

  return (
    <div className="user-management">
      <div className="header">
        <h1>User & Role Management</h1>
        <button className="btn-primary" onClick={() => navigate('/users/new')}>
          + Add New User
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="user-table-container">
          {users.length > 0 ? (
            <table className="user-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Portal Access</th>
                  <th>Member Link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || '—'}</td>
                    <td>{user.email || '—'}</td>
                    <td>{user.profile?.role || '—'}</td>
                    <td>{user.profile?.portal_access ? 'Yes' : 'No'}</td>
                    <td>{user.profile?.member || '—'}</td>
                    <td>
                      <button className="btn-small btn-view" onClick={() => navigate(`/users/${user.id}/edit`)}>
                        Edit
                      </button>
                      {!user.is_superuser && (
                        <button className="btn-small btn-delete" onClick={() => handleDelete(user.id)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-results">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserList;
