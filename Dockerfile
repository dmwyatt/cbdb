FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

# Install uv (pinned for reproducibility)
COPY --from=ghcr.io/astral-sh/uv:0.9.21 /uv /uvx /bin/

# Install dependencies first (better layer caching)
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project --compile-bytecode

# Copy application code
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY app.py dropbox_api.py ./

# Final sync to install project
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --compile-bytecode

ENV PORT=5000
CMD ["uv", "run", "gunicorn", "--timeout", "120", "--bind", "0.0.0.0:5000", "app:app"]
