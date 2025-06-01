#!/bin/bash

# BDNS Web - Automatic Daily Sync Setup Script
# This script sets up a cron job to run incremental sync daily at midnight

echo "🔧 Setting up automatic daily incremental sync for BDNS Web..."

# Create the cron script
CRON_SCRIPT="/home/ubuntu/bdns-web/scripts/cron-sync.sh"
cat > "$CRON_SCRIPT" << 'EOF'
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

# Check if the application is running
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    log "⚠️ CRON: Application not responding on port 3000, trying via cron API..."
    
    # Try direct sync via API
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "x-cron-secret: $CRON_SECRET" \
        http://localhost:3000/api/sync/cron)
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        log "✅ CRON: Sync completed successfully via API"
        log "📊 CRON: Response: $RESPONSE"
    else
        log "❌ CRON: Sync failed via API: $RESPONSE"
        exit 1
    fi
else
    # Application is running, use direct script execution
    log "🔄 CRON: Application is running, executing incremental sync..."
    
    # Run incremental sync
    if npm run db:sync >> "$LOG_FILE" 2>&1; then
        log "✅ CRON: Incremental sync completed successfully"
    else
        log "❌ CRON: Incremental sync failed"
        exit 1
    fi
fi

log "🎉 CRON: Daily sync completed at $(date)"

# Clean up old log files (keep last 30 days)
find "$(dirname "$LOG_FILE")" -name "cron-sync.log.*" -mtime +30 -delete 2>/dev/null || true

# Rotate log file if it's too large (> 10MB)
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 10485760 ]; then
    mv "$LOG_FILE" "${LOG_FILE}.$(date +%Y%m%d)"
    log "📝 CRON: Log file rotated"
fi
EOF

# Make the cron script executable
chmod +x "$CRON_SCRIPT"

# Create logs directory
mkdir -p /home/ubuntu/bdns-web/logs

# Set up the cron job (daily at midnight)
CRON_JOB="0 0 * * * $CRON_SCRIPT"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$CRON_SCRIPT"; then
    echo "⚠️  Cron job already exists, updating..."
    # Remove existing job and add new one
    (crontab -l 2>/dev/null | grep -v "$CRON_SCRIPT"; echo "$CRON_JOB") | crontab -
else
    echo "➕ Adding new cron job..."
    # Add new job to existing crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
fi

# Verify cron service is running
if systemctl is-active --quiet cron 2>/dev/null; then
    echo "✅ Cron service is running"
elif systemctl is-active --quiet crond 2>/dev/null; then
    echo "✅ Crond service is running"
elif service cron status >/dev/null 2>&1; then
    echo "✅ Cron service is running"
else
    echo "⚠️  Starting cron service..."
    if command -v systemctl >/dev/null; then
        sudo systemctl start cron 2>/dev/null || sudo systemctl start crond 2>/dev/null || true
    else
        sudo service cron start 2>/dev/null || true
    fi
fi

echo ""
echo "🎉 Automatic daily sync setup completed!"
echo "📋 Summary:"
echo "   • Cron job: Daily at 00:00 (midnight)"
echo "   • Script: $CRON_SCRIPT"
echo "   • Logs: /home/ubuntu/bdns-web/logs/cron-sync.log"
echo "   • Lock file: /tmp/bdns-sync.lock"
echo ""
echo "📝 Current crontab entries:"
crontab -l 2>/dev/null | grep -E "(bdns|sync)" || echo "   (No BDNS-related cron jobs found)"
echo ""
echo "🔍 To check the setup:"
echo "   • View cron logs: tail -f /home/ubuntu/bdns-web/logs/cron-sync.log"
echo "   • Test sync API: curl http://localhost:3000/api/sync/cron"
echo "   • View crontab: crontab -l"
echo "   • Check next run: Next midnight (00:00)"
echo ""
echo "⚡ To test the sync immediately:"
echo "   $CRON_SCRIPT"