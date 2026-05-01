# FMS Production Deployment - One-Page Checklist

Use this checklist for repeatable deployments on Linux or Windows servers.

## 1) Pre-Deployment (2-5 min)

- [ ] Docker and Docker Compose are installed
- [ ] GHCR login is valid (`read:packages` token)
- [ ] Deployment directory contains `docker-compose.yml` and `.env`
- [ ] `.env` has required values:
  - [ ] `SECRET_KEY`
  - [ ] `DB_PASSWORD`
  - [ ] `ALLOWED_HOSTS`
  - [ ] `CORS_ALLOWED_ORIGINS`
  - [ ] `DB_IMAGE`, `BACKEND_IMAGE`, `FRONTEND_IMAGE` (same commit SHA)
- [ ] Image tags use immutable SHA (not `latest`)

## 2) Pull Images

### Linux
```bash
cd /opt/fms
docker pull "$DB_IMAGE"
docker pull "$BACKEND_IMAGE"
docker pull "$FRONTEND_IMAGE"
```

### Windows (PowerShell)
```powershell
Set-Location C:\fms
docker pull $env:DB_IMAGE
docker pull $env:BACKEND_IMAGE
docker pull $env:FRONTEND_IMAGE
```

## 3) Start / Update Services

### Linux
```bash
cd /opt/fms
docker compose --env-file .env up -d --remove-orphans
```

### Windows (PowerShell)
```powershell
Set-Location C:\fms
docker compose --env-file .env up -d --remove-orphans
```

## 4) Verify Health (must pass)

### Linux
```bash
cd /opt/fms
docker compose ps
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/auth/token/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:80/
```

Expected:
- Backend token endpoint returns `400` or `401`
- Frontend returns `200`
- `db` and `backend` are healthy/up in `docker compose ps`

### Windows (PowerShell)
```powershell
Set-Location C:\fms
docker compose ps
(Invoke-WebRequest -Uri "http://localhost:8000/api/auth/token/" -Method POST -ErrorAction SilentlyContinue).StatusCode
(Invoke-WebRequest -Uri "http://localhost:80/" -UseBasicParsing).StatusCode
```

Expected:
- Backend token endpoint returns `400` or `401`
- Frontend returns `200`
- `db` and `backend` are healthy/up in `docker compose ps`

## 5) Fast Rollback (if verification fails)

- [ ] Replace `DB_IMAGE`, `BACKEND_IMAGE`, and `FRONTEND_IMAGE` in `.env` with previous known-good SHA tags
- [ ] Re-run deployment command:

### Linux
```bash
cd /opt/fms
docker compose --env-file .env pull
docker compose --env-file .env up -d --remove-orphans
```

### Windows (PowerShell)
```powershell
Set-Location C:\fms
docker compose --env-file .env pull
docker compose --env-file .env up -d --remove-orphans
```

## 6) Post-Deployment (1-2 min)

- [ ] Check last logs for errors:
  - `docker compose logs --tail=50 backend`
  - `docker compose logs --tail=50 db`
- [ ] Confirm app login page is reachable from browser
- [ ] Save deployed SHA in change record/ticket

## Required `.env` Keys (minimum)

```env
DEBUG=False
SECRET_KEY=<strong-random-value>
ALLOWED_HOSTS=fms.example.com

DB_NAME=fms_db
DB_USER=fms_user
DB_PASSWORD=<strong-random-value>
DB_SSL_REQUIRE=False

CORS_ALLOWED_ORIGINS=https://fms.example.com
CSRF_TRUSTED_ORIGINS=https://fms.example.com
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
TIME_ZONE=UTC

REACT_APP_API_URL=https://fms.example.com/api
DB_IMAGE=ghcr.io/trimurtisangampune-bot/fms/db:<full-commit-sha>
BACKEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/backend:<full-commit-sha>
FRONTEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/frontend:<full-commit-sha>
BACKEND_PORT=8000
FRONTEND_PORT=80
```

## Deployment Change Ticket (Printable)

Copy this section into your change record for each rollout.

```text
FMS DEPLOYMENT CHANGE TICKET
============================

Ticket ID: ______________________________
Environment: ____________________________   (Production / Staging)
Date: ___________________________________   (YYYY-MM-DD)

Operator Name: __________________________
Reviewed By: _____________________________

Deployment Window Start: _________________
Deployment Window End: ___________________

Host / Server: ___________________________
Deployment Path: _________________________   (/opt/fms or C:\fms)

Image SHAs Deployed
-------------------
DB_IMAGE:       ghcr.io/trimurtisangampune-bot/fms/db:________________________
BACKEND_IMAGE:  ghcr.io/trimurtisangampune-bot/fms/backend:___________________
FRONTEND_IMAGE: ghcr.io/trimurtisangampune-bot/fms/frontend:__________________

Previous Known-Good SHAs (Rollback Target)
------------------------------------------
DB_IMAGE:       ghcr.io/trimurtisangampune-bot/fms/db:________________________
BACKEND_IMAGE:  ghcr.io/trimurtisangampune-bot/fms/backend:___________________
FRONTEND_IMAGE: ghcr.io/trimurtisangampune-bot/fms/frontend:__________________

Pre-Deployment Checks
---------------------
[ ] GHCR login valid
[ ] .env updated
[ ] SECRET_KEY present
[ ] DB_PASSWORD present
[ ] ALLOWED_HOSTS verified

Post-Deployment Verification
----------------------------
[ ] docker compose ps shows db/backend healthy
[ ] Backend token endpoint returns 400 or 401
[ ] Frontend endpoint returns 200
[ ] No critical errors in backend/db logs

Verification Evidence
---------------------
Backend HTTP Code: __________
Frontend HTTP Code: _________

Rollback Required?  [ ] No   [ ] Yes
If Yes, Rollback Start Time: __________________
If Yes, Rollback End Time: ____________________
Rollback Outcome: _____________________________

Final Status
------------
[ ] Successful Deployment
[ ] Successful Rollback
[ ] Failed - Escalated

Notes:
______________________________________________________________________________
______________________________________________________________________________
______________________________________________________________________________
```