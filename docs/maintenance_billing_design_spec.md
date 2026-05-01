# Maintenance Billing & Invoice Generation Module - Design Specification

## 1. Overview

The Maintenance Billing & Invoice Generation module handles the creation, management, and processing of maintenance charges for residential cooperative society units. This module supports flexible billing templates, variable levies, multiple billing frequencies, and automated penalty calculations.

## 2. Core Requirements

### 2.1 Maintenance Templates
- **Standard maintenance template per unit type**: Each unit type (Flat, Villa, Shop, Office, Parking) has a configurable base maintenance charge
- **Variable levies**: Additional charges for water/electricity, sinking fund, repair fund
- **Billing frequency**: Monthly (12 invoices/year) or Annual (1 invoice/year)

### 2.2 Invoice Generation
- **Automated invoice creation**: Generate invoices based on billing cycle and due dates
- **Overdue handling**: Apply penalties after due date
- **Payment recalculation**: Adjust penalties when payments are received

## 3. Database Schema Design

### 3.1 MaintenanceTemplate Model
```sql
CREATE TABLE units_maintenancetemplate (
    id SERIAL PRIMARY KEY,
    unit_type VARCHAR(20) NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    billing_frequency VARCHAR(10) NOT NULL, -- 'monthly' or 'annual'
    due_day INTEGER NOT NULL, -- Day of month when payment is due
    penalty_rate DECIMAL(5,2) NOT NULL, -- Penalty percentage per month
    penalty_type VARCHAR(20) NOT NULL, -- 'percentage' or 'fixed'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by_id INTEGER REFERENCES auth_user(id),
    updated_by_id INTEGER REFERENCES auth_user(id)
);
```

### 3.2 MaintenanceLevy Model
```sql
CREATE TABLE units_maintenancelevy (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES units_maintenancetemplate(id),
    levy_type VARCHAR(50) NOT NULL, -- 'water', 'electricity', 'sinking_fund', 'repair_fund'
    amount DECIMAL(10,2) NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 Invoice Model
```sql
CREATE TABLE units_invoice (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER REFERENCES units_unit(id),
    member_id INTEGER REFERENCES units_member(id),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    total_levies DECIMAL(10,2) DEFAULT 0,
    penalty_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
    payment_date DATE NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by_id INTEGER REFERENCES auth_user(id),
    updated_by_id INTEGER REFERENCES auth_user(id)
);
```

### 3.4 InvoiceItem Model (for levies breakdown)
```sql
CREATE TABLE units_invoiceitem (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES units_invoice(id),
    levy_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.5 InvoicePenalty Model (penalty calculation history)
```sql
CREATE TABLE units_invoicepenalty (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES units_invoice(id),
    penalty_date DATE NOT NULL,
    penalty_amount DECIMAL(10,2) NOT NULL,
    days_overdue INTEGER NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW()
);
```

## 4. API Design

### 4.1 Maintenance Template APIs

#### GET /api/maintenance-templates/
- List all maintenance templates
- Filter by unit_type, is_active
- Pagination support

#### POST /api/maintenance-templates/
- Create new maintenance template
- Required: unit_type, base_amount, billing_frequency, due_day, penalty_rate, penalty_type
- Permission: Admin only

#### PUT /api/maintenance-templates/{id}/
- Update maintenance template
- Permission: Admin only

#### DELETE /api/maintenance-templates/{id}/
- Soft delete (set is_active=False)
- Permission: Admin only

### 4.2 Maintenance Levy APIs

#### GET /api/maintenance-templates/{template_id}/levies/
- Get levies for a specific template

#### POST /api/maintenance-templates/{template_id}/levies/
- Add levy to template
- Required: levy_type, amount, description

#### PUT /api/maintenance-templates/{template_id}/levies/{levy_id}/
- Update levy

#### DELETE /api/maintenance-templates/{template_id}/levies/{levy_id}/
- Remove levy from template

### 4.3 Invoice Generation APIs

#### POST /api/invoices/generate/
- Generate invoices for billing period
- Request body:
```json
{
  "billing_period_start": "2024-01-01",
  "billing_period_end": "2024-01-31",
  "unit_ids": [1, 2, 3], // optional, generate for all if not provided
  "force_regenerate": false // regenerate existing invoices
}
```
- Permission: Admin, Treasurer

#### GET /api/invoices/
- List invoices with filtering
- Filters: unit_id, member_id, status, billing_period_start, billing_period_end, due_date

#### GET /api/invoices/{id}/
- Get invoice details with levy breakdown

#### PUT /api/invoices/{id}/
- Update invoice (limited fields for corrections)

### 4.4 Invoice Processing APIs

#### POST /api/invoices/{id}/calculate-penalty/
- Recalculate penalty for overdue invoice
- Called automatically by system or manually

#### POST /api/invoices/bulk-generate/
- Generate invoices for multiple units/billing periods

## 5. Business Logic

### 5.1 Invoice Generation Process

1. **Determine Billing Period**
   - For monthly: Generate 12 invoices per year (Jan-Dec)
   - For annual: Generate 1 invoice per year

2. **Calculate Base Amount**
   - Get maintenance template for unit type
   - Apply base_amount from template

3. **Calculate Levies**
   - Add variable levies (water, electricity, sinking fund, repair fund)
   - Sum all levy amounts

4. **Set Due Date**
   - Use due_day from template
   - For monthly: due_day of each month
   - For annual: due_day of billing month

5. **Create Invoice Record**
   - Store all calculations
   - Set initial status as 'pending'

### 5.2 Overdue Penalty Calculation

1. **Penalty Trigger**
   - When current date > due_date and status = 'pending'

2. **Penalty Calculation**
   - **Percentage Penalty**: penalty_amount = outstanding_amount * (penalty_rate/100) * months_overdue
   - **Fixed Penalty**: penalty_amount = penalty_rate * months_overdue

3. **Penalty Application**
   - Add penalty to total_amount
   - Create InvoicePenalty record for audit trail
   - Update invoice status to 'overdue'

### 5.3 Payment Processing Integration

1. **On Payment Entry**
   - Allocate payment to outstanding invoices
   - Recalculate penalties if payment reduces overdue amount
   - Update invoice status (paid/overdue/pending)

2. **Penalty Recalculation**
   - When payment is applied to overdue invoice
   - Reduce penalty proportionally
   - Update penalty history

## 6. User Interface Design

### 6.1 Maintenance Template Management

#### Template List View
- Table showing: Unit Type, Base Amount, Frequency, Due Day, Status
- Actions: Edit, Delete, Manage Levies

#### Template Form
- Unit Type dropdown (Flat, Villa, Shop, Office, Parking)
- Base Amount (decimal input)
- Billing Frequency (Monthly/Annual radio)
- Due Day (1-31 dropdown)
- Penalty Rate (percentage input)
- Penalty Type (Percentage/Fixed radio)

#### Levy Management
- Modal/Popup for adding levies to template
- Levy Type dropdown (water, electricity, sinking_fund, repair_fund)
- Amount input
- Mandatory checkbox
- Description textarea

### 6.2 Invoice Generation

#### Generate Invoice Form
- Billing Period Start/End date pickers
- Unit selection (multi-select dropdown or checkboxes)
- Force Regenerate checkbox
- Preview button (shows what will be generated)
- Generate button

#### Invoice List View
- Filters: Unit, Member, Status, Billing Period, Due Date
- Table columns: Invoice #, Unit, Member, Period, Amount, Due Date, Status
- Actions: View, Edit, Print, Mark as Paid

#### Invoice Detail View
- Invoice header (number, dates, amounts)
- Levy breakdown table
- Penalty history
- Payment allocation details

### 6.3 Dashboard Integration

#### Billing Summary Cards
- Total Pending Invoices
- Total Overdue Amount
- This Month's Collections
- Next Due Date

#### Quick Actions
- Generate Monthly Invoices
- View Overdue Invoices
- Process Payments

## 7. Workflow and Automation

### 7.1 Automated Invoice Generation

#### Monthly Billing (Cron Job)
```python
# Run on 1st of every month
def generate_monthly_invoices():
    # Get all active maintenance templates with monthly frequency
    templates = MaintenanceTemplate.objects.filter(
        billing_frequency='monthly',
        is_active=True
    )

    current_month = date.today().replace(day=1)
    next_month = current_month + relativedelta(months=1)

    for template in templates:
        # Generate invoices for all units of this type
        units = Unit.objects.filter(unit_type=template.unit_type)

        for unit in units:
            create_invoice_for_unit(unit, template, current_month, next_month)
```

#### Annual Billing (Cron Job)
```python
# Run on January 1st
def generate_annual_invoices():
    templates = MaintenanceTemplate.objects.filter(
        billing_frequency='annual',
        is_active=True
    )

    current_year = date.today().year
    year_start = date(current_year, 1, 1)
    year_end = date(current_year, 12, 31)

    for template in templates:
        units = Unit.objects.filter(unit_type=template.unit_type)

        for unit in units:
            create_invoice_for_unit(unit, template, year_start, year_end)
```

### 7.2 Penalty Calculation (Daily Job)

```python
def calculate_daily_penalties():
    # Find overdue invoices
    overdue_invoices = Invoice.objects.filter(
        status__in=['pending', 'overdue'],
        due_date__lt=date.today()
    )

    for invoice in overdue_invoices:
        calculate_penalty_for_invoice(invoice)
```

### 7.3 Payment Integration

```python
def process_payment_allocation(payment, invoice):
    # Allocate payment to invoice
    allocated_amount = min(payment.remaining_amount, invoice.total_amount)

    # Update invoice
    invoice.paid_amount += allocated_amount
    if invoice.paid_amount >= invoice.total_amount:
        invoice.status = 'paid'
        invoice.payment_date = payment.payment_date
    else:
        invoice.status = 'pending'

    # Recalculate penalty if overdue
    if invoice.status == 'overdue':
        recalculate_penalty(invoice)

    invoice.save()
```

## 8. Integration Points

### 8.1 Unit Management
- Invoice generation triggered when new units are added
- Template lookup based on unit.unit_type

### 8.2 Member Management
- Invoice assignment to current primary member of unit
- Member contact details for invoice notifications

### 8.3 Payment Processing
- Invoice status updates when payments are recorded
- Penalty recalculation on payment entry

### 8.4 Reporting
- Invoice data feeds into financial reports
- Overdue amounts included in receivables reports

## 9. Security and Permissions

### 9.1 Role-Based Access
- **Admin**: Full CRUD on templates, generate invoices, modify penalties
- **Treasurer**: View invoices, generate invoices, process payments
- **Board Member**: View invoices and reports
- **Member**: View their own invoices

### 9.2 Audit Trail
- All template changes logged
- Invoice creation/modification tracked
- Penalty calculations recorded
- Payment allocations audited

## 10. Testing Strategy

### 10.1 Unit Tests
- Template creation and validation
- Invoice calculation logic
- Penalty calculation algorithms
- Payment allocation logic

### 10.2 Integration Tests
- End-to-end invoice generation workflow
- Payment processing integration
- API endpoint testing

### 10.3 User Acceptance Tests
- Template configuration workflow
- Invoice generation and review
- Payment processing and penalty recalculation

## 11. Performance Considerations

### 11.1 Database Optimization
- Indexes on frequently queried fields (unit_id, due_date, status)
- Partitioning for large invoice tables (by year)
- Efficient queries for dashboard calculations

### 11.2 Caching Strategy
- Cache maintenance templates (rarely change)
- Cache unit type lookups
- Cache penalty calculations

### 11.3 Batch Processing
- Bulk invoice generation for large societies
- Batch penalty calculations
- Asynchronous processing for heavy operations

## 12. Deployment and Migration

### 12.1 Database Migrations
- Create new tables for templates, levies, invoices, invoice items, penalties
- Migrate existing maintenance data to new structure
- Update existing invoice calculations

### 12.2 Configuration
- Set up cron jobs for automated invoice generation
- Configure penalty calculation schedules
- Set up email notifications for due dates

### 12.3 Rollback Plan
- Backup existing data before migration
- Gradual rollout with feature flags
- Rollback scripts for critical issues

## 13. Future Enhancements

### 13.1 Advanced Features
- Custom billing cycles (quarterly, bi-monthly)
- Variable penalty rates based on days overdue
- Invoice templates and branding
- Multi-currency support
- Automated payment reminders

### 13.2 Integration Features
- Online payment gateway integration
- SMS/email notification system
- Document attachment for invoices
- QR code generation for easy payments

This design specification provides a comprehensive foundation for implementing the Maintenance Billing & Invoice Generation module with all required features and proper integration with the existing FMS system.