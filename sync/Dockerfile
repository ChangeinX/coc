FROM python:3.11-slim

# Build this image from within the root directory:
#   docker build -f sync/Dockerfile -t clan-boards/sync-package .

WORKDIR /opt/app

COPY sync/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY sync/ ./sync
COPY coclib/  ./coclib

# shared migration scripts
COPY migrations/ /opt/migrations
ENV PYTHONPATH=/opt/app

EXPOSE 8000

CMD ["sh", "-c", "uvicorn sync.run:asgi_app --host 0.0.0.0 --port ${PORT:-80} --workers 1"]
