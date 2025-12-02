# Prism SRT - API Reference

Complete REST API documentation for automation and integration.

## Base URL

```
http://localhost:4670
```

For HTTPS (with reverse proxy):
```
https://prism.yourdomain.com
```

## Authentication

### Login

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_xxx",
    "username": "admin"
  }
}
```

**Usage:**
```bash
curl -X POST http://localhost:4670/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

### Using the Token

Include in `Authorization` header:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4670/routes
```

**Token expiration:** 7 days

---

## Routes API

### List All Routes

**Endpoint:** `GET /routes`

**Response:**
```json
{
  "routes": [
    {
      "id": "route_1234567890",
      "name": "Studio A to YouTube",
      "mode": "passthrough",
      "status": "running",
      "autoStart": true,
      "ingest": {
        "type": "srt",
        "port": 5000,
        "mode": "srtla",
        "latency": 1200
      },
      "egresses": [
        {
          "id": "output_1",
          "type": "rtmp",
          "host": "a.rtmp.youtube.com/live2/KEY",
          "port": 1935,
          "enabled": true
        }
      ]
    }
  ]
}
```

### Get Route Details

**Endpoint:** `GET /routes/:id`

**Response:**
```json
{
  "id": "route_xxx",
  "name": "My Route",
  "mode": "passthrough",
  "status": "running",
  "ingest": { ... },
  "egresses": [ ... ],
  "video": { ... },
  "audio": { ... }
}
```

### Create Route

**Endpoint:** `POST /routes`

**Request:**
```json
{
  "name": "New Route",
  "mode": "passthrough",
  "autoStart": false,
  "ingest": {
    "type": "srt",
    "port": 5000,
    "mode": "listener",
    "latency": 150
  },
  "egresses": [
    {
      "type": "srt",
      "host": "remote.server.com",
      "port": 6000,
      "mode": "caller",
      "latency": 150
    }
  ]
}
```

**Response:**
```json
{
  "id": "route_1234567890",
  "name": "New Route",
  ...
}
```

### Update Route

**Endpoint:** `PUT /routes/:id`

**Request:** Complete route object (replaces entire config)

**Response:** Updated route object

### Partial Update

**Endpoint:** `PATCH /routes/:id`

**Request:** (only fields to update)
```json
{
  "name": "Updated Name"
}
```

**Response:** Updated route object

### Delete Route

**Endpoint:** `DELETE /routes/:id`

**Response:** `204 No Content`

**Note:** Route must be stopped before deleting

---

## Route Control

### Start Route

**Endpoint:** `POST /routes/:id/start`

**Response:**
```json
{
  "ok": true,
  "pid": 12345,
  "status": "running"
}
```

**Errors:**
- `400` - Route already running
- `500` - Failed to start (check logs)

### Stop Route

**Endpoint:** `POST /routes/:id/stop`

**Response:**
```json
{
  "ok": true,
  "status": "stopped"
}
```

### Restart Route

**Endpoint:** `POST /routes/:id/restart`

**Response:**
```json
{
  "ok": true,
  "pid": 12346
}
```

---

## Output Management

### Add Output (Hot-Add)

**Endpoint:** `POST /routes/:id/outputs`

**Request:**
```json
{
  "type": "srt",
  "host": "backup.server.com",
  "port": 7000,
  "mode": "caller",
  "latency": 150
}
```

**Response:**
```json
{
  "ok": true,
  "outputIndex": 2,
  "pid": 12347
}
```

**Note:** Route must be running

### Toggle Output

**Endpoint:** `POST /routes/:id/outputs/:index/toggle`

**Request:**
```json
{
  "enabled": false
}
```

**Response:**
```json
{
  "ok": true,
  "enabled": false
}
```

### Remove Output

**Endpoint:** `DELETE /routes/:id/outputs/:index`

**Response:** `204 No Content`

---

## Metrics API

### Get Route Stats

**Endpoint:** `GET /routes/:id/stats`

**Response:**
```json
{
  "status": "running",
  "srt": {
    "connected": true,
    "rtt": 12.5,
    "bandwidth": 8.3,
    "packetsLost": 0,
    "packetsDropped": 0,
    "flight": 42
  },
  "srtOutputs": [
    {
      "port": 6000,
      "connected": true,
      "rtt": 15.2,
      "bandwidth": 8.1,
      "enabled": true
    }
  ],
  "httpOutputs": [
    {
      "port": 8080,
      "clientCount": 3,
      "bytesSent": 1234567890
    }
  ]
}
```

### Get Historical Metrics

**Endpoint:** `GET /metrics/:routeId`

**Query params:**
- `from`: Unix timestamp (seconds)
- `to`: Unix timestamp (seconds)
- `output`: Output index (optional, default all)

**Example:**
```bash
GET /metrics/route_xxx?from=1700000000&to=1700003600&output=0
```

**Response:**
```json
{
  "routeId": "route_xxx",
  "outputIndex": 0,
  "metrics": [
    {
      "timestamp": 1700000060,
      "rtt": 12.3,
      "flight": 45,
      "bandwidth": 8.2,
      "packetsLost": 0,
      "packetsDropped": 0
    },
    ...
  ]
}
```

---

## System API

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "uptime": 86400,
  "routes": {
    "total": 5,
    "running": 3,
    "stopped": 2
  },
  "system": {
    "cpu": 23.5,
    "memory": 45.2,
    "disk": 67.8
  },
  "version": "1.0.0"
}
```

**Use for monitoring:**
```bash
# Nagios/Icinga check
curl -sf http://localhost:4670/health || exit 2
```

### Get System Stats

**Endpoint:** `GET /stats`

**Response:**
```json
{
  "cpu": 23.5,
  "memory": {
    "used": 4.2,
    "total": 16.0,
    "percent": 26.25
  },
  "disk": {
    "used": 12.5,
    "total": 100.0,
    "percent": 12.5
  },
  "network": {
    "interfaces": [
      {
        "name": "eth0",
        "rx": 1234567890,
        "tx": 9876543210
      }
    ]
  }
}
```

---

## Presets API

### List Presets

**Endpoint:** `GET /presets`

**Query params:**
- `type`: Filter by type (`input`, `output`, `audio`)

**Response:**
```json
{
  "presets": [
    {
      "id": "preset_xxx",
      "name": "YouTube 1080p",
      "type": "output",
      "config": {
        "type": "rtmp",
        "host": "a.rtmp.youtube.com/live2/",
        "port": 1935
      }
    }
  ]
}
```

### Create Preset

**Endpoint:** `POST /presets`

**Request:**
```json
{
  "name": "My Preset",
  "type": "output",
  "config": {
    "type": "srt",
    "mode": "caller",
    "latency": 150
  }
}
```

### Delete Preset

**Endpoint:** `DELETE /presets/:id`

**Response:** `204 No Content`

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:4670');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Message Types

**Server → Client (Broadcasts):**

**1. Status Update**
```json
{
  "type": "statusUpdate",
  "routeId": "route_xxx",
  "status": "running"
}
```

**2. Stats Update**
```json
{
  "type": "statsUpdate",
  "routeId": "route_xxx",
  "stats": {
    "srt": {
      "connected": true,
      "rtt": 12.5,
      "bandwidth": 8.3
    }
  }
}
```

**3. Route Created**
```json
{
  "type": "routeCreated",
  "route": { ... }
}
```

**4. Route Deleted**
```json
{
  "type": "routeDeleted",
  "routeId": "route_xxx"
}
```

**Client → Server:**

Currently one-way (server broadcasts only). No client commands via WebSocket.

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional context"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (success, no body)
- `400` - Bad Request (invalid data)
- `401` - Unauthorized (auth required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., route already exists)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Error Codes

```json
{ "code": "ROUTE_NOT_FOUND" }
{ "code": "ROUTE_ALREADY_RUNNING" }
{ "code": "PORT_IN_USE" }
{ "code": "INVALID_CONFIG" }
{ "code": "COMMAND_NOT_FOUND" }  // FFmpeg/SRT tools missing
```

---

## Rate Limits

**Endpoints:**
- `/auth/*`: 5 requests/minute
- `/routes/:id/start|stop|restart`: 10 requests/minute
- `/routes` (CRUD): 30 requests/minute
- Other endpoints: 100 requests/minute

**Headers:**
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
X-RateLimit-Reset: 1700000060
```

---

## Example Scripts

### Start All Auto-Start Routes

```bash
#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:4670/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}' \
  | jq -r '.token')

curl -s http://localhost:4670/routes \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.routes[] | select(.autoStart == true) | .id' \
  | while read id; do
    curl -X POST http://localhost:4670/routes/$id/start \
      -H "Authorization: Bearer $TOKEN"
  done
```

### Monitor Route Health

```bash
#!/bin/bash
ROUTE_ID="route_xxx"

while true; do
  STATS=$(curl -s http://localhost:4670/routes/$ROUTE_ID/stats)
  RTT=$(echo $STATS | jq -r '.srt.rtt')
  LOSS=$(echo $STATS | jq -r '.srt.packetsLost')

  if (( $(echo "$RTT > 100" | bc -l) )); then
    echo "WARNING: High RTT: $RTT ms"
  fi

  if (( $LOSS > 100 )); then
    echo "WARNING: Packet loss: $LOSS packets"
  fi

  sleep 10
done
```

### Bulk Create Routes from CSV

```python
import csv
import requests

API_BASE = "http://localhost:4670"
TOKEN = "your-jwt-token"

headers = {"Authorization": f"Bearer {TOKEN}"}

with open('routes.csv') as f:
    reader = csv.DictReader(f)
    for row in reader:
        route = {
            "name": row['name'],
            "mode": "passthrough",
            "ingest": {
                "type": "srt",
                "port": int(row['input_port']),
                "mode": "listener",
                "latency": 150
            },
            "egresses": [{
                "type": "srt",
                "host": row['output_host'],
                "port": int(row['output_port']),
                "mode": "caller",
                "latency": 150
            }]
        }

        resp = requests.post(f"{API_BASE}/routes", json=route, headers=headers)
        print(f"Created: {resp.json()['id']}")
```

---

## WebSocket Integration

### React Example

```javascript
import { useEffect, useState } from 'react';

function RouteMonitor({ routeId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4670');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'statsUpdate' && data.routeId === routeId) {
        setStats(data.stats);
      }
    };

    return () => ws.close();
  }, [routeId]);

  return (
    <div>
      <h3>RTT: {stats?.srt?.rtt || 'N/A'} ms</h3>
      <h3>Bandwidth: {stats?.srt?.bandwidth || 0} Mbps</h3>
    </div>
  );
}
```

### Node.js Example

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:4670');

ws.on('open', () => {
  console.log('Connected to Prism SRT');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.type === 'statsUpdate') {
    console.log(`Route ${msg.routeId}: ${msg.stats.srt.bandwidth} Mbps`);
  }
});
```

---

## Automation Examples

### Auto-Restart Failed Routes

```javascript
const axios = require('axios');

const API = 'http://localhost:4670';
const TOKEN = 'your-jwt-token';
const headers = { Authorization: `Bearer ${TOKEN}` };

async function checkAndRestartRoutes() {
  const { data } = await axios.get(`${API}/routes`, { headers });

  for (const route of data.routes) {
    if (route.autoStart && route.status !== 'running') {
      console.log(`Restarting ${route.name}...`);

      await axios.post(`${API}/routes/${route.id}/start`, {}, { headers });
    }
  }
}

// Run every 60 seconds
setInterval(checkAndRestartRoutes, 60000);
```

### Export Metrics to CSV

```bash
#!/bin/bash
ROUTE_ID="route_xxx"
FROM=$(date -d "24 hours ago" +%s)
TO=$(date +%s)

curl -s "http://localhost:4670/metrics/$ROUTE_ID?from=$FROM&to=$TO" \
  | jq -r '.metrics[] | [.timestamp, .rtt, .bandwidth, .packetsLost] | @csv' \
  > metrics.csv

echo "Exported to metrics.csv"
```

---

## Webhooks (Custom Integration)

While Prism SRT doesn't have built-in webhooks, you can implement them by listening to WebSocket events:

```javascript
const WebSocket = require('ws');
const axios = require('axios');

const ws = new WebSocket('ws://localhost:4670');

ws.on('message', async (data) => {
  const msg = JSON.parse(data);

  // Forward status changes to your webhook endpoint
  if (msg.type === 'statusUpdate') {
    await axios.post('https://your-webhook.com/prism-events', msg);
  }
});
```

---

## Complete API Reference

### Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/routes` | List all routes |
| GET | `/routes/:id` | Get route details |
| GET | `/routes/:id/config` | Get route configuration |
| GET | `/routes/:id/stats` | Get real-time stats |
| POST | `/routes` | Create new route |
| PUT | `/routes/:id` | Update route (full) |
| PATCH | `/routes/:id` | Update route (partial) |
| DELETE | `/routes/:id` | Delete route |
| POST | `/routes/:id/start` | Start route |
| POST | `/routes/:id/stop` | Stop route |
| POST | `/routes/:id/restart` | Restart route |
| POST | `/routes/:id/outputs` | Add output |
| POST | `/routes/:id/outputs/:index/toggle` | Enable/disable output |
| DELETE | `/routes/:id/outputs/:index` | Remove output |
| POST | `/routes/:id/duplicate` | Duplicate route |

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/metrics/:routeId` | Get historical metrics |
| DELETE | `/metrics/:routeId` | Delete metrics for route |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/stats` | System statistics |
| POST | `/system/restart` | Restart service (requires auth) |
| POST | `/system/stop` | Stop service (requires auth) |

### Presets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/presets` | List presets |
| GET | `/presets/:id` | Get preset |
| POST | `/presets` | Create preset |
| PUT | `/presets/:id` | Update preset |
| DELETE | `/presets/:id` | Delete preset |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login (get JWT token) |
| POST | `/auth/logout` | Logout (invalidate token) |
| GET | `/auth/verify` | Verify token validity |

### Probe

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/probe` | Probe input stream |

---

**Questions?** Contact stephane.bhiri@gmail.com or open an issue on GitHub.
