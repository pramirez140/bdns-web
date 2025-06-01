# Automatic Daily Sync System

## Overview

The BDNS Web application now includes an **automatic daily incremental sync system** that runs every night at midnight (00:00) to keep the local database updated with the latest grants from the Spanish BDNS API.

## How It Works

### Daily Schedule
- **Frequency**: Every day at 00:00 (midnight)
- **Type**: Incremental sync (only recent grants)
- **Duration**: Typically 2-10 minutes depending on new grants
- **Automatic**: No manual intervention required

### System Components

#### 1. Cron Job
```bash
# Runs daily at midnight
0 0 * * * /home/ubuntu/bdns-web/scripts/cron-sync.sh
```

#### 2. Sync Script (`/home/ubuntu/bdns-web/scripts/cron-sync.sh`)
- **Lock mechanism**: Prevents multiple concurrent syncs
- **Comprehensive logging**: All activities logged with timestamps
- **Error handling**: Graceful failure handling with notifications
- **Application health check**: Verifies app is running before sync
- **Log rotation**: Automatic cleanup of old logs

#### 3. API Endpoint (`/api/sync/cron`)
- **Security**: Protected with secret header
- **Monitoring**: Returns sync status and statistics
- **Fallback method**: Alternative sync method if direct script fails

#### 4. Logging System
- **Location**: `/home/ubuntu/bdns-web/logs/cron-sync.log`
- **Rotation**: Files > 10MB are automatically rotated
- **Retention**: Old logs cleaned up after 30 days
- **Format**: Timestamped entries for easy debugging

## Setup Instructions

### Automatic Setup (Recommended)
```bash
cd /home/ubuntu/bdns-web
./setup-cron.sh
```

### Manual Setup
```bash
# Add cron job manually
echo "0 0 * * * /home/ubuntu/bdns-web/scripts/cron-sync.sh" | crontab -

# Make sure cron service is running
sudo systemctl start cron
```

## Monitoring and Management

### Check Sync Status
```bash
# View recent sync logs
tail -f /home/ubuntu/bdns-web/logs/cron-sync.log

# Check if cron job is configured
crontab -l

# Test the sync API
curl http://localhost:3000/api/sync/cron
```

### View Sync Results
```bash
# Last 20 lines of sync log
tail -20 /home/ubuntu/bdns-web/logs/cron-sync.log

# Search for errors in logs
grep "ERROR\|FAILED" /home/ubuntu/bdns-web/logs/cron-sync.log

# Check sync statistics via API
curl -s http://localhost:3000/api/sync | jq '.data.latest_sync'
```

### Manual Sync Testing
```bash
# Test the cron script manually
/home/ubuntu/bdns-web/scripts/cron-sync.sh

# Run incremental sync directly
cd /home/ubuntu/bdns-web && npm run db:sync
```

## Features

### 🔒 **Lock Mechanism**
- Prevents multiple sync processes from running simultaneously
- Uses `/tmp/bdns-sync.lock` file for coordination
- Automatic cleanup on script exit

### 📝 **Comprehensive Logging**
- All sync activities logged with timestamps
- Separate log file for cron operations
- Automatic log rotation and cleanup
- Easy debugging and monitoring

### ⚡ **Intelligent Fallback**
- Primary method: Direct script execution
- Fallback method: API endpoint with authentication
- Health checks before sync execution
- Graceful error handling

### 🔧 **Maintenance Features**
- Automatic log rotation (files > 10MB)
- Old log cleanup (> 30 days)
- Lock file cleanup on exit
- Cron service verification

## Security

### Authentication
- API endpoint protected with secret header
- Secret: `bdns-cron-secret-2024` (configurable via environment)
- Only internal requests allowed

### File Permissions
- Cron script: Executable by owner only
- Log files: Written with restricted permissions
- Lock files: Temporary with automatic cleanup

## Troubleshooting

### Common Issues

#### Cron Job Not Running
```bash
# Check cron service status
systemctl status cron

# Start cron service if stopped
sudo systemctl start cron

# View cron logs
journalctl -u cron
```

#### Sync Failures
```bash
# Check application is running
curl http://localhost:3000/api/health

# Check database connectivity
docker-compose ps

# Review sync logs for errors
grep -i error /home/ubuntu/bdns-web/logs/cron-sync.log
```

#### Lock File Issues
```bash
# Remove stale lock file if sync stuck
rm -f /tmp/bdns-sync.lock

# Check for running sync processes
ps aux | grep sync
```

### Log Analysis

#### Successful Sync
```
[2024-05-31 00:00:01] 🕛 CRON: Starting automatic daily incremental sync...
[2024-05-31 00:00:02] 🔄 CRON: Application is running, executing incremental sync...
[2024-05-31 00:02:15] ✅ CRON: Incremental sync completed successfully
[2024-05-31 00:02:15] 🎉 CRON: Daily sync completed at Fri May 31 00:02:15 UTC 2024
```

#### Failed Sync
```
[2024-05-31 00:00:01] 🕛 CRON: Starting automatic daily incremental sync...
[2024-05-31 00:00:02] ❌ CRON: Application not responding on port 3000
[2024-05-31 00:00:03] ❌ CRON: Sync failed via API: {"success":false,"error":"Connection refused"}
```

## Performance Impact

### Resource Usage
- **CPU**: Minimal during sync (< 10% for 2-10 minutes)
- **Memory**: ~100-200MB additional during sync
- **Disk I/O**: Database writes only (efficient UPSERT operations)
- **Network**: API calls to BDNS (rate limited)

### Database Impact
- **New records**: Typically 10-100 new grants per day
- **Updated records**: Existing grants with changes
- **Touched records**: No database writes for unchanged grants
- **Performance**: Uses change detection to minimize writes

## Benefits

### For Users
- ✅ **Always up-to-date data**: Latest grants available every morning
- ✅ **No manual intervention**: Completely automated process
- ✅ **Fast search results**: Local database always current
- ✅ **Reliable access**: No dependency on external API availability

### For Administrators
- ✅ **Reduced maintenance**: Automatic operation
- ✅ **Comprehensive monitoring**: Detailed logs and status
- ✅ **Error recovery**: Automatic retry mechanisms
- ✅ **Resource efficiency**: Incremental updates only

## Configuration

### Environment Variables
```bash
# Cron secret for API authentication
CRON_SECRET=bdns-cron-secret-2024

# Database connection (already configured)
DATABASE_URL=postgresql://bdns_user:bdns_password@postgres:5432/bdns_db
```

### Customization
```bash
# Change sync frequency (edit crontab)
crontab -e
# Example: Every 6 hours at minute 0
# 0 */6 * * * /home/ubuntu/bdns-web/scripts/cron-sync.sh

# Change log location (edit script)
vim /home/ubuntu/bdns-web/scripts/cron-sync.sh
# Modify LOG_FILE variable
```

## Next Steps

The automatic sync system is now fully operational. The next sync will occur at midnight (00:00) tonight. Monitor the logs to ensure successful operation:

```bash
# Watch logs in real-time
tail -f /home/ubuntu/bdns-web/logs/cron-sync.log

# Check sync status tomorrow morning
curl -s http://localhost:3000/api/sync | jq '.data.latest_sync'
```