# SRT Router - Latency Estimation Guide

This document provides **precise latency estimations** for all operational modes of the SRT Router.

## Important Notes

⚠️ **Critical distinction:**

1. **SRT Latency (Network Buffer)**: 150ms default (configurable)
   - This is the **network jitter buffer** configured on SRT input/output
   - NOT added by the gateway itself
   - Applied at **source** and **destination** SRT endpoints

2. **Gateway Processing Latency**: The **actual delay** added by this system
   - Passthrough: **~3-5ms**
   - Transcode: **~15-40ms**
   - This is what the gateway adds on top of network buffers

3. **Total End-to-End Latency** = Network propagation + SRT buffers (input+output) + Gateway processing

---

## Gateway Processing Latency (What This System Adds)

This section describes **only the latency added by the gateway** itself, excluding SRT network buffers.

### 1. Passthrough Mode - Single Output

**Architecture:**
```
Input SRT → srt-live-transmit → Output SRT
```

**Processing Components:**
- Socket read (SRT → localhost): **~0.5-1ms**
- srt-live-transmit packet forwarding: **~1-2ms**
- Socket write (localhost → SRT): **~0.5-1ms**

**🔹 Gateway Processing Latency:** **~2-4ms**

**Total E2E with 150ms SRT buffers:** 150ms (input) + 2-4ms (gateway) + 150ms (output) = **~302-304ms**

---

### 2. Passthrough Mode - Multiple Outputs (2+ destinations)

**Architecture:**
```
Input SRT → srt-live-transmit → UDP (localhost) → UDP Duplicator → N × srt-live-transmit → N × Output SRT
```

**Processing Components:**
- srt-live-transmit input: **~1-2ms**
- UDP write to duplicator: **<0.5ms** (localhost socket)
- UDP Duplicator forward (Node.js): **<0.5ms** (parallel to all outputs)
- srt-live-transmit output × N: **~1-2ms each** (parallel)

**🔹 Gateway Processing Latency:** **~3-5ms**

**Note:** Multi-output adds only **~1-2ms** vs single output (UDP duplicator overhead)

**Total E2E with 150ms SRT buffers:** 150ms + 3-5ms + 150ms = **~303-305ms**

---

### 3. Transcode Mode - Single Output

**Architecture:**
```
Input SRT → FFmpeg (demux → decode → audio matrix → encode → mux) → Output SRT
```

**FFmpeg Configuration:**
- `-fflags nobuffer` (no input buffering)
- `-flags low_delay` (low-delay encoding)
- `-probesize 32 -analyzeduration 0` (minimal stream analysis)
- `-preset ultrafast` (for video transcode if needed)

**Processing Components:**
- FFmpeg demux (MPEGTS): **~1-2ms**
- Video decode (H.264, 1 GOP): **~3-8ms** (depends on resolution)
- Audio decode (AAC/MP2): **~1-3ms**
- Audio matrix (pan filter): **~1-2ms** (channel remapping)
- Audio encode (AAC/MP2): **~3-8ms**
- Video copy/encode: **~0.5ms** (copy) or **~5-12ms** (transcode)
- FFmpeg mux (MPEGTS): **~1-2ms**

**🔹 Gateway Processing Latency:**
- Video copy mode: **~13-28ms** (typical: **~18ms**)
- Video transcode mode: **~15-40ms** (typical: **~25ms**)

**Total E2E with 150ms SRT buffers:** 150ms + 15-28ms + 150ms = **~315-328ms**

---

### 4. Transcode Mode - Multiple Outputs (2+ destinations)

**Architecture:**
```
Input SRT → FFmpeg → UDP (localhost) → UDP Duplicator → N × srt-live-transmit → N × Output SRT
```

**Processing Components:**
- FFmpeg processing: **~15-28ms** (same as single output)
- UDP write to duplicator: **<0.5ms**
- UDP Duplicator forward: **<0.5ms**
- srt-live-transmit × N: **~1-2ms** (parallel)

**🔹 Gateway Processing Latency:** **~17-31ms** (typical: **~20ms**)

**Note:** Multi-output adds only **~2-3ms** vs single transcode output

**Total E2E with 150ms SRT buffers:** 150ms + 17-31ms + 150ms = **~317-331ms**

---

## Summary Table

| Mode | Outputs | **Gateway Adds** | Total E2E (150ms SRT) | Use Case |
|------|---------|-----------------|----------------------|----------|
| **Passthrough** | 1 | **~2-4ms** | **~302-304ms** | Lowest latency relay |
| **Passthrough** | 2+ | **~3-5ms** | **~303-305ms** | Multi-destination relay |
| **Transcode** | 1 | **~15-28ms** | **~315-328ms** | Audio matrix + single output |
| **Transcode** | 2+ | **~17-31ms** | **~317-331ms** | Audio matrix + distribution |

**Key Insight:** Multi-output adds only **1-3ms** overhead thanks to UDP Duplicator architecture!

---

## 🎯 Quick Answer: Latency Added by This Gateway

**EXCLUDING SRT network buffers (those are configurable separately):**

| Mode | Gateway Adds | Notes |
|------|-------------|-------|
| **Passthrough Single** | **2-4ms** | Just packet forwarding |
| **Passthrough Multi** | **3-5ms** | +1ms for UDP duplicator |
| **Transcode Single** | **15-28ms** | FFmpeg decode/encode (video copy) |
| **Transcode Multi** | **17-31ms** | FFmpeg + UDP duplicator |

**In practice:**
- Passthrough is nearly transparent (**sub-5ms**)
- Transcode adds ~1 video frame delay (**~17-25ms @ 50fps**)
- Multi-output adds almost nothing (**~1-3ms**)

**Why so low?**
- FFmpeg configured with `-fflags nobuffer -flags low_delay`
- No internal buffering beyond what's required for decode/encode
- UDP Duplicator is pure packet forwarding (Node.js socket)
- All components run on localhost (no network hops)

---

## Optimizing Latency

### 1. Reduce SRT Latency (Network Buffer)

**SRT Latency Values:**
- **Default:** 150ms (good balance)
- **Low-latency LAN:** 50-80ms (stable, low-jitter networks)
- **Internet/WAN:** 120-200ms (standard)
- **Unstable networks:** 250-500ms (wireless, congested)

**Example - Passthrough Single with 50ms SRT:**
- SRT buffers: 50ms × 2 = 100ms
- Gateway processing: ~3ms
- **Total E2E: ~103ms** ✅ Ultra-low latency

**⚠️ Trade-off:** Lower SRT latency = smaller jitter buffer = **higher packet loss** on unstable networks

### 2. Choose Passthrough When Possible

If audio remapping is not required:
- **Passthrough adds only ~3-5ms** (gateway processing)
- **Transcode adds ~15-30ms** (FFmpeg processing)
- **Difference: ~12-25ms saved** by using passthrough

Use presets to quickly switch between modes based on workflow needs.

### Network Considerations

**Additional factors not included above:**
- Physical distance latency: **~1ms per 100km** (fiber)
- Internet routing overhead: **~5-50ms** (variable)
- Last-mile network: **~2-20ms** (cable/fiber/5G)

**Example - Paris to London (350km):**
- Physical propagation: ~3.5ms
- Routing overhead: ~10-20ms
- SRT Router processing: ~5ms (passthrough)
- Total one-way: **~320ms** (with 150ms SRT buffers)

---

## Real-World Performance

### Broadcast Workflows

**Typical configuration:**
- Mode: **Transcode** (audio compatibility)
- SRT Latency: **150-200ms** (Internet stability)
- Outputs: **2-4 destinations**

**Expected latency:** **~350-400ms E2E**
**Acceptable for:** Live events, remote production, contribution feeds

### Low-Latency Workflows

**Optimal configuration:**
- Mode: **Passthrough**
- SRT Latency: **50-80ms** (LAN/dedicated fiber)
- Outputs: **1-2 destinations**

**Expected latency:** **~105-165ms E2E**
**Acceptable for:** Sports, news, live switching

### Studio-to-Transmitter Links (STL)

**Balanced configuration:**
- Mode: **Passthrough** (if audio compatible) or **Transcode** (if needed)
- SRT Latency: **100-150ms** (dedicated link)
- Outputs: **1 primary + 1 backup**

**Expected latency:** **~205-310ms E2E**
**Acceptable for:** Broadcast transmission, contribution

---

## Testing Methodology

To measure actual latency in your setup:

1. **Timecode insertion**: Burn timecode into video at source
2. **Side-by-side comparison**: Compare source vs output on synchronized monitors
3. **Audio measurement**: Use audio click + oscilloscope for precise measurement
4. **SRT stats**: Monitor RTT (Round-Trip Time) in the gateway UI

**Expected variance:** ±10-20ms due to encoding GOP structure and network jitter

---

## Codec Impact on Transcode Latency

### Audio Codecs
- **AAC-LC**: ~8-15ms encode + ~3-5ms decode
- **MP2**: ~10-20ms encode + ~3-8ms decode
- **Opus** (if supported): ~5-10ms encode + ~2-5ms decode

### Video Codecs (when transcoding)
- **H.264 (x264 ultrafast)**: ~10-20ms
- **H.264 (x264 fast)**: ~20-40ms
- **H.265 (x265 ultrafast)**: ~15-30ms

**Note:** Video codec only matters if transcoding video (not common in this gateway)

---

## Monitoring Latency

The SRT Router provides real-time monitoring:

### Available Metrics
- **RTT (Round-Trip Time)**: Network latency × 2
- **Link Bandwidth**: Available throughput
- **Packet Loss**: Network stability indicator
- **Rate Sending/Receiving**: Actual bitrate

### Latency Warning Signs
- **High RTT (>50ms on LAN)**: Network congestion
- **Packet loss (>0.1%)**: SRT latency too low or network issues
- **Variable bitrate**: Encoding instability (increases latency variance)

---

## Conclusion

**Passthrough mode** provides the lowest latency (~305-320ms E2E) and is ideal when audio remapping is not required.

**Transcode mode** adds ~25-65ms processing overhead but enables audio channel compatibility between different broadcast equipment.

**Multi-output** adds minimal overhead (~5ms) thanks to UDP Duplicator architecture.

**SRT latency** is the dominant factor - tune based on network quality vs latency requirements.

For latency-critical applications, use **Passthrough + 50-80ms SRT latency** on stable networks to achieve **sub-150ms** total latency.
