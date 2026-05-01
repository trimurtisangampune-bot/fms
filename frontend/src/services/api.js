import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle unauthorized access
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await api.post('auth/token/refresh/', {
            refresh: refreshToken
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens but don't redirect here
        // Let the AuthContext handle the redirect
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const getUnitSummary = () => api.get('units/summary/');
export const bulkImportUnits = (formData) => api.post('units/bulk-import/', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getUnits = (params) => api.get('units/', { params });
export const getUnit = (unitId) => api.get(`units/${unitId}/`);
export const createUnit = (payload) => api.post('units/', payload);
export const updateUnit = (unitId, payload) => api.put(`units/${unitId}/`, payload);
export const deleteUnit = (unitId) => api.delete(`units/${unitId}/`);
export const setUnitInvoiceFrequency = (unitId, invoice_frequency) =>
  api.patch(`units/${unitId}/invoice-frequency/`, { invoice_frequency });
export const bulkImportMembers = (formData) => api.post('members/bulk-import/', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getMembers = (params) => api.get('members/', { params });
export const getMember = (memberId) => api.get(`members/${memberId}/`);
export const createMember = (payload) => api.post('members/', payload);
export const updateMember = (memberId, payload) => api.put(`members/${memberId}/`, payload);
export const deleteMember = (memberId) => api.delete(`members/${memberId}/`);
export const getMemberLedger = (memberId) => api.get(`members/${memberId}/ledger/`);
export const getMemberHistory = (memberId) => api.get(`members/${memberId}/history/`);

export const getMaintenanceTemplates = (params) => api.get('maintenance-templates/', { params });
export const getMaintenanceTemplate = (id) => api.get(`maintenance-templates/${id}/`);
export const createMaintenanceTemplate = (payload) => api.post('maintenance-templates/', payload);
export const updateMaintenanceTemplate = (id, payload) => api.put(`maintenance-templates/${id}/`, payload);
export const deleteMaintenanceTemplate = (id) => api.delete(`maintenance-templates/${id}/`);
export const getMaintenanceTemplateLevies = (templateId) => api.get(`maintenance-templates/${templateId}/levies/`);
export const createMaintenanceLevy = (templateId, payload) => api.post(`maintenance-templates/${templateId}/levies/`, payload);
export const updateMaintenanceLevy = (templateId, levyId, payload) => api.put(`maintenance-templates/${templateId}/levies/${levyId}/`, payload);
export const deleteMaintenanceLevy = (templateId, levyId) => api.delete(`maintenance-templates/${templateId}/levies/${levyId}/`);

export const generateInvoices = (payload) => api.post('invoices/generate/', payload);
export const getInvoices = (params) => api.get('invoices/', { params });
export const getInvoice = (invoiceId) => api.get(`invoices/${invoiceId}/`);
export const deleteInvoice = (invoiceId, force = false) => api.delete(`invoices/${invoiceId}/`, {
  params: force ? { force: 'true' } : undefined,
});
export const bulkDeleteInvoices = (invoiceIds, force = false) => api.post('invoices/bulk-delete/', {
  invoice_ids: invoiceIds,
  force,
});
export const bulkDeleteInvoicesFiltered = (payload, force = false) => api.post('invoices/bulk-delete-filtered/', {
  ...payload,
  force,
});
export const calculateInvoicePenalty = (invoiceId) => api.post(`invoices/${invoiceId}/calculate-penalty/`);
export const getInvoiceDeletionApprovalTasks = (params) => api.get('invoices/deletion-approval-tasks/', { params });
export const approveInvoiceDeletionTask = (taskId, payload = {}) => api.post(`invoices/deletion-approval-tasks/${taskId}/approve/`, payload);
export const rejectInvoiceDeletionTask = (taskId, payload = {}) => api.post(`invoices/deletion-approval-tasks/${taskId}/reject/`, payload);
export const cancelInvoice = (invoiceId, payload = {}) => api.post(`invoices/${invoiceId}/cancel/`, payload);
export const getInvoiceCancellationApprovalTasks = (params) => api.get('invoices/cancellation-approval-tasks/', { params });
export const approveInvoiceCancellationTask = (taskId, payload = {}) => api.post(`invoices/cancellation-approval-tasks/${taskId}/approve/`, payload);
export const rejectInvoiceCancellationTask = (taskId, payload = {}) => api.post(`invoices/cancellation-approval-tasks/${taskId}/reject/`, payload);

export const createPayment = (payload) => api.post('payments/', payload);
export const getPayments = (params) => api.get('payments/', { params });
export const verifyPayment = (paymentId) => api.post(`payments/${paymentId}/verify/`);
export const sharePaymentReceipt = (paymentId) => api.post(`payments/${paymentId}/share-receipt/`);
export const getNotificationSettings = () => api.get('notification-settings/');
export const saveNotificationSettings = (payload) => api.post('notification-settings/', payload);
export const getFormatSettings = () => api.get('format-settings/');
export const saveFormatSettings = (payload) => api.post('format-settings/', payload);
export const getPaymentCommunicationLogs = (params) => api.get('payment-communication-logs/', { params });

// Authentication functions
export const login = (credentials) => api.post('auth/token/', credentials);
export const refreshToken = (refreshToken) => api.post('auth/token/refresh/', { refresh: refreshToken });
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
};

export const getCurrentUser = () => api.get('users/me/');
export const getUsers = (params) => api.get('users/', { params });
export const getUser = (userId) => api.get(`users/${userId}/`);
export const createUser = (payload) => api.post('users/', payload);
export const updateUser = (userId, payload) => api.put(`users/${userId}/`, payload);
export const deleteUser = (userId) => api.delete(`users/${userId}/`);

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

export default api;