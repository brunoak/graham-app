#!/bin/sh
# Start script for Railway deployment
# Railway provides PORT env variable, default to 8000 for local dev

PORT="${PORT:-8000}"
echo "Starting uvicorn on port $PORT"
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
