FROM python:3.11-slim

WORKDIR /opt/app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["sh", "-c", "uvicorn run:asgi_app \
  --host 0.0.0.0 \
  --port ${PORT:-8000} \
  --workers 1"]