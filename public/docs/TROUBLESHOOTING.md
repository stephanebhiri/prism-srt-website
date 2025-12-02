# Prism SRT - Troubleshooting Guide

Common issues and solutions for Prism SRT.

## Table of Contents

1. [Connection Issues](#connection-issues)
2. [Performance Problems](#performance-problems)
3. [Audio/Video Quality](#audiovideo-quality)
4. [Network Issues](#network-issues)
5. [Process Management](#process-management)
6. [Database Issues](#database-issues)

---

## Connection Issues

### SRT Input Won't Connect

**Symptoms:**
- Route shows "Connecting..." indefinitely
- Red indicator on input
- No bandwidth/stats showing

**Solutions:**

**1. Check firewall allows UDP port:**
```bash
sudo ufw status | grep <PORT>
# If missing:
sudo ufw allow <PORT>/udp
```

**2. Verify mode mismatch:**
- If Prism = Listener → Encoder must be Caller
- If Prism = Caller → Remote must be Listener

**3. Check if port already in use:**
```bash
sudo lsof -i UDP:<PORT>
# If something else is using it:
sudo kill -9 <PID>
```

**4. Test with srt-live-transmit:**
```bash
# Send test stream
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \
  -f mpegts "srt://YOUR_SERVER:5000?mode=caller"
```

**5. Check latency setting:**
- Too low latency on unstable networks = connection drops
- Increase to 500-1000ms and retry

### RTMP Output to YouTube Fails

**Symptoms:**
- FFmpeg process starts but disconnects
- YouTube shows "Offline"

**Solutions:**

**1. Verify stream key is correct:**
- Get fresh key from YouTube Studio
- Check for extra spaces/characters

**2. Check YouTube server:**
```bash
# Test RTMP connectivity
ffmpeg -re -f lavfi -i testsrc -f flv \
  "rtmp://a.rtmp.youtube.com/live2/YOUR-KEY"
```

**3. Audio format issues:**
- YouTube requires AAC audio
- Check FFmpeg logs for audio codec errors

**4. Bitrate too high:**
- YouTube max: 51 Mbps (4K), 16 Mbps (1080p)
- Reduce encoder bitrate if exceeded

### HTTP Output Shows "No Signal"

**Symptoms:**
- HTTP server running (green checkmark)
- VLC/browser shows black screen or "No signal"

**Solutions:**

**1. Check if route is actually streaming:**
```bash
pm2 logs | grep -A 5 "route_xxx"
# Look for bandwidth > 0
```

**2. Test HTTP output:**
```bash
curl -I http://localhost:<HTTP_PORT>/
# Should return: Content-Type: video/mp2t
```

**3. VLC may need extra buffer:**
```bash
vlc http://SERVER:PORT/ --network-caching=3000
```

---

## Performance Problems

### High CPU Usage

**Symptoms:**
- CPU at 80-100%
- Streams stuttering
- System slow

**Solutions:**

**1. Check mode:**
```bash
# Passthrough should be <10% CPU
# Transcode can be 50-100% per route
```

**2. Switch to passthrough if possible:**
- Edit route → Change mode to Passthrough
- Removes FFmpeg transcoding overhead

**3. Enable hardware acceleration:**
```javascript
// NVIDIA GPU
video: { encoder: 'h264_nvenc' }

// Intel QuickSync
video: { encoder: 'h264_qsv' }
```

**4. Reduce concurrent transcode routes:**
- Move some routes to another server
- Or switch non-critical routes to passthrough

**5. Lower encoding settings:**
```javascript
video: {
  preset: 'veryfast',  // Instead of 'slow'
  bitrate: '3000k'     // Instead of '8000k'
}
```

### High Memory Usage

**Symptoms:**
- RAM usage growing over time
- System starts swapping
- OOM killer terminates processes

**Solutions:**

**1. Set PM2 memory limit:**
```bash
pm2 delete prism-srt
pm2 start ecosystem.config.cjs --max-memory-restart 1G
pm2 save
```

**2. Check for memory leaks:**
```bash
# Monitor over time
pm2 monit

# If memory keeps growing without leveling off = possible leak
```

**3. Restart service daily (workaround):**
```bash
# Crontab: Restart at 4 AM daily
0 4 * * * pm2 restart prism-srt
```

### Slow Web UI

**Symptoms:**
- Dashboard takes > 3 seconds to load
- Route list slow to render
- Metrics graphs laggy

**Solutions:**

**1. Clear old metrics:**
```bash
# Delete metrics older than 7 days
sqlite3 data/metrics.db "DELETE FROM srt_metrics WHERE timestamp < strftime('%s', 'now', '-7 days')"
sqlite3 data/metrics.db "VACUUM"
```

**2. Reduce metrics retention:**
```javascript
// In metricsDatabase.js
const RETENTION_DAYS = 2;  // Instead of 30
```

**3. Disable metrics for non-critical routes:**
- Edit route → Disable "Collect metrics"

**4. Check network latency:**
```bash
ping YOUR_SERVER_IP
# High ping = slow UI responses
```

---

## Audio/Video Quality

### Audio Out of Sync (Lip Sync Issues)

**Symptoms:**
- Audio delayed or ahead of video
- Sync drifts over time

**Solutions:**

**1. Check sample rate mismatch:**
```bash
# Probe input
ffprobe -show_streams input.ts 2>&1 | grep sample_rate

# Ensure output matches:
audio: { sampleRate: 48000 }
```

**2. Add async flag (for RTMP):**
```javascript
// Already enabled in code for RTMP outputs
-async 1
```

**3. Increase SRT latency:**
- Higher latency = more buffering = better sync
- Try 500-1000ms

### Audio Crackling/Distortion

**Symptoms:**
- Pops, clicks, or dropouts in audio
- Distortion under certain conditions

**Solutions:**

**1. Check packet loss:**
- View metrics → If packet loss > 5% = network issue
- Increase SRT latency

**2. Sample rate conversion:**
```javascript
// Force 48kHz (broadcast standard)
audio: { sampleRate: 48000 }
```

**3. Bitrate too low:**
```javascript
// Increase audio bitrate
audio: { bitrate: '192k' }  // Instead of '128k'
```

### Video Pixelation/Artifacts

**Symptoms:**
- Blocky video
- Compression artifacts
- Quality degradation

**Solutions:**

**1. Increase video bitrate:**
```javascript
video: { bitrate: '8000k' }  // Higher quality
```

**2. Check encoder preset:**
```javascript
video: { preset: 'medium' }  // Better quality than 'fast'
```

**3. Verify no packet loss:**
- Packet loss = corruption even with copy mode
- Check network path

**4. Source quality:**
- Can't improve quality beyond source
- Check encoder settings

---

## Network Issues

### Multicast Not Working

**Symptoms:**
- Outputs don't receive data
- Only first output works
- "No multicast route" errors

**Solutions:**

**1. Add multicast route:**
```bash
sudo ip route add 239.0.0.0/8 dev eth0
```

**2. Verify route exists:**
```bash
ip route show | grep 239
# Should show: 239.0.0.0/8 dev eth0 scope link
```

**3. Check IGMP:**
```bash
# Verify multicast group membership
ip maddr show

# Should show 239.1.x.y addresses
```

**4. Test multicast manually:**
```bash
# Terminal 1 (sender)
echo "test" | socat - UDP4-SENDTO:239.1.1.1:9000

# Terminal 2 (receiver)
socat UDP4-RECVFROM:9000,ip-add-membership=239.1.1.1:0.0.0.0 -
```

### High Packet Loss

**Symptoms:**
- Packet loss > 5% sustained
- Video stuttering
- Frequent reconnections

**Solutions:**

**1. Check network path:**
```bash
# MTR shows packet loss per hop
mtr -r -c 100 DESTINATION_IP
```

**2. Increase SRT latency:**
- SRT can buffer and recover lost packets
- Try latency = RTT × 4

**3. Check bandwidth:**
```bash
# Ensure available bandwidth > stream bitrate
iperf3 -c DESTINATION_IP -u -b 50M
```

**4. QoS/Traffic shaping:**
```bash
# Prioritize SRT traffic (UDP ports)
sudo tc qdisc add dev eth0 root handle 1: htb default 12
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 1gbit
sudo tc class add dev eth0 parent 1:1 classid 1:10 htb rate 500mbit prio 1  # SRT
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 match ip dport 5000 0xf000 flowid 1:10
```

### Firewall Blocking SRT

**Symptoms:**
- Works on LAN, fails on internet
- Connection timeout
- No error message

**Solutions:**

**1. Check if UDP is blocked:**
```bash
# On server
sudo tcpdump -i any udp port 5000

# Send test packet from client
echo "test" | nc -u SERVER_IP 5000
```

**2. Corporate firewall:**
- Some networks block all UDP
- Use SRT on standard ports (554, 1935) as workaround
- Or tunnel through VPN/SSH

**3. NAT traversal:**
```
Encoder (Caller) → [NAT] → Server (Listener)  ✅ Works
Encoder (Listener) ← [NAT] ← Server (Caller)  ❌ May fail
```
Always use Listener mode on public server for NAT compatibility.

---

## Process Management

### Route Won't Start

**Symptoms:**
- Click "Start" but route stays stopped
- Error message in UI
- Logs show errors

**Solutions:**

**1. Check logs:**
```bash
pm2 logs prism-srt --lines 50
# Look for specific error messages
```

**2. Port conflict:**
```bash
# Find what's using the port
sudo lsof -i UDP:5000

# Kill conflicting process
sudo kill -9 <PID>
```

**3. FFmpeg not found:**
```bash
# Verify FFmpeg is in PATH
which ffmpeg
ffmpeg -version
```

**4. Validate route config:**
```bash
# Check routes.json syntax
cat data/routes.json | python3 -m json.tool
```

### Route Stops Unexpectedly

**Symptoms:**
- Route was running, now stopped
- No user action
- May happen randomly

**Solutions:**

**1. Check process crashed:**
```bash
pm2 logs | grep -i "error\|crash\|killed"
```

**2. OOM Killer:**
```bash
# Check if process was killed due to memory
dmesg | grep -i "killed process"
```

**3. SRT connection timeout:**
```bash
# Input disconnected and didn't reconnect
# Enable auto-reconnect in encoder settings
```

**4. Check auto-restart config:**
```javascript
// ecosystem.config.cjs
autorestart: true,
max_restarts: 10
```

### Orphan Processes

**Symptoms:**
- Processes still running after route stopped
- Port in use error
- Multiple processes for same route

**Solutions:**

**1. Kill orphans:**
```bash
# Kill all SRT processes
killall srt-live-transmit

# Kill all SRTLA processes
killall srtla_rec

# Kill all FFmpeg
killall ffmpeg
```

**2. Use cleanup script:**
```bash
npm run cleanup:srt
```

**3. Restart PM2:**
```bash
pm2 restart prism-srt
```

---

## Database Issues

### Routes Not Loading

**Symptoms:**
- Dashboard empty
- "No routes found"
- Routes exist in routes.json but not in UI

**Solutions:**

**1. Check JSON syntax:**
```bash
cat data/routes.json | python3 -m json.tool > /dev/null
echo "JSON valid: $?"
```

**2. Check file permissions:**
```bash
ls -la data/routes.json
# Should be readable by user running PM2
```

**3. Restore from backup:**
```bash
cp data/routes.json.backup data/routes.json
pm2 restart prism-srt
```

### Metrics Not Showing

**Symptoms:**
- No graphs in metrics view
- Historical data missing
- Database queries slow

**Solutions:**

**1. Check database exists:**
```bash
ls -lh data/metrics.db
# Should exist and grow over time
```

**2. Verify writes:**
```bash
sqlite3 data/metrics.db "SELECT COUNT(*) FROM srt_metrics"
# Should return > 0
```

**3. Check disk space:**
```bash
df -h /opt/prism-srt/data
# Need at least 1GB free
```

**4. Rebuild database:**
```bash
rm data/metrics.db
# Will recreate on next metric collection
pm2 restart prism-srt
```

---

## Common Error Messages

### "EADDRINUSE: address already in use"

**Cause**: Port is already bound by another process

**Solution:**
```bash
# Find process
sudo lsof -i :<PORT>

# Kill it
sudo kill -9 <PID>

# Or change port in route config
```

### "ffmpeg: command not found"

**Cause**: FFmpeg not installed or not in PATH

**Solution:**
```bash
# Install FFmpeg
sudo apt install ffmpeg

# Verify
which ffmpeg
ffmpeg -version | grep srt
```

### "srt-live-transmit: command not found"

**Cause**: SRT tools not installed

**Solution:**
```bash
sudo apt install srt-tools

# Verify
which srt-live-transmit
srt-live-transmit -version
```

### "Error opening input: Input/output error"

**Cause**: FFmpeg can't open UDP socket

**Solution:**
```bash
# Check if input process is running
ps aux | grep srt-live-transmit

# Verify UDP port is bound
sudo lsof -i UDP:<PORT>

# Increase timeout
# (already set to 2000000μs = 2s in code)
```

### "Multicast address already in use"

**Cause**: Two routes generated same multicast address (rare collision)

**Solution:**
```bash
# Restart route - will regenerate different address
# Or manually edit rec.multicastAddr in code
```

---

## Performance Diagnostics

### CPU Profiling

**Check which process uses CPU:**
```bash
# Top processes
top -o %CPU

# Specific to Prism SRT
ps aux | grep -E "ffmpeg|srt-live|srtla" | sort -k3 -rn
```

### Network Debugging

**Packet capture:**
```bash
# Capture SRT traffic
sudo tcpdump -i any udp port 5000 -w /tmp/srt-capture.pcap

# Analyze with Wireshark (on desktop)
# Or with tcpdump
tcpdump -r /tmp/srt-capture.pcap | less
```

**Bandwidth monitoring:**
```bash
# Real-time interface stats
nload eth0

# Or
iftop -i eth0
```

### Latency Measurement

**End-to-end latency test:**
```bash
# Encode timestamp overlay on source
ffmpeg -i input.mp4 \
  -vf "drawtext=text='%{localtime}':fontsize=48" \
  -f mpegts "srt://..."

# Compare timestamp on output stream
```

**Expected latencies:**
- Passthrough: 50-150ms
- Transcode: 300-800ms
- SRTLA (cellular): +500-2000ms

---

## Emergency Procedures

### Complete System Reset

**When all else fails:**

```bash
# 1. Stop all routes
pm2 stop prism-srt

# 2. Kill all media processes
killall ffmpeg srt-live-transmit srtla_rec

# 3. Clear temp data
rm -rf /tmp/srt-* /tmp/ffmpeg-*

# 4. Restart PM2
pm2 restart prism-srt

# 5. Verify clean state
pm2 logs --lines 20
```

### Database Recovery

**If database corrupted:**

```bash
# 1. Stop service
pm2 stop prism-srt

# 2. Backup corrupted DB
mv data/gateway.db data/gateway.db.corrupt

# 3. Restore from backup
cp data/backups/gateway_LATEST.db.gz .
gunzip gateway_LATEST.db.gz
mv gateway_LATEST.db data/gateway.db

# 4. Restart
pm2 restart prism-srt
```

### Network Stack Reset

**If network behaving strangely:**

```bash
# 1. Flush multicast routes
sudo ip route flush 239.0.0.0/8

# 2. Re-add multicast route
sudo ip route add 239.0.0.0/8 dev eth0

# 3. Restart networking (careful - may drop SSH!)
sudo systemctl restart networking

# 4. Verify
ip route show | grep 239
ip maddr show
```

---

## Getting Help

### Before Opening an Issue

**Collect this information:**

1. **System info:**
```bash
uname -a
node --version
ffmpeg -version | head -5
```

2. **Logs:**
```bash
pm2 logs prism-srt --lines 100 > logs.txt
```

3. **Route config:**
```bash
# Sanitize sensitive info first (stream keys, IPs)
cat data/routes.json
```

4. **Network test:**
```bash
mtr -r -c 50 DESTINATION_IP > network.txt
```

### Support Channels

- **GitHub Issues**: https://github.com/stephanebhiri/prism-srt/issues
- **Email**: stephane.bhiri@gmail.com

**When reporting:**
- [ ] Include system info
- [ ] Attach relevant logs
- [ ] Describe expected vs actual behavior
- [ ] Steps to reproduce
- [ ] Workarounds attempted

---

## Known Limitations

1. **No clustering**: Single server only (no distributed mode)
2. **Manual failover**: No automatic HA built-in
3. **UDP only**: No TCP mode for SRT (protocol limitation)
4. **No FEC**: Forward Error Correction not implemented (use SRT ARQ instead)

These are architectural limitations, not bugs.

---

**Still stuck?** Contact stephane.bhiri@gmail.com with detailed logs.
