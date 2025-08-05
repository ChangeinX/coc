FROM python:3.11-slim

# Build this image from within the root directory:
#   docker build -f recruiting-py/Dockerfile -t clash-of-clans/recruiting-service .
WORKDIR /opt/app

# install dependencies
COPY recruiting-py/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# copy the service source
COPY . .

# include shared library and migrations
COPY recruiting-py/           ./
COPY coclib/                 ./coclib
COPY migrations/             ./migrations

EXPOSE 8002

CMD ["sh", "-c", "uvicorn run:asgi_app --host 0.0.0.0 --port ${PORT:-80} --workers 1"]
