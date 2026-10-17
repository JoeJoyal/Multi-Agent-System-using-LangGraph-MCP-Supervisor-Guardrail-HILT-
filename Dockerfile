```dockerfile
# ============================================================
# 1. BASE IMAGE
# ============================================================
FROM python:3.11-slim

# ============================================================
# 2. WORKING DIRECTORY
# ============================================================
WORKDIR /app

# Avoid generating .pyc files and enable real-time log output.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# ============================================================
# 3. SYSTEM DEPENDENCIES
# ============================================================
# Install build tools only if required by Python dependencies.
# curl is useful for container health checks and debugging.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ============================================================
# 4. INSTALL PYTHON DEPENDENCIES
# ============================================================
COPY requirements.txt .

RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# ============================================================
# 5. COPY APPLICATION CODE
# ============================================================
COPY . .

# ============================================================
# 6. NETWORK PORT
# ============================================================
EXPOSE 8000

# ============================================================
# 7. START FASTAPI
# ============================================================
# --host 0.0.0.0 makes the application reachable outside
# the container through its published Docker port.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```