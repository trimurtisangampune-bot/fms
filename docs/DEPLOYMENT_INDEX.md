# FMS Production Deployment - Quick Start Index

## Overview

This directory contains everything needed to deploy FMS (Finance Management System) on a separate Linux server using Docker and Docker Compose.

The deployment uses **immutable Docker images** from GitHub Container Registry (GHCR) identified by commit SHA, ensuring reproducible, versioned deployments with easy rollback capability.

---

## 📚 Documentation Files

### **[DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md)** — START HERE (Common to Both)
**Read first if you haven't set up GitHub container registry access.**

- How to create a GitHub Personal Access Token (PAT)
- Required permissions: `read:packages` only
- How to login to GHCR
- Troubleshooting authentication issues
- Security best practices

**Time to complete:** 5-10 minutes

---

### **[DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md)** — SECOND (Common to Both)
**Required before running deployment commands.**

- Production `.env` file template (fully commented)
- How to generate `SECRET_KEY` securely
- How to generate strong database password
- Example fully populated `.env` for reference
- Staging/testing configuration (optional)

**Time to complete:** 10-15 minutes

---

## 🐧 LINUX Deployment

### **[DEPLOYMENT_LINUX_COMMANDS.md](DEPLOYMENT_LINUX_COMMANDS.md)** — For Ubuntu/Debian
**Step-by-step deployment commands for Linux systems.**

- System preparation (Docker, Docker Compose installation)
- GHCR login
- Directory setup
- Pulling images from registry
- Starting FMS services
- Health check verification
- (Optional) Configuring nginx reverse proxy + SSL
- Managing services (logs, restart, stop, backup, restore)
- Updating to new versions
- Troubleshooting

**Time to complete:** 20-30 minutes (first time), 5 minutes (subsequent deployments)

---

## 🪟 WINDOWS Deployment

### **[DEPLOYMENT_WINDOWS_QUICK_REFERENCE.md](DEPLOYMENT_WINDOWS_QUICK_REFERENCE.md)** — Quick Start for Windows
**Windows quick reference with PowerShell commands and troubleshooting.**

- 30-minute quick start checklist
- Docker Desktop installation (Windows 10/11)
- WSL 2 / Hyper-V setup
- PowerShell command reference
- Windows-specific troubleshooting
- Common issues and solutions

**Time to complete:** 2-3 minutes (reference only)

### **[DEPLOYMENT_WINDOWS_DOCKER.md](DEPLOYMENT_WINDOWS_DOCKER.md)** — Full Windows Guide
**Comprehensive Windows deployment with Docker Desktop.**

- System requirements (Windows 10 Pro/Enterprise, Windows 11, Windows Server)
- Enable WSL 2 (Windows 10/11) or Hyper-V (Windows Server)
- Docker Desktop installation and setup
- GHCR login via PowerShell
- Start FMS services (docker-compose)
- Health check verification
- Backup & restore database
- Manage services (logs, restart, stop)
- Updating to new versions
- Windows-specific troubleshooting

**Time to complete:** 20-30 minutes (first time), 5 minutes (subsequent deployments)

---

## 🚀 Quick Deployment Checklists

### Linux/Ubuntu Deployment (~30 minutes)

- [ ] **GitHub Setup** (5 min)
  - [ ] Create GitHub PAT with `read:packages` scope
  - [ ] Save PAT securely
  
- [ ] **Environment Configuration** (10 min)
  - [ ] Generate `SECRET_KEY` (Python one-liner)
  - [ ] Generate strong `DB_PASSWORD` (openssl command)
  - [ ] Create `.env` file with your values

- [ ] **System Preparation** (5 min)
  - [ ] SSH into target Linux server
  - [ ] Run Docker installation command
  - [ ] Verify `docker --version` and `docker compose version`

- [ ] **GHCR Login** (2 min)
  - [ ] Login: `echo "$PAT" | docker login ghcr.io ...`
  - [ ] Verify: `docker pull ghcr.io/trimurtisangampune-bot/fms/backend:latest`

- [ ] **Deploy FMS** (5 min)
  - [ ] Create `/opt/fms` directory
  - [ ] Download `docker-compose.yml`
  - [ ] Create `.env` file
  - [ ] Run: `docker compose up -d`

- [ ] **Verify** (2 min)
  - [ ] Run health check: `curl http://localhost:8000/api/token/`
  - [ ] Check service status: `docker compose ps`

→ See: [DEPLOYMENT_LINUX_COMMANDS.md](DEPLOYMENT_LINUX_COMMANDS.md)

---

### Windows Deployment (~30-45 minutes, including Docker Desktop install)

- [ ] **GitHub Setup** (5 min)
  - [ ] Create GitHub PAT with `read:packages` scope
  - [ ] Save PAT securely
  
- [ ] **Environment Configuration** (10 min)
  - [ ] Generate `SECRET_KEY` (Python one-liner)
  - [ ] Generate strong `DB_PASSWORD` (openssl command)
  - [ ] Create `.env` file with your values

- [ ] **System Preparation** (10-15 min)
  - [ ] Enable WSL 2 (Windows 10) or Hyper-V (Windows Server)
  - [ ] Download and install Docker Desktop
  - [ ] Restart computer
  - [ ] Verify `docker --version` and `docker compose version`

- [ ] **GHCR Login** (2 min)
  - [ ] Login: `$PAT | docker login ghcr.io -u $USERNAME --password-stdin`
  - [ ] Verify: `docker pull ghcr.io/trimurtisangampune-bot/fms/backend:latest`

- [ ] **Deploy FMS** (5 min)
  - [ ] Create `C:\fms` directory
  - [ ] Download `docker-compose.yml`
  - [ ] Create `.env` file
  - [ ] Run: `docker compose up -d`

- [ ] **Verify** (2 min)
  - [ ] Run health check: `curl http://localhost:8000/api/token/`
  - [ ] Check service status: `docker compose ps`

→ See: [DEPLOYMENT_WINDOWS_DOCKER.md](DEPLOYMENT_WINDOWS_DOCKER.md) or [DEPLOYMENT_WINDOWS_QUICK_REFERENCE.md](DEPLOYMENT_WINDOWS_QUICK_REFERENCE.md)

---

## 🔗 Key Information

### Registry Location
```
ghcr.io/trimurtisangampune-bot/fms/
```

### Image Tags
- **Production (recommended):** Commit SHA (immutable)
  ```
  ghcr.io/trimurtisangampune-bot/fms/backend:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
  ghcr.io/trimurtisangampune-bot/fms/frontend:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
  ```

- **Development/Staging (not recommended for production):** `latest`
  ```
  ghcr.io/trimurtisangampune-bot/fms/backend:latest
  ghcr.io/trimurtisangampune-bot/fms/frontend:latest
  ```

### Default Ports
- Backend API: `8000` (via gunicorn)
- Frontend: `80` (via nginx)
- PostgreSQL: `5432` (internal to Docker network)

### Data Persistence
- Database data stored in Docker volume: `fms_postgres_data`
- Persists across container restarts and updates

---

## 📋 Common Commands (After Deployment)

```bash
# View service status
cd /opt/fms && docker compose ps

# View logs
docker compose logs -f backend

# Restart all services
docker compose restart

# Stop all services (data persists)
docker compose stop

# Backup database
docker compose exec db pg_dump -U fms_user fms_db > backup.sql

# Update to new version
# 1. Update image SHAs in .env
# 2. Run: docker compose up -d
```

---

## ⚠️ Critical Security Notes

1. **Never commit `.env` to version control** — Add to `.gitignore`
2. **Rotate GitHub PAT every 90 days** — Set expiration date
3. **Use strong database password** — 16+ characters, random
4. **SECURE_SSL_REDIRECT=True** — Only if you have valid SSL certificate
5. **ALLOWED_HOSTS** — Must match your actual domain/IP
6. **Image SHAs** — Use commit SHA for reproducible deployments, not `latest`

---

## 🆘 Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Can't pull images from GHCR | See [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md) — Check PAT permissions and expiration |
| Backend won't start | See [DEPLOYMENT_LINUX_COMMANDS.md](DEPLOYMENT_LINUX_COMMANDS.md#troubleshooting) — Check database health |
| Frontend returning 502 | See [DEPLOYMENT_LINUX_COMMANDS.md](DEPLOYMENT_LINUX_COMMANDS.md#troubleshooting) — Restart backend |
| Port already in use | See [DEPLOYMENT_LINUX_COMMANDS.md](DEPLOYMENT_LINUX_COMMANDS.md#troubleshooting) — Change port in `.env` or stop conflicting service |
| Database disk full | See [DEPLOYMENT_LINUX_COMMANDS.md](DEPLOYMENT_LINUX_COMMANDS.md#step-8-managing-fms-services) — Backup and cleanup |

---

## 📞 Support & Debugging

### Get help with:
1. Read the troubleshooting section in each guide
2. Check service logs: `docker compose logs <service-name>`
3. Verify `.env` values match your infrastructure
4. Confirm Docker and Docker Compose are up to date

### Common error messages:
- `connection refused` → Database not ready, wait 10-15 seconds
- `401 Unauthorized` → GitHub PAT invalid or expired
- `CORS error` → `CORS_ALLOWED_ORIGINS` doesn't match frontend URL
- `502 Bad Gateway` → Backend crashed, check logs

---

## 🔄 Recommended Workflow

### Initial Deployment
1. Read [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md)
2. Read [DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md)
3. Follow [DEPLOYMENT_LINUX_COMMANDS.md](DEPLOYMENT_LINUX_COMMANDS.md)
4. Run health check
5. Bookmark this page for reference

### Regular Operations
- Refer to "Common Commands" section above
- Monitor logs: `docker compose logs -f`
- Backup database weekly/monthly: `docker compose exec db pg_dump ...`

### Updates
1. Get new commit SHA from GitHub
2. Update `.env` with new image SHAs
3. Run: `docker compose up -d`
4. Wait for database migrations to complete
5. Verify health check

### Rollback
1. Update `.env` with previous commit SHA
2. Run: `docker compose down && docker compose up -d`
3. Verify all services healthy

---

## 📦 File Inventory

```
docs/
├── DEPLOYMENT_INDEX.md (this file — start here)
├── DEPLOYMENT_GITHUB_PAT.md (GitHub authentication setup — common to both)
├── DEPLOYMENT_ENV_TEMPLATE.md (Environment configuration — common to both)
├── DEPLOYMENT_LINUX_COMMANDS.md (Ubuntu/Linux deployment steps)
├── DEPLOYMENT_WINDOWS_QUICK_REFERENCE.md (Windows quick reference + PowerShell commands)
└── DEPLOYMENT_WINDOWS_DOCKER.md (Comprehensive Windows guide)

Root:
├── docker-compose.yml (Service orchestration — same for both platforms)
├── .env.example (Template — copy to .env and fill in)
└── .gitignore (Should include .env)
```

---

## ✅ Deployment Validation Checklist

After running deployment commands, verify:

- [ ] `docker compose ps` shows 3 services in "Up" state
- [ ] Database shows "(healthy)" in health status
- [ ] `curl http://localhost:8000/api/token/` returns HTTP 400 (not connection error)
- [ ] `curl http://localhost:80/` returns HTTP 200 (not 502)
- [ ] `docker compose logs backend | grep "Booting worker"` shows gunicorn started
- [ ] `docker compose logs frontend | grep "nginx: master"` shows nginx started

---

## 🎯 Next Steps

### **Choose Your Platform:**

#### 🐧 For Linux/Ubuntu:
1. Read [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md) → Create your GitHub PAT
2. Read [DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md) → Prepare your `.env` file
3. Follow [DEPLOYMENT_LINUX_COMMANDS.md](DEPLOYMENT_LINUX_COMMANDS.md) → Run deployment commands
4. Run health check
5. Access FMS at your domain

#### 🪟 For Windows 10/11 or Windows Server:
1. Read [DEPLOYMENT_GITHUB_PAT.md](DEPLOYMENT_GITHUB_PAT.md) → Create your GitHub PAT
2. Read [DEPLOYMENT_ENV_TEMPLATE.md](DEPLOYMENT_ENV_TEMPLATE.md) → Prepare your `.env` file
3. Choose one:
   - **Quick Start:** [DEPLOYMENT_WINDOWS_QUICK_REFERENCE.md](DEPLOYMENT_WINDOWS_QUICK_REFERENCE.md) (2-3 min reference)
   - **Full Guide:** [DEPLOYMENT_WINDOWS_DOCKER.md](DEPLOYMENT_WINDOWS_DOCKER.md) (detailed steps)
4. Run health check
5. Access FMS at http://localhost:80 or your domain

#### 🤔 Not sure which to choose?

| Criterion | Linux | Windows |
|-----------|-------|---------|
| Server OS | Ubuntu, Debian, RHEL, etc. | Windows 10 Pro/Enterprise, Windows 11, Windows Server |
| Learning curve | Moderate | Easier (GUI Docker Desktop) |
| Production ready | Recommended | Fully supported |
| DevOps familiarity | High | Medium to Low |
| Corporate IT preference | Common | Common |

**Recommendation:** Choose based on your organization's infrastructure. Both are production-ready.

---

**Last Updated:** April 26, 2026  
**Supported OS:** Ubuntu 20.04 LTS+, Debian 10+  
**Docker Version:** 20.10+  
**Docker Compose Version:** 2.0+
