# FMS Production Deployment - Linux Commands

## Overview
This guide provides step-by-step commands to deploy FMS on a **Ubuntu/Debian Linux** system using Docker and Docker Compose.

**Prerequisites:**
- Ubuntu 20.04 LTS or newer
- Root or sudo access
- Public internet connection
- Pre-configured `.env` file (see [DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md))
- GitHub PAT for GHCR login (see [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md))

---

## Step 1: System Preparation

### Update package manager:
```bash
sudo apt update
sudo apt upgrade -y
```

### Install Docker and Docker Compose:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (optional, allows docker without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker installation
docker --version
# Expected: Docker version 20.10+ or newer

# Install Docker Compose (via docker plugin)
docker version
# Verify "Docker Compose version" appears in output
```

### Verify installation:
```bash
docker --version
docker compose version
# Should show versions without errors
```

---

## Step 2: Configure GitHub Container Registry (GHCR) Access

### Create a GitHub Personal Access Token (PAT):
See [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md) for detailed instructions.

### Login to GHCR:
```bash
# Set your GitHub username and PAT
export GITHUB_USER="your-github-username"
export GITHUB_PAT="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Login to GHCR
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

# Verify login
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:latest

# Expected output: Image pulled successfully
# If fails: Check PAT permissions and token expiration
```

### Make login persistent (optional):
```bash
# Docker credentials are stored in ~/.docker/config.json
# They persist across sessions automatically
cat ~/.docker/config.json
```

---

## Step 3: Set Up FMS Deployment Directory

### Create working directory:
```bash
# Choose deployment path (example: /opt/fms)
sudo mkdir -p /opt/fms
sudo chown $USER:$USER /opt/fms
cd /opt/fms
```

### Download docker-compose.yml:
```bash
# Option A: Clone from GitHub (requires git)
git clone https://github.com/trimurtisangampune-bot/fms.git .
cd fms

# Option B: Download via curl (just docker-compose.yml)
cd /opt/fms
curl -o docker-compose.yml \
  https://raw.githubusercontent.com/trimurtisangampune-bot/fms/main/docker-compose.yml

# Verify file downloaded
ls -la docker-compose.yml
```

### Create and populate `.env` file:
```bash
# Copy template
cat > .env << 'EOF'
DEBUG=False
SECRET_KEY=<YOUR_SECRET_KEY>
ALLOWED_HOSTS=fms.example.com

DB_NAME=fms_db
DB_USER=fms_user
DB_PASSWORD=<YOUR_DB_PASSWORD>
DB_SSL_REQUIRE=True

CORS_ALLOWED_ORIGINS=https://fms.example.com
CSRF_TRUSTED_ORIGINS=https://fms.example.com
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
TIME_ZONE=UTC

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=no-reply@example.com

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_FROM=
TWILIO_WHATSAPP_FROM=

REACT_APP_API_URL=https://fms.example.com/api
BACKEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/backend:abc123def456
FRONTEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/frontend:abc123def456
BACKEND_PORT=8000
FRONTEND_PORT=80
EOF

# Edit .env with actual values
nano .env  # or vi, vim, code, etc.

# Verify .env exists and is readable
ls -la .env
cat .env | head -20
```

---

## Step 4: Pull Docker Images

### Pull images from GHCR:
```bash
# Pull backend image (replace commit SHA with your target tag)
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:abc123def456

# Pull frontend image (use same SHA for consistency)
docker pull ghcr.io/trimurtisangampune-bot/fms/frontend:abc123def456

# Verify images are available
docker images | grep trimurtisangampune-bot/fms
```

### Alternative: Use `latest` tag (NOT RECOMMENDED for production):
```bash
# Not recommended—latest can change. Use commit SHAs instead.
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:latest
docker pull ghcr.io/trimurtisangampune-bot/fms/frontend:latest
```

---

## Step 5: Start FMS Services

### Validate docker-compose.yml:
```bash
cd /opt/fms
docker compose config --quiet
# Expected: No output means valid. Any error messages = fix before proceeding.
```

### Start all services (database, backend, frontend):
```bash
cd /opt/fms

# Start in detached mode (runs in background)
docker compose up -d

# Watch startup (output last 50 lines)
docker compose logs -f --tail=50

# Press Ctrl+C to exit logs (services keep running)
```

### Check service status:
```bash
docker compose ps
# Expected output:
# NAME             STATUS         PORTS
# fms-db-1         Up (healthy)   5432/tcp
# fms-backend-1    Up             0.0.0.0:8000->8000/tcp
# fms-frontend-1   Up             0.0.0.0:80->80/tcp
```

---

## Step 6: Verify Deployment

### Quick health check:
```bash
# Check backend API (should return 401 or 400, not connection errors)
curl -i http://localhost:8000/api/token/
# Expected: HTTP 400 (missing credentials)

# Check frontend (should return HTML, not 502/503)
curl -i http://localhost:80/
# Expected: HTTP 200 OK

# Check database logs for errors
docker compose logs db | tail -10
```

### Full validation script:
```bash
#!/bin/bash
cd /opt/fms

echo "=== Checking service status ==="
docker compose ps

echo -e "\n=== Testing backend API ==="
curl -s -i http://localhost:8000/api/token/ | head -1

echo -e "\n=== Testing frontend ==="
curl -s -i http://localhost:80/ | head -1

echo -e "\n=== Checking logs for errors ==="
docker compose logs --tail=20 | grep -i "error\|exception" || echo "No errors found"

echo -e "\n=== Backend container details ==="
docker compose logs backend | tail -5
```

### Expected health check output:
```
=== Checking service status ===
NAME             STATUS         PORTS
fms-db-1         Up (healthy)   5432/tcp
fms-backend-1    Up             0.0.0.0:8000->8000/tcp
fms-frontend-1   Up             0.0.0.0:80->80/tcp

=== Testing backend API ===
HTTP/1.1 400 Bad Request

=== Testing frontend ===
HTTP/1.1 200 OK

=== Checking logs for errors ===
No errors found

=== Backend container details ===
[INFO] WSGI app loaded successfully
```

---

## Step 7: Configure Reverse Proxy (Optional but Recommended)

For production with SSL/TLS, use nginx or Apache as a reverse proxy.

### Install and configure nginx:
```bash
sudo apt install -y nginx

# Create nginx config for FMS
sudo tee /etc/nginx/sites-available/fms > /dev/null << 'EOF'
server {
    listen 80;
    server_name fms.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fms.example.com;

    # SSL certificates (use Let's Encrypt or your CA)
    ssl_certificate /etc/letsencrypt/live/fms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fms.example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/fms /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t
# Expected: "nginx: configuration file test is successful"

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify nginx
sudo systemctl status nginx
```

### Obtain SSL certificate (Let's Encrypt via Certbot):
```bash
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (automatically updates nginx config)
sudo certbot --nginx -d fms.example.com

# Follow prompts to set up HTTPS

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Step 8: Managing FMS Services

### View logs:
```bash
cd /opt/fms

# All services
docker compose logs

# Specific service
docker compose logs backend
docker compose logs frontend
docker compose logs db

# Follow logs in real-time
docker compose logs -f backend

# Last 100 lines with timestamps
docker compose logs --timestamps --tail=100
```

### Restart services:
```bash
cd /opt/fms

# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend

# Graceful restart (stop + start)
docker compose down
docker compose up -d
```

### Stop services:
```bash
cd /opt/fms

# Stop (services can be restarted)
docker compose stop

# Stop specific service
docker compose stop backend

# Stop and remove containers (data persists in volumes)
docker compose down

# Full cleanup (removes containers, networks, images NOT volumes)
docker compose down --rmi local
```

### Backup database:
```bash
cd /opt/fms

# Export PostgreSQL dump
docker compose exec db pg_dump \
  -U fms_user fms_db \
  > backup-$(date +%Y%m%d-%H%M%S).sql

# List backups
ls -lh backup-*.sql
```

### Restore database:
```bash
cd /opt/fms

# Stop services first
docker compose stop

# Restore from backup
docker compose up -d db
sleep 5  # Wait for DB to be ready

docker compose exec -T db psql \
  -U fms_user fms_db \
  < backup-20260401-120000.sql

# Restart services
docker compose restart backend frontend
```

---

## Step 9: Update to New Version

### Pull updated images:
```bash
cd /opt/fms

# Get latest commit SHA from GitHub (or use specific tag)
# Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Update .env with new image SHAs
nano .env
# Change BACKEND_IMAGE and FRONTEND_IMAGE to new commit SHA

# Pull new images
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
docker pull ghcr.io/trimurtisangampune-bot/fms/frontend:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Perform rolling update:
```bash
cd /opt/fms

# Graceful update (migrations run automatically)
docker compose up -d

# Verify new versions running
docker compose ps
docker compose logs backend | tail -5
```

### Rollback to previous version:
```bash
cd /opt/fms

# Update .env back to previous commit SHA
nano .env
# Change BACKEND_IMAGE and FRONTEND_IMAGE to previous SHA

# Restart with old images
docker compose down
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:previous_sha
docker pull ghcr.io/trimurtisangampune-bot/fms/frontend:previous_sha
docker compose up -d
```

---

## Troubleshooting

### Backend won't start (connection refused):
```bash
# Check database is ready
docker compose logs db | tail -5

# Wait for DB health check
docker compose ps

# Check backend logs for errors
docker compose logs backend | tail -20

# If DB crashed, restart it
docker compose restart db
```

### Frontend returning 502/503:
```bash
# Check backend is running
docker compose ps

# Check backend logs
docker compose logs backend

# Restart frontend after backend is healthy
docker compose restart frontend
```

### GHCR login failing:
```bash
# Verify PAT is still valid (check GitHub settings)
# Regenerate if expired

# Re-login
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

# Try pull again
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:latest
```

### Database disk full:
```bash
# Check volume usage
docker volume ls
docker volume inspect fms_postgres_data

# Backup and clean old data
docker compose exec db pg_dump -U fms_user fms_db > backup.sql
# Manual cleanup via database admin commands
```

### Ports already in use:
```bash
# Check what's using port 8000
sudo lsof -i :8000
# Kill process or change BACKEND_PORT in .env

# Check what's using port 80
sudo lsof -i :80
# Usually nginx or Apache—stop and restart
```

---

## References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [nginx Documentation](https://nginx.org/en/docs/)
- [GitHub Container Registry (GHCR) Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## Next Steps

1. Verify [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md) for PAT setup
2. Populate `.env` file from [DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md)
3. Run commands from this guide
4. Bookmark troubleshooting section for operational reference
