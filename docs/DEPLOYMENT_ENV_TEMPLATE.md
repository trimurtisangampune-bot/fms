# FMS Production Deployment - Environment Configuration

## Overview
This guide provides a production-ready `.env` file template for deploying FMS on a separate system. Copy the content below to `.env` in your deployment directory (alongside `docker-compose.yml`).

## Generate SECRET_KEY (Python)
Before using the template below, generate a strong `SECRET_KEY`:

```bash
# On Ubuntu/Linux with Python 3:
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Expected output: A 50-character string like `abc123xyz...`

---

## Production `.env` Template

```bash
# ===== DJANGO CONFIGURATION =====
# Set to False for production (no debug output)
DEBUG=False

# Replace with output from command above. REQUIRED for production.
# Min 50 chars, no special prefixes. Example: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV
SECRET_KEY=<GENERATE_NEW_SECRET_KEY_WITH_COMMAND_ABOVE>

# Space-separated list of domains/IPs. Example: fms.example.com,192.168.1.100
ALLOWED_HOSTS=fms.example.com

# UTC timezone (recommended for production)
TIME_ZONE=UTC

# ===== POSTGRESQL DATABASE =====
# Database name (alphanumeric + underscore only)
DB_NAME=fms_db

# Database user (alphanumeric + underscore only)
DB_USER=fms_user

# STRONG random password. Recommended: 16+ chars, mix upper/lower/numbers/symbols
# Generate: openssl rand -base64 16
DB_PASSWORD=<GENERATE_STRONG_PASSWORD>

# For docker-compose internal db container, SSL is typically not enabled.
# Set True only when using external managed Postgres that requires SSL.
DB_SSL_REQUIRE=False

# ===== SECURITY & HTTPS =====
# CORS allowed origins (frontend URL). Use https:// for production.
# Example: https://fms.example.com
CORS_ALLOWED_ORIGINS=https://fms.example.com

# CSRF trusted origins (same as CORS for most deployments)
CSRF_TRUSTED_ORIGINS=https://fms.example.com

# Redirect all HTTP to HTTPS (production only)
SECURE_SSL_REDIRECT=True

# HSTS max-age in seconds. 31536000 = 1 year. Recommended for production.
SECURE_HSTS_SECONDS=31536000

# ===== EMAIL CONFIGURATION (Optional) =====
# Django email backend (default: console output)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend

# SMTP server hostname (e.g., smtp.gmail.com, mail.your-domain.com)
EMAIL_HOST=smtp.example.com

# SMTP port (587 for TLS, 465 for SSL)
EMAIL_PORT=587

# SMTP login username
EMAIL_HOST_USER=your-email@example.com

# SMTP login password or app-specific password
EMAIL_HOST_PASSWORD=your-app-password

# Use TLS for SMTP (typically True for port 587)
EMAIL_USE_TLS=True

# Default sender email address
DEFAULT_FROM_EMAIL=no-reply@fms.example.com

# ===== SMS/WHATSAPP CONFIGURATION (Optional) =====
# Twilio Account SID (from https://www.twilio.com/console)
TWILIO_ACCOUNT_SID=

# Twilio Auth Token (from https://www.twilio.com/console)
TWILIO_AUTH_TOKEN=

# Twilio SMS phone number (format: +1234567890)
TWILIO_SMS_FROM=

# Twilio WhatsApp number (format: whatsapp:+1234567890)
TWILIO_WHATSAPP_FROM=

# ===== DOCKER CONFIGURATION =====
# Backend image tag. Use commit SHA for immutable deployments.
# Examples:
#   - ghcr.io/trimurtisangampune-bot/fms/backend:abc123def456... (specific commit)
#   - ghcr.io/trimurtisangampune-bot/fms/backend:latest (rolling, not recommended for prod)
DB_IMAGE=ghcr.io/trimurtisangampune-bot/fms/db:abc123def456
BACKEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/backend:abc123def456

# Frontend image tag (should match backend commit for consistency)
FRONTEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/frontend:abc123def456

# Optional gunicorn runtime tuning
GUNICORN_WORKERS=2
GUNICORN_THREADS=2

# Backend service port (host binding)
BACKEND_PORT=8000

# Frontend service port (typically 80 for HTTP or 443 for HTTPS reverse proxy)
FRONTEND_PORT=80

# ===== FRONTEND API URL =====
# URL that frontend uses to reach backend API (from browser perspective)
# Example: https://fms.example.com/api
REACT_APP_API_URL=https://fms.example.com/api
```

---

## Step-by-Step Setup Instructions

### 1. Create the `.env` file on target system:
```bash
mkdir -p /opt/fms
cd /opt/fms
# Edit .env with values above (use nano, vi, or your preferred editor)
nano .env
```

### 2. Fill in required values:
- `SECRET_KEY` → Run the Python command above
- `DB_PASSWORD` → Generate strong password: `openssl rand -base64 16`
- `ALLOWED_HOSTS` → Your actual domain (e.g., `fms.company.com`)
- `CORS_ALLOWED_ORIGINS` → Frontend URL (e.g., `https://fms.company.com`)
- `BACKEND_IMAGE` & `FRONTEND_IMAGE` → Use commit SHA tags (see Deployment Guide for examples)

### 3. Verify the `.env` file:
```bash
# Check syntax (should show no errors)
cat .env | grep -E "^[A-Z_]+=.+" | wc -l
# Output: should show count of env vars (typically 35+)
```

---

## Example Fully Populated `.env`

```bash
DEBUG=False
SECRET_KEY=5pJ9xK2mL1qR8sT3uV4wX5yZ6aB7cD8eF9gH0iJ1kL2mN3
ALLOWED_HOSTS=fms.mycompany.com,192.168.1.50

DB_NAME=fms_db
DB_USER=fms_user
DB_PASSWORD=9mK5pL8qR2sT6uV3wX7yZ1aB4cD9eF5gH8iJ2kL6mN0
DB_SSL_REQUIRE=True

CORS_ALLOWED_ORIGINS=https://fms.mycompany.com
CSRF_TRUSTED_ORIGINS=https://fms.mycompany.com
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
TIME_ZONE=UTC

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=fms-alerts@mycompany.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=noreply@fms.mycompany.com

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=
TWILIO_WHATSAPP_FROM=

REACT_APP_API_URL=https://fms.mycompany.com/api
DB_IMAGE=ghcr.io/trimurtisangampune-bot/fms/db:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
BACKEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/backend:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
FRONTEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/frontend:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
GUNICORN_WORKERS=2
GUNICORN_THREADS=2
BACKEND_PORT=8000
FRONTEND_PORT=80
```

---

## Security Notes

1. **SECRET_KEY**: Never commit to version control. Regenerate for each new production deployment.
2. **DB_PASSWORD**: Use strong, randomly generated passwords. Never share via email or messaging.
3. **ALLOWED_HOSTS**: Specify exact domains/IPs. Wildcards (`*`) reduce security.
4. **SECURE_SSL_REDIRECT**: Only set to `True` if you have a valid SSL certificate (required by modern browsers).
5. **IMAGE TAGS**: Use immutable commit SHA tags for DB, backend, and frontend images for production rollback capability.

---

## Minimal Example (for testing/staging)

```bash
DEBUG=True
SECRET_KEY=dev-key-do-not-use-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,staging.example.com

DB_NAME=fms_db
DB_USER=fms_user
DB_PASSWORD=staging_password_123
DB_SSL_REQUIRE=False

CORS_ALLOWED_ORIGINS=http://localhost:3000,https://staging.example.com
CSRF_TRUSTED_ORIGINS=http://localhost:3000,https://staging.example.com
SECURE_SSL_REDIRECT=False
SECURE_HSTS_SECONDS=0
TIME_ZONE=UTC

EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=
TWILIO_WHATSAPP_FROM=

REACT_APP_API_URL=http://localhost:8000/api
DB_IMAGE=ghcr.io/trimurtisangampune-bot/fms/db:latest
BACKEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/backend:latest
FRONTEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/frontend:latest
BACKEND_PORT=8000
FRONTEND_PORT=3000
```

---

## Next Steps

1. Fill in `.env` with your production values
2. Follow [Linux Deployment Commands](DEPLOYMENT_LINUX_COMMANDS.md)
3. Reference [GitHub PAT Permissions](DEPLOYMENT_GITHUB_PAT.md) for GHCR image access
