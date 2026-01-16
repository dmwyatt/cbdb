FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY app.py dropbox_api.py ./
ENV PORT=5000
CMD gunicorn --timeout 120 --bind 0.0.0.0:$PORT app:app
