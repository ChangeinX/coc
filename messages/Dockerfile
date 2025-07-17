FROM python:3.11-slim

# Build this image from within the root directory:
#   docker build -f messages/Dockerfile -t clan-boards/message-service .

WORKDIR /opt/app

COPY messages/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY messages/ ./messages
COPY coclib/ ./coclib
COPY migrations/ ./migrations

ENV PYTHONPATH=/opt/app


EXPOSE 8010

CMD ["sh", "-c", "uvicorn messages.run:asgi_app --host 0.0.0.0 --port ${PORT:-80} --workers 1"]
