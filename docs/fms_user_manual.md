# FMS User Manual

## Table of Contents

- [Overview](#overview)
- [Role-Based Access Guide](#role-based-access-guide)
- [Common Sign-In Steps](#common-sign-in-steps)
- [Admin Guide](#admin-guide)
- [Treasurer Guide](#treasurer-guide)
- [Board Member Guide](#board-member-guide)
- [Auditor Guide](#auditor-guide)
- [Member Guide](#member-guide)
- [Section Guide: Maintenance Templates](#section-guide-maintenance-templates)
- [Section Guide: Invoices](#section-guide-invoices)
- [Section Guide: Payments](#section-guide-payments)
- [Troubleshooting](#troubleshooting)
- [Recommended Monthly Billing Workflow](#recommended-monthly-billing-workflow)

## Overview

This manual explains day-to-day usage of user and billing features in the FMS application.
It is organized in two ways:

1. By role (what each role can access and do).
2. By section (step-by-step instructions for Maintenance Templates, Invoices, and Payments).

## Role-Based Access Guide

- Admin:
  - Full user management access
  - Maintenance Templates: full access
  - Invoices: view and generate
  - Payments: record and review
- Treasurer:
  - Invoices: view and generate
  - Payments: record and review
  - Maintenance Templates: access as configured by policy
- Board Member:
  - Invoices: view
  - Units and Members: view and approved operations based on policy
- Auditor:
  - Read-only access to assigned areas
- Member:
  - Access limited to member scope and permitted sections

## Common Sign-In Steps

1. Open the application and go to /login.
2. Enter username and password.
3. On successful login, you are redirected to Dashboard.
4. Confirm your role name shown in the top navigation.

## Admin Guide

### Manage Users

1. Open Users from the navigation bar.
2. Review user list (username, name, email, role, access status, linked member).
3. Create user:
   - Click + Add New User
   - Fill required fields: Username, Password, Role
   - Fill optional fields: First Name, Last Name, Email, Portal Access, Linked Member
   - Click Save User
4. Edit user:
   - Click Edit
   - Update fields as required
   - Leave password blank to keep existing password
   - Click Save User
5. Delete user:
   - Click Delete
   - Confirm prompt

### Admin Notes

- Use Admin accounts only for configuration and supervision.
- Assign finance roles carefully for billing and payment workflows.

## Treasurer Guide

### Daily Finance Operations

1. Open Invoices and review pending or overdue items.
2. Generate invoices for the billing period when needed.
3. Record incoming payments.
4. Recheck invoice status after each payment.

## Board Member Guide

### Oversight and Review

1. Open Invoices.
2. Use search and status filters to review collections.
3. Open invoice detail for levy, penalty, and payment history.

## Auditor Guide

### Audit Checks

1. Review available read-only pages.
2. Validate billing and payment records against policy.
3. Escalate inconsistencies to Admin/Treasurer.

## Member Guide

### Basic Usage

1. Sign in with your member account.
2. Access only permitted pages shown in navigation.
3. Contact Admin if role-based access appears incorrect.

## Section Guide: Maintenance Templates

Maintenance templates define recurring billing rules by unit type.

### Open Maintenance Templates

1. From navigation, click Maintenance Templates.
2. Review existing templates: unit type, frequency, base amount, due day, penalty settings.

### Create Template

1. Click + Create Template.
2. Fill:
   - Unit Type (Flat, Office, Shop, Penthouse)
   - Base Amount
   - Billing Frequency (Monthly or Annual)
   - Due Day (1 to 31)
   - Penalty Rate
   - Penalty Type (Percentage or Fixed)
   - Active Template
3. Click Create Template.

### Edit Template

1. Click Edit in template row.
2. Update fields.
3. Click Save Changes.

### Delete Template

1. Click Delete.
2. Confirm deletion.

### Best Practices

1. Keep only one active template per unit type and cycle.
2. Review templates before each invoice run.

## Section Guide: Invoices

Invoices are generated from active maintenance templates.

### Generate Invoices

1. Open Invoices.
2. Click Generate Invoices.
3. Enter:
   - Billing Period Start
   - Billing Period End
   - Unit IDs (optional, comma-separated)
   - Force Regenerate (optional)
4. Click Generate Invoices.
5. Confirm created and skipped counts.

### View Invoice List

1. Open Invoices.
2. Use filters:
   - Search by unit or owner
   - Status filter: Pending, Paid, Overdue, Cancelled
3. Click View on any invoice.

### View Invoice Detail

1. Review unit, owner, billing period, due date, status.
2. Review base amount, levies, penalties, paid, total, outstanding.
3. Review line items, penalty history, and payment history.

### Recalculate Penalty

1. Open invoice detail.
2. Click Recalculate Penalty.
3. Confirm refreshed totals.

## Section Guide: Payments

Payments are recorded against invoices and update balances automatically.

### Record Payment

1. Open Payments.
2. Select an open invoice.
3. Enter:
   - Amount
   - Payment Date
   - Payment Mode (Online, Transfer, Cheque, Cash, UPI)
   - Reference Number (optional)
4. Click Record Payment.
5. Confirm success message.

### Verify Payment Effect

1. Open invoice detail.
2. Confirm payment entry is present.
3. Confirm paid amount and outstanding are updated.
4. Confirm invoice status is updated correctly.

## Troubleshooting

### Users page not visible

- Cause: current role is not Admin.
- Action: sign in with Admin account.

### Billing menu not visible

- Cause: role does not include billing permissions.
- Action: ask Admin to update role mapping.

### Invoices skipped during generation

- Cause: no active template for one or more unit types.
- Action: create/activate templates, then regenerate.

### Payment recorded but invoice not fully paid

- Cause: payment amount is less than total outstanding.
- Action: record remaining payment later.

### Frontend proxy or connection error

- Cause: backend is not running.
- Action: start backend on port 8000 and frontend on port 3000.

## Recommended Monthly Billing Workflow

1. Validate maintenance templates.
2. Generate invoices for target period.
3. Review pending and overdue invoices.
4. Record payments daily.
5. Recalculate penalties before monthly close.
