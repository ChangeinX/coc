FROM python:3.11-slim

# Build this image from the back-end directory using the repository root as the
# build context:
#   docker build -f Dockerfile ..

WORKDIR /opt/app
COPY back-end/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY back-end ./back-end
COPY coclib ./coclib
COPY migrations ./migrations

WORKDIR /opt/app/back-end

EXPOSE 8000

CMD ["sh", "-c", "uvicorn run:asgi_app \
  --host 0.0.0.0 \
  --port ${PORT:-80} \
  --workers 1"]

