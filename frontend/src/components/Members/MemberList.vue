<template>
  <div class="member-management">
    <div class="header">
      <h1>Member Management</h1>
      <div class="header-actions">
        <button class="btn-primary" @click="showCreateModal = true">+ Add New Member</button>
        <label class="btn-secondary">
          Import CSV
          <input 
            type="file" 
            accept=".csv" 
            @change="handleBulkImport"
            style="display: none"
          />
        </label>
      </div>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Search and Filters -->
    <div class="filters-section">
      <div class="search-box">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Search by name, email, phone, or unit..."
          class="search-input"
          @input="handleSearch"
        />
      </div>

      <div class="filter-group">
        <select v-model="membershipStatus" @change="handleFilterChange" class="filter-select">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Suspended">Suspended</option>
          <option value="Left">Left</option>
        </select>

        <select v-model="occupantType" @change="handleFilterChange" class="filter-select">
          <option value="">All Types</option>
          <option value="Owner">Owner</option>
          <option value="Tenant">Tenant</option>
          <option value="Caretaker">Caretaker</option>
          <option value="Co-owner">Co-owner</option>
        </select>

        <select v-model="paymentPref" @change="handleFilterChange" class="filter-select">
          <option value="">All Payment Preferences</option>
          <option value="Online">Online Transfer</option>
          <option value="Check">Check</option>
          <option value="Cash">Cash</option>
          <option value="Auto-Debit">Auto-Debit</option>
        </select>
      </div>
    </div>

    <!-- Members Table -->
    <div class="members-table-container">
      <div v-if="loading" class="loading">Loading members...</div>

      <div v-else-if="members.length > 0">
        <table class="members-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Unit</th>
              <th>Type</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th>Payment Preference</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in members" :key="member.id">
              <td class="member-name">{{ member.owner_name }}</td>
              <td class="unit-number">{{ member.unit_number }}</td>
              <td>{{ member.occupant_type }}</td>
              <td>{{ member.contact_phone }}</td>
              <td>{{ member.contact_email }}</td>
              <td>
                <span :class="['status-badge', `status-${member.membership_status.toLowerCase()}`]">
                  {{ member.membership_status }}
                </span>
              </td>
              <td>{{ member.payment_preference }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-small btn-view" @click="viewMember(member.id)">View</button>
                  <button class="btn-small btn-edit" @click="editMember(member.id)">Edit</button>
                  <button class="btn-small btn-delete" @click="deleteMember(member.id)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="pagination">
          <button 
            :disabled="page === 1"
            @click="previousPage"
            class="btn-pagination"
          >
            Previous
          </button>
          
          <span class="pagination-info">
            Page {{ page }} of {{ totalPages }} (Total: {{ totalCount }} members)
          </span>
          
          <button 
            :disabled="page === totalPages"
            @click="nextPage"
            class="btn-pagination"
          >
            Next
          </button>
        </div>
      </div>

      <div v-else class="no-results">No members found</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:8000/api';

// State
const members = ref([]);
const loading = ref(false);
const error = ref(null);
const page = ref(1);
const pageSize = 20;
const totalCount = ref(0);

// Filters
const searchTerm = ref('');
const membershipStatus = ref('');
const occupantType = ref('');
const paymentPref = ref('');
const showCreateModal = ref(false);

// Computed
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize));

// Methods
const fetchMembers = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const params = new URLSearchParams();
    params.append('page', page.value);
    params.append('limit', pageSize);
    if (searchTerm.value) params.append('search', searchTerm.value);
    if (membershipStatus.value) params.append('membership_status', membershipStatus.value);
    if (occupantType.value) params.append('occupant_type', occupantType.value);
    if (paymentPref.value) params.append('payment_preference', paymentPref.value);
    
    const response = await axios.get(`${API_BASE_URL}/members/`, {
      params,
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    });
    
    members.value = response.data.results;
    totalCount.value = response.data.count;
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to fetch members';
    console.error('Error fetching members:', err);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  fetchMembers();
};

const handleFilterChange = () => {
  page.value = 1;
  fetchMembers();
};

const previousPage = () => {
  if (page.value > 1) {
    page.value--;
    fetchMembers();
  }
};

const nextPage = () => {
  if (page.value < totalPages.value) {
    page.value++;
    fetchMembers();
  }
};

const handleBulkImport = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    loading.value = true;
    const response = await axios.post(`${API_BASE_URL}/members/bulk-import/`, formData, {
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    alert(`Bulk import completed!\nSuccess: ${response.data.success}\nFailed: ${response.data.failed}`);
    fetchMembers();
  } catch (err) {
    alert(`Bulk import failed: ${err.response?.data?.error || err.message}`);
  } finally {
    loading.value = false;
    e.target.value = '';
  }
};

const viewMember = (memberId) => {
  console.log('View member:', memberId);
};

const editMember = (memberId) => {
  console.log('Edit member:', memberId);
};

const deleteMember = (memberId) => {
  if (confirm('Are you sure you want to delete this member?')) {
    console.log('Delete member:', memberId);
  }
};

// Lifecycle
onMounted(() => {
  fetchMembers();
});
</script>

<style scoped>
@import './MemberList.css';
</style>
