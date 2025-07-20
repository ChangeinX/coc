FROM python:3.11-slim

# Build this image from within the root directory:
#   docker build -f clan-service/Dockerfile -t clash-of-clans/clan-service .
WORKDIR /opt/app

# install dependencies
COPY clan-service/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

# copy the backend source
COPY . .

# include shared library and migrations
COPY clan-service/              ./
COPY coclib/                ./coclib
COPY migrations/            ./migrations

EXPOSE 8001

CMD ["sh", "-c", "uvicorn run:asgi_app --host 0.0.0.0 --port ${PORT:-80} --workers 1"]

