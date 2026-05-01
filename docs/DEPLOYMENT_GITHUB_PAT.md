# FMS Production Deployment - GitHub PAT Setup

## Overview

To pull FMS Docker images from GitHub Container Registry (GHCR), you need a **GitHub Personal Access Token (PAT)** with appropriate permissions.

This guide explains:
1. How to create a PAT
2. Required permissions
3. How to use it for Docker login
4. Security best practices

---

## Step 1: Create a Personal Access Token

### Via GitHub Web Interface:

1. **Go to GitHub Settings → Developer settings**
   - Navigate to: https://github.com/settings/tokens
   - Or: GitHub Account (top right) → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Click "Generate new token (classic)"**
   - Avoid "Tokens (Fine-grained personal access tokens)" for now—use classic tokens for simplicity

3. **Name the token:**
   ```
   FMS Deployment - GHCR Pull
   ```
   (Include timestamp for tracking: `FMS Deployment - GHCR Pull 2026-04-26`)

4. **Set expiration:**
   - Option A: **90 days** (recommended for frequent CI/CD)
   - Option B: **No expiration** (less secure, only if unavoidable)
   - Note: You'll need to rotate the token before expiration

5. **Select scopes:**
   Check **ONLY** these permissions:
   - ✅ `read:packages` — Allows pulling images from GHCR
   - ✅ `repo` (optional) — If you need to access private repositories; **not required for public GHCR images**
   - ❌ Do NOT check `write:packages`, `admin`, `delete:packages`, or others

   **Minimal scope example:**
   ```
   ✅ read:packages
   ```

6. **Click "Generate token"**
   - You'll see a one-time token like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

7. **Copy and save immediately:**
   ```bash
   ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   - **This is your only chance to see the token.** GitHub does NOT display it again.
   - Store safely (e.g., password manager, secure note).
   - **Never commit to version control.**

---

## Step 2: Use PAT for Docker Login

### On your deployment machine (Linux):

```bash
# Set environment variables
export GITHUB_USER="your-github-username"          # Example: john-doe
export GITHUB_PAT="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"   # Your token

# Login to GHCR
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
```

### Expected output:
```
Login Succeeded
```

### If login fails:
```bash
# Check token validity
curl -H "Authorization: token $GITHUB_PAT" https://api.github.com/user

# Expected output includes your GitHub login
# If "Bad credentials", token is invalid or expired
```

---

## Step 3: Verify Token Permissions

### Check if token can pull images:

```bash
# Try pulling an image
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:latest

# Should show: "Downloaded newer image for ghcr.io/trimurtisangampune-bot/fms/backend:latest"
# If "401 Unauthorized", token lacks `read:packages` permission
```

### Verify token scopes via API:
```bash
curl -H "Authorization: token $GITHUB_PAT" https://api.github.com/user

# Look for "scopes" in response
# Should include "read:packages"
```

---

## Step 4: Make Login Persistent

### Option A: Store credentials in Docker config (automatic):

```bash
# Login via docker (stores credentials in ~/.docker/config.json)
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

# Verify credentials stored
cat ~/.docker/config.json
# Should show ghcr.io entry
```

### Option B: Use credential helper (more secure):

```bash
# Install pass or credential-helper
sudo apt install -y pass

# Configure Docker to use credential helper
mkdir -p ~/.docker
cat > ~/.docker/config.json << 'EOF'
{
  "credHelpers": {
    "ghcr.io": "pass"
  }
}
EOF

# Login (credentials stored encrypted in pass)
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
```

### Option C: Use environment variables (for CI/CD):

```bash
# In CI/CD pipeline (GitHub Actions, GitLab CI, etc.)
export DOCKER_USERNAME=${{ secrets.DOCKER_USERNAME }}
export DOCKER_PASSWORD=${{ secrets.DOCKER_PASSWORD }}

# Login
echo "$DOCKER_PASSWORD" | docker login ghcr.io -u "$DOCKER_USERNAME" --password-stdin
```

---

## Step 5: Rotate PAT Before Expiration

### When PAT is about to expire:

1. **Create new PAT** (follow Step 1)
2. **Update deployment systems** with new token
3. **Revoke old PAT** (GitHub Settings → Personal access tokens → Delete)

### Set calendar reminder:
```bash
# Add to calendar (90 days from token creation)
# Linux: 
timedatectl
# Note today's date, add 90 days
```

---

## Step 6: Troubleshooting

### "401 Unauthorized" when pulling images:

**Root causes:**
- Token expired → Create new token (Step 1)
- Token lacks `read:packages` scope → Regenerate with correct scopes
- Wrong username → Check `$GITHUB_USER` matches token owner
- Token not set in environment → Re-run login command

**Fix:**
```bash
# Verify token is valid
curl -H "Authorization: token $GITHUB_PAT" https://api.github.com/user
# Should succeed with 200 OK

# Re-login
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

# Try pull again
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:latest
```

### "credentials not found" when running docker compose:

**Root cause:** Credentials stored for logged-in user, but docker compose running as different user (e.g., root).

**Fix:**
```bash
# Option A: Login as the user running docker compose
# sudo docker login ... (if running as root)

# Option B: Configure sudo to preserve environment
echo "Defaults env_keep=\"DOCKER_USERNAME DOCKER_PASSWORD\"" | sudo tee /etc/sudoers.d/docker
```

### Token leaked (accidentally committed or exposed):

**Immediate actions:**
1. Go to GitHub Settings → Personal access tokens
2. **Immediately delete/revoke the exposed token**
3. Create a new token
4. Update all systems using old token
5. Check GitHub audit log for unauthorized access

```bash
# Revoke command (via GitHub CLI, if installed)
gh auth logout
# Then create new token and re-auth
```

---

## Security Best Practices

| ✅ DO | ❌ DON'T |
|------|---------|
| Create PAT with minimal scopes (`read:packages` only) | Use personal GitHub password for docker login |
| Set expiration date (90 days recommended) | Store PAT in version control (.git) |
| Rotate PAT regularly | Use same PAT across multiple systems |
| Store PAT in secure password manager | Log PAT in stdout/logs |
| Revoke immediately if leaked | Share PAT in emails or Slack |
| Use different PAT per environment | Set expiration to "no expiration" |
| Store PAT in CI/CD secrets (GitHub Actions, etc.) | Hardcode PAT in docker-compose.yml or .env |

---

## Reference Scopes

| Scope | Purpose | Required for FMS? |
|-------|---------|-------------------|
| `read:packages` | Pull images from GHCR | ✅ **YES** |
| `write:packages` | Push/upload images to GHCR | ❌ No (only needed for maintainers) |
| `delete:packages` | Delete packages from GHCR | ❌ No |
| `repo` | Access private repositories | ❌ No (FMS images are public) |
| `workflow` | Access GitHub Actions | ❌ No |
| `admin` | Full account access | ❌ **Dangerous—never use** |

---

## Example Secure Deployment Script

```bash
#!/bin/bash
# File: deploy-fms.sh (make it executable: chmod +x deploy-fms.sh)

set -e  # Exit on error

# Load credentials from secure source (GitHub Secrets, pass, etc.)
# DO NOT hardcode below
read -sp "GitHub Username: " GITHUB_USER
echo
read -sp "GitHub PAT (read:packages only): " GITHUB_PAT
echo

# Set environment
export GITHUB_USER GITHUB_PAT
cd /opt/fms

# Login to GHCR
echo "$GITHUB_PAT" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

# Pull images (use commit SHA for reproducibility)
COMMIT_SHA="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
docker pull ghcr.io/trimurtisangampune-bot/fms/db:$COMMIT_SHA
docker pull ghcr.io/trimurtisangampune-bot/fms/backend:$COMMIT_SHA
docker pull ghcr.io/trimurtisangampune-bot/fms/frontend:$COMMIT_SHA

# Update .env with SHA
sed -i "s|DB_IMAGE=.*|DB_IMAGE=ghcr.io/trimurtisangampune-bot/fms/db:$COMMIT_SHA|" .env
sed -i "s|BACKEND_IMAGE=.*|BACKEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/backend:$COMMIT_SHA|" .env
sed -i "s|FRONTEND_IMAGE=.*|FRONTEND_IMAGE=ghcr.io/trimurtisangampune-bot/fms/frontend:$COMMIT_SHA|" .env

# Start services
docker compose up -d

echo "FMS deployed successfully!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:80"
```

---

## Next Steps

1. Create PAT with `read:packages` scope (Step 1)
2. Login to GHCR on deployment system (Step 2)
3. Verify access by pulling a test image (Step 3)
4. Make login persistent for convenience (Step 4)
5. Follow [DEPLOYMENT_LINUX_COMMANDS.md](DEPLOYMENT_LINUX_COMMANDS.md) for full deployment
