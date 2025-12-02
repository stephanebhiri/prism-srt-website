# Database Backup & Restore

**Automatic backup system for user database (gateway.db)**

## Overview

The SRT Router includes an automatic database backup system to protect your users and presets data.

**What's Backed Up:**
- ✅ Users (admin, operators, viewers)
- ✅ Presets (input/output configurations)

**What's NOT Backed Up (separate JSON files):**
- ❌ Routes (stored in `routes.json`)
- ❌ System configuration

## Quick Reference

```bash
# Manual backup (anytime)
npm run db:backup

# List available backups
npm run db:list-backups

# Restore from backup
npm run db:restore <backup-filename>

# Setup automatic daily backups (3 AM)
./scripts/setup-daily-backup.sh
```

## Backup Storage

**Location:** `/opt/mini-nimble/data/backups/`

**Filename Format:** `gateway_YYYY-MM-DDTHH-MM-SS.db.gz`

**Retention:** Last 30 backups are kept automatically (older backups are auto-deleted)

**Compression:** All backups are gzip compressed to save disk space

## Manual Backup

Create a backup anytime with:

```bash
npm run db:backup
```

**Example Output:**
```
[Backup] Creating database backup...
[Backup] ✓ Backup successful: /opt/mini-nimble/data/backups/gateway_2025-10-23T09-12-27.db
[Backup] ✓ Compressed: /opt/mini-nimble/data/backups/gateway_2025-10-23T09-12-27.db.gz
[Backup] Total backups: 5
```

## Automatic Daily Backups

To setup automatic daily backups at 3:00 AM:

```bash
cd /opt/mini-nimble
./scripts/setup-daily-backup.sh
```

This will:
1. Create a cron job to run backups daily
2. Store backup logs in `logs/backup.log`
3. Auto-cleanup old backups (keep last 30)

**Verify Cron Job:**
```bash
crontab -l | grep backup-database
```

## Restore Database

### 1. List Available Backups

```bash
npm run db:list-backups
```

**Example Output:**
```
Available backups:
  1. gateway_2025-10-23T09-12-27.db.gz (1.8 KB) - 10/23/2025, 11:12:27 AM
  2. gateway_2025-10-22T03-00-01.db.gz (1.7 KB) - 10/22/2025, 3:00:01 AM
  3. gateway_2025-10-21T03-00-01.db.gz (1.6 KB) - 10/21/2025, 3:00:01 AM

To restore, run:
  npm run db:restore gateway_2025-10-23T09-12-27.db.gz
```

### 2. Restore from Backup

```bash
npm run db:restore gateway_2025-10-23T09-12-27.db.gz
```

**⚠️ Warning:** This will REPLACE your current database!

The script will:
1. Ask for confirmation
2. Backup current database before restoring
3. Decompress and restore the selected backup
4. Prompt you to restart the server

### 3. Restart Server

After restoring, restart the server:

```bash
npm run pm2:restart
```

## Troubleshooting

### Backup Failed

Check if the database is locked:
```bash
lsof /opt/mini-nimble/data/gateway.db
```

If locked, stop the server temporarily:
```bash
npm run pm2:stop
npm run db:backup
npm run pm2:start
```

### No Backups Found

Check if backup directory exists:
```bash
ls -lh /opt/mini-nimble/data/backups/
```

If empty, create your first backup:
```bash
npm run db:backup
```

### Restore Failed

1. Check if backup file exists:
   ```bash
   ls -lh /opt/mini-nimble/data/backups/
   ```

2. Try decompressing manually:
   ```bash
   gunzip -c /opt/mini-nimble/data/backups/gateway_YYYY-MM-DDTHH-MM-SS.db.gz > /tmp/test.db
   ```

3. Verify backup integrity:
   ```bash
   file /tmp/test.db
   # Should show: SQLite 3.x database
   ```

## Disk Space Management

Backups are compressed (gzip) and automatically cleaned up:
- **Average backup size:** ~2 KB compressed
- **30 backups:** ~60 KB total
- **Old backups:** Auto-deleted after 30 backups

To manually clean up old backups:
```bash
cd /opt/mini-nimble/data/backups
ls -lt gateway_*.db.gz | tail -n +11 | awk '{print $9}' | xargs rm -f
```

## Recovery Scenarios

### Lost Admin Password

1. Restore from recent backup:
   ```bash
   npm run db:restore <backup-with-working-credentials>
   npm run pm2:restart
   ```

2. Or create new admin:
   ```bash
   npm run create-admin
   ```

### Database Corrupted

1. Stop server:
   ```bash
   npm run pm2:stop
   ```

2. Restore from backup:
   ```bash
   npm run db:restore <most-recent-backup>
   ```

3. Start server:
   ```bash
   npm run pm2:start
   ```

### Accidentally Deleted Users

1. Check backup before deletion:
   ```bash
   npm run db:list-backups
   ```

2. Restore from backup:
   ```bash
   npm run db:restore <backup-before-deletion>
   npm run pm2:restart
   ```

## Security Considerations

**Backup Files Contain:**
- Usernames
- Password hashes (bcrypt - safe)
- User roles

**Recommendations:**
1. Keep `/opt/mini-nimble/data/backups/` directory secure (chmod 700)
2. Regularly copy backups to off-site storage
3. Encrypt backups if storing externally

**Secure Backups Directory:**
```bash
chmod 700 /opt/mini-nimble/data/backups/
```

## Offsite Backup (Optional)

To copy backups to external storage:

```bash
# Copy to external drive
cp /opt/mini-nimble/data/backups/gateway_*.db.gz /mnt/backup/

# Or use rsync for remote backup
rsync -avz /opt/mini-nimble/data/backups/ user@backup-server:/backups/srt-router/
```

## Monitoring Backup Logs

View backup execution history:

```bash
tail -f /opt/mini-nimble/logs/backup.log
```

Check if daily backups are working:

```bash
grep "Backup successful" /opt/mini-nimble/logs/backup.log | tail -n 7
```

## FAQ

**Q: Why did I lose my users?**
A: The database file may have been deleted or corrupted. Always use automatic backups to prevent data loss.

**Q: Are routes backed up?**
A: No, routes are stored in `routes.json` (separate file). They won't be lost when the database is reset.

**Q: How often should I backup?**
A: Daily automatic backups (3 AM) are sufficient for most cases. Manual backup before major changes is recommended.

**Q: Can I restore while server is running?**
A: Yes, but you MUST restart the server after restoring for changes to take effect.

**Q: Where are backup logs stored?**
A: `/opt/mini-nimble/logs/backup.log`

## Related Documentation

- [AUTHENTICATION.md](./AUTHENTICATION.md) - User authentication and roles
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Server deployment and PM2 setup
