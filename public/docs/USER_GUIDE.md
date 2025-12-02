# Prism SRT - User Guide

Complete guide to using Prism SRT for live stream routing and transcoding.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Route](#creating-your-first-route)
3. [Understanding Modes](#understanding-modes)
4. [Input Configuration](#input-configuration)
5. [Output Configuration](#output-configuration)
6. [Audio Matrix](#audio-matrix)
7. [Monitoring & Metrics](#monitoring--metrics)
8. [Advanced Features](#advanced-features)

---

## Getting Started

### Accessing the Web Interface

After installation, open your browser to:
```
http://localhost:4670
```

Or from another computer on your network:
```
http://YOUR_SERVER_IP:4670
```

### Dashboard Overview

The dashboard shows:
- **Active Routes**: Currently running streams
- **System Health**: CPU, RAM, network usage
- **Quick Actions**: Create route, view metrics, system settings

---

## Creating Your First Route

### Step 1: Click "New Route"

From the dashboard, click the **"New Route"** button.

### Step 2: Basic Information

- **Name**: Give your route a descriptive name (e.g., "Studio A to YouTube")
- **Mode**: Choose between:
  - **Passthrough**: Direct relay (no transcoding) - lowest latency
  - **Transcode**: Process video/audio - adds latency but allows modifications

### Step 3: Configure Input

Select your input source type:

**SRT (Recommended for reliability)**
- **Mode**:
  - `Listener` - Wait for incoming connection (use this for BELABOX/encoder)
  - `Caller` - Connect to remote SRT server
  - `SRTLA` - Multi-path bonding for cellular/unreliable networks
- **Port**: UDP port to listen on (e.g., 5000)
- **Latency**: Buffer size in milliseconds (1200ms recommended for SRTLA, 150ms for LAN)

**Other Input Types:**
- **HTTP/HTTPS**: Pull stream from HTTP server
- **RTSP**: IP camera or RTSP source
- **UDP**: Direct UDP multicast or unicast
- **RTMP**: Accept RTMP push (OBS, vMix)

### Step 4: Configure Output(s)

Add one or more outputs:

**SRT Output**
- **Mode**: Caller (push to remote) or Listener (wait for connection)
- **Host**: Destination IP or hostname
- **Port**: Destination port
- **Latency**: Buffer size (match remote server settings)

**RTMP Output** (YouTube, Twitch, etc.)
- **Host**: Full RTMP URL or just hostname
  - Example: `a.rtmp.youtube.com/live2/YOUR-STREAM-KEY`
- **Port**: 1935 (default)

**HTTP/TS Output**
- **Port**: HTTP server port (clients connect to `http://SERVER:PORT/`)
- Useful for VLC playback or web embedding

**UDP Output**
- **Host**: Destination IP
- **Port**: Destination port
- Useful for legacy equipment or multicast distribution

### Step 5: Video Settings (Transcode Mode Only)

- **Copy**: No re-encoding (fastest, preserves quality)
- **H.264**: Re-encode to H.264 (compatibility)
- **H.265/HEVC**: Re-encode to HEVC (better compression)
- **Resize**: Change resolution (e.g., 1080p → 720p)
- **Deinterlace**: Convert interlaced to progressive

### Step 6: Audio Settings (Transcode Mode Only)

**Simple Mode:**
- **Copy**: Pass through audio unchanged
- **AAC**: Re-encode to AAC (compatibility)

**Matrix Mode (Advanced):**
- Remap audio channels
- Downmix 5.1/7.1 to stereo
- Split/combine channels
- See [Audio Matrix](#audio-matrix) section below

### Step 7: Start Route

Click **"Start Route"** - you'll see:
- ✅ Green indicator when input connects
- 📊 Real-time metrics (bitrate, RTT, packet loss)
- 🔴 Red indicator if connection fails

---

## Understanding Modes

### Passthrough Mode

**When to use:**
- You don't need to modify the video/audio
- Lowest latency is critical
- Maximum quality preservation

**How it works:**
```
SRT Input → Multicast UDP → Multiple Outputs
```

**Characteristics:**
- ⚡ Glass-to-glass latency: <50ms
- 💪 CPU usage: Near zero (hardware multicast)
- ✅ Quality: Bit-perfect copy
- 🚀 Scalability: 50+ routes per server

### Transcode Mode

**When to use:**
- Need to change video resolution/codec
- Audio channel remapping required
- Adding overlays/watermarks
- Format conversion (e.g., RTMP input → SRT output)

**How it works:**
```
SRT Input → FFmpeg Transcode → Multicast UDP → Multiple Outputs
```

**Characteristics:**
- ⏱️ Latency: 200-500ms (depends on encoding)
- 🔥 CPU usage: High (depends on resolution/codec)
- 🎨 Flexibility: Full video/audio processing
- 📊 Scalability: 5-15 routes per server (CPU dependent)

---

## Input Configuration

### SRT Input

#### Listener Mode (Most Common)

Use when encoders connect TO you (BELABOX, OBS, etc.)

**Settings:**
```json
{
  "type": "srt",
  "port": 5000,
  "mode": "listener",
  "latency": 150
}
```

**Encoder configuration:**
```
SRT URL: srt://YOUR_SERVER_IP:5000?mode=caller
```

#### Caller Mode

Use when connecting TO a remote SRT server.

**Settings:**
```json
{
  "type": "srt",
  "host": "remote.server.com",
  "port": 6000,
  "mode": "caller",
  "latency": 150
}
```

#### SRTLA Mode (Multi-Path Bonding)

Use with BELABOX or other SRTLA-capable encoders for cellular/bonded connections.

**Settings:**
```json
{
  "type": "srt",
  "port": 5000,
  "mode": "srtla",
  "latency": 1200
}
```

**Why higher latency?**
- SRTLA aggregates multiple network paths (4G, 5G, WiFi)
- Packets arrive out-of-order and need reordering
- 1200-2000ms recommended for reliable bonding

**BELABOX configuration:**
```
Protocol: SRTLA
Server: YOUR_SERVER_IP
Port: 5000
Latency: 1200ms
```

### HTTP/HTTPS Input

Pull stream from HTTP(S) server (e.g., IP cameras, streaming servers).

**Settings:**
```json
{
  "type": "http",
  "host": "camera.local.network",
  "port": 8080,
  "path": "/stream.ts"
}
```

### RTSP Input

Standard for IP cameras.

**Settings:**
```json
{
  "type": "rtsp",
  "host": "192.168.1.100",
  "port": 554,
  "path": "/stream1"
}
```

---

## Output Configuration

### SRT Output

#### Caller Mode (Push to Remote Server)

**Settings:**
```json
{
  "type": "srt",
  "host": "destination.server.com",
  "port": 6000,
  "mode": "caller",
  "latency": 150
}
```

#### Listener Mode (Wait for Connections)

**Settings:**
```json
{
  "type": "srt",
  "port": 7000,
  "mode": "listener",
  "latency": 150
}
```

**Remote player connects:**
```bash
ffplay "srt://YOUR_SERVER_IP:7000?mode=caller"
```

### RTMP Output (YouTube, Twitch, Facebook)

#### YouTube Live

**Settings:**
```json
{
  "type": "rtmp",
  "host": "a.rtmp.youtube.com/live2/YOUR-STREAM-KEY",
  "port": 1935
}
```

**Where to find stream key:**
1. YouTube Studio → Go Live
2. Copy "Stream URL" and "Stream Key"
3. Combine: `a.rtmp.youtube.com/live2/STREAM-KEY`

#### Twitch

```json
{
  "type": "rtmp",
  "host": "live.twitch.tv/app/YOUR-STREAM-KEY",
  "port": 1935
}
```

### HTTP/TS Output

Create an HTTP server that clients can pull from.

**Settings:**
```json
{
  "type": "http",
  "port": 8080
}
```

**Clients access:**
```
http://YOUR_SERVER_IP:8080/
```

**Play in VLC:**
```bash
vlc http://YOUR_SERVER_IP:8080/
```

### UDP Output

**Settings:**
```json
{
  "type": "udp",
  "host": "192.168.1.200",
  "port": 5004
}
```

---

## Audio Matrix

The audio matrix allows complex channel routing and remapping.

### When to Use Audio Matrix

- Downmix 5.1/7.1 to stereo
- Swap left/right channels
- Extract specific channels (e.g., commentary track)
- Combine channels from multiple sources
- Create custom channel layouts

### Example: 7.1 to Stereo Downmix

**Input:** 7.1 audio (8 channels)
```
FL, FR, C, LFE, BL, BR, SL, SR
```

**Output:** Stereo (2 channels)
```
L = FL + C*0.7 + BL*0.5 + SL*0.5
R = FR + C*0.7 + BR*0.5 + SR*0.5
```

**Configuration in UI:**
1. Set input PID and layout (7.1)
2. Add output with stereo layout
3. Click channel routing:
   - Route FL → L (100%)
   - Route C → L (70%)
   - Route BL → L (50%)
   - Route SL → L (50%)
   - (Repeat for R channel)
4. Save configuration

### Example: Stereo to Dual Mono

**Input:** Stereo (L, R)

**Output 1:** Mono Left only
```
Mono = L (100%)
```

**Output 2:** Mono Right only
```
Mono = R (100%)
```

### Audio Matrix Tips

- **Gain Reduction**: When combining channels, reduce levels to prevent clipping
- **Center Channel**: Typically reduced to 70% when downmixing to stereo
- **LFE**: Usually excluded from stereo downmix
- **Test First**: Always test audio routing before going live

---

## Monitoring & Metrics

### Route Status Indicators

**Color Coding:**
- 🟢 **Green**: Healthy connection, good quality
- 🟡 **Yellow**: Warning - elevated packet loss or RTT
- 🔴 **Red**: Problem - high packet loss or disconnected
- ⚪ **Gray**: Stopped or disabled

### Key Metrics

**RTT (Round Trip Time)**
- Network latency in milliseconds
- Lower is better
- Typical values:
  - LAN: 1-10ms
  - Internet (same country): 10-50ms
  - International: 50-200ms
  - Satellite: 500-800ms

**Flight Size**
- Packets in transit (not yet acknowledged)
- Dynamic threshold based on RTT
- Warning if > (RTT × packets/sec × 1.5)

**Bandwidth**
- Current bitrate in Mbps
- Should match encoder output
- Sustained drops indicate network issues

**Packet Loss**
- Percentage of packets lost
- SRT can recover up to ~20% loss
- >5% sustained = investigate network

**Buffer (byteAvailBuf)**
- Receiver buffer fill level
- High buffer = latency/delay accumulating
- Low buffer = risk of underrun

### Historical Graphs

Click on any route to view:
- 📈 **RTT over time**: Network stability
- 📉 **Packet loss trends**: Quality issues
- 📊 **Bandwidth graph**: Bitrate stability
- 🔋 **Buffer levels**: Latency trends

**Time Range:** Last 24 hours with 1-minute granularity

---

## Advanced Features

### Hot Output Management

Add or remove outputs while route is running:

1. Click running route
2. Scroll to "Outputs" section
3. Click **"Add Output"**
4. Configure new output
5. Save - output starts immediately

**Benefits:**
- No interruption to existing outputs
- No reconnection required
- Test new destinations without downtime

### Auto-Start Routes

Enable auto-start for critical routes:

1. Edit route
2. Enable **"Auto-start on boot"**
3. Save

Route will automatically start when:
- Server boots up
- PM2/systemd restarts the service

### Route Duplication

Quickly duplicate an existing route:

1. Right-click route (or click menu)
2. Select **"Duplicate"**
3. Modify settings as needed
4. Save as new route

**Use case:** Testing different output configurations

### Output Enable/Disable

Temporarily disable outputs without deleting:

1. Click route
2. Find output in list
3. Toggle **ON/OFF** switch

**Benefits:**
- Keep configuration for later use
- Quickly enable backup destinations
- A/B testing different outputs

---

## Best Practices

### Latency Settings

**SRT Latency Guidelines:**
- **LAN/Datacenter**: 100-200ms
- **Internet (stable)**: 200-500ms
- **Internet (unstable)**: 500-1000ms
- **SRTLA (cellular)**: 1200-2000ms
- **Satellite**: 2000-3000ms

**Rule of thumb:**
```
Latency ≥ (RTT × 4)
```

### Network Configuration

**Firewall Rules:**
```bash
# SRT ports (UDP)
sudo ufw allow 5000:8000/udp

# Web UI (TCP)
sudo ufw allow 4670/tcp
```

**Bandwidth Planning:**
```
Required Bandwidth = Stream Bitrate × Number of Outputs × 1.2 (overhead)
```

Example: 10 Mbps stream to 3 destinations = 36 Mbps minimum

### Backup Strategy

**Daily Backups:**
```bash
# Add to crontab
0 2 * * * /opt/prism-srt/scripts/backup-database.sh
```

**What to backup:**
- `data/routes.json` - Route configurations
- `data/gateway.db` - User accounts, presets
- `data/metrics.db` - Historical metrics (optional)

### Monitoring Recommendations

**Set up alerts for:**
- RTT > 200ms (sustained)
- Packet loss > 5%
- Route disconnections
- CPU > 80%
- Disk space < 10%

**Check daily:**
- Metrics graphs for anomalies
- Log files for errors
- System resource usage

---

## Common Workflows

### Workflow 1: BELABOX to Multiple Destinations

**Scenario**: Field camera with BELABOX bonding to studio + YouTube + backup

**Configuration:**
```
Input:
- Type: SRT
- Mode: SRTLA
- Port: 5000
- Latency: 1500ms

Outputs:
1. SRT Caller → Studio server (10.0.1.100:6000)
2. RTMP → YouTube (a.rtmp.youtube.com/live2/KEY)
3. SRT Listener → Backup recorder (:7000)
```

**Mode**: Passthrough (no transcoding needed)

### Workflow 2: Studio to Web with Downmix

**Scenario**: 5.1 audio broadcast, need stereo for web

**Configuration:**
```
Input:
- Type: SRT Listener
- Port: 5000

Output:
- Type: SRT Caller
- Host: cdn.server.com
- Port: 6000

Video: Copy
Audio: Matrix Mode
  Input: 5.1 (FL, FR, C, LFE, BL, BR)
  Output: Stereo
    L = FL + C*0.7 + BL*0.5
    R = FR + C*0.7 + BR*0.5
```

**Mode**: Transcode (audio processing required)

### Workflow 3: Multi-Camera Switch Output

**Scenario**: Video switcher output to multiple destinations

**Configuration:**
```
Input:
- Type: SRT Listener
- Port: 5000

Outputs:
1. SRT → Recording server
2. SRT → Streaming server
3. HTTP → Local monitors
4. RTMP → YouTube (main)
5. RTMP → Facebook (backup)
```

**Mode**: Passthrough (switcher already outputs correct format)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | New Route |
| `R` | Refresh metrics |
| `Esc` | Close modals |
| `Ctrl+S` | Save route (in editor) |
| `Space` | Start/Stop selected route |
| `/` | Search routes |

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| Route won't start | Check input port not in use (`sudo lsof -i :PORT`) |
| No video/audio | Verify stream format with `ffprobe` |
| High latency | Increase SRT latency setting |
| Packet loss | Check network path with `mtr` |
| Audio out of sync | Verify sample rate matches (48kHz standard) |
| CPU at 100% | Switch to passthrough or reduce output count |

Full troubleshooting guide: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## FAQ

**Q: Can I run multiple routes simultaneously?**
A: Yes, limited only by CPU/bandwidth. Passthrough mode can handle 50+ routes, transcode mode depends on CPU.

**Q: Does SRT work through NAT/firewall?**
A: Yes, but you need to port-forward the SRT port (UDP). Caller mode is easier for NAT traversal.

**Q: Can I use this for 24/7 broadcasting?**
A: Yes, designed for production use. Enable auto-restart and set up monitoring.

**Q: What's the difference between SRT and SRTLA?**
A: SRTLA is multi-path SRT bonding (combines multiple network connections). Use with BELABOX for cellular/unreliable networks.

**Q: Can I password-protect SRT streams?**
A: Yes, use SRT passphrase in advanced settings. Both sides must use same passphrase.

**Q: How many outputs can I have per route?**
A: Unlimited (technically). Practical limit is network bandwidth. Multicast distribution has zero CPU overhead.

---

## Next Steps

- 📖 [Architecture Documentation](./ARCHITECTURE.md) - Technical deep-dive
- 🚀 [Deployment Guide](./DEPLOYMENT.md) - Production setup
- 🔧 [API Reference](./API.md) - Automation and integration
- ❓ [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues and solutions

---

**Need help?** Contact stephane.bhiri@gmail.com or open an issue on GitHub.
