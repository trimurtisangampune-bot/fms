# Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose
This document defines the software requirements for a finance management system for a residential cooperative housing society. The system will support maintenance income collection, expense tracking, member account management, and financial reporting.

### 1.2 Scope
The system will manage:
- resident maintenance charges and receipts
- society expenses and vendor payments
- unit/member balances and dues
- budgeting, fund management, and reporting
- user roles for administrative and accounting workflows

### 1.3 Definitions, Acronyms, and Abbreviations
- Member: resident or unit owner of the society
- Maintenance: periodic charge collected from members for common services
- Arrears: overdue maintenance or unpaid dues
- Fund: financial pool such as sinking fund, reserve fund, or repair fund
- Admin: system user with full configuration and management rights
- Treasurer: user managing payments, expenses, and reports

### 1.4 References
- Society bylaws and cooperative finance rules
- Shared understanding of maintenance accounting practices

## 2. Overall Description

### 2.1 Product Perspective
This product is a dedicated finance module for a residential cooperative society. It can be a standalone application, a web portal, or integrated with broader society management software.

### 2.2 Product Functions
- Member/unit registry management
- Maintenance billing and invoice generation
- Payment receipt recording and allocation
- Expense entry, approval, and payment tracking
- Budget vs. actual comparison and forecasting
- Dashboard and report generation

### 2.3 User Classes and Characteristics
- Admin / Society Secretary: configures units, charges, and system settings.
- Treasurer / Accountant: manages invoices, payments, expenses, and reports.
- Resident / Member: views dues, receipts, and notices (optional resident portal).
- Auditor / Board Member: reviews financial history and compliance records.

### 2.4 Operating Environment
The system may operate in a browser-based environment or desktop application. It should support secure login, data backup, and persistence on a database.

### 2.5 Design and Implementation Constraints
- Accurate financial calculations are mandatory.
- Role-based access control is required.
- Audit trail for every transaction must be maintained.

### 2.6 User Documentation
- User guide for Admin and Treasurer workflows.
- Quick reference for invoice creation and expense entry.
- Reporting usage instructions.

## 3. Specific Requirements

### 3.1 Unit / Member Management
#### 3.1.1 Requirement
The system shall maintain a register of units and members with contact and status details.
#### 3.1.2 Data Fields
- Unit number
- Owner name
- Occupant type (owner/tenant)
- Membership status
- Contact details
- Bank/payment preference
#### 3.1.3 Acceptance Criteria
- Admin can add, update, and remove unit/member records.
- The system displays current owner/occupant information for each unit.
- Member records can be searched by unit number and owner name.

### 3.2 Maintenance Income Management
#### 3.2.1 Requirement
The system shall define and collect maintenance charges with automated invoice generation.
#### 3.2.2 Features
- Support monthly, quarterly, and annual billing cycles.
- Calculate charges by flat type or area.
- Add supplementary levies such as water, electricity, sinking fund, and repair fund.
- Generate invoices automatically for each billing period.
- Post late fees or penalties for overdue amounts.
#### 3.2.3 Acceptance Criteria
- Invoices can be issued for selected units and billing periods.
- The system calculates total amount due correctly, including additional levies.
- Overdue invoices show penalty amounts when applicable.
- Residents can be assigned to different billing frequencies.

### 3.3 Payment Recording and Allocation
#### 3.3.1 Requirement
The system shall record incoming payments and allocate amounts to current charges, arrears, and penalties.
#### 3.3.2 Payment Attributes
- Payment date
- Amount
- Mode (cash, cheque, transfer, UPI)
- Reference number
- Allocation details
#### 3.3.3 Acceptance Criteria
- Treasurer can record payments with full payment metadata.
- The system updates member ledger balances immediately.
- Payments can be allocated to current dues, arrears, or special funds.
- A receipt can be generated for each payment entry.

### 3.4 Expense Tracking
#### 3.4.1 Requirement
The system shall track society expenses by category, vendor, and payment status.
#### 3.4.2 Expense Attributes
- Expense date
- Amount
- Category (repairs, salaries, utilities, tax, insurance, admin)
- Vendor/supplier details
- Payment status
- Approval status
- Supporting documents
#### 3.4.3 Acceptance Criteria
- Expenses can be created, edited, and marked as paid.
- Expense records include vendor details and category assignment.
- Approval workflow supports pending and approved states.
- Paid expenses reduce the society cash/fund balance.

### 3.5 Budgeting and Forecasting
#### 3.5.1 Requirement
The system shall support budgets and compare actual spending to budgeted amounts.
#### 3.5.2 Features
- Define annual budgets by expense category.
- Track actual expense totals against budget.
- Forecast remaining funds and cash flow needs.
#### 3.5.3 Acceptance Criteria
- Budget targets can be set and modified by Admin.
- Reports show variance between budgeted and actual expenses.
- Forecast projections update after each transaction.

### 3.6 Receivables and Payables
#### 3.6.1 Requirement
The system shall manage maintenance receivables and pending vendor payables.
#### 3.6.2 Features
- Track outstanding dues by unit/member.
- Show payable vendor amounts and due dates.
- Generate collection and payment due reports.
#### 3.6.3 Acceptance Criteria
- The system can list all outstanding receivables.
- Payable expenses are visible with due date alerts.
- Reports can be filtered by unit, category, and status.

### 3.7 Reporting and Dashboard
#### 3.7.1 Requirement
The system shall provide dashboards and standard financial reports.
#### 3.7.2 Reports
- Maintenance collection summary
- Expense by category
- Arrears statement
- Unit-wise outstanding report
- Cash flow / profit and loss
- Bank reconciliation
#### 3.7.3 Acceptance Criteria
- Dashboard displays totals for collections, arrears, and recent expenses.
- Reports can be generated for selected date ranges.
- Export options include PDF and Excel.

### 3.8 Notifications and Communication
#### 3.8.1 Requirement
The system shall notify members and administrators about dues, payments, and notices.
#### 3.8.2 Features
- Payment reminders for due/overdue maintenance.
- Receipts and acknowledgement notifications.
- Notices for new charges or society announcements.
#### 3.8.3 Acceptance Criteria
- Reminder notifications can be created and sent manually or automatically.
- Receipts are generated after payment records are saved.
- Notices can be logged and referenced in the system.

### 3.9 Audit and History
#### 3.9.1 Requirement
The system shall maintain an audit trail for significant financial actions.
#### 3.9.2 Audit Data
- Transaction creation
- Edits and updates
- Approvals and status changes
- Payment entries
- User identity and timestamp
#### 3.9.3 Acceptance Criteria
- All changes to invoices, payments, and expenses are recorded.
- Audit records can be reviewed by authorized users.
- The system logs user, action, date, and before/after values where applicable.

## 4. Non-Functional Requirements

### 4.1 Accuracy
- All financial calculations must be precise and consistent.
- The system must validate amounts, dates, and input ranges.

### 4.2 Security
- Role-based access control with separate permissions.
- Secure authentication and authorization.
- Confidentiality for member and financial data.

### 4.3 Reliability
- Data persistence must be durable and recoverable.
- The system must support backup and restore procedures.
- Transactions should be atomic to prevent inconsistent balances.

### 4.4 Performance
- Dashboard and reports should load within acceptable time frames.
- Search and filter operations should scale to hundreds of units and transactions.

### 4.5 Usability
- Forms and workflows should be simple and intuitive.
- Clear status indicators for dues, payments, and approvals.
- Search, filter, and sort capabilities for financial records.

### 4.6 Compliance
- Maintain records suitable for audits.
- Support statutory reporting requirements for cooperative societies.

## 5. Optional Enhancements
- Resident self-service portal for dues and receipts.
- Online payment gateway integration.
- Automated SMS/email reminders.
- Multi-society support under a single system.
- Multi-currency support if needed.

## 6. Minimum Data Elements
- Member: name, unit, contact, membership number, payment preferences
- Invoice: period, amount, due date, status, arrears
- Payment: date, amount, mode, reference, allocation
- Expense: category, vendor, amount, date, approval
- Fund: maintenance, reserve, sinking, contingency

## 7. Acceptance Criteria Summary
- Unit/member registry exists and is searchable.
- Invoices and maintenance charges can be generated accurately.
- Payments are recorded and properly allocated.
- Expenses are tracked, approved, and paid with vendor details.
- Reports and dashboards provide clear financial status.
- Audit trail captures changes and user actions.
- Role-based security protects financial data.
