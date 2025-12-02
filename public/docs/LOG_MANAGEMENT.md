# Log Management & Disk Space

## ⚠️ Log Accumulation Risk

SRT processes generate **very verbose logs**:
- Stats every second (PACKETS, RTT, BANDWIDTH, BUFFERLEFT)
- Connection status updates
- FFmpeg encoding progress

**Without rotation:** Logs can grow to **500MB - 10GB+ per day** depending on number of active routes!

## Current Mitigation (v1.0)

### Log Filtering in routeManager.js

SRT stats lines are now **filtered out** before writing to stdout/stderr:
- Lines containing "======= SRT STATS:" → NOT logged
- Lines containing "PACKETS" → NOT logged
- Lines containing "BUFFERLEFT" → NOT logged

**Impact:** ~90% reduction in log volume

**What's still logged:**
- Connection established/lost
- Error messages
- Route start/stop
- Process crashes
- All other important events

**Monitoring NOT affected:**
- Stats are still **parsed and sent to frontend** via WebSocket
- Monitor still tracks RTT, bandwidth, packets
- UI still shows real-time stats
- Only **disk logging** is reduced

## PM2 Log Rotation (Production)

### Install PM2 LogRotate Module

```bash
# Install rotation module
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 100M        # Rotate at 100MB
pm2 set pm2-logrotate:retain 7             # Keep 7 old files
pm2 set pm2-logrotate:compress true        # Gzip old logs
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # Daily at midnight
pm2 set pm2-logrotate:workerInterval 30    # Check every 30 seconds

# Verify configuration
pm2 conf pm2-logrotate
```

### What This Does

**Without rotation:**
```
logs/
  pm2-out.log  (grows forever → 50GB+ after months)
  pm2-error.log
```

**With pm2-logrotate:**
```
logs/
  pm2-out.log                        (current, max 100MB)
  pm2-out__2025-10-22_00-00-00.log.gz  (yesterday, compressed)
  pm2-out__2025-10-21_00-00-00.log.gz  (2 days ago)
  pm2-out__2025-10-20_00-00-00.log.gz  (3 days ago)
  ...
  (only keeps 7 most recent)
```

**Space savings:**
- Uncompressed 1 day: 2GB
- Compressed (gzip): ~200MB
- 7 days retained: ~1.4GB total (vs 14GB without compression!)

## Alternative: systemd with journalctl

If running with systemd instead of PM2:

### Automatic Log Rotation (Built-in)

systemd journals automatically rotate! Configure limits:

```bash
# /etc/systemd/journald.conf
[Journal]
SystemMaxUse=1G          # Max disk usage
SystemKeepFree=2G        # Keep 2GB free
SystemMaxFileSize=100M   # Rotate at 100MB
MaxRetentionSec=7day     # Keep 7 days
```

```bash
# Apply config
sudo systemctl restart systemd-journald
```

### View Logs

```bash
# View SRT gateway logs
journalctl -u srt-router -f

# Last 100 lines
journalctl -u srt-router -n 100

# Since yesterday
journalctl -u srt-router --since yesterday

# Disk usage
journalctl --disk-usage
```

## Manual Log Cleanup (Emergency)

If logs already huge and disk is full:

```bash
# Check current log sizes
du -sh logs/*.log

# Truncate PM2 logs (keeps last 1000 lines)
tail -n 1000 logs/pm2-out.log > logs/pm2-out.log.tmp && mv logs/pm2-out.log.tmp logs/pm2-out.log
tail -n 1000 logs/pm2-error.log > logs/pm2-error.log.tmp && mv logs/pm2-error.log.tmp logs/pm2-error.log

# Or delete old logs entirely
rm -f logs/*.log
pm2 restart srt-router
```

## Monitoring Disk Usage

### Setup Disk Alert (Cron)

Create `/usr/local/bin/check-disk-space.sh`:
```bash
#!/bin/bash
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
  echo "⚠️  Disk usage: ${USAGE}% - Consider cleaning logs"
  # Could send email/alert here
fi
```

Add to crontab:
```bash
# Check disk every hour
0 * * * * /usr/local/bin/check-disk-space.sh
```

## Log Levels (Future Enhancement)

Currently all logs go to stdout. Future improvement:

```javascript
// Configurable log levels
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';  // debug, info, warn, error

if (LOG_LEVEL === 'debug') {
  // Log SRT stats
}
// Always log errors, warnings, important events
```

## Recommended Setup for Production

**Immediate (Day 1):**
1. ✅ Log filtering already implemented (v1.0 - reduces 90%)
2. ⚠️ Install pm2-logrotate module
3. ⚠️ Set max_size=100M, retain=7, compress=true

**Short term (Week 1):**
4. Monitor disk usage daily
5. Check pm2-logrotate is working (`ls -lh logs/`)

**Long term (Month 1):**
6. Setup disk usage alerts
7. Consider moving to systemd if preferred
8. Add LOG_LEVEL environment variable

## Quick Win Checklist

```bash
# Install PM2 logrotate NOW (2 minutes)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# Verify
pm2 conf pm2-logrotate

# Check current log sizes
du -sh logs/

# Done! Logs will now auto-rotate ✅
```

## Troubleshooting

### Logs still growing after pm2-logrotate install

**Check if module is active:**
```bash
pm2 ls
# Should show pm2-logrotate in list
```

**Check config:**
```bash
pm2 conf pm2-logrotate
# Should show your settings
```

**Force rotation test:**
```bash
pm2 flush  # Clears all logs
pm2 reloadLogs  # Reloads log files
```

### Disk full emergency

```bash
# Find largest files
du -ah /var/log | sort -rh | head -20

# Clean PM2 logs
pm2 flush

# Clean system logs
sudo journalctl --vacuum-time=1d

# Clean old compressed logs
find logs/ -name "*.gz" -mtime +7 -delete
```

## Conclusion

**Current state:**
- ✅ Log filtering implemented (90% reduction)
- ⚠️ No automatic rotation yet

**Recommended action:**
- Install pm2-logrotate **before production deployment**
- Takes 2 minutes, saves headaches

**Without rotation:** Disk could fill in weeks/months depending on activity.
**With rotation:** Logs capped at ~1-2GB total (manageable forever).
