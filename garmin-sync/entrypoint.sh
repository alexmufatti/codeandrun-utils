#!/bin/sh
# Run once immediately on startup, then hand off to crond
python /app/sync.py
exec crond -f -l 2
