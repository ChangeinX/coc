FROM --platform=linux/amd64 python:3.11-slim

WORKDIR /opt/app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["sh","-c","gunicorn --bind 0.0.0.0:${PORT:-8000} run:app"]