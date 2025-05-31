#!/bin/bash

# BDNS Web - Daily Incremental Sync Cron Job
# Runs daily at 00:00 to sync recent grants from BDNS

LOG_FILE="/home/ubuntu/bdns-web/logs/cron-sync.log"
LOCK_FILE="/tmp/bdns-sync.lock"
APP_DIR="/home/ubuntu/bdns-web"
CRON_SECRET="bdns-cron-secret-2024"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check if sync is already running
if [ -f "$LOCK_FILE" ]; then
    log "❌ CRON: Sync already running (lock file exists), skipping..."
    exit 1
fi

# Create lock file
touch "$LOCK_FILE"

# Ensure lock file is removed on exit
trap 'rm -f "$LOCK_FILE"' EXIT

log "🕛 CRON: Starting automatic daily incremental sync..."

# Change to app directory
cd "$APP_DIR" || {
    log "❌ CRON: Failed to change to app directory: $APP_DIR"
    exit 1
}

# Check if the application is running (try development port 3001 first)
if curl -s http://localhost:3001/api/health > /dev/null; then
    APP_PORT=3001
    log "📱 CRON: Using development container on port 3001"
elif curl -s http://localhost:3000/api/health > /dev/null; then
    APP_PORT=3000
    log "📱 CRON: Using production container on port 3000"
else
    log "❌ CRON: Application not responding on either port 3000 or 3001"
    exit 1
fi

# Try sync via API
log "🔄 CRON: Executing sync via API on port $APP_PORT..."
RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "x-cron-secret: $CRON_SECRET" \
    http://localhost:$APP_PORT/api/sync/cron)

if echo "$RESPONSE" | grep -q '"success":true'; then
    log "✅ CRON: Sync completed successfully via API"
    log "📊 CRON: Response: $RESPONSE"
else
    log "❌ CRON: Sync failed via API: $RESPONSE"
    exit 1
fi

log "🎉 CRON: Daily sync completed at $(date)"

# Clean up old log files (keep last 30 days)
find "$(dirname "$LOG_FILE")" -name "cron-sync.log.*" -mtime +30 -delete 2>/dev/null || true

# Rotate log file if it's too large (> 10MB)
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 10485760 ]; then
    mv "$LOG_FILE" "${LOG_FILE}.$(date +%Y%m%d)"
    log "📝 CRON: Log file rotated"
fi
