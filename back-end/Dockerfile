FROM python:3.11-slim

# Build this image from within the `back-end` directory:
#   docker build -t clash-of-clans/clan-boards-api .

WORKDIR /opt/app

# install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy the backend source
COPY . .

# include shared library and migrations
COPY ../coclib ./coclib
COPY ../migrations ./migrations

EXPOSE 8000

CMD ["sh", "-c", "uvicorn run:asgi_app --host 0.0.0.0 --port ${PORT:-80} --workers 1"]

