# FMS Quick Start Guide (New Staff)

Use this quick guide during onboarding to complete common tasks in the first day.

## 1) First Login (All Staff)

1. Open the FMS login page.
2. Enter your username and password.
3. Confirm your role in the top navigation after login.
4. If role or menu items look wrong, contact Admin.

## 2) Know Your Role in 30 Seconds

- Admin:
  - Manage users and roles
  - Manage maintenance templates
  - Generate invoices
  - Record payments
- Treasurer:
  - Generate and review invoices
  - Record and track payments
- Board Member:
  - Review invoice status and collections
- Auditor:
  - Review records in read-only mode
- Member:
  - Access member-level features only

## 3) Core Billing Workflow (Most Common)

### Step A: Check Maintenance Templates (Admin)

1. Open Maintenance Templates.
2. Confirm active template exists for each unit type.
3. Verify due day, base amount, and penalty rules.

### Step B: Generate Invoices (Admin or Treasurer)

1. Open Invoices.
2. Click Generate Invoices.
3. Enter billing period start and end.
4. Optionally enter unit IDs for a partial run.
5. Click Generate and verify created/skipped counts.

### Step C: Review Invoices (Admin/Treasurer/Board Member)

1. Open Invoices list.
2. Filter by status: Pending or Overdue.
3. Open invoice detail to verify line items and outstanding amount.

### Step D: Record Payments (Admin or Treasurer)

1. Open Payments.
2. Select invoice.
3. Enter amount, payment date, mode, and reference.
4. Submit and confirm success.
5. Reopen invoice detail to verify updated status and balance.

## 4) Quick Role-Specific Tasks

### Admin Checklist

1. Create user accounts for new staff.
2. Assign correct roles.
3. Validate template setup before monthly billing.
4. Review exceptions and skipped invoices.

### Treasurer Checklist

1. Generate monthly invoices.
2. Track pending and overdue accounts daily.
3. Record payments and maintain references.
4. Recalculate penalties before month-end review.

### Board Member Checklist

1. Review invoice summary and overdue trends.
2. Check payment collection progress.
3. Escalate anomalies to Admin/Treasurer.

### Auditor Checklist

1. Review billing and payment records.
2. Cross-check invoice and payment consistency.
3. Report policy or process deviations.

## 5) Common Issues and Fast Fixes

- Users page missing:
  - You are not signed in as Admin.
- Billing menu missing:
  - Your role does not include billing access.
- Invoices skipped:
  - Missing active maintenance template for some unit types.
- Payment not marking invoice as paid:
  - Amount is less than outstanding balance.
- Proxy/connection error:
  - Backend server is not running on port 8000.

## 6) End-of-Month Mini Checklist

1. Confirm template correctness.
2. Generate invoices for target period.
3. Review pending and overdue invoices.
4. Complete payment entries.
5. Recalculate penalties.
6. Share summary with management.

## Where to Learn More

- Full manual: docs/fms_user_manual.md
- Implementation details: docs/6_implementation_guide.md
