import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import UnitList from './components/Units/UnitList';
import UnitDetail from './components/Units/UnitDetail';
import UnitForm from './components/Units/UnitForm';
import MemberList from './components/Members/MemberList';
import MemberDetail from './components/Members/MemberDetail';
import MemberForm from './components/Members/MemberForm';
import UserList from './components/Users/UserList';
import UserForm from './components/Users/UserForm';
import Dashboard from './components/Dashboard';
import LoginForm from './components/Auth/LoginForm';
import MaintenanceTemplates from './components/Billing/MaintenanceTemplates';
import MaintenanceTemplateForm from './components/Billing/MaintenanceTemplateForm';
import InvoiceGeneration from './components/Billing/InvoiceGeneration';
import InvoiceList from './components/Billing/InvoiceList';
import InvoiceDetail from './components/Billing/InvoiceDetail';
import PaymentEntry from './components/Billing/PaymentEntry';
import PaymentReport from './components/Billing/PaymentReport';
import AdminSettings from './components/Settings/AdminSettings';
import CommunicationLogs from './components/Settings/CommunicationLogs';
import FormatSettings from './components/Settings/FormatSettings';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AdminRoute from './components/Auth/AdminRoute';
import RoleRoute from './components/Auth/RoleRoute';
import Navbar from './components/Navbar';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/units" element={<UnitList />} />
                      <Route
                        path="/units/new"
                        element={
                          <AdminRoute>
                            <UnitForm />
                          </AdminRoute>
                        }
                      />
                      <Route path="/units/:id" element={<UnitDetail />} />
                      <Route
                        path="/units/:id/edit"
                        element={
                          <AdminRoute>
                            <UnitForm />
                          </AdminRoute>
                        }
                      />
                      <Route path="/members" element={<MemberList />} />
                      <Route
                        path="/members/new"
                        element={
                          <RoleRoute allowedRoles={['Admin', 'Treasurer', 'Board Member']}>
                            <MemberForm />
                          </RoleRoute>
                        }
                      />
                      <Route path="/members/:id" element={<MemberDetail />} />
                      <Route
                        path="/members/:id/edit"
                        element={
                          <RoleRoute allowedRoles={['Admin', 'Treasurer', 'Board Member']}>
                            <MemberForm />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/maintenance-templates"
                        element={
                          <AdminRoute>
                            <MaintenanceTemplates />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/maintenance-templates/new"
                        element={
                          <AdminRoute>
                            <MaintenanceTemplateForm />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/maintenance-templates/:id/edit"
                        element={
                          <AdminRoute>
                            <MaintenanceTemplateForm />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/invoices/generate"
                        element={
                          <RoleRoute allowedRoles={['Admin', 'Treasurer']}>
                            <InvoiceGeneration />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/invoices"
                        element={
                          <RoleRoute allowedRoles={['Admin', 'Treasurer', 'Board Member']}>
                            <InvoiceList />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/invoices/:id"
                        element={
                          <RoleRoute allowedRoles={['Admin', 'Treasurer', 'Board Member']}>
                            <InvoiceDetail />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/payments/new"
                        element={
                          <RoleRoute allowedRoles={['Admin', 'Treasurer']}>
                            <PaymentEntry />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/payments/report"
                        element={
                          <RoleRoute allowedRoles={['Admin', 'Treasurer']}>
                            <PaymentReport />
                          </RoleRoute>
                        }
                      />
                      <Route
                        path="/users"
                        element={
                          <AdminRoute>
                            <UserList />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/users/new"
                        element={
                          <AdminRoute>
                            <UserForm />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/users/:id/edit"
                        element={
                          <AdminRoute>
                            <UserForm />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/communication-settings"
                        element={
                          <AdminRoute>
                            <AdminSettings />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/communication-logs"
                        element={
                          <AdminRoute>
                            <CommunicationLogs />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin/format-settings"
                        element={
                          <AdminRoute>
                            <FormatSettings />
                          </AdminRoute>
                        }
                      />
                    </Routes>
                  </main>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;