<template>
  <div class="unit-management">
    <div class="header">
      <h1>Unit Management</h1>
      <button class="btn-primary" @click="showCreateModal = true">+ Add New Unit</button>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Search and Filters -->
    <div class="filters-section">
      <div class="search-box">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Search by unit number or block..."
          class="search-input"
          @input="handleSearch"
        />
      </div>

      <div class="filter-group">
        <select v-model="statusFilter" @change="handleFilterChange" class="filter-select">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Vacant">Vacant</option>
          <option value="Disputed">Disputed</option>
        </select>

        <select v-model="unitTypeFilter" @change="handleFilterChange" class="filter-select">
          <option value="">All Types</option>
          <option v-for="type in unitTypes" :key="type" :value="type">{{ type }}</option>
        </select>

        <select v-model="blockFilter" @change="handleFilterChange" class="filter-select">
          <option value="">All Blocks</option>
          <option v-for="block in blocks" :key="block" :value="block">{{ block }}</option>
        </select>
      </div>
    </div>

    <!-- Units Table -->
    <div class="units-table-container">
      <div v-if="loading" class="loading">Loading units...</div>

      <div v-else-if="units.length > 0">
        <table class="units-table">
          <thead>
            <tr>
              <th>Unit Number</th>
              <th>Block</th>
              <th>Floor</th>
              <th>Area (sqft)</th>
              <th>Type</th>
              <th>Status</th>
              <th>Member</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="unit in units" :key="unit.id">
              <td class="unit-number">{{ unit.unit_number }}</td>
              <td>{{ unit.block }}</td>
              <td>{{ unit.floor }}</td>
              <td>{{ parseFloat(unit.area_sqft).toFixed(2) }}</td>
              <td>{{ unit.unit_type }}</td>
              <td>
                <span :class="['status-badge', `status-${unit.status.toLowerCase()}`]">
                  {{ unit.status }}
                </span>
              </td>
              <td>
                <span v-if="unit.primary_member" class="member-name">
                  {{ unit.primary_member.owner_name }}
                </span>
                <span v-else class="no-member">No member</span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn-small btn-view" @click="viewUnit(unit.id)">View</button>
                  <button class="btn-small btn-edit" @click="editUnit(unit.id)">Edit</button>
                  <button class="btn-small btn-delete" @click="deleteUnit(unit.id)">Delete</button>
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
            Page {{ page }} of {{ totalPages }} (Total: {{ totalCount }} units)
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

      <div v-else class="no-results">No units found</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:8000/api';

// State
const units = ref([]);
const loading = ref(false);
const error = ref(null);
const page = ref(1);
const pageSize = 20;
const totalCount = ref(0);

// Filters
const searchTerm = ref('');
const statusFilter = ref('');
const unitTypeFilter = ref('');
const blockFilter = ref('');
const blocks = ref([]);
const unitTypes = ref([]);
const showCreateModal = ref(false);

// Computed
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize));

// Methods
const fetchUnits = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const params = new URLSearchParams();
    params.append('page', page.value);
    params.append('limit', pageSize);
    if (searchTerm.value) params.append('search', searchTerm.value);
    if (statusFilter.value) params.append('status', statusFilter.value);
    if (unitTypeFilter.value) params.append('unit_type', unitTypeFilter.value);
    if (blockFilter.value) params.append('block', blockFilter.value);
    
    const response = await axios.get(`${API_BASE_URL}/units/`, {
      params,
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    });
    
    units.value = response.data.results;
    totalCount.value = response.data.count;
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to fetch units';
    console.error('Error fetching units:', err);
  } finally {
    loading.value = false;
  }
};

const fetchFilters = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/units/`, {
      params: { limit: 1000 },
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    });
    
    blocks.value = [...new Set(response.data.results.map(u => u.block))];
    unitTypes.value = [...new Set(response.data.results.map(u => u.unit_type))];
  } catch (err) {
    console.error('Error fetching filters:', err);
  }
};

const handleSearch = () => {
  page.value = 1;
  fetchUnits();
};

const handleFilterChange = () => {
  page.value = 1;
  fetchUnits();
};

const previousPage = () => {
  if (page.value > 1) {
    page.value--;
    fetchUnits();
  }
};

const nextPage = () => {
  if (page.value < totalPages.value) {
    page.value++;
    fetchUnits();
  }
};

const viewUnit = (unitId) => {
  console.log('View unit:', unitId);
};

const editUnit = (unitId) => {
  console.log('Edit unit:', unitId);
};

const deleteUnit = (unitId) => {
  if (confirm('Are you sure you want to delete this unit?')) {
    console.log('Delete unit:', unitId);
  }
};

// Lifecycle
onMounted(() => {
  fetchUnits();
  fetchFilters();
});
</script>

<style scoped>
@import './UnitManagement.css';
</style>
