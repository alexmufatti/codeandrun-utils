FROM python:3.12-alpine

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sync.py .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Cron: every day at 06:00
RUN echo "0 6 * * * cd /app && python sync.py >> /proc/1/fd/1 2>&1" > /etc/crontabs/root

RUN mkdir -p /data/garmin_tokens

ENTRYPOINT ["/entrypoint.sh"]
