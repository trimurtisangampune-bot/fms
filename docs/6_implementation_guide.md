# Unit/Member Management Module - Implementation Guide

## Table of Contents
1. [Backend Setup](#backend-setup)
2. [Frontend Setup](#frontend-setup)
3. [API Integration](#api-integration)
4. [Database Migration](#database-migration)
5. [Testing](#testing)
6. [Deployment](#deployment)

---

## Backend Setup

### 1. Django Project Structure

```
fms_backend/
├── manage.py
├── fms/                          # Main project settings
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── units/                         # Unit/Member Management App
│   ├── migrations/
│   │   └── 0001_initial.py
│   ├── __init__.py
│   ├── models.py                 # Data models
│   ├── serializers.py            # DRF serializers
│   ├── views.py                  # API views
│   ├── urls.py                   # URL routing
│   ├── services.py               # Business logic
│   ├── tests.py                  # Unit tests
│   └── admin.py                  # Django admin
└── requirements.txt
```

### 2. Install Dependencies

```bash
pip install Django==4.2.0
pip install djangorestframework==3.14.0
pip install django-filter==23.1
pip install django-cors-headers==4.0.0
pip install psycopg2-binary
pip install python-dateutil
pip install python-decouple
```

### 3. Django Settings Configuration

Add to `settings.py`:

```python
# INSTALLED_APPS
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'django_filters',
    'corsheaders',
    'units',  # Our app
]

# MIDDLEWARE
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fms_db',
        'USER': 'postgres',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
]

# JWT Configuration
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

### 4. Create and Migrate Database

```bash
# Create migrations
python manage.py makemigrations units

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 5. Update Main URLs

In `fms/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('units.urls')),
]
```

### 6. Register Models in Admin

In `units/admin.py`:

```python
from django.contrib import admin
from .models import Unit, Member, Occupant, AuditLog

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('unit_number', 'block', 'floor', 'unit_type', 'status', 'created_at')
    list_filter = ('status', 'unit_type', 'block')
    search_fields = ('unit_number', 'block')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('owner_name', 'unit', 'occupant_type', 'membership_status', 'is_primary')
    list_filter = ('membership_status', 'occupant_type', 'payment_preference')
    search_fields = ('owner_name', 'contact_email', 'contact_phone')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

@admin.register(Occupant)
class OccupantAdmin(admin.ModelAdmin):
    list_display = ('name', 'unit', 'occupant_type', 'is_primary')
    list_filter = ('occupant_type', 'is_primary')
    search_fields = ('name', 'unit__unit_number')

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('entity_type', 'entity_id', 'action', 'changed_by', 'changed_at')
    list_filter = ('entity_type', 'action', 'changed_at')
    search_fields = ('entity_name',)
    readonly_fields = ('changed_at',)
```

---

## Frontend Setup

### React Setup

```bash
# Create React app
npx create-react-app fms-frontend
cd fms-frontend

# Install dependencies
npm install axios react-router-dom

# Create environment file
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env.local
```

### Vue Setup

```bash
# Create Vue app
npm create vite@latest fms-frontend -- --template vue
cd fms-frontend

# Install dependencies
npm install
npm install axios

# Create environment file
echo "VITE_APP_API_URL=http://localhost:8000/api" > .env.local
```

### Component Integration

**React:**
```jsx
// App.jsx
import React from 'react';
import UnitList from './components/Units/UnitList';
import MemberList from './components/Members/MemberList';

function App() {
  return (
    <div className="app">
      <UnitList />
      <MemberList />
    </div>
  );
}

export default App;
```

**Vue:**
```vue
<!-- App.vue -->
<template>
  <div class="app">
    <UnitList />
    <MemberList />
  </div>
</template>

<script setup>
import UnitList from './components/Units/UnitList.vue';
import MemberList from './components/Members/MemberList.vue';
</script>
```

---

## API Integration

### Authentication

```javascript
// axios config
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
});

// Add token to headers
axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
```

### Error Handling

```javascript
// Centralized error handler
const handleApiError = (error) => {
  if (error.response?.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.response?.status === 403) {
    // Show permission error
    console.error('Permission denied');
  } else if (error.response?.status === 400) {
    // Show validation errors
    return error.response.data;
  }
  return null;
};
```

---

## Database Migration

### Create Indexed Views (PostgreSQL)

```sql
-- Receivables summary view
CREATE VIEW receivables_view AS
SELECT 
    m.id as member_id,
    m.owner_name,
    u.unit_number,
    SUM(i.total_amount) as total_invoiced,
    SUM(COALESCE(p.amount, 0)) as total_paid,
    SUM(i.total_amount) - SUM(COALESCE(p.amount, 0)) as outstanding
FROM members m
JOIN units u ON m.unit_id = u.id
LEFT JOIN invoices i ON m.id = i.member_id
LEFT JOIN payments p ON i.id = p.invoice_id
GROUP BY m.id, m.owner_name, u.unit_number;

-- Bank details completeness view
CREATE VIEW bank_details_completeness AS
SELECT 
    COUNT(*) as total_members,
    COUNT(CASE WHEN m.bank_account != '{}'::jsonb THEN 1 END) as with_bank_details,
    COUNT(CASE WHEN m.bank_account = '{}'::jsonb THEN 1 END) as without_bank_details,
    ROUND(
        COUNT(CASE WHEN m.bank_account != '{}'::jsonb THEN 1 END) * 100.0 / 
        COUNT(*), 
        2
    ) as percentage_complete
FROM members m
WHERE m.membership_status = 'Active';
```

---

## Testing

### Unit Tests Example

```python
# units/tests.py
from django.test import TestCase, Client
from django.contrib.auth.models import User
from .models import Unit, Member

class UnitModelTests(TestCase):
    def setUp(self):
        self.unit = Unit.objects.create(
            unit_number='A-101',
            block='Block A',
            floor=1,
            area_sqft='1200.00',
            unit_type='Flat'
        )

    def test_unit_creation(self):
        self.assertEqual(self.unit.unit_number, 'A-101')
        self.assertEqual(self.unit.status, 'Active')

    def test_unit_string_representation(self):
        self.assertEqual(str(self.unit), 'A-101 - Block A')

class UnitAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass'
        )
        self.client.login(username='testuser', password='testpass')

    def test_list_units(self):
        Unit.objects.create(
            unit_number='A-101',
            block='Block A',
            floor=1,
            area_sqft='1200.00'
        )
        response = self.client.get('/api/units/')
        self.assertEqual(response.status_code, 200)
```

### Run Tests

```bash
python manage.py test units
python manage.py test units.tests.UnitModelTests
python manage.py test units.tests.UnitAPITests
```

---

## Deployment

### New Production Assets Added

- `backend/requirements.txt` for deterministic backend dependency installation.
- `backend/.env.example` with all required production environment variables.
- `frontend/.env.production.example` for frontend API endpoint configuration.
- `.github/workflows/ci-cd.yml` with CI/CD stages.
- `backend/Procfile` for process-based deployments.

### CI/CD Pipeline Stages

The workflow (`.github/workflows/ci-cd.yml`) is split into these stages:

1. **Backend Quality**
   - Install Python dependencies
   - Run `python manage.py check --deploy`
   - Run `python manage.py makemigrations --check --dry-run`

2. **Backend Tests**
   - Run `python manage.py test`

3. **Frontend Build**
   - Install Node dependencies with `npm ci`
   - Build production assets with `npm run build`
   - Upload build artifact for downstream deployment use

4. **Deploy Production**
   - Runs only for push to `main`
  - Deploys through SSH using Docker Compose on the target host
  - Pulls backend/frontend images from GHCR and performs rolling restart
  - Runs post-deploy API health check before marking deployment successful

### Code and Image Version Traceability

The pipeline maintains strict traceability between source code and deployed images:

1. **Repository of Record**
  - Source code is maintained in `trimurtisangampune-bot/fms`.

2. **Immutable Image Tags**
  - CI publishes images to GHCR with commit SHA tags:
    - `ghcr.io/trimurtisangampune-bot/fms/backend:<github.sha>`
    - `ghcr.io/trimurtisangampune-bot/fms/frontend:<github.sha>`
  - `latest` is also published for convenience, but deploy uses SHA tags for correctness.

3. **Deterministic Deployments**
  - Deploy job uses the same `github.sha` from the workflow run.
  - This guarantees deployed containers map exactly to one Git commit.

4. **Rollback Strategy**
  - To roll back, redeploy a previously known-good SHA tag from GHCR.
  - This avoids ambiguity that can occur when relying only on mutable `latest` tags.

### Production Deployment Best Practices

1. **Configuration and Secrets**
   - Keep all credentials in environment variables or secret managers, never in source code.
   - Generate a strong `SECRET_KEY` and rotate it through controlled releases.
   - Configure `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` to exact domains.

2. **Security**
   - Run with `DEBUG=False` in production.
   - Enforce HTTPS and HSTS (`SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`).
   - Keep session and CSRF cookies secure.

3. **Data and Backups**
   - Use PostgreSQL in production, not SQLite.
   - Schedule automated encrypted backups with periodic restore testing.
   - Apply migrations through CI/CD before serving new application code.

4. **Release Safety**
   - Keep deployment atomic (build artifact first, then deploy).
   - Use staging environment parity with production for smoke checks.
   - Gate deploy stage on passing test/build jobs only.

5. **Observability and Operations**
   - Centralize application logs and set alerts for 5xx rates and latency.
   - Add health checks and readiness endpoints to deployment platform.
   - Monitor database connections, slow queries, and queue growth.

### Suggested Deployment Sequence

1. Provision infrastructure (DB, app host, TLS cert, DNS).
2. Configure production environment variables from `backend/.env.example`.
3. Run CI on pull requests to verify quality and tests.
4. Merge to `main` to trigger build and deployment workflow.
5. Run post-deploy smoke tests (login, unit list, member list, invoice generation).

### Optional Docker Setup

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

CMD ["gunicorn", "fms.wsgi:application", "--bind", "0.0.0.0:8000"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: fms_db
      POSTGRES_USER: fms_user
      POSTGRES_PASSWORD: change_me
    volumes:
      - postgres_data:/var/lib/postgresql/data

  web:
    build: .
    command: gunicorn fms.wsgi:application --bind 0.0.0.0:8000
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://fms_user:change_me@db:5432/fms_db
      DEBUG: "False"
      SECRET_KEY: change-this-in-production
      ALLOWED_HOSTS: localhost
    depends_on:
      - db

volumes:
  postgres_data:
```

---

## API Documentation

### Generate API Documentation (Swagger)

```bash
pip install drf-spectacular==0.26.1

# Add to INSTALLED_APPS
INSTALLED_APPS = [
    ...
    'drf_spectacular',
]

# Add to urls.py
from drf_spectacular.views import SpectacularView, SpectacularSwaggerView

urlpatterns = [
    path('api/schema/', SpectacularView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema')),
]

# Run server and visit http://localhost:8000/api/docs/
```

---

## Troubleshooting

### Common Issues

1. **CORS Error**
   ```python
   # Add your frontend URL to CORS_ALLOWED_ORIGINS
   CORS_ALLOWED_ORIGINS = [
       'http://localhost:3000',
   ]
   ```

2. **Authentication Failed**
   - Ensure token is included in Authorization header
   - Check token expiration
   - Verify token format: `Bearer <token>`

3. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials in settings
   - Run migrations

4. **Module Not Found**
   - Install all requirements: `pip install -r requirements.txt`
   - Add app to INSTALLED_APPS
   - Restart Django server

---

## Performance Optimization

### Database Indexing
- Indexes are created automatically via Meta class in models
- Monitor slow queries with Django Debug Toolbar

### Caching
```python
from django.views.decorators.cache import cache_page

@cache_page(60 * 5)  # Cache for 5 minutes
def unit_summary(request):
    return Response(UnitService.get_unit_summary())
```

### Query Optimization
- Use `select_related()` for foreign keys
- Use `prefetch_related()` for reverse relations
- Use pagination for large datasets

---
