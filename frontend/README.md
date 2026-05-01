# Society FMS - Society Finance Managment System Frontend

This is the React frontend for Society FMS - Society Finance Managment System.

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (irreversible)

## Authentication

The application uses JWT (JSON Web Token) authentication with the Django backend.

### Login Process

1. Navigate to `/login` or get redirected there if not authenticated
2. Enter your Django username and password
3. Upon successful login, you'll be redirected to the dashboard
4. The JWT token is stored in localStorage and automatically included in API requests

### Token Management

- **Access Token**: Stored in `localStorage` as `access_token`
- **Refresh Token**: Stored in `localStorage` as `refresh_token`
- **Auto-refresh**: When an access token expires, it's automatically refreshed using the refresh token
- **Logout**: Clears tokens and redirects to login page

### Protected Routes

All routes except `/login` are protected. Unauthenticated users are automatically redirected to the login page.

## Project Structure

```
src/
├── components/
│   ├── Auth/
│   │   ├── LoginForm.jsx      # Login form component
│   │   ├── ProtectedRoute.jsx # Route protection wrapper
│   │   ├── Auth.css          # Authentication styles
│   │   └── index.js          # Auth component exports
│   ├── Navbar.js             # Navigation component
│   ├── Navbar.css            # Navigation styles
│   ├── Units/
│   │   ├── UnitList.jsx      # Unit listing component
│   │   ├── UnitDetail.jsx    # Unit detail view
│   │   ├── UnitForm.jsx      # Unit create/edit form
│   │   └── UnitManagement.css
│   └── Members/
│       ├── MemberList.jsx    # Member listing component
│       ├── MemberDetail.jsx  # Member detail view
│       ├── MemberForm.jsx    # Member create/edit form
│       └── MemberList.css
├── services/
│   └── api.js                # API service with authentication
├── App.js                    # Main application component
├── App.css                   # Application styles
├── index.js                  # Application entry point
└── index.css                 # Global styles
```

## API Configuration

The application connects to the Django backend API. Configure the API URL in the `.env` file:

```
REACT_APP_API_URL=http://localhost:8000/api
```

## Features

- **Authentication**: JWT-based login/logout with automatic token refresh
- **Unit Management**: View, search, filter, create, edit, and delete residential units
- **Member Management**: View, search, filter, create, edit, and delete unit members/owners
- **User Management**: Admin-only user and role administration with create/edit/delete capability
- **Responsive Design**: Works on desktop and mobile devices
- **Protected Routes**: Automatic redirection for unauthenticated users

## User Management Guide

### Who can use it

- Only users with the `Admin` role can access the `Users` page.
- Admin users see the `Users` link in the navigation bar and the `Manage Users` button on the dashboard.
- Non-admin users will not see the `Users` tab and cannot navigate to `/users`.

### How to manage users

1. Sign in with an Admin account.
2. Open the `Users` page from the navigation bar or the dashboard.
3. Use the `+ Add New User` button to create a user.
4. Use the `Edit` button to update an existing user.
5. Use the `Delete` button to remove a user after confirming the prompt.

### User form fields

- `Username`: Required login name for the user.
- `Password`: Required only when creating a new user. Leave blank when editing if you do not want to change the user's password.
- `First Name` / `Last Name`: Personal name fields.
- `Email`: Contact email address.
- `Role`: Select one of `Admin`, `Treasurer`, `Auditor`, `Board Member`, or `Member`.
- `Portal Access`: Enable or disable portal access for the account.
- `Linked Member`: Optional member ID to connect the user account to a member record.

### Role feedback in the UI

- The current signed-in user’s name and role are shown on the navbar.
- The dashboard displays the current role and provides links appropriate to the signed-in user.
- If you do not see the `Users` tab, your account is not an Admin role.

## Backend Requirements

The frontend expects the following Django REST Framework endpoints:

### Authentication
- `POST /api/auth/token/` - Obtain JWT token pair
- `POST /api/auth/token/refresh/` - Refresh access token

### Units
- `GET /api/units/` - List units with filtering/searching
- `POST /api/units/` - Create unit
- `GET /api/units/{id}/` - Get unit details
- `PUT /api/units/{id}/` - Update unit
- `DELETE /api/units/{id}/` - Delete unit
- `POST /api/units/bulk-import/` - Bulk import units

### Members
- `GET /api/members/` - List members with filtering/searching
- `POST /api/members/` - Create member
- `GET /api/members/{id}/` - Get member details
- `PUT /api/members/{id}/` - Update member
- `DELETE /api/members/{id}/` - Delete member
- `GET /api/members/{id}/ledger/` - Get member financial ledger
- `GET /api/members/{id}/history/` - Get member change history
- `POST /api/members/bulk-import/` - Bulk import members