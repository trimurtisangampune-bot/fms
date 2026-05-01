# FMS Production Deployment - Windows Docker Setup

## Overview

This guide covers deploying FMS on **Windows 10/11** (Home, Pro, Enterprise) or **Windows Server 2019+** using Docker Desktop and Docker Compose.

**Prerequisites:**
- Windows 10 Pro/Enterprise (or Windows 11, or Windows Server 2019+)
- Internet connection
- Administrator access (for Docker Desktop installation)
- Pre-configured `.env` file (see [DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md))
- GitHub PAT for GHCR login (see [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md))

**Key Differences from Linux:**
- Docker runs via **Docker Desktop** (GUI application)
- Uses **WSL 2** (Windows Subsystem for Linux 2) as backend on Windows 10/11
- Commands run in **PowerShell** (Windows Terminal recommended)
- Same images, same docker-compose.yml, slightly different commands

---

## Step 1: System Requirements & Setup

### Check Windows Version:
```powershell
# Open PowerShell as Administrator
$os = [System.Environment]::OSVersion
$os.VersionString

# Windows 10/11 example: Microsoft Windows NT 10.0.19045.0
# Windows Server example: Microsoft Windows NT 10.0.20348.0
```

### Enable WSL 2 (Windows 10/11 only):

**Windows 10:**
```powershell
# Run as Administrator in PowerShell

# Enable WSL feature
wsl --install

# Restart your computer when prompted

# Verify WSL 2 installed
wsl --list --verbose
```

**Windows 11:**
```powershell
# WSL 2 is installed by default. Verify:
wsl --list --verbose
```

**Windows Server:**
```powershell
# Use Hyper-V instead. Enable via:
Enable-WindowsOptionalFeature -Online -FeatureName Hyper-V -All

# Restart required
```

### Verify WSL 2 Set as Default:
```powershell
wsl --set-default-version 2

# Expected output: "WSL 2 has been set as your default version of WSL"
```

---

## Step 2: Install Docker Desktop for Windows

### Download Docker Desktop:
1. Go to https://www.docker.com/products/docker-desktop
2. Click **Download for Windows**
3. Save the installer (.msi file)

### Install Docker Desktop:
```powershell
# Run installer (or double-click the .msi file)
# Follow on-screen prompts

# Restart computer when prompted

# Note: Installation may take 5-10 minutes
```

### Verify Installation:
```powershell
# Open PowerShell (regular user, no admin required)

docker --version
# Expected: Docker version 24.0+ or newer

docker compose version
# Expected: Docker Compose version 2.0+ or newer

docker run hello-world
# Should print "Hello from Docker!"
```

### If Docker fails to start:
```powershell
# Check Docker service status
Get-Service -Name "com.docker.service"

# If not running, start it
Start-Service -Name "com.docker.service"

# Or restart Docker Desktop from system tray
```

---

## Step 3: Configure GitHub Container Registry (GHCR) Access

### Create GitHub Personal Access Token:
See [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md) for detailed instructions.

### Login to GHCR in PowerShell:
```powershell
# Set your credentials (replace with your actual values)
$GITHUB_USER = "your-github-username"
$GITHUB_PAT = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Login to GHCR
$GITHUB_PAT | docker login ghcr.io -u $GITHUB_USER --password-stdin

# Expected output: "Login Succeeded"
```

### Make Login Persistent:
```powershell
# Credentials stored in: %USERPROFILE%\.docker\config.json
# They persist automatically across PowerShell sessions

# Verify credentials stored
cat $env:USERPROFILE\.docker\config.json | findstr ghcr
```

### Test GHCR Access:
```powershell
# Check whether latest tag exists
docker manifest inspect ghcr.io/trimurtisangampune-bot/fms/backend:latest

# If latest is missing, use commit-SHA tag from the latest successful Actions run
# Example:
# docker pull ghcr.io/trimurtisangampune-bot/fms/backend:<full-40-char-sha>
# docker pull ghcr.io/trimurtisangampune-bot/fms/frontend:<full-40-char-sha>
```

---

## Step 4: Set Up FMS Deployment Directory

### Create Working Directory:
```powershell
# Choose deployment path (example: C:\fms)
mkdir C:\fms
cd C:\fms
```

### Download docker-compose.yml:
```powershell
# Option A: Using curl (built-in on Windows 10+)
curl -o docker-compose.yml `
  https://raw.githubusercontent.com/trimurtisangampune-bot/fms/main/docker-compose.yml

# Verify file downloaded
ls docker-compose.yml

# Option B: Manual download
# 1. Visit: https://raw.githubusercontent.com/trimurtisangampune-bot/fms/main/docker-compose.yml
# 2. Save as docker-compose.yml in C:\fms
```

### Create and Populate `.env` File:
```powershell
# Create .env file
@"
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
DB_IMAGE=ghcr.io/trimurtisangampune-bot/fms/db:abc123def456
BACKEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/backend:abc123def456
FRONTEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/frontend:abc123def456
GUNICORN_WORKERS=2
GUNICORN_THREADS=2
BACKEND_PORT=8000
FRONTEND_PORT=80
"@ | Out-File -FilePath .env -Encoding UTF8

# Edit .env with actual values (use Notepad or VS Code)
notepad .env

# Verify .env exists
ls .env
type .env | head -20
```

---

## Step 5: Pull Docker Images from GHCR

### Pull Images:
```powershell
cd C:\fms

# Pull database image (use same SHA for consistency)
docker pull ghcr.io/trimurtisangampune-bot/fms/db:abc123def456

# Pull backend image (replace commit SHA with your target tag)
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:abc123def456

# Pull frontend image (use same SHA for consistency)
docker pull ghcr.io/trimurtisangampune-bot/fms/frontend:abc123def456

# Verify images available
docker images | findstr "trimurtisangampune-bot/fms"
```

### Image Size Reference:
```powershell
# Each image is typically 200-400 MB
# Download time: 2-5 minutes on 10 Mbps connection

# Check local image size
docker images ghcr.io/trimurtisangampune-bot/fms/backend --format "table {{.Repository}} {{.Size}}"
```

---

## Step 6: Start FMS Services

### Validate Configuration:
```powershell
cd C:\fms

# Validate docker-compose.yml syntax
docker compose config | Out-Null

# Expected: No error output means valid config
```

### Start Services:
```powershell
cd C:\fms

# Start all services in background
docker compose up -d

# Watch startup logs (press Ctrl+C to exit, services keep running)
docker compose logs -f --tail=50

# Exit logs without stopping services
# Press Ctrl+C
```

### Check Service Status:
```powershell
docker compose ps

# Expected output:
# NAME               STATUS            PORTS
# fms-db-1           Up (healthy)      5432/tcp
# fms-backend-1      Up                0.0.0.0:8000->8000/tcp
# fms-frontend-1     Up                0.0.0.0:80->80/tcp
```

---

## Step 7: Verify Deployment

### Quick Health Check:
```powershell
# Test backend API (should return 400, not connection error)
$response = curl -i http://localhost:8000/api/token/
$response | head -1
# Expected: "HTTP/1.1 400 Bad Request"

# Test frontend (should return 200)
$response = curl -i http://localhost:80/
$response | head -1
# Expected: "HTTP/1.1 200 OK"
```

### Full Validation Script:
```powershell
# Save as: C:\fms\health-check.ps1

$ErrorActionPreference = "Continue"

Write-Host "=== Docker Service Status ===" -ForegroundColor Green
docker compose ps
Write-Host ""

Write-Host "=== Testing Backend API ===" -ForegroundColor Green
try {
    $backend = Invoke-RestMethod -Uri "http://localhost:8000/api/token/" -Method POST -ErrorAction Stop
} catch {
    Write-Host "Backend returned: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=== Testing Frontend ===" -ForegroundColor Green
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:80/" -ErrorAction Stop
    Write-Host "Frontend status: $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Frontend error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Recent Backend Logs ===" -ForegroundColor Green
docker compose logs --tail=10 backend
```

### Run Health Check:
```powershell
cd C:\fms
powershell -ExecutionPolicy Bypass -File health-check.ps1
```

---

## Step 8: Access FMS Application

### From Same Computer:
```
Frontend: http://localhost:80/
Backend API: http://localhost:8000/api/
```

### From Network (if Docker Desktop configured for network access):
```
Frontend: http://<your-computer-ip>:80/
Backend API: http://<your-computer-ip>:8000/api/
```

### Get Your Computer IP:
```powershell
ipconfig | findstr "IPv4"
# Look for IPv4 Address under your network adapter
# Example: 192.168.1.100
```

---

## Step 9: Managing FMS Services (PowerShell Commands)

### View Logs:
```powershell
cd C:\fms

# All services
docker compose logs

# Specific service
docker compose logs backend
docker compose logs frontend
docker compose logs db

# Follow logs in real-time (Ctrl+C to exit)
docker compose logs -f backend

# Last 50 lines
docker compose logs --tail=50 backend
```

### Restart Services:
```powershell
cd C:\fms

# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend
```

### Stop Services:
```powershell
cd C:\fms

# Stop (can be restarted)
docker compose stop

# Stop specific service
docker compose stop backend

# Stop and remove containers (data in volumes persists)
docker compose down

# Full cleanup (removes containers, networks, volumes!)
docker compose down -v
```

### View Container Details:
```powershell
# Run commands in running container
docker compose exec backend python manage.py migrate

# Check backend Python version
docker compose exec backend python --version

# Execute shell command in container
docker compose exec db psql -U fms_user -d fms_db -c "SELECT COUNT(*) FROM units_unit;"
```

---

## Step 10: Backup & Restore Database

### Backup Database to File:
```powershell
cd C:\fms

# Export PostgreSQL dump
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
docker compose exec -T db pg_dump `
  -U fms_user fms_db `
  > "backup-$timestamp.sql"

# List backups
ls backup-*.sql

# Example: backup-20260426-143000.sql (file size ~5-50 MB depending on data)
```

### Restore from Backup:
```powershell
cd C:\fms

# Stop services first
docker compose stop

# Start database only
docker compose up -d db
Start-Sleep -Seconds 5  # Wait for DB to be ready

# Restore from backup
$backupFile = "backup-20260426-143000.sql"
Get-Content $backupFile | docker compose exec -T db psql -U fms_user fms_db

# Restart services
docker compose up -d
```

---

## Step 11: Update to New Version

### Get Latest Image Commit SHA:
```powershell
# From GitHub Actions: https://github.com/trimurtisangampune-bot/fms/actions
# Look for latest successful build
# Copy the "Deploy" job output for image SHA
# Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Update Images:
```powershell
cd C:\fms

# Update .env with new image SHAs
notepad .env
# Change BACKEND_IMAGE and FRONTEND_IMAGE to new commit SHA

# Pull new images
$newSha = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
docker pull "ghcr.io/trimurtisangampune-bot/fms/backend:$newSha"
docker pull "ghcr.io/trimurtisangampune-bot/fms/frontend:$newSha"

# Restart services (migrations run automatically)
docker compose up -d

# Verify new versions
docker compose logs backend | tail -10
```

### Rollback to Previous Version:
```powershell
cd C:\fms

# Update .env back to previous commit SHA
notepad .env

# Restart with old images
docker compose down
docker pull "ghcr.io/trimurtisangampune-bot/fms/backend:previous_sha"
docker pull "ghcr.io/trimurtisangampune-bot/fms/frontend:previous_sha"
docker compose up -d
```

---

## Step 12: Advanced Configuration

### Change Ports:
```powershell
# Edit .env and update
notepad .env

# Change these lines:
# BACKEND_PORT=8001  (if 8000 is in use)
# FRONTEND_PORT=8080 (if 80 is in use)

# Restart services
docker compose restart
```

### Enable HTTPS (via reverse proxy):
```powershell
# For Windows, use IIS (Internet Information Services) as reverse proxy
# Or use nginx in a Docker container (see Linux guide for nginx config)

# Simple approach: Use ngrok for public HTTPS
# Download: https://ngrok.com/
# Run: ngrok http 80
```

### Persist Data Location:
```powershell
# Docker volumes stored in:
# %USERPROFILE%\AppData\Local\Docker\volumes\

# View volume info
docker volume ls
docker volume inspect fms_postgres_data

# Backup volume data manually
docker cp fms-db-1:/var/lib/postgresql/data C:\fms\db-backup
```

---

## Troubleshooting

### Docker Desktop Won't Start:
```powershell
# Check if WSL 2 is enabled
wsl --list --verbose

# If WSL 2 not running, check Windows features are enabled
Get-WindowsOptionalFeature -Online | findstr -i "containers|hyper"

# Restart Docker Desktop from system tray
# Right-click Docker icon → Quit
# Double-click Docker Desktop to restart
```

### GHCR Login Failing:
```powershell
# Verify PAT still valid (check GitHub settings)
# See [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md)

# Clear cached credentials and re-login
docker logout ghcr.io
$GITHUB_PAT | docker login ghcr.io -u $GITHUB_USER --password-stdin

# Test registry visibility
docker manifest inspect ghcr.io/trimurtisangampune-bot/fms/backend:latest
```

### No Packages Visible in GitHub (Manual Publish Fallback):
```powershell
# Use this only if Actions did not push images and package pages are empty.
# Prerequisites:
# - PAT must include write:packages (and repo if repository is private)
# - Run from local repository root (contains backend/ and frontend/ folders)

$GITHUB_USER = "trimurtisangampune-bot"
$GITHUB_PAT = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$GHCR_REPO = "ghcr.io/trimurtisangampune-bot/fms"
$SHA = (git rev-parse HEAD).Trim()

# Login
$GITHUB_PAT | docker login ghcr.io -u $GITHUB_USER --password-stdin

# Build db, backend and frontend images with latest + SHA tags
docker build -f database/Dockerfile `
  -t "$GHCR_REPO/db:latest" `
  -t "$GHCR_REPO/db:$SHA" `
  database

docker build -f backend/Dockerfile `
  -t "$GHCR_REPO/backend:latest" `
  -t "$GHCR_REPO/backend:$SHA" `
  backend

docker build -f frontend/Dockerfile `
  --build-arg REACT_APP_API_URL=https://fms.example.com/api `
  -t "$GHCR_REPO/frontend:latest" `
  -t "$GHCR_REPO/frontend:$SHA" `
  frontend

# Push all tags
docker push "$GHCR_REPO/db:latest"
docker push "$GHCR_REPO/db:$SHA"
docker push "$GHCR_REPO/backend:latest"
docker push "$GHCR_REPO/backend:$SHA"
docker push "$GHCR_REPO/frontend:latest"
docker push "$GHCR_REPO/frontend:$SHA"

# Verify tags now exist
docker manifest inspect "$GHCR_REPO/db:latest"
docker manifest inspect "$GHCR_REPO/backend:latest"
docker manifest inspect "$GHCR_REPO/frontend:latest"
```

After manual publish, set SHA tags in `.env` (recommended for production):
```env
DB_IMAGE=ghcr.io/trimurtisangampune-bot/fms/db:<full-40-char-sha>
BACKEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/backend:<full-40-char-sha>
FRONTEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/frontend:<full-40-char-sha>
```

### "Port 80 already in use":
```powershell
# Find what's using port 80
netstat -ano | findstr ":80"

# Kill process (replace PID with actual process ID)
taskkill /PID 1234 /F

# Or change port in .env
# FRONTEND_PORT=8080
# Then: docker compose restart
```

### "Port 8000 already in use":
```powershell
# Find what's using port 8000
netstat -ano | findstr ":8000"

# Kill process or change port in .env
# BACKEND_PORT=8001
# Then: docker compose restart
```

### Backend Won't Start (connection refused):
```powershell
# Check database is healthy
docker compose ps
# db should show "Up (healthy)"

# View backend logs
docker compose logs backend | tail -20

# Restart database
docker compose restart db
Start-Sleep -Seconds 5

# Restart backend
docker compose restart backend
```

### Frontend Returning 502/503:
```powershell
# Check backend is running
docker compose ps

# View backend logs for errors
docker compose logs backend

# Restart frontend after backend healthy
docker compose restart frontend
```

### Out of Disk Space:
```powershell
# Check Docker disk usage
docker system df

# Clean up unused images/containers/networks
docker system prune --force

# Check volume size
docker volume ls
docker volume inspect fms_postgres_data

# If needed, back up and remove volume
docker compose exec db pg_dump -U fms_user fms_db > backup.sql
docker volume rm fms_postgres_data
```

---

## Optional: Enable Docker Desktop Startup

### Auto-start Docker Desktop on Windows Boot:
```powershell
# Option 1: Via Docker Desktop GUI
# Settings (gear icon) → General → "Start Docker Desktop when you log in"

# Option 2: Via Registry (if GUI option not available)
# No manual steps needed—Docker Desktop handles this automatically
```

### Auto-start FMS Services on Windows Boot:
```powershell
# Create scheduled task to start FMS on boot
# PowerShell (as Administrator):

$action = New-ScheduledTaskAction -Execute "docker" `
  -Argument "compose -f C:\fms\docker-compose.yml up -d"

$trigger = New-ScheduledTaskTrigger -AtStartup

$principal = New-ScheduledTaskPrincipal -UserID "NT AUTHORITY\SYSTEM" `
  -RunLevel Highest

Register-ScheduledTask -TaskName "FMS-Auto-Start" `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal

# Verify task created
Get-ScheduledTask -TaskName "FMS-Auto-Start"
```

---

## References

- [Docker Desktop for Windows Documentation](https://docs.docker.com/desktop/install/windows-install/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Windows Subsystem for Linux (WSL 2)](https://docs.microsoft.com/en-us/windows/wsl/install)
- [GitHub Container Registry (GHCR) Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## Next Steps

1. Verify [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md) for PAT setup
2. Populate `.env` file from [DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md)
3. Follow steps 1-7 from this guide
4. Run health check to verify deployment
5. Bookmark troubleshooting section for operational reference

---

**Supported Windows Versions:**
- ✅ Windows 10 (Pro, Enterprise) with WSL 2
- ✅ Windows 11 (all editions)
- ✅ Windows Server 2019+
- ❌ Windows 10 Home (requires Hyper-V workaround or Docker Desktop with custom WSL setup)
