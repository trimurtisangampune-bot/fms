# App Start and Stop Scripts

This guide provides PowerShell scripts you can run from the project root:

C:\society\fms

## Start all services

### Option A: Start backend and frontend in separate PowerShell windows

Use this when you want to see live logs in two windows.

    # Run from project root: C:\society\fms
    Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location "C:\society\fms\backend"; & "C:\society\fms\.venv\Scripts\python.exe" manage.py runserver'
    Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location "C:\society\fms\frontend"; npm start'

### Option B: Start both in current terminal tabs manually

Use this if you prefer to control each process in dedicated terminals.

Terminal 1:

    Set-Location C:\society\fms\backend
    & "C:\society\fms\.venv\Scripts\python.exe" manage.py runserver

Terminal 2:

    Set-Location C:\society\fms\frontend
    npm start

## Stop all services

### Option A: Stop by known ports (recommended)

    # Stop Django on port 8000
    Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique |
      ForEach-Object { Stop-Process -Id $_ -Force }

    # Stop React dev server on port 3000
    Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique |
      ForEach-Object { Stop-Process -Id $_ -Force }

### Option B: Stop by process names (broader)

This may stop other Python or Node processes on your machine.

    Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

## Quick verification commands

    # Confirm backend
    Get-NetTCPConnection -State Listen -LocalPort 8000 -ErrorAction SilentlyContinue

    # Confirm frontend
    Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue

## Docker production deployment (small reference)

Run these from project root:

    C:\society\fms

### Start / deploy the production stack

    # Build (if needed) and start in detached mode
    docker compose --env-file .env up -d --build

    # If images are already in registry and compose is image-based
    docker compose --env-file .env pull
    docker compose --env-file .env up -d

### Check status and logs

    docker compose --env-file .env ps
    docker compose --env-file .env logs -f backend
    docker compose --env-file .env logs -f frontend
    docker compose --env-file .env logs -f db

### Stop / restart

    # Stop containers (keep volumes/data)
    docker compose --env-file .env stop

    # Restart containers
    docker compose --env-file .env restart

    # Stop and remove containers/network (keep named volumes)
    docker compose --env-file .env down

### Full reset (destructive: removes database volume)

Use only when you intentionally want a clean database.

    docker compose --env-file .env down -v

### Quick health check (post-deploy)

    docker compose --env-file .env ps
    Invoke-WebRequest -Uri http://localhost:8000/api/auth/token/ -Method POST -ContentType application/json -Body '{}' -ErrorAction SilentlyContinue | Select-Object StatusCode
    Invoke-WebRequest -Uri http://localhost -Method GET -ErrorAction SilentlyContinue | Select-Object StatusCode
    docker compose --env-file .env logs --tail=50 backend
    docker compose --env-file .env logs --tail=50 frontend

Expected results:

- `docker compose ... ps`: all services should show `Up` (db, backend, frontend).
- backend token endpoint: `StatusCode` should be `400` or `401` (app reachable and auth endpoint working).
- frontend homepage: `StatusCode` should be `200`.
- backend/frontend logs: no repeating crash loops, traceback, or connection refused errors.
