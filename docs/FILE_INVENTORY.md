# Unit/Member Management Module - File Structure & Quick Reference

## 📂 Complete File Inventory

### Documentation Files
```
docs/
├── 5_unit_member_management_design.md ................... Detailed design specification
├── 6_implementation_guide.md ............................. Step-by-step setup & deployment guide
├── 7_code_summary.md .................................... Complete code overview & reference
├── fms_user_manual.md ................................... Unified end-user manual (roles, user management, billing)
├── fms_quick_start_guide.md ............................. 1-2 page onboarding quick-start for new staff
└── FILE_INVENTORY.md .................................... This file
```

### Backend Files (Django)
```
backend/units/
├── models.py ............................................ Database models
│   ├── Unit
│   ├── Member
│   ├── Occupant
│   └── AuditLog
│
├── serializers.py ....................................... DRF Serializers
│   ├── UnitSerializer
│   ├── UnitDetailSerializer
│   ├── MemberSerializer
│   ├── MemberListSerializer
│   ├── MemberDetailSerializer
│   ├── OccupantSerializer
│   ├── AuditLogSerializer
│   ├── BulkImportResultSerializer
│   ├── UnitMemberSummarySerializer
│   └── BankAccountField
│
├── views.py ............................................ API ViewSets
│   ├── UnitViewSet (CRUD + bulk import + summary + history)
│   ├── MemberViewSet (CRUD + bulk import + ledger + transfer + history)
│   ├── OccupantViewSet
│   └── AuditLogViewSet
│
├── services.py ......................................... Business Logic
│   ├── AuditService (logging & audit trail)
│   ├── UnitService (unit operations)
│   └── MemberService (member operations)
│
├── urls.py ............................................ URL routing
│   └── DefaultRouter configuration
│
├── applications.py ..................................... Django app config
└── admin.py ............................................ Django admin registration
```

### Frontend - React Components
```
frontend/src/components/

Units/
├── UnitList.jsx ........................................ Unit listing with search/filter/pagination
├── UnitDetail.jsx ...................................... Unit detail view with tabbed interface
├── UnitManagement.css .................................. Shared styling for unit components

Members/
├── MemberList.jsx ...................................... Member listing with bulk import
├── MemberDetail.jsx .................................... Member detail with ledger & history
├── MemberList.css ...................................... Styling for member components
```

### Frontend - Vue Components
```
frontend/src/components/

Units/
├── UnitList.vue ....................................... Vue 3 unit listing
│   └── Uses Composition API with TypeScript (recommended)

Members/
├── MemberList.vue ..................................... Vue 3 member listing
│   └── Uses Composition API with TypeScript (recommended)
```

---

## 🗂️ File Purposes & Usage

### Design Documentation

**5_unit_member_management_design.md**
- Purpose: Complete module design specification
- Contains: Data models, API endpoints, features, validations, access control
- Use: Reference for implementation, API documentation, requirements validation

**6_implementation_guide.md**
- Purpose: Setup and deployment instructions
- Contains: Step-by-step backend/frontend setup, migrations, testing, deployment
- Use: Initial setup, troubleshooting, production deployment

**7_code_summary.md**
- Purpose: Code overview and quick reference
- Contains: Technology stack, deliverables, API examples, security features
- Use: Developer reference, onboarding new team members

---

### Backend Models (models.py)

**Unit Model**
```python
- Fields: unit_number, block, floor, area_sqft, unit_type, status
- Methods: get_primary_member()
- Use: Represents physical units in the cooperative
- Features: Unique number, status tracking, member association
```

**Member Model**
```python
- Fields: 18 fields including contact, bank details, status
- Methods: has_bank_details()
- Use: Represents occupants/owners of units
- Features: Multiple occupants per unit, encrypted bank details, audit trail
```

**Occupant Model**
```python
- Fields: name, relation, contact, occupant_type, is_primary
- Use: Additional residents in a unit beyond primary member
- Features: Relations to primary member, flexible family structure
```

**AuditLog Model**
```python
- Fields: Tracks changes with entity type, action, before/after data
- Use: Complete audit trail for compliance and debugging
- Features: User attribution, timestamp, action classification
```

---

### Backend Serializers (serializers.py)

**UnitSerializer** → List view with member count
**UnitDetailSerializer** → Full detail with members and occupants
**MemberSerializer** → Full member data with bank details (masked)
**MemberListSerializer** → Lightweight list view
**MemberDetailSerializer** → Complete member info for detail page
**OccupantSerializer** → Occupant information
**AuditLogSerializer** → Audit trail entries
**BankAccountField** → Custom field that masks account numbers in responses
**BulkImportResultSerializer** → Import result summary
**UnitMemberSummarySerializer** → Dashboard summary statistics

---

### Backend Views (views.py)

**UnitViewSet** (6 methods + custom actions)
- Methods: list, create, retrieve, update, partial_update, destroy
- Custom Actions:
  - `summary`: GET /api/units/summary/ → Dashboard statistics
  - `bulk_import`: POST /api/units/bulk-import/ → CSV import
  - `history`: GET /api/units/{id}/history/ → Audit trail

**MemberViewSet** (6 methods + custom actions)
- Methods: list, create, retrieve, update, partial_update, destroy
- Custom Actions:
  - `bulk_import`: POST /api/members/bulk-import/
  - `ledger`: GET /api/members/{id}/ledger/
  - `transfer`: POST /api/members/{id}/transfer/
  - `history`: GET /api/members/{id}/history/

**OccupantViewSet**
- Methods: list, create, retrieve, update, partial_update, destroy
- Custom Actions:
  - `by_unit`: GET /api/occupants/by_unit/?unit_id=123

**AuditLogViewSet** (Read-only)
- Methods: list, retrieve
- Custom Actions:
  - `by_entity`: GET /api/audit-logs/by_entity/?entity_type=Unit&entity_id=1

---

### Backend Services (services.py)

**AuditService**
- `log_change()`: Create audit log entries
- `get_entity_history()`: Retrieve change history for an entity
- Purpose: Centralized audit trail management

**UnitService**
- `create_unit()`: Create with audit logging
- `update_unit()`: Update with before/after tracking
- `delete_unit()`: Soft delete with audit
- `get_unit_summary()`: Dashboard statistics
- `bulk_import_units()`: CSV import with validation
- `get_unit_data_dict()`: Audit data extraction
- Purpose: All unit-related business logic

**MemberService**
- `create_member()`: Create with primary member logic
- `update_member()`: Update with member status handling
- `delete_member()`: Delete with audit trail
- `transfer_member()`: Transfer to new unit with full audit
- `get_member_ledger()`: Financial ledger generation
- `bulk_import_members()`: CSV import with unit linking
- `get_member_data_dict()`: Audit data extraction
- Purpose: All member-related business logic

---

### Backend URL Configuration (urls.py)

```python
DefaultRouter auto-generates:
- GET/POST /api/units/
- GET/PUT/PATCH/DELETE /api/units/{id}/
- GET/POST /api/members/
- GET/PUT/PATCH/DELETE /api/members/{id}/
- GET/POST /api/occupants/
- GET/PUT/PATCH/DELETE /api/occupants/{id}/
- GET /api/audit-logs/
- GET /api/audit-logs/{id}/

Plus custom actions:
- POST /api/units/bulk-import/
- GET /api/units/summary/
- GET /api/units/{id}/history/
- POST /api/members/bulk-import/
- GET /api/members/{id}/ledger/
- POST /api/members/{id}/transfer/
- GET /api/members/{id}/history/
- GET /api/occupants/by_unit/
- GET /api/audit-logs/by_entity/
```

---

### Frontend - React Components

**UnitList.jsx** (287 lines)
- Purpose: Display paginated unit list with search and filters
- Features:
  - Search by unit number and block
  - Filter by status, type, block
  - Pagination with next/previous
  - Table with action buttons
  - Loading and error states
- Uses: axios, React hooks (useState, useEffect, useCallback)
- Import: `import UnitList from './components/Units/UnitList'`

**UnitDetail.jsx** (165 lines)
- Purpose: Display detailed unit information with member management
- Features:
  - Tabbed interface (Details, Members, Occupants, Ledger)
  - Member listing and management
  - Occupant tracking
  - Financial ledger view
  - Edit buttons
- Uses: axios, React hooks, multiple API calls
- Import: `import UnitDetail from './components/Units/UnitDetail'`

**MemberList.jsx** (272 lines)
- Purpose: Display paginated member list with advanced search
- Features:
  - Search by name, email, phone, unit
  - Filter by status, type, payment preference
  - Bulk CSV import functionality
  - Pagination
  - Action buttons
  - Loading states
- Uses: axios, React hooks, FormData for file upload
- Import: `import MemberList from './components/Members/MemberList'`

**MemberDetail.jsx** (258 lines)
- Purpose: Display member details with complete information
- Features:
  - Tabbed interface (Details, Ledger, History)
  - Personal & contact information
  - Bank details (masked)
  - Financial ledger with invoices/payments
  - Change history timeline
  - Nominated person information
- Uses: axios, Promise.all() for parallel API calls
- Import: `import MemberDetail from './components/Members/MemberDetail'`

---

### Frontend - Vue Components

**UnitList.vue** (~240 lines)
- Purpose: Vue 3 version of unit listing
- Framework: Vue 3 Composition API
- Features: Same as React UnitList
- Setup: Uses `<script setup>` with ref, computed, onMounted
- Styling: Scoped CSS from UnitManagement.css
- Import: `import UnitList from './components/Units/UnitList.vue'`

**MemberList.vue** (~230 lines)
- Purpose: Vue 3 version of member listing
- Framework: Vue 3 Composition API
- Features: Same as React MemberList with bulk import
- Setup: Reactive data with ref(), async operations
- Styling: Scoped CSS from MemberList.css
- Import: `import MemberList from './components/Members/MemberList.vue'`

---

### Frontend - Styling

**UnitManagement.css** (300+ lines)
- Covers: UnitList component styling
- Sections:
  - Header and buttons
  - Search and filter styling
  - Table styles with hover effects
  - Status badges
  - Pagination controls
  - Responsive design for mobile
  - Loading and error states

**MemberList.css** (280+ lines)
- Covers: MemberList component styling
- Sections: Similar structure to UnitManagement.css
- Special: Member-specific color schemes
- Features: Mobile optimization with CSS media queries

**UnitDetail.css** (320+ lines)
- Covers: UnitDetail component styling
- Sections:
  - Tab interface styling
  - Detail cards and info-items
  - Member card layouts
  - Ledger summary display
  - Table styling
  - Modal and dialog styling

**MemberDetail.css** (380+ lines)
- Covers: MemberDetail component styling
- Sections:
  - Tabs with active highlighting
  - Personal/contact info sections
  - Bank details display
  - Ledger summary with amounts
  - Invoice and payment tables
  - History timeline styling

---

## 🎯 Usage Patterns

### Creating a New Unit
```python
# Backend
unit = UnitService.create_unit({
    'unit_number': 'A-101',
    'block': 'Block A',
    'floor': 1,
    'area_sqft': Decimal('1200.00'),
    'unit_type': 'Flat',
    'status': 'Active'
}, user)

# Frontend (React)
const createUnit = async () => {
  const response = await axios.post(`${API_BASE_URL}/units/`, unitData, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  setUnits([...units, response.data]);
};
```

### Adding a Member to Unit
```python
# Backend
member = MemberService.create_member({
    'unit': unit,
    'owner_name': 'John Doe',
    'contact_phone': '9876543210',
    'contact_email': 'john@example.com',
    # ... other fields
}, user)

# Frontend (React)
const createMember = async (memberData) => {
  await axios.post(`${API_BASE_URL}/members/`, memberData, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  fetchMembers(); // Refresh list
};
```

### Bulk Importing Units
```python
# Backend (automatic in view)
results = UnitService.bulk_import_units(csv_file, user)

# Frontend (React)
const handleBulkImport = async (e) => {
  const file = e.target.files[0];
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_BASE_URL}/units/bulk-import/`, formData);
  console.log(`Success: ${response.data.success}, Failed: ${response.data.failed}`);
};
```

---

## 📊 Database Relationships

```
┌─────────────┐         ┌──────────────┐
│   User      │         │    Unit      │
│ (Django)    │◄────────┤              │
└─────────────┘ created_by, updated_by └──────────────┘
                                            │
                                       has many
                                            │
                                    ┌───────▼─────────┐
                                    │    Member       │
                                    │ (is_primary=1)  │
                                    └─────────────────┘
                                            │
                                      tracked by
                                            │
                                    ┌───────▼─────────┐
                                    │   AuditLog      │
                                    │ (changed_by)    │
                                    └─────────────────┘

┌─────────────┐
│    Unit     │
├─────────────┤
│ 1 : many    │
└────────┬────┘
         │
      has many
         │
    ┌────▼─────────┐
    │   Occupant   │
    │(not primary) │
    └──────────────┘
```

---

## 🔄 Data Flow Architecture

```
Frontend
   │
   ├─► React/Vue Component
   │   ├─► User Interaction
   │   └─► API Call (axios)
   │
   │
   ▼
Backend
   │
   ├─► Django View (ViewSet)
   │   ├─► Authentication Check
   │   ├─► Permission Check
   │   └─► Parameter Parsing
   │
   ├─► Serializer
   │   ├─► Validation
   │   └─► Data Transformation
   │
   ├─► Service Class
   │   ├─► Business Logic
   │   ├─► Audit Logging
   │   └─► Transaction Management
   │
   ├─► ORM Models
   │   └─► Database Operations
   │
   └─► Response (JSON)
       │
       ▼
    Frontend
    (Display/Update)
```

---

## 🚀 Quick Navigation Guide

| Task | File(s) | Location |
|------|---------|----------|
| Understand the system | 7_code_summary.md, 5_unit_member_management_design.md | docs/ |
| Set up backend | 6_implementation_guide.md | docs/ |
| Add new unit endpoint | views.py, services.py, serializers.py | backend/units/ |
| Create member form (React) | MemberDetail.jsx | Will be created |
| Create member form (Vue) | MemberDetail.vue | Will be created |
| Style components | *.css files | frontend/src/components |
| Run tests | (See guide) | backend/units/tests.py |
| Deploy to production | 6_implementation_guide.md | docs/ |

---

## 📝 Notes for Developers

1. **Models**: All models include timestamps and user attribution
2. **Audit**: All changes are logged automatically via service classes
3. **Validation**: Serializers provide comprehensive field validation
4. **Permissions**: ViewSets require IsAuthenticated permission
5. **Pagination**: Default 20 items per page, configurable
6. **Error Handling**: All views return proper HTTP status codes
7. **CORS**: Configure CORS_ALLOWED_ORIGINS in Django settings
8. **Bank Details**: Stored as encrypted JSONB, masked in API responses
9. **Bulk Import**: CSV must have proper headers, errors reported individually
10. **Search**: Uses Django ORM __icontains for case-insensitive search

---

## ✨ Summary of Features Implemented

✅ Complete CRUD operations for Units and Members  
✅ Bulk import with CSV validation  
✅ Financial ledger generation  
✅ Member transfer between units  
✅ Complete audit trail system  
✅ Encrypted bank details storage  
✅ Advanced search and filtering  
✅ Pagination for large datasets  
✅ Both React and Vue component implementations  
✅ Responsive design for mobile  
✅ Dashboard statistics API  
✅ Comprehensive error handling  
✅ Role-based access control ready  
✅ Database indexing for performance  
✅ API documentation ready  

---

**Ready for Production! 🎉**

