# PM2 Production Deployment

This application uses PM2 for production deployment with automatic restart, monitoring, and orphan process cleanup.

## Quick Start

### First Time Setup

```bash
# Install dependencies and build
npm run setup

# Start with PM2 (includes save + startup)
npm run pm2:setup
```

This will:
1. Start the application with PM2
2. Save the process list
3. Configure auto-start on system boot

### Daily Operations

```bash
# Start application
npm run pm2:start

# Stop application
npm run pm2:stop

# Restart application
npm run pm2:restart

# View logs (real-time)
npm run pm2:logs

# View process status
npm run pm2:status

# Monitor CPU/RAM usage
npm run pm2:monit
```

## Features

### Auto-Restart
- Automatically restarts if Node.js crashes
- Max 10 restarts within 1 minute
- Exponential backoff on rapid failures
- Memory limit: 500MB (restart if exceeded)

### Health Monitoring
- **Bandwidth checks** (every 10s)
  - Restarts if SRT bandwidth = 0 for >30s
  - Max 3 auto-restart attempts

- **FFmpeg checks** (every 10s)
  - Restarts if FPS = 0 for >10s (transcode mode)
  - Detects stalled encoding

- **Process crash detection**
  - Checks if child processes (srt-live-transmit, ffmpeg) crashed
  - Auto-restarts route if process disappeared

### Orphan Cleanup
- On startup, scans `/tmp/srt-gateway-pids/` for orphaned processes
- Kills any srt-live-transmit or ffmpeg from previous run
- Prevents zombie processes after crashes

### Logging
- Logs stored in `./logs/pm2-out.log` and `./logs/pm2-error.log`
- Timestamps on all log entries
- Combined logs for easier searching

## Advanced Usage

### Manual PM2 Commands

```bash
# Start with specific config
pm2 start ecosystem.config.cjs

# Start in cluster mode (NOT recommended for this app)
# pm2 start ecosystem.config.cjs -i 2

# Delete from PM2
pm2 delete srt-router

# Flush logs
pm2 flush

# Save current process list
pm2 save

# Resurrect saved processes
pm2 resurrect
```

### Environment Variables

```bash
# Production
pm2 start ecosystem.config.cjs --env production

# Development
pm2 start ecosystem.config.cjs --env development
```

### Auto-Start on Boot

```bash
# Generate startup script (run once)
pm2 startup

# Save current processes
pm2 save

# Disable auto-start
pm2 unstartup
```

## Monitoring

### PM2 Web Dashboard

```bash
# Install PM2 web interface
pm2 install pm2-server-monit

# Access at http://localhost:9615
```

### Process Info

```bash
# Detailed info
pm2 show srt-router

# Monitor in terminal
pm2 monit

# Real-time logs
pm2 logs --lines 100
```

## Troubleshooting

### App won't start

```bash
# Check logs
pm2 logs srt-router --err

# Check status
pm2 status

# Try manual start
node src/server.js
```

### Orphaned processes still running

```bash
# Find srt-live-transmit processes
ps aux | grep srt-live-transmit

# Kill manually
pkill -9 srt-live-transmit
pkill -9 ffmpeg

# Restart PM2
pm2 restart srt-router
```

### Too many restarts

```bash
# Check restart count
pm2 status

# Reset restart counter
pm2 reset srt-router

# Increase max_restarts in ecosystem.config.cjs
```

## Health Checker Configuration

Edit `src/container/awilixContainer.js` to tune health checker:

```javascript
const healthChecker = new HealthChecker(routeManager, {
  checkInterval: 10000,        // Check every 10s
  bandwidthStaleTimeout: 30000, // Restart if no bandwidth for 30s
  fpsStaleTimeout: 10000,       // Restart if FPS=0 for 10s
  maxRestartAttempts: 3,        // Max 3 auto-restart attempts
});
```

## Production Checklist

- [ ] `npm run setup` completed
- [ ] `npm run pm2:setup` completed
- [ ] Verify auto-start: `pm2 startup` configured
- [ ] Test restart: `pm2 restart srt-router`
- [ ] Monitor logs: `pm2 logs`
- [ ] Check health: Routes auto-restart when unhealthy
- [ ] Orphan cleanup: No zombie processes after crashes

## Systemd Integration (Production)

### Overview

On production servers (NY, LON, Beijing), PM2 is managed by systemd for automatic startup on server reboot.

**Architecture:**
```
Server Boot
    ↓
systemd (pm2-actua.service)
    ↓
PM2 Daemon
    ↓
├─ srt-router (main application)
└─ pm2-logrotate (log rotation module)
```

### Initial Setup

```bash
# 1. Start PM2 as user actua
su - actua -c "pm2 start /opt/mini-nimble/src/server.js --name srt-router"

# 2. Generate systemd service
su - actua -c "pm2 startup"

# 3. Execute the command shown (example):
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u actua --hp /home/actua

# 4. Save current process list
su - actua -c "pm2 save"

# 5. Verify systemd service
systemctl status pm2-actua
```

### Systemd Service Management

```bash
# Start PM2 via systemd
sudo systemctl start pm2-actua

# Stop PM2 via systemd
sudo systemctl stop pm2-actua

# Restart PM2 via systemd
sudo systemctl restart pm2-actua

# Check status
systemctl status pm2-actua

# View systemd logs
journalctl -u pm2-actua -f

# Enable auto-start on boot (should already be enabled)
sudo systemctl enable pm2-actua

# Disable auto-start on boot
sudo systemctl disable pm2-actua
```

### Verifying Boot Persistence

```bash
# Check if service is enabled
systemctl is-enabled pm2-actua
# Should output: enabled

# Check service status
systemctl status pm2-actua | grep -E "Loaded|Active"
# Should show: enabled and active (running)

# Check PM2 processes
su - actua -c "pm2 list"
# Should show: srt-router and pm2-logrotate online
```

### Troubleshooting Systemd

**Problem: Service is enabled but inactive (dead)**

This means PM2 is running manually, not via systemd. To fix:

```bash
# 1. Stop manual PM2
su - actua -c "pm2 kill"

# 2. Start via systemd
sudo systemctl start pm2-actua

# 3. Verify
systemctl status pm2-actua
su - actua -c "pm2 list"
```

**Problem: Processes not restored after reboot**

```bash
# 1. Check if dump.pm2 exists and is recent
ls -lh /home/actua/.pm2/dump.pm2

# 2. Update dump with current processes
su - actua -c "pm2 save"

# 3. Test resurrection manually
su - actua -c "pm2 kill && pm2 resurrect"
```

## Log Rotation (pm2-logrotate)

### Overview

pm2-logrotate is a PM2 module that automatically rotates logs to prevent disk space issues.

**Configuration (Production Servers):**
- **Max log size**: 100 MB per file
- **Retention**: 100 files (total ~10 GB)
- **Compression**: Enabled (gzip)
- **Rotation time**: At 00:00 daily + when size exceeded

### Installation

**For servers WITH internet access (NY, LON):**

```bash
# Install module
su - actua -c "pm2 install pm2-logrotate"

# Configure
su - actua -c "pm2 set pm2-logrotate:max_size 100M"
su - actua -c "pm2 set pm2-logrotate:retain 100"
su - actua -c "pm2 set pm2-logrotate:compress true"

# Save
su - actua -c "pm2 save"
```

**For servers WITHOUT internet access (Beijing):**

Since Beijing has no internet, the module must be copied from another server:

```bash
# On LON server, create tarball
ssh actua@213.86.161.190
cd /home/actua/.pm2/modules
tar czf /tmp/pm2-logrotate.tar.gz pm2-logrotate

# Transfer to Beijing (via your local machine)
# From local machine:
scp -P 22123 ibs@213.86.161.190:/tmp/pm2-logrotate.tar.gz ~/Downloads/
scp ~/Downloads/pm2-logrotate.tar.gz root@192.168.31.2:/tmp/

# On Beijing, extract and reorganize
cd /tmp
tar xzf pm2-logrotate.tar.gz

# Copy the actual module (not the wrapper)
cp -r pm2-logrotate/node_modules/pm2-logrotate /home/actua/.pm2/modules/
chown -R actua:actua /home/actua/.pm2/modules/pm2-logrotate

# Copy module config
cp /root/.pm2/module_conf.json /home/actua/.pm2/module_conf.json
chown actua:actua /home/actua/.pm2/module_conf.json

# Start the module manually
su - actua -c "pm2 start /home/actua/.pm2/modules/pm2-logrotate/app.js --name pm2-logrotate"
su - actua -c "pm2 save"
```

### Verification

```bash
# Check if module is running
su - actua -c "pm2 list"
# Should show pm2-logrotate in the list or as a Module section

# Check module configuration
su - actua -c "pm2 conf pm2-logrotate"

# Check logs are being rotated
ls -lh /opt/mini-nimble/logs/
# Should see rotated files with timestamps
```

### Log Rotation Calculation

- **Max size**: 100 MB per file
- **Retention**: 100 files
- **Total storage**: ~10 GB
- **Rotation frequency**:
  - At 00:00 daily
  - When file reaches 100 MB
- **Estimated retention time**:
  - At 30 MB/hour: ~13 days
  - At 50 MB/hour: ~8 days
  - At 100 MB/hour: ~4 days

### Updating Log Retention

```bash
# Change to 200 files (20 GB)
su - actua -c "pm2 set pm2-logrotate:retain 200"

# Change max size to 50 MB
su - actua -c "pm2 set pm2-logrotate:max_size 50M"

# Restart module to apply changes
su - actua -c "pm2 restart pm2-logrotate"
```

## Production Server Setup Script

For quick setup on new servers:

```bash
#!/bin/bash
# pm2-production-setup.sh

USER="actua"
APP_DIR="/opt/mini-nimble"

echo "Setting up PM2 for production..."

# Start application
su - $USER -c "cd $APP_DIR && pm2 start src/server.js --name srt-router"

# Install pm2-logrotate (requires internet)
su - $USER -c "pm2 install pm2-logrotate"
su - $USER -c "pm2 set pm2-logrotate:max_size 100M"
su - $USER -c "pm2 set pm2-logrotate:retain 100"
su - $USER -c "pm2 set pm2-logrotate:compress true"

# Configure systemd
su - $USER -c "pm2 startup" | grep "sudo" | bash

# Save process list
su - $USER -c "pm2 save"

# Verify
echo "Verifying setup..."
systemctl status pm2-$USER
su - $USER -c "pm2 list"

echo "Setup complete! PM2 will auto-start on boot."
```

## System Requirements

- Node.js 18+
- PM2 (installed globally recommended: `npm install -g pm2`)
- FFmpeg with SRT support
- srt-live-transmit
- systemd (for production auto-start)

## Files

- `ecosystem.config.cjs` - PM2 configuration
- `logs/pm2-out.log` - stdout logs
- `logs/pm2-error.log` - stderr logs
- `/tmp/srt-gateway-pids/` - PID tracking directory
- `/etc/systemd/system/pm2-actua.service` - systemd service file
- `/home/actua/.pm2/dump.pm2` - Saved PM2 process list
- `/home/actua/.pm2/module_conf.json` - PM2 modules configuration
