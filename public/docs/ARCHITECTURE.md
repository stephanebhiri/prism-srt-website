# Prism SRT - Architecture Documentation

Technical deep-dive into Prism SRT's architecture, design decisions, and implementation details.

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Components](#core-components)
3. [Multicast Architecture](#multicast-architecture)
4. [Process Management](#process-management)
5. [Monitoring System](#monitoring-system)
6. [Database Schema](#database-schema)
7. [WebSocket Protocol](#websocket-protocol)
8. [Performance Optimizations](#performance-optimizations)

---

## System Overview

### Technology Stack

**Backend:**
- Node.js (v18+) - JavaScript runtime
- Express.js - HTTP server and REST API
- WebSocket (ws) - Real-time bidirectional communication
- better-sqlite3 - Embedded database (zero config)
- Awilix - Dependency injection container

**Frontend:**
- React 19 - UI framework
- TypeScript - Type safety
- Vite - Build tool and dev server
- TanStack Query - Server state management
- Chart.js - Metrics visualization
- Tailwind CSS - Styling

**Media Processing:**
- FFmpeg - Video/audio transcoding
- srt-live-transmit - SRT protocol handling
- srtla_rec - SRTLA multi-path aggregation

### Architecture Patterns

- **Service Layer Pattern**: Business logic in services (`src/services/`)
- **Controller Pattern**: HTTP request handling (`src/controllers/`)
- **Repository Pattern**: Data access abstraction
- **Observer Pattern**: EventBus for inter-service communication
- **Dependency Injection**: Awilix container for loose coupling

---

## Core Components

### 1. RouteManager (`src/services/routeManager.js`)

**Responsibilities:**
- Spawn and manage media processes (FFmpeg, srt-live-transmit, srtla_rec)
- Handle route lifecycle (start, stop, restart)
- Manage multicast address allocation
- Hot-add/remove outputs without downtime

**Key Methods:**
```javascript
startRoute(cfg)           // Start a route with given config
stopRoute(id)             // Stop route and kill all processes
addDynamicOutput(id, cfg) // Add output to running route
toggleOutput(id, index)   // Enable/disable specific output
```

**Process Tracking:**
```javascript
this.procById = new Map()           // routeId → { srt, ffmpeg, multicast }
this.outputProcesses = new Map()    // routeId → Map(port → processInfo)
this.srtlaManagers = new Map()      // routeId → SrtlaManager instance
this.ffmpegOutputPorts = new Map()  // routeId → FFmpeg output UDP port
```

### 2. RouteMonitor (`src/services/routeMonitor.js`)

**Responsibilities:**
- Parse SRT statistics from srt-live-transmit JSON output
- Track connection state (connected/disconnected)
- Calculate derived metrics (bitrate, packet loss %)
- Store metrics to database
- Broadcast stats via WebSocket

**Stats Parsing:**
```javascript
parseSRTStats(routeId, data) {
  // Parse JSON from srt-live-transmit -pf:json output
  // Extract: RTT, bandwidth, flight, packets lost/dropped
  // Update in-memory state
  // Broadcast to WebSocket clients
  // Store to metrics database
}
```

**Connection Detection:**
```javascript
// For passthrough: Bandwidth > 0 = connected
// For transcode: FPS > 0 = connected (FFmpeg probe)
```

### 3. SrtlaManager (`src/services/srtlaManager.js`)

**Responsibilities:**
- Spawn `srtla_rec` process for SRTLA aggregation
- Manage multiple network paths (4G, 5G, WiFi, Ethernet)
- Monitor aggregator health
- Handle reconnections

**SRTLA Flow:**
```
BELABOX (SRTLA Client)
  ├─ Path 1: 4G → srtla_rec :5000
  ├─ Path 2: 5G → srtla_rec :5000
  └─ Path 3: WiFi → srtla_rec :5000
        ↓
    srtla_rec (aggregator)
        ↓
    SRT Output → 127.0.0.1:XXXXX
        ↓
    srt-live-transmit → UDP/Multicast
```

### 4. HttpTsServer (`src/services/httpTsServer.js`)

**Responsibilities:**
- HTTP server for MPEG-TS delivery
- Read from multicast UDP
- Serve to HTTP clients (browsers, VLC, etc.)
- Track client connections

**Multicast Join:**
```javascript
if (udpHost.startsWith('239.')) {
  socket.bind(udpPort, '0.0.0.0', () => {
    socket.addMembership(udpHost);
    socket.setMulticastTTL(128);
  });
  socket.setReuseAddress(true); // Multiple HTTP outputs can share multicast
}
```

### 5. MetricsDatabase (`src/services/metricsDatabase.js`)

**Responsibilities:**
- Store SRT metrics every second
- Efficient querying for time-range graphs
- Auto-cleanup of old data (configurable retention)

**Schema:**
```sql
CREATE TABLE srt_metrics (
  route_id TEXT,
  output_index INTEGER,
  timestamp INTEGER,
  direction TEXT,
  rtt REAL,
  flight INTEGER,
  bandwidth REAL,
  packets_lost INTEGER,
  packets_dropped INTEGER,
  packets_rexmit INTEGER,
  link_bandwidth REAL,
  byte_avail_buf INTEGER
);

CREATE INDEX idx_route_time ON srt_metrics(route_id, timestamp);
```

---

## Multicast Architecture

### Why Multicast?

**Traditional approach (unicast):**
```
Input → Process → Copy to RAM → Send to Output 1
                → Copy to RAM → Send to Output 2
                → Copy to RAM → Send to Output 3
```
**Problem**: N outputs = N copies in RAM = high CPU usage

**Multicast approach:**
```
Input → Process → Send to Multicast Address (239.1.x.y)
                    ↓ (NIC duplicates in hardware)
                 Output 1 reads from multicast
                 Output 2 reads from multicast
                 Output 3 reads from multicast
```
**Benefit**: N outputs = 1 copy = zero CPU overhead

### Multicast Address Generation

Each route gets a unique multicast address:

```javascript
function generateMulticastAddress(routeId) {
  // Hash route ID to generate unique address
  let hash = 0;
  for (let i = 0; i < routeId.length; i++) {
    hash = ((hash << 5) - hash) + routeId.charCodeAt(i);
  }

  const byte2 = (absHash >> 8) % 256;
  const byte3 = absHash % 256;

  return `239.1.${byte2}.${byte3}`;
}
```

**Address Range**: 239.1.0.0 - 239.1.255.255 (65,536 unique addresses)

**TTL**: 128 (allows routing across subnets)

### Multicast Joining

**Sender** (srt-live-transmit, FFmpeg):
```javascript
// Just send to multicast address - no special setup needed
const outputUrl = `udp://239.1.106.219:25401`;
```

**Receiver** (srt-live-transmit, HttpTsServer):
```javascript
// Must join multicast group
socket.bind(port, '0.0.0.0', () => {
  socket.addMembership('239.1.106.219');
});
```

### Network Requirements

**Routing:**
```bash
# Ensure multicast route exists
ip route add 239.0.0.0/8 dev eth0
```

**Switch Configuration:**
- IGMP Snooping: Recommended (prevents flooding)
- Multicast filtering: Disabled
- TTL: ≥ 128 if routing across subnets

---

## Process Management

### Process Hierarchy

**Passthrough Mode:**
```
Node.js (PM2/systemd)
 ├─ srtla_rec (if SRTLA input)
 │   └─ srt-live-transmit (SRT → UDP multicast)
 │
 ├─ srt-live-transmit (input → multicast)
 │
 ├─ srt-live-transmit (multicast → SRT output 1)
 ├─ srt-live-transmit (multicast → SRT output 2)
 ├─ ffmpeg (multicast → RTMP output)
 └─ HttpTsServer (multicast → HTTP clients)
```

**Transcode Mode:**
```
Node.js (PM2/systemd)
 ├─ srtla_rec (if SRTLA input)
 │   └─ srt-live-transmit (SRT → UDP localhost)
 │
 ├─ ffmpeg (UDP localhost → transcode → UDP multicast)
 │
 ├─ srt-live-transmit (multicast → SRT output 1)
 ├─ srt-live-transmit (multicast → SRT output 2)
 └─ HttpTsServer (multicast → HTTP clients)
```

### Process Cleanup

**PID Tracking:**
```javascript
// PidManager stores all child PIDs
pidManager.savePid(routeId, 'srt', proc.pid);
```

**Orphan Cleanup:**
```bash
# On startup, kill orphaned processes
node scripts/cleanup-all-srt.js
```

**Graceful Shutdown:**
```javascript
process.on('SIGTERM', () => {
  // Stop all routes
  // Wait for processes to exit (max 15s)
  // Force kill if needed
});
```

---

## Monitoring System

### EventBus Architecture

**Publisher-Subscriber Pattern:**

```javascript
// Publisher (RouteMonitor)
eventBus.emit(EventType.ROUTE_STATUS_CHANGED, {
  routeId: 'route_xxx',
  status: 'running',
  stats: { rtt: 12, bandwidth: 8.5 }
});

// Subscriber (WebSocket service)
eventBus.on(EventType.ROUTE_STATUS_CHANGED, (data) => {
  // Broadcast to all connected WebSocket clients
  wss.broadcast('statusUpdate', data);
});
```

**Event Types:**
- `ROUTE_STATUS_CHANGED` - Status updates (running, stopped, error)
- `ROUTE_CREATED` - New route added
- `ROUTE_DELETED` - Route removed
- `SRT_STATS_UPDATED` - SRT metrics update (every 500 packets)

### WebSocket Protocol

**Client → Server:**
```javascript
// Subscribe to route updates
ws.send(JSON.stringify({
  type: 'subscribe',
  routeId: 'route_xxx'
}));
```

**Server → Client:**
```javascript
// Status update broadcast
{
  type: 'statusUpdate',
  routeId: 'route_xxx',
  status: 'running',
  srt: {
    connected: true,
    rtt: 12.5,
    bandwidth: 8.3,
    packetsLost: 0
  }
}
```

**Update Frequency:**
- SRT stats: Every 500 packets (~0.5-2 seconds depending on bitrate)
- System health: Every 5 seconds
- Route status: Immediate on state change

---

## Database Schema

### Routes Storage (`data/routes.json`)

**Format:**
```json
{
  "route_<timestamp>": {
    "id": "route_<timestamp>",
    "name": "My Route",
    "mode": "passthrough|transcode",
    "autoStart": true|false,
    "ingest": { /* input config */ },
    "egresses": [ /* output configs */ ],
    "video": { /* video processing */ },
    "audio": { /* audio processing */ }
  }
}
```

**File Operations:**
- Read on startup (load routes)
- Write on route create/update/delete
- Atomic writes using temp file + rename

### User Database (`data/gateway.db`)

**Tables:**
```sql
-- User accounts (if AUTH_ENABLED=true)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT,
  created_at INTEGER
);

-- Presets (saved configurations)
CREATE TABLE presets (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT, -- 'input' | 'output' | 'audio'
  config TEXT, -- JSON
  created_at INTEGER
);
```

### Metrics Database (`data/metrics.db`)

**Retention Strategy:**
```
1 minute resolution: Keep 24 hours
5 minute aggregation: Keep 7 days
1 hour aggregation: Keep 30 days
```

**Query Optimization:**
```sql
-- Indexed by route_id + timestamp for fast range queries
SELECT * FROM srt_metrics
WHERE route_id = ?
  AND timestamp > ?
  AND timestamp < ?
ORDER BY timestamp ASC;
```

---

## Performance Optimizations

### 1. Multicast UDP (Zero-Copy Distribution)

**Traditional UDP unicast requires:**
- Application copies packet to kernel buffer N times (one per destination)
- CPU usage scales linearly with output count

**Multicast UDP optimization:**
- Application sends packet ONCE to multicast address
- NIC hardware duplicates packet to all interested receivers
- CPU usage: O(1) regardless of receiver count

**Benchmark:**
```
1 input → 10 SRT outputs:
  Unicast:  ~40% CPU
  Multicast: ~2% CPU (97% reduction)
```

### 2. Process Isolation

Each output runs in its own process:
- **Benefit**: One output crash doesn't affect others
- **Benefit**: Can restart individual outputs without route restart
- **Tradeoff**: Higher memory usage (~10-20MB per srt-live-transmit process)

### 3. FFmpeg Tuning

**Low-Latency Flags:**
```bash
-fflags nobuffer              # Disable input buffering
-fflags +discardcorrupt       # Drop corrupt packets instead of buffering
-flags low_delay              # Minimize encoder latency
-flush_packets 1              # Flush packets immediately
-max_delay 0                  # No muxer delay
```

**Audio Matrix Efficiency:**
```bash
# Instead of multiple FFmpeg processes, use filter_complex:
-filter_complex "[0:a:0]pan=stereo|FL=c0|FR=c1[aout0]"
# Single process handles all audio routing
```

### 4. Database Write Batching

**Metrics Database:**
```javascript
// Batch inserts every 1 second (instead of per-packet)
const batch = [];
statsInterval = setInterval(() => {
  db.run('BEGIN TRANSACTION');
  batch.forEach(metric => db.run('INSERT INTO srt_metrics...', metric));
  db.run('COMMIT');
  batch.length = 0;
}, 1000);
```

**Result**: 1000+ metrics/sec → 1 transaction/sec (lower I/O overhead)

### 5. WebSocket Throttling

**Problem**: SRT stats at 500-packet intervals = 2-10 updates/second per route

**Solution**: Rate limiting per client
```javascript
// Throttle to max 2 updates/second per route
if (Date.now() - lastUpdate < 500) {
  return; // Skip this update
}
```

---

## Multicast Implementation Details

### Address Collision Avoidance

**Hash-based allocation:**
```javascript
// Generates unique address from route ID
hash(route_1234567890) → 239.1.106.219
hash(route_9876543210) → 239.1.42.87
```

**Collision probability:**
- 65,536 possible addresses (239.1.0.0 - 239.1.255.255)
- Birthday paradox: 50% collision at ~300 routes
- Acceptable for typical use (< 100 routes per server)

**Collision detection:**
```javascript
// Check if multicast address already in use
const existingAddresses = Array.from(this.procById.values())
  .map(rec => rec.multicastAddr);

if (existingAddresses.includes(newAddress)) {
  // Regenerate with salt
  newAddress = generateMulticastAddress(routeId + '_retry');
}
```

### Multicast TTL

**Default TTL**: 128

**Reasoning:**
- TTL 1: Same subnet only (too restrictive)
- TTL 32: Organization-scoped (typical default)
- TTL 128: Allows routing across multiple networks
- TTL 255: Global (unnecessary and dangerous)

### IGMP Join Behavior

**Receiver must:**
1. Bind to `0.0.0.0` (not multicast address)
2. Call `addMembership(multicast_address)`
3. Set reuse address (`SO_REUSEADDR`) for multiple listeners

**Code:**
```javascript
socket.bind(port, '0.0.0.0', () => {
  socket.addMembership('239.1.x.y');
  socket.setMulticastTTL(128);
});
socket.setReuseAddress(true);
```

---

## SRTLA Deep-Dive

### Multi-Path Aggregation

**How SRTLA works:**
1. Encoder splits stream into chunks
2. Each chunk sent over ALL available paths simultaneously
3. Receiver (srtla_rec) reorders chunks by sequence number
4. Forwards reordered stream to local SRT port

**Packet Flow:**
```
Encoder
 ├─ Chunk #1 → Path A (4G)  ────┐
 ├─ Chunk #1 → Path B (5G)  ────┼─→ srtla_rec
 └─ Chunk #1 → Path C (WiFi) ───┘
                                  ↓
                            Reorder by sequence
                                  ↓
                            SRT output (single stream)
```

**Benefits:**
- **Redundancy**: If one path fails, others continue
- **Aggregation**: Combined bandwidth of all paths
- **Latency**: Uses fastest path for each packet
- **Reliability**: Can sustain 50%+ packet loss on individual paths

### SRTLA Configuration

**Recommended Settings:**
- **Latency**: 1200-2000ms (high for reordering buffer)
- **MTU**: 1316 bytes (cellular-friendly)
- **FEC**: Disabled (SRTLA handles redundancy)

---

## Audio Matrix Implementation

### Channel Routing Engine

**AudioMatrixEngine** (`shared/audioMatrix/AudioMatrixEngine.js`):

**Input:**
```javascript
{
  inputPids: [
    { pid: 260, channels: ['FL', 'FR', 'C', 'LFE', 'BL', 'BR', 'SL', 'SR'] }
  ],
  outputPids: [
    { pid: 512, channels: ['FL', 'FR'] }
  ],
  routes: {
    '260.0_512.0': true,  // Input FL → Output FL
    '260.1_512.1': true,  // Input FR → Output FR
    '260.2_512.0': 0.7,   // Input C  → Output FL (70%)
    '260.2_512.1': 0.7    // Input C  → Output FR (70%)
  }
}
```

**FFmpeg Filter Generation:**
```javascript
buildFilter() {
  // Generates: [0:a:0]pan=stereo|FL=c0+0.7*c2|FR=c1+0.7*c2[aout0]
  // Translates matrix routes → FFmpeg pan filter syntax
}
```

**Complexity:**
- Input channels: Up to 32
- Output channels: Up to 32
- Routes: Up to 1024 (32×32)

### Audio Processing Pipeline

```
Input Stream
    ↓
FFmpeg Demux → Extract Audio Streams
    ↓
Audio Matrix Filter
    ↓
pan=layout|FL=formula|FR=formula...
    ↓
AAC Encoder (if transcoding)
    ↓
Mux with Video
    ↓
Output Stream
```

---

## Security Architecture

### Authentication (Optional)

**JWT-based authentication:**
```javascript
// Login
POST /auth/login { username, password }
→ Returns: { token: "jwt_token", user: {...} }

// Protected endpoints
GET /routes
Headers: { Authorization: "Bearer jwt_token" }
```

**Password Hashing:**
```javascript
// bcrypt with cost factor 10
const hash = await bcrypt.hash(password, 10);
```

**Token Expiration**: 7 days (configurable)

### Rate Limiting

**Endpoints:**
- Route control (start/stop): 10 requests/minute
- Route CRUD: 30 requests/minute
- Auth: 5 requests/minute

**Implementation:**
```javascript
const routeControlLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10
});
```

### Input Validation

**Zod schemas** for all API endpoints:
```javascript
const createRouteSchema = z.object({
  name: z.string().min(1).max(100),
  mode: z.enum(['passthrough', 'transcode']),
  ingest: z.object({
    type: z.enum(['srt', 'udp', 'http', ...]),
    port: z.number().int().min(1).max(65535)
  })
});
```

---

## Scaling Considerations

### Vertical Scaling (Single Server)

**CPU Bottleneck:**
- Passthrough: Can handle 50+ routes (minimal CPU)
- Transcode: 5-15 routes depending on resolution

**Network Bottleneck:**
- 1 Gbps NIC: ~80 simultaneous 10Mbps streams
- 10 Gbps NIC: ~800 simultaneous 10Mbps streams

**Memory:**
- Base: ~100MB
- Per route: ~50MB (passthrough) or ~200MB (transcode with FFmpeg)

### Horizontal Scaling (Multiple Servers)

**Load balancing strategies:**

**Option 1: DNS Round-Robin**
```
prism1.example.com → 10.0.1.10
prism2.example.com → 10.0.1.11
prism3.example.com → 10.0.1.12
```

**Option 2: Dedicated Servers per Use Case**
```
ingest.example.com  → Passthrough routes (many routes, low CPU)
transcode.example.com → Transcode routes (few routes, high CPU)
```

**Option 3: Geo-Distribution**
```
prism-us-east.example.com
prism-eu-west.example.com
prism-asia.example.com
```

### High Availability

**Active-Passive Failover:**
```
Primary Server (Active)
    ↓ heartbeat
Secondary Server (Standby)
    ↓ (monitors primary health)
If primary fails → Secondary takes over
```

**Implementation:**
- Sync `routes.json` between servers (rsync/NFS)
- Health check endpoint: `GET /health`
- Failover script monitors health and starts routes on secondary

---

## Code Organization

### Directory Structure

```
prism-srt/
├── src/
│   ├── server.js              # Entry point
│   ├── container.js           # Dependency injection setup
│   ├── controllers/           # HTTP request handlers
│   │   ├── RouteController.js
│   │   ├── MetricsController.js
│   │   └── HealthController.js
│   ├── services/              # Business logic
│   │   ├── routeManager.js    # Process management
│   │   ├── routeMonitor.js    # Stats collection
│   │   ├── srtlaManager.js    # SRTLA handling
│   │   └── database.js        # Data persistence
│   ├── routes/                # Express route definitions
│   └── middleware/            # Auth, validation, etc.
├── shared/                    # Code shared between backend/frontend
│   └── audioMatrix/
├── frontend/                  # React UI
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api/               # API client
│   │   └── queries/           # TanStack Query hooks
│   └── public/
├── scripts/                   # Utility scripts
└── docs/                      # Documentation
```

### Design Principles

1. **Separation of Concerns**: Controllers → Services → Data
2. **Dependency Injection**: Testable, swappable components
3. **Fail-Fast**: Validate early, throw errors clearly
4. **Graceful Degradation**: Continue working when non-critical services fail
5. **Observable**: Comprehensive logging and metrics

---

## Future Enhancements

### Planned Features

- **Hardware Acceleration**: NVENC, QSV, VAAPI for GPU transcoding
- **HLS/DASH Output**: Adaptive bitrate streaming
- **Multi-Server Clustering**: Distributed processing
- **Advanced Audio DSP**: Loudness normalization, dynamics processing
- **Video Overlays**: Dynamic text, logos, timecode
- **NDI Support**: NewTek NDI input/output
- **API Webhooks**: External event notifications

### Performance Roadmap

- **Rust Rewrite**: Critical path in Rust for <1ms latency
- **eBPF Packet Processing**: Kernel-level multicast optimization
- **DPDK Integration**: Userspace NIC control for maximum throughput

---

## Technical Debt

### Known Limitations

1. **Single Node.js Thread**: JavaScript event loop bottleneck at extreme scale
2. **SQLite Write Concurrency**: Single writer limit for metrics DB
3. **No Clustering**: Can't distribute routes across servers automatically
4. **Manual Failover**: No automatic HA/failover built-in

### Mitigation Strategies

1. Use PM2 cluster mode for API endpoints (read-only operations)
2. Metrics DB: Write batching + async writes
3. Manual load balancing via DNS
4. External monitoring (Prometheus) for failover detection

---

**Questions or suggestions?** Open an issue or contact stephane.bhiri@gmail.com
