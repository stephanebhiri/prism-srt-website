# Process Management

**Automatic orphan process cleanup and lifecycle management**

## Overview

The SRT Router includes robust process management to prevent orphaned `srt-live-transmit` and `ffmpeg` processes from surviving server crashes or reboots.

## Why Aggressive Cleanup is Safe

In broadcast/streaming environments, process cleanup is a **standard best practice**:

### Characteristics of SRT/FFmpeg Processes

| Property | Description |
|----------|-------------|
| **Stateless** | No persistent data stored |
| **Transitive** | Only transmit live streams |
| **Restartable** | Can be restarted in milliseconds |
| **Isolated** | No shared state between processes |

**Result:** Killing these processes is safe and hygienic, like restarting a network service.

### Industry Standard Practice

| Environment | Standard Cleanup Command |
|-------------|-------------------------|
| SRT/RTP/UDP | `pkill -9 srt-live-transmit` |
| FFmpeg workers | `pkill -9 ffmpeg` |
| GPU encoders | `pkill -9 nvidia-smi` |
| Process routers | `systemctl restart router.service` |

**Goal:** Zero zombie processes before restarting routes.

## Automatic Orphan Cleanup

### How It Works

When the server starts, `RouteManager` initializes `PidManager` which performs:

```javascript
this.pidManager.cleanupOrphans();
```

**Cleanup Process:**

1. **Step 1 (Original):** Kill processes with PID files in `/tmp/srt-gateway-pids/`
   - Reads all `.pid` files
   - Sends SIGTERM/SIGKILL to each PID
   - Removes PID files

2. **Step 2 (Enhanced - NEW):** Kill orphaned processes WITHOUT PID files
   - Scans all running `srt-live-transmit` processes via `ps aux`
   - Identifies processes without corresponding PID files
   - Kills them with SIGTERM/SIGKILL
   - Cleans up any remaining PID files

**Why Step 2 is Critical:**
- `/tmp` is cleared on system reboot (volatile)
- Server crashes don't clean up PID files
- Orphaned processes survive indefinitely without this step

### Enhanced Implementation

**File:** `src/services/pidManager.js`

```javascript
cleanupOrphans() {
  // Step 1: Kill processes with PID files
  const files = fs.readdirSync(PID_DIR).filter(f => f.endsWith('.pid'));
  for (const file of files) {
    const pid = readPidFromFile(file);
    if (isProcessRunning(pid)) {
      killProcess(pid);
    }
  }

  // Step 2: Kill srt-live-transmit processes WITHOUT PID files (NEW)
  const orphanedSrt = this.findOrphanedSrtProcesses();
  for (const proc of orphanedSrt) {
    console.log(`Killing orphaned srt-live-transmit PID ${proc.pid}`);
    killProcess(proc.pid);
  }
}

findOrphanedSrtProcesses() {
  // Get all srt-live-transmit processes via ps aux
  const result = spawnSync('ps', ['aux'], { encoding: 'utf8' });
  const processes = parseProcessList(result.stdout);

  // Filter processes without PID files
  return processes.filter(proc => !this.hasPidFile(proc.pid));
}
```

### Example Startup Logs

```
[RouteManager] Cleaning up orphaned processes...
[PidManager] Found 0 PID file(s), cleaning up orphans...
[PidManager] Found 2 orphaned srt-live-transmit process(es) without PID files
[PidManager] Killing orphaned srt-live-transmit PID 232607
[PidManager] Killing orphaned srt-live-transmit PID 232617
[PidManager] Orphan cleanup complete: 2 killed, 0 errors
[RouteManager] Orphan cleanup: 2 processes killed, 0 errors
```

## Manual Cleanup Script

For situations requiring manual intervention:

### Interactive Cleanup

```bash
npm run cleanup:srt
```

**What it does:**
1. Lists all `srt-live-transmit` processes with PID, CPU %, and command
2. Asks for confirmation
3. Kills all processes (including process groups)
4. Cleans up PID files

**Example Output:**
```
[Cleanup] Found 5 srt-live-transmit process(es):
  1. PID 232607 (1.0% CPU) - srt-live-transmit -s:500 srt://192.168.1.100:4082...
  2. PID 232617 (0.9% CPU) - srt-live-transmit -s:500 udp://127.0.0.1:34521...
  3. PID 283076 (7.6% CPU) - srt-live-transmit -s:1000 srt://62.23.181.196:10000...

⚠️  Kill all 5 process(es)? (yes/no):
```

### Script Location

`scripts/cleanup-all-srt.js` - Manual cleanup utility

**Features:**
- ✅ Lists all SRT processes with details
- ✅ Confirmation required (safe)
- ✅ Kills process groups (thorough)
- ✅ Cleans up PID files

## Process Lifecycle

### Route Start

1. **Pre-start checks**
   - Validate configuration
   - Check port availability
   - Verify collision-free ports

2. **Process spawning**
   - Spawn `srt-live-transmit` processes
   - Spawn `ffmpeg` (if transcoding)
   - Save PIDs to `/tmp/srt-gateway-pids/`

3. **Monitoring**
   - HealthChecker monitors FPS and bandwidth
   - RouteMonitor tracks stats every second
   - Auto-restart on unhealthy conditions

### Route Stop

1. **Graceful shutdown**
   - Send SIGTERM to all processes
   - Wait 3 seconds for graceful exit

2. **Force kill**
   - Send SIGKILL if still running
   - Kill process groups (includes child processes)

3. **Cleanup**
   - Remove PID files
   - Update route status to "stopped"
   - Broadcast status update to clients

### Server Restart

1. **Automatic cleanup** (on startup)
   - Kill orphaned processes (with and without PID files)
   - Reset all route statuses to "stopped"

2. **Auto-start routes**
   - Start routes with `autoStart: true`
   - Update statuses to "running"

## PID File Management

### Storage Location

```
/tmp/srt-gateway-pids/
```

**Why `/tmp`?**
- ✅ Volatile (cleared on reboot) - prevents stale PIDs
- ✅ Fast access (tmpfs filesystem)
- ✅ Automatic cleanup by OS

**⚠️ Trade-off:**
- PID files lost on reboot
- Enhanced cleanup (Step 2) compensates for this

### PID File Format

**Filename:** `{routeId}_{processType}.pid`

**Examples:**
```
route_1761154355576_srt.pid
route_1761154355576_srtOut:6000.pid
route_1761154355576_ffmpeg.pid
```

**Content:**
```
283076
1761210663315
```
- Line 1: Process ID
- Line 2: Timestamp (milliseconds since epoch)

## Process Tracking

### Tracked Process Types

| Process Type | Description | PID File Name |
|--------------|-------------|---------------|
| `srt` | Main SRT input process | `{routeId}_srt.pid` |
| `srtOut:{port}` | SRT output per egress | `{routeId}_srtOut:{port}.pid` |
| `ffmpeg` | Transcoding process | `{routeId}_ffmpeg.pid` |
| `udpDuplicator` | UDP multicast duplicator | `{routeId}_udpDuplicator.pid` |

### Process States

| State | Description | Actions |
|-------|-------------|---------|
| **Running** | Process alive with valid PID | Monitor health |
| **Stopped** | Process killed, no PID file | Ready to start |
| **Orphaned** | Process running without PID file | Killed on startup |
| **Zombie** | Process dead but PID file exists | Cleaned on startup |

## Health Monitoring

### HealthChecker Integration

**File:** `src/services/healthChecker.js`

**Monitors:**
- **FPS (Frames Per Second):** Restart if FPS=0 for 10s
- **Bandwidth:** Restart if no bandwidth for 30s
- **Auto-restart:** Max 3 attempts before giving up

**Why separate from PID cleanup?**
- PID cleanup = startup hygiene (kill orphans)
- HealthChecker = runtime monitoring (restart unhealthy)

### Monitor Events

```javascript
healthChecker.on('routeUnhealthy', ({ routeId, reason }) => {
  console.warn(`Route ${routeId} unhealthy: ${reason}`);
});

healthChecker.on('routeRestarting', ({ routeId, attempts }) => {
  console.log(`Restarting route ${routeId} (attempt ${attempts})`);
});

healthChecker.on('routeGaveUp', ({ routeId, attempts }) => {
  console.error(`Route ${routeId} gave up after ${attempts} attempts`);
});
```

## Troubleshooting

### Orphaned Processes Not Killed

**Symptoms:**
- `srt-live-transmit` processes survive server restart
- Port conflicts on route start

**Diagnosis:**
```bash
# List all SRT processes
ps aux | grep srt-live-transmit

# Check PID files
ls -lah /tmp/srt-gateway-pids/

# Check startup logs
npm run pm2:logs | grep "orphan"
```

**Solution:**
```bash
# Manual cleanup
npm run cleanup:srt

# Or restart server (automatic cleanup)
npm run pm2:restart
```

### PID Files Not Created

**Symptoms:**
- Routes start but no PID files in `/tmp/srt-gateway-pids/`
- Orphan cleanup doesn't find processes

**Diagnosis:**
```bash
# Check if PID directory exists
ls -ld /tmp/srt-gateway-pids/

# Check permissions
ls -lah /tmp/srt-gateway-pids/

# Check server logs
npm run pm2:logs | grep "PidManager"
```

**Solution:**
```bash
# Recreate PID directory
mkdir -p /tmp/srt-gateway-pids/
chmod 755 /tmp/srt-gateway-pids/

# Restart server
npm run pm2:restart
```

### Process Won't Die

**Symptoms:**
- `killProcess()` called but process survives
- SIGTERM and SIGKILL both fail

**Diagnosis:**
```bash
# Check process state
ps aux | grep <PID>

# Check if process is zombie
ps -ef | grep <PID> | grep defunct

# Check process tree
pstree -p <PID>
```

**Solution:**
```bash
# Kill process group (kills children too)
kill -9 -<PID>

# Or use pkill
pkill -9 -f "srt-live-transmit.*<port>"

# Nuclear option: kill all SRT processes
pkill -9 srt-live-transmit
```

## Best Practices

### ✅ DO

- **Let automatic cleanup work** - It runs on every server start
- **Monitor startup logs** - Check for orphan cleanup messages
- **Use `npm run cleanup:srt`** - For manual intervention
- **Check process list** - Before debugging port conflicts
- **Trust the system** - Killing SRT/FFmpeg is safe

### ❌ DON'T

- **Don't manually kill processes** - Use the cleanup script
- **Don't worry about "aggressive" cleanup** - It's a best practice
- **Don't create processes outside RouteManager** - Always use the API
- **Don't reuse PIDs** - Let the system manage lifecycle
- **Don't persist PID files outside `/tmp`** - Volatility is intentional

## Process Management Commands

```bash
# List all SRT processes
ps aux | grep srt-live-transmit

# List all FFmpeg processes
ps aux | grep ffmpeg

# Check PID files
ls -lah /tmp/srt-gateway-pids/

# Manual cleanup (interactive)
npm run cleanup:srt

# View cleanup logs
npm run pm2:logs | grep -E "orphan|Killing|PidManager"

# View health check logs
npm run pm2:logs | grep HealthChecker

# Restart server (triggers automatic cleanup)
npm run pm2:restart
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Server Startup                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              RouteManager Initialization                     │
│  • Load routes from routes.json                             │
│  • Initialize PidManager                                     │
│  • Call pidManager.cleanupOrphans()                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 PidManager.cleanupOrphans()                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Step 1: Kill processes with PID files               │   │
│  │  • Read /tmp/srt-gateway-pids/*.pid                 │   │
│  │  • Check if process is running (kill -0)            │   │
│  │  • Send SIGTERM/SIGKILL                             │   │
│  │  • Remove PID file                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Step 2: Kill orphaned SRT processes (NEW)           │   │
│  │  • Run ps aux | grep srt-live-transmit             │   │
│  │  • Find processes WITHOUT PID files                │   │
│  │  • Send SIGTERM/SIGKILL to orphans                 │   │
│  │  • Clean up any stale PID files                    │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Zero Orphaned Processes                    │
│                   Clean State Guaranteed                     │
└─────────────────────────────────────────────────────────────┘
```

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Server deployment and PM2 setup
- [AUTHENTICATION.md](./AUTHENTICATION.md) - User authentication and roles
- [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) - Database backup and restore
- [LATENCY_ESTIMATION.md](./LATENCY_ESTIMATION.md) - Latency analysis
