# Unit/Member Management Module - Detailed Design

## 1. Overview

The Unit/Member Management module is responsible for managing residential units and their associated members/occupants in the cooperative society. It serves as the foundation for all billing, payment, and other operations.

### Key Responsibilities:
- Register and maintain unit details
- Manage member/occupant information
- Track membership status and payment preferences
- Provide search, filter, and reporting capabilities
- Maintain audit trails for all changes

---

## 2. Data Model

### Unit Entity
```
Unit
├── id (PK)
├── unit_number (String, Unique) - e.g., "A-101"
├── block (String) - e.g., "Block A"
├── floor (Integer) - e.g., 1
├── area_sqft (Float) - carpet area
├── unit_type (Enum) - Flat, Villa, Shop, etc.
├── status (Enum) - Active, Inactive, Disputed, Sold, etc.
├── created_at (DateTime)
├── updated_at (DateTime)
├── created_by (FK User)
├── updated_by (FK User)
```

### Member Entity
```
Member
├── id (PK)
├── unit_id (FK Unit) - one member per unit (primary contact)
├── owner_name (String)
├── occupant_type (Enum) - Owner, Tenant, Caretaker, etc.
├── contact_phone (String)
├── contact_email (String)
├── alternate_contact (String) - optional
├── membership_status (Enum) - Active, Inactive, Suspended, Left
├── payment_preference (Enum) - Online, Check, Cash, Auto-Debit
├── bank_account (JSON) - {account_holder, account_no, ifsc, bank_name}
├── nominated_person_name (String) - optional
├── nominated_person_contact (String) - optional
├── move_in_date (Date)
├── move_out_date (Date) - nullable
├── is_primary (Boolean) - primary contact for unit
├── notes (Text)
├── created_at (DateTime)
├── updated_at (DateTime)
├── created_by (FK User)
├── updated_by (FK User)
```

### Occupant Entity (Optional - for tracking multiple occupants)
```
Occupant
├── id (PK)
├── unit_id (FK Unit)
├── name (String)
├── relation (String) - Family member, Tenant, etc.
├── contact_phone (String)
├── occupant_type (Enum) - Owner, Tenant, Caretaker
├── is_primary (Boolean)
├── created_at (DateTime)
├── updated_at (DateTime)
```

---

## 3. Key Features

### 3.1 Unit Management
- CRUD operations on units
- Bulk import units via CSV
- Unit status management (Active, Inactive, Disputed, etc.)
- Unit search by: unit number, block, floor, area range, unit type
- Unit filtering and sorting

### 3.2 Member Management
- CRUD operations on members
- Link member to unit (one primary member per unit)
- Track multiple occupants per unit (optional)
- Member status management
- Payment preference management
- Bank account details management (encrypted)
- Member search by: owner name, unit number, contact, status
- Bulk import members via CSV

### 3.3 Member History & Transitions
- Track member move-in/move-out dates
- Maintain audit trail of member changes
- Generate transition reports

### 3.4 Dashboard
- Total units, active units, vacant units
- Total members, active members, inactive members
- Units by type, block distribution
- Members by status
- Missing bank details list

---

## 4. API Endpoints

### Units API

#### List Units
```
GET /api/units/
Parameters:
  - page (default: 1)
  - limit (default: 20)
  - search (unit_number, block)
  - status (Active, Inactive, Disputed)
  - unit_type
  - block
  - floor__gte, floor__lte
  - area_sqft__gte, area_sqft__lte
  - ordering (unit_number, block, floor, -created_at)

Response:
{
  "count": 150,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": 1,
      "unit_number": "A-101",
      "block": "Block A",
      "floor": 1,
      "area_sqft": 1200,
      "unit_type": "Flat",
      "status": "Active",
      "member": { "id": 5, "owner_name": "John Doe" }
    }
  ]
}
```

#### Get Unit Details
```
GET /api/units/{id}/
Response:
{
  "id": 1,
  "unit_number": "A-101",
  "block": "Block A",
  "floor": 1,
  "area_sqft": 1200,
  "unit_type": "Flat",
  "status": "Active",
  "created_at": "2026-01-15T10:30:00Z",
  "created_by": { "id": 1, "name": "Admin" },
  "member": {
    "id": 5,
    "owner_name": "John Doe",
    "occupant_type": "Owner",
    "contact_phone": "9876543210",
    "contact_email": "john@example.com",
    "membership_status": "Active",
    "payment_preference": "Online"
  },
  "occupants": [
    {
      "id": 10,
      "name": "Jane Doe",
      "relation": "Spouse",
      "contact_phone": "9876543211",
      "occupant_type": "Owner",
      "is_primary": false
    }
  ]
}
```

#### Create Unit
```
POST /api/units/
{
  "unit_number": "A-102",
  "block": "Block A",
  "floor": 1,
  "area_sqft": 1200,
  "unit_type": "Flat",
  "status": "Active"
}
```

#### Update Unit
```
PUT /api/units/{id}/
{
  "area_sqft": 1250,
  "status": "Active"
}
```

#### Delete Unit
```
DELETE /api/units/{id}/
```

#### Bulk Import Units
```
POST /api/units/bulk-import/
Content-Type: multipart/form-data
- file: CSV file

CSV Format:
unit_number,block,floor,area_sqft,unit_type,status
A-101,Block A,1,1200,Flat,Active
A-102,Block A,1,1200,Flat,Active
```

### Members API

#### List Members
```
GET /api/members/
Parameters:
  - page (default: 1)
  - limit (default: 20)
  - search (owner_name, unit_number, contact_email, contact_phone)
  - membership_status (Active, Inactive, Suspended, Left)
  - occupant_type (Owner, Tenant, Caretaker)
  - payment_preference
  - unit_id
  - has_bank_details (true/false)
  - ordering (owner_name, unit__unit_number, -created_at)

Response:
{
  "count": 120,
  "results": [
    {
      "id": 5,
      "unit": { "id": 1, "unit_number": "A-101" },
      "owner_name": "John Doe",
      "occupant_type": "Owner",
      "contact_phone": "9876543210",
      "contact_email": "john@example.com",
      "membership_status": "Active",
      "payment_preference": "Online",
      "is_primary": true
    }
  ]
}
```

#### Get Member Details
```
GET /api/members/{id}/
Response:
{
  "id": 5,
  "unit": {
    "id": 1,
    "unit_number": "A-101",
    "block": "Block A",
    "area_sqft": 1200
  },
  "owner_name": "John Doe",
  "occupant_type": "Owner",
  "contact_phone": "9876543210",
  "contact_email": "john@example.com",
  "alternate_contact": "9876543211",
  "membership_status": "Active",
  "payment_preference": "Online",
  "bank_account": {
    "account_holder": "John Doe",
    "account_no": "XXXX...XXXX",
    "ifsc": "SBIN0001234",
    "bank_name": "State Bank of India"
  },
  "is_primary": true,
  "move_in_date": "2020-01-15",
  "nominated_person_name": "Jane Doe",
  "nominated_person_contact": "9876543211",
  "notes": "Important notes",
  "created_at": "2026-01-15T10:30:00Z"
}
```

#### Create Member
```
POST /api/members/
{
  "unit_id": 1,
  "owner_name": "John Doe",
  "occupant_type": "Owner",
  "contact_phone": "9876543210",
  "contact_email": "john@example.com",
  "membership_status": "Active",
  "payment_preference": "Online",
  "bank_account": {
    "account_holder": "John Doe",
    "account_no": "1234567890",
    "ifsc": "SBIN0001234",
    "bank_name": "State Bank of India"
  },
  "move_in_date": "2020-01-15"
}
```

#### Update Member
```
PUT /api/members/{id}/
{
  "contact_phone": "9876543210",
  "membership_status": "Active",
  "payment_preference": "Online"
}
```

#### Delete Member
```
DELETE /api/members/{id}/
```

#### Bulk Import Members
```
POST /api/members/bulk-import/
Content-Type: multipart/form-data
- file: CSV file

CSV Format:
unit_number,owner_name,occupant_type,contact_phone,contact_email,membership_status,payment_preference
A-101,John Doe,Owner,9876543210,john@example.com,Active,Online
A-102,Jane Smith,Tenant,9876543211,jane@example.com,Active,Online
```

#### Get Member Ledger
```
GET /api/members/{id}/ledger/
Response:
{
  "member": { "id": 5, "owner_name": "John Doe" },
  "invoices": [
    {
      "id": 45,
      "period": "May 2026",
      "issued_date": "2026-05-01",
      "due_date": "2026-05-15",
      "amount": 10000.00,
      "paid": 9500.00,
      "outstanding": 500.00,
      "status": "Partially Paid"
    }
  ],
  "payments": [
    {
      "id": 120,
      "date": "2026-05-12",
      "amount": 9500.00,
      "mode": "UPI",
      "reference": "TXN7890"
    }
  ],
  "total_outstanding": 500.00,
  "arrears": 0.00
}
```

### Dashboard API

#### Units & Members Summary
```
GET /api/units-members/summary/
Response:
{
  "units": {
    "total": 150,
    "active": 145,
    "inactive": 5,
    "by_type": {
      "Flat": 100,
      "Villa": 30,
      "Shop": 20
    },
    "by_block": {
      "Block A": 50,
      "Block B": 50,
      "Block C": 50
    }
  },
  "members": {
    "total": 145,
    "active": 140,
    "inactive": 5,
    "by_occupant_type": {
      "Owner": 100,
      "Tenant": 40,
      "Caretaker": 5
    },
    "by_payment_preference": {
      "Online": 80,
      "Check": 40,
      "Cash": 25
    }
  },
  "missing_bank_details": 15,
  "vacant_units": 5
}
```

---

## 5. Service Classes

### UnitService
```python
class UnitService:
    - create_unit(data)
    - update_unit(unit_id, data)
    - delete_unit(unit_id)
    - get_unit_details(unit_id)
    - search_units(filters)
    - bulk_import_units(csv_data)
    - get_unit_summary()
    - audit_log_change(unit_id, before, after)
```

### MemberService
```python
class MemberService:
    - create_member(data)
    - update_member(member_id, data)
    - delete_member(member_id)
    - get_member_details(member_id)
    - search_members(filters)
    - bulk_import_members(csv_data)
    - transfer_member(old_unit_id, new_unit_id)
    - get_member_ledger(member_id)
    - verify_bank_account(member_id)
    - get_members_summary()
    - audit_log_change(member_id, before, after)
```

---

## 6. Validations

### Unit Validations
- Unit number must be unique
- Unit number format validation
- Area must be positive number
- Unit type must be from predefined list
- Status must be valid
- Floor must be non-negative
- Block must not be empty

### Member Validations
- Unit must exist and be active
- Owner name must not be empty
- Contact phone format validation (10-15 digits)
- Email validation
- Occupant type must be valid
- Membership status must be valid
- Payment preference must be valid
- Bank account details validation (if provided)
- Move-in date must be valid
- Move-out date must be after move-in date if provided
- Multiple primary members not allowed per unit

---

## 7. Access Control

### Unit Management
- `Admin`: Full CRUD + bulk import + status change
- `Treasurer`: CRUD + view
- `Auditor`: View only
- `Member`: View only own unit

### Member Management
- `Admin`: Full CRUD + bulk import + status change
- `Treasurer`: CRUD + view
- `Auditor`: View only
- `Member`: View only own member details

---

## 8. Audit & Logging

- Log all CRUD operations
- Track: user, timestamp, action, before/after data
- Maintain change history for member transfers
- Generate audit reports by date range, user, entity

---

## 9. Frontend Components

### Units Module
- Unit List View (with search, filter, pagination)
- Unit Detail View
- Unit Form (Create/Edit)
- Bulk Import Modal
- Unit Summary Dashboard Card

### Members Module
- Member List View (with search, filter, pagination)
- Member Detail View
- Member Form (Create/Edit)
- Bulk Import Modal
- Member Ledger View
- Member Summary Dashboard Card
- Bank Details Manager

### Shared Components
- Search Bar with auto-complete
- Filter Sidebar
- Pagination
- Data Export (CSV, PDF)
- Confirmation Dialogs
- Status Badge
- Audit Trail Viewer

---

## 10. Database Indexes

```sql
CREATE INDEX idx_unit_number ON units(unit_number);
CREATE INDEX idx_unit_block_floor ON units(block, floor);
CREATE INDEX idx_unit_status ON units(status);
CREATE INDEX idx_member_unit_id ON members(unit_id);
CREATE INDEX idx_member_owner_name ON members(owner_name);
CREATE INDEX idx_member_status ON members(membership_status);
CREATE INDEX idx_member_contact_email ON members(contact_email);
CREATE INDEX idx_member_contact_phone ON members(contact_phone);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, changed_at DESC);
```

---
