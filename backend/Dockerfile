# ── Build stage ────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies once; layer is cached as long as requirements.txt
# does not change.
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from the builder stage (keeps runtime image lean)
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .
RUN chmod +x /app/entrypoint.sh

# Collect static files at image build time.
# The SECRET_KEY here is only used during the build step, not at runtime.
RUN /bin/sh -c "SECRET_KEY=build-time-placeholder DEBUG=False ALLOWED_HOSTS='*' CORS_ALLOWED_ORIGINS=https://placeholder.example.com python manage.py collectstatic --noinput"

EXPOSE ${PORT}

CMD ["/app/entrypoint.sh"]
