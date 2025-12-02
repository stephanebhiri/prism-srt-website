# How to Measure Real Latency

This guide explains how to **actually measure** the latency added by the SRT Router on your specific hardware.

## Method 1: Timecode Burn-In (Most Accurate)

### Requirements
- Video source with burned-in timecode (or generate one)
- Two monitors/windows side-by-side
- Camera or screen capture tool

### Step 1: Generate Test Stream with Timecode

```bash
# Generate video with burned-in timecode at millisecond precision
ffmpeg -f lavfi -i "testsrc=size=1280x720:rate=25" \
  -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf:text='%{localtime\:%T}.%{eif\:1000*t-1000*trunc(t)\:d\:3}':fontsize=48:fontcolor=yellow:x=(w-text_w)/2:y=(h-text_h)/2" \
  -c:v libx264 -preset ultrafast -tune zerolatency -b:v 2M \
  -f mpegts "srt://127.0.0.1:5000?mode=caller"
```

### Step 2: Route Through SRT Router

Configure a route:
- **Input:** SRT listener on port 5000
- **Output:** SRT caller to port 6000
- **Mode:** Passthrough OR Transcode (test both)

### Step 3: Receive Output

```bash
ffplay -fflags nobuffer -flags low_delay "srt://127.0.0.1:6000?mode=listener"
```

### Step 4: Measure

1. Display **source timecode** and **output timecode** side-by-side
2. Take photo or use screen capture
3. Calculate difference in milliseconds

**Example:**
- Source: `14:35:22.156`
- Output: `14:35:22.478`
- **Latency = 322ms**
- Subtract SRT buffers (150ms × 2 = 300ms)
- **Gateway processing = 22ms** ✅

---

## Method 2: FFmpeg Profiling (Component-Level)

### Enable FFmpeg Benchmarking

Add to your route's FFmpeg command:

```bash
-benchmark -benchmark_all
```

This will output:
```
bench: utime=0.015s stime=0.003s rtime=0.018s
```

- `utime` = user CPU time (decode/encode)
- `stime` = system time (I/O)
- `rtime` = real time (total)

### Where to Add

Edit `/opt/mini-nimble/src/services/routeManager.js`:

```javascript
// Around line 340, after args initialization
args.push('-benchmark');
args.push('-benchmark_all');
```

Restart the gateway and check logs for timing data.

---

## Method 3: Audio Click Test (Sub-Millisecond Precision)

### Requirements
- Audio generator (tone or click)
- Oscilloscope or audio editor with waveform view
- Loopback audio cable (or virtual audio routing)

### Process

1. Generate audio click at exact time
2. Route through SRT Router
3. Record input and output simultaneously
4. Compare waveforms in audio editor (Audacity, etc.)
5. Measure sample offset

**Example @ 48kHz audio:**
- Offset: 960 samples
- **Latency = 960 / 48000 = 20ms** ✅

---

## Method 4: SRT Stats RTT (Network Only)

This measures **network latency only**, not processing.

### Check in Gateway UI

The SRT Router displays RTT (Round-Trip Time) for each connection:

- RTT = network latency × 2
- This does NOT include processing latency
- Useful for baseline network measurement

**Example:**
- RTT = 4ms on localhost
- One-way network = 2ms
- If total measured = 305ms
- Then: 305ms - 300ms (SRT) - 2ms (network) = **3ms gateway processing** ✅

---

## Expected Results by Hardware

### Low-end (Raspberry Pi 4, old laptop)
- Passthrough: **3-6ms**
- Transcode: **25-45ms**

### Mid-range (Desktop i5/Ryzen 5, 4+ cores)
- Passthrough: **2-4ms**
- Transcode: **15-28ms**

### High-end (Server Xeon, GPU encoding)
- Passthrough: **2-3ms**
- Transcode: **8-15ms** (with hardware acceleration)

---

## Factors That Increase Latency

### 1. CPU Load
- High CPU usage → frame drops → increased latency
- Solution: reduce other processes, upgrade CPU

### 2. Video Resolution
- 4K takes longer to decode/encode than 1080p
- Each doubling of pixels adds ~5-10ms

### 3. Video Codec
- H.265 decode: +5-10ms vs H.264
- VP9: +10-20ms vs H.264

### 4. GOP Size
- Larger GOP (60 frames) → +20-40ms initial latency
- Smaller GOP (15 frames) → lower latency but higher bitrate

### 5. Audio Codec
- AAC: ~3-8ms
- MP2: ~5-12ms
- Opus: ~2-5ms (if supported)

---

## How to Reduce Measured Latency

### 1. Passthrough When Possible
If audio remapping not needed → use passthrough mode

### 2. Lower SRT Latency
Default 150ms → try 50-80ms on stable networks

### 3. Video Settings
- Use `-c:v copy` instead of transcode
- Reduce GOP size: `-g 15`
- Use hardware encoding if available: `-c:v h264_nvenc`

### 4. Audio Settings
- Use low-latency codec (Opus > AAC > MP2)
- Reduce audio quality if acceptable

### 5. Disable Unnecessary Processing
- Skip video if audio-only workflow
- Use minimal audio matrix complexity

---

## Logging Latency Data

Create a test script to automate measurements:

```bash
#!/bin/bash
# latency_test.sh

echo "=== SRT Router Latency Test ==="
echo "Date: $(date)"
echo "Mode: $1"  # passthrough or transcode

# Start timecode source
ffmpeg -f lavfi -i "testsrc=size=1280x720:rate=25" \
  -vf "drawtext=text='%{localtime\:%T}.%{eif\:1000*t-1000*trunc(t)\:d\:3}':fontsize=48:fontcolor=yellow:x=(w-tw)/2:y=(h-th)/2" \
  -c:v libx264 -preset ultrafast -b:v 2M \
  -f mpegts "srt://127.0.0.1:5000?mode=caller" &

SOURCE_PID=$!

# Wait for route to stabilize
sleep 5

# Capture output frame
ffmpeg -i "srt://127.0.0.1:6000?mode=listener" -frames:v 1 output_frame.png

# Kill source
kill $SOURCE_PID

# Compare timestamps (manual or OCR)
echo "Check output_frame.png for timecode difference"
```

---

## Conclusion

**"Au doigt mouillé"** estimates are useful for planning, but **real measurements** are essential for:

- Critical low-latency workflows
- SLA/QoS requirements
- Performance optimization
- Hardware sizing decisions

Use **timecode burn-in** for the most accurate end-to-end measurement.

Use **FFmpeg benchmarking** for component-level profiling.

Use **SRT stats** to isolate network vs processing latency.
