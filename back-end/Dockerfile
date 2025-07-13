FROM python:3.11-slim

WORKDIR /opt/app
COPY back-end/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY back-end ./back-end
COPY coclib ./coclib
COPY migrations ./migrations

EXPOSE 8000

CMD ["sh", "-c", "uvicorn back-end.run:asgi_app \
  --host 0.0.0.0 \
  --port ${PORT:-80} \
  --workers 1"]

