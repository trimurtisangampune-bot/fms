# FMS Production Deployment - Windows Quick Reference

## 📖 Overview

This guide helps you deploy FMS on **Windows 10/11** or **Windows Server** using Docker Desktop and Docker Compose.

**Total setup time: ~30-45 minutes** (first time, including Docker Desktop installation)

---

## 📚 Documentation Files

### 1. **[DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md)** — START HERE (5 min)
Create GitHub Personal Access Token for GHCR image access.
- Create PAT with `read:packages` scope
- GitHub authentication steps
- Troubleshooting login failures

### 2. **[DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md)** — SECOND (10 min)
Configure environment variables for production deployment.
- Copy template and fill in your values
- Generate SECRET_KEY (Python one-liner)
- Generate strong database password
- Example fully populated `.env`

### 3. **[DEPLOYMENT_WINDOWS_DOCKER.md](DEPLOYMENT_WINDOWS_DOCKER.md)** — THIRD (20-30 min)
**Windows-specific deployment steps.**
- Install Docker Desktop on Windows
- Enable WSL 2 (Windows 10) or Hyper-V (Windows Server)
- Login to GHCR
- Start FMS services
- Health check and verification
- Manage services (logs, restart, backup, restore)
- Troubleshooting

---

## ⚡ Quick Start (30 minutes)

### Prerequisites Checklist
- [ ] Windows 10 Pro/Enterprise (or Windows 11, or Windows Server 2019+)
- [ ] Administrator access to install Docker
- [ ] Internet connection
- [ ] GitHub account (to create PAT)

### Installation Checklist

**Step 1: GitHub Setup (5 min)**
```powershell
# 1. Go to https://github.com/settings/tokens
# 2. Click "Generate new token (classic)"
# 3. Name it "FMS Deployment - GHCR Pull"
# 4. Select ONLY: ✅ read:packages
# 5. Click "Generate token"
# 6. Copy and save: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Step 2: Docker Installation (10 min)**
```powershell
# 1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
# 2. Run installer (.msi file)
# 3. Restart computer when prompted
# 4. Verify installation:

docker --version  # Should show version 24.0+
docker compose version  # Should show version 2.0+
docker run hello-world  # Should print "Hello from Docker!"
```

**Step 3: Setup FMS (5 min)**
```powershell
# 1. Create folder: mkdir C:\fms && cd C:\fms
# 2. Download: docker-compose.yml from GitHub
# 3. Create .env file with your configuration
# 4. Login: $PAT | docker login ghcr.io -u $USERNAME --password-stdin
```

**Step 4: Deploy (5 min)**
```powershell
cd C:\fms

# Pull images
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:abc123def456
docker pull ghcr.io/trimurtisangampune-bot/fms/frontend:abc123def456

# Start services
docker compose up -d

# Verify
docker compose ps
```

**Step 5: Verify (2 min)**
```powershell
# Health check
curl http://localhost:8000/api/token/  # Should return HTTP 400
curl http://localhost:80/               # Should return HTTP 200
docker compose logs backend | tail -5   # Should show "Booting worker"
```

---

## 🔗 Key Information

### Registry & Images
```
Registry: ghcr.io/trimurtisangampune-bot/fms/
Backend:  ghcr.io/trimurtisangampune-bot/fms/backend:<commit-sha>
Frontend: ghcr.io/trimurtisangampune-bot/fms/frontend:<commit-sha>
```

### Default Ports
| Service | Port | URL |
|---------|------|-----|
| Frontend | 80 | http://localhost:80/ |
| Backend API | 8000 | http://localhost:8000/api/ |
| PostgreSQL | 5432 | Internal to Docker network |

### Data Persistence
- Database: Docker volume `fms_postgres_data` (survives restarts/updates)
- Frontend: Stateless (served from container)
- Backend: Stateless (app state in database)

---

## 📋 PowerShell Command Reference

### Essential Commands

```powershell
# Navigate to FMS directory
cd C:\fms

# ===== START/STOP =====
docker compose up -d              # Start all services
docker compose stop               # Stop services (keep containers)
docker compose restart            # Restart services
docker compose down               # Stop and remove containers (volumes persist)
docker compose down -v            # Full cleanup (removes everything including data!)

# ===== MONITORING =====
docker compose ps                 # Service status
docker compose logs               # View all logs
docker compose logs -f backend    # Follow backend logs (Ctrl+C to exit)
docker compose logs --tail=50 db  # Last 50 lines from database

# ===== DATABASE =====
docker compose exec db psql -U fms_user -d fms_db  # Connect to database
docker compose exec backend python manage.py migrate  # Run migrations

# ===== BACKUP/RESTORE =====
docker compose exec -T db pg_dump -U fms_user fms_db > backup.sql
Get-Content backup.sql | docker compose exec -T db psql -U fms_user fms_db

# ===== UPDATES =====
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:new-sha
docker pull ghcr.io/trimurtisangampune-bot/fms/frontend:new-sha
docker compose up -d  # Restart with new images

# ===== TROUBLESHOOTING =====
docker system df                   # Disk usage
docker system prune --force        # Clean unused containers/images
netstat -ano | findstr ":8000"    # Check what's using port 8000
docker compose exec backend python --version
```

---

## 🆘 Windows-Specific Troubleshooting

| Issue | Solution |
|-------|----------|
| **Docker Desktop won't start** | Enable WSL 2 or Hyper-V. See [DEPLOYMENT_WINDOWS_DOCKER.md](DEPLOYMENT_WINDOWS_DOCKER.md#step-1-system-requirements--setup) |
| **"Port 80 already in use"** | `netstat -ano \| findstr ":80"` to find process. Or change `FRONTEND_PORT` in `.env` |
| **"Port 8000 already in use"** | `netstat -ano \| findstr ":8000"` to find process. Or change `BACKEND_PORT` in `.env` |
| **GHCR login fails (401)** | Check PAT expiration, verify `read:packages` scope. See [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md) |
| **Backend won't start** | Check database is healthy: `docker compose ps`. Restart: `docker compose restart db` |
| **WSL 2 not found** | Run `wsl --install` as Administrator. Restart computer. See Step 1 of Windows guide |
| **Out of disk space** | Run `docker system prune --force`. Or backup & remove volume `docker volume rm fms_postgres_data` |

---

## 🔒 Security Checklist

- [ ] Created GitHub PAT with **ONLY** `read:packages` scope
- [ ] Set PAT expiration date (recommended: 90 days)
- [ ] Generated strong `SECRET_KEY` (50+ characters)
- [ ] Generated strong `DB_PASSWORD` (16+ characters, random)
- [ ] Created `.env` file and added to `.gitignore`
- [ ] **Never** commit `.env` to version control
- [ ] Using commit SHA image tags (not `latest`)
- [ ] Set `ALLOWED_HOSTS` to your actual domain
- [ ] Set `CORS_ALLOWED_ORIGINS` to frontend URL

---

## 📞 Common Issues & Solutions

### "Login Succeeded" but can't pull images
```powershell
# Verify PAT has read:packages scope
# Try logout and re-login:
docker logout ghcr.io
$PAT | docker login ghcr.io -u $USERNAME --password-stdin
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:latest
```

### "Docker compose: command not found"
```powershell
# Verify Docker Desktop installed correctly
docker --version  # Should succeed
docker compose version  # May need to restart PowerShell after Docker install

# If still failing, restart Docker Desktop:
# Right-click Docker icon (system tray) → Quit
# Wait 10 seconds
# Double-click Docker Desktop icon
```

### Services start but won't connect
```powershell
# Check all services are healthy
docker compose ps
# All should show "Up" status

# Check backend logs for errors
docker compose logs backend | tail -20

# Wait 10-15 seconds for database to initialize
# Then restart backend
docker compose restart backend
```

### Database connection errors
```powershell
# Verify DATABASE_URL in docker-compose.yml
# Should be: postgres://fms_user:password@db:5432/fms_db

# Check if db is healthy
docker compose ps
# Should show: fms-db-1  Up (healthy)

# View database logs
docker compose logs db
```

---

## 🚀 Next Steps

### 1. **First Time Setup** (30-45 min)
   1. Read [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md)
   2. Create GitHub PAT
   3. Read [DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md)
   4. Create `.env` file
   5. Follow [DEPLOYMENT_WINDOWS_DOCKER.md](DEPLOYMENT_WINDOWS_DOCKER.md)
   6. Run health check

### 2. **Regular Operations**
   - Monitor: `docker compose logs -f backend`
   - Backup: `docker compose exec -T db pg_dump -U fms_user fms_db > backup.sql`
   - Restart: `docker compose restart`
   - Logs: `docker compose logs`

### 3. **Updates**
   1. Get new commit SHA from GitHub Actions
   2. Update `BACKEND_IMAGE` and `FRONTEND_IMAGE` in `.env`
   3. Run: `docker compose up -d`
   4. Verify: `docker compose logs backend | tail -10`

### 4. **Rollback**
   1. Update `.env` with previous commit SHA
   2. Run: `docker compose down && docker compose up -d`
   3. Verify services healthy

---

## 📂 File Locations

```
C:\fms\
├── docker-compose.yml         (Service definition)
├── .env                        (Configuration — DO NOT COMMIT)
├── .env.example               (Template)
├── backup-*.sql               (Database backups)
└── health-check.ps1           (Optional validation script)
```

---

## ✅ Deployment Validation

After completing deployment, run these checks:

```powershell
# 1. Services healthy
docker compose ps
# All should show "Up" status

# 2. Backend responding
curl -i http://localhost:8000/api/token/
# Should return HTTP 400 (not connection refused)

# 3. Frontend responding
curl -i http://localhost:80/
# Should return HTTP 200

# 4. Logs clean
docker compose logs backend | tail -5
# Should show "Booting worker" messages, no errors

# 5. Database working
docker compose exec db psql -U fms_user -d fms_db -c "SELECT version();"
# Should print PostgreSQL version
```

---

## 🔄 Typical Workflow

**Daily:**
```powershell
cd C:\fms
docker compose ps
docker compose logs -f backend  # Monitor for issues
```

**Weekly:**
```powershell
cd C:\fms
docker compose exec -T db pg_dump -U fms_user fms_db > "backup-$(Get-Date -Format 'yyyyMMdd').sql"
```

**Updates:**
```powershell
cd C:\fms
notepad .env  # Update image SHAs
docker compose up -d
docker compose logs backend  # Verify
```

**Restart:**
```powershell
cd C:\fms
docker compose restart
```

---

## 💡 Tips

1. **Windows Terminal Recommended** — Better than PowerShell. Download free from Microsoft Store.
2. **Keep Docker Desktop Updated** — Check Settings → About for updates.
3. **Monitor Resources** — Docker Desktop uses 2-4 GB RAM. Increase if needed: Settings → Resources.
4. **Bookmark .env Template** — See [DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md) for all configuration options.
5. **Backup Regularly** — Use provided backup commands weekly.

---

## 🎯 Success Criteria

You've successfully deployed FMS when:
- ✅ `docker compose ps` shows all 3 services "Up"
- ✅ `curl http://localhost:8000/api/token/` returns HTTP 400
- ✅ `curl http://localhost:80/` returns HTTP 200
- ✅ No error messages in `docker compose logs`
- ✅ Can access http://localhost:80/ in browser

---

**Last Updated:** April 26, 2026  
**Supported Windows:** Windows 10 Pro/Enterprise, Windows 11, Windows Server 2019+  
**Docker Version:** 20.10+  
**Docker Compose Version:** 2.0+  
**WSL Version:** WSL 2 (Windows 10) or Hyper-V (Windows Server)
