# Application Screenshots

This document provides a detailed walkthrough of the SRT Router interface with screenshots of all major features.

## Table of Contents

- [Home Page & Route List](#home-page--route-list)
- [Route Configuration](#route-configuration)
- [Audio Matrix Setup](#audio-matrix-setup)
- [Real-Time Monitoring](#real-time-monitoring)

---

## Home Page & Route List

![Home Page](images/00-home-page.png)

The main dashboard shows all configured routes with their current status:

**Key Features:**
- **Route Cards**: Each route is displayed with its name, status (STOPPED/RUNNING), and configuration summary
- **Quick Actions**: Start/Stop, Edit, Monitor, and Delete buttons for each route
- **Add Route Button**: Create new routes with default configuration
- **WebSocket Status**: Connection indicator at the bottom
- **Route Information**:
  - Route ID and name
  - Ingest settings (protocol, mode, host, port)
  - Egress settings (protocol, mode, host, port)

**Example shown:**
- "Production Stream Paris" - STOPPED route receiving from SRT caller (IP censored for security)
- "New Route" - RUNNING route actively processing

---

## Route Configuration

![Route Editor](images/02-edit-form-general.png)

Comprehensive route configuration interface:

### General Settings
- **Route Name**: Custom name for easy identification
- **Auto-start**: Enable to start automatically on system boot

### Ingest Settings
- **Type**: SRT, RTMP, or UDP input
- **Mode**:
  - Caller: Connect to remote host
  - Listener: Wait for incoming connection
- **Host**: IP address or hostname
- **Port**: Network port
- **Latency**: SRT latency in milliseconds (affects reliability vs delay)
- **Probe Input**: Test input stream to detect audio/video PIDs

### Egress Settings
- **Type**: SRT, RTMP, or UDP output
- **Mode**: Caller or Listener
- **Host**: Destination address
- **Port**: Destination port
- **Latency**: SRT output latency
- **SRT Pipe**: Use srt-live-transmit for passthrough (when available)

### Video Settings
- **Mode**:
  - Copy (Passthrough): No video transcoding
  - Transcode: Re-encode video (specify codec and bitrate)

---

## Audio Matrix Setup

![Audio Matrix](images/03-audio-matrix.png)

Visual audio routing interface for flexible channel mapping:

### Input PIDs Section (📥)
- **Add Input**: Define source audio PIDs from your input stream
- **PID Configuration**: Specify PID number, name, and channel layout
- **Channel Display**: Shows individual channels (Ch1, Ch2, etc.)

### Routing Matrix (🔀)
- **Visual Grid**: Click cells to create/remove routes
- **Input → Output**: Clear visualization of audio routing
- **Active Routes**: Green checkmarks show enabled connections
- **Example**:
  - PID 1024 Ch1 → PID 300 Ch1
  - PID 1024 Ch2 → PID 300 Ch2

### Output PIDs Section (📤)
- **Add Output**: Create output audio streams
- **Codec Selection**: AAC, MP3, Opus, FLAC, etc.
- **Bitrate**: Configure audio bitrate
- **Channel Layout**: Mono, Stereo, 5.1, 7.1, custom
- **Edit/Remove**: Modify or delete output PIDs

### Active Routes Summary (📋)
- **Route Count**: Total number of active channel mappings
- **Route List**: Complete list of configured input→output connections

**Sample Rate**: Configure output sample rate (44100 Hz, 48000 Hz)

---

## Real-Time Monitoring

![Monitoring Interface](images/05-monitor-running.png)

Live statistics and process monitoring for active routes:

### Overview Section (🎯)
- **Route Status**: RUNNING, STOPPED, ERROR, STARTING
- **Uptime**: How long the route has been running
- **Last Update**: Timestamp of latest stats

### FFmpeg Process (🎬)
- **Status**: Process state (running, failed, stopped)
- **PID**: System process ID
- **Exit Code**: If process failed, shows exit code
- **Performance Metrics**:
  - **FPS**: Current frames per second
  - **Bitrate**: Output bitrate in kbits/s
  - **Speed**: Processing speed (1.0x = real-time)
  - **Frame**: Current frame number
  - **Size**: Output file size
  - **Time**: Processing timestamp
- **Command**: Full FFmpeg command being executed
- **Errors**: Any error messages from FFmpeg

### SRT Input (📡)
- **Status**: connecting, connected, disconnected
- **Connected**: Yes/No indicator
- **PID**: Process ID
- **Bandwidth**: Current bandwidth usage in Mbps
- **Link BW**: Available link bandwidth
- **RTT Average**: Round-trip time (latency) in milliseconds
- **Packets Received**: Total packets received
- **Packets Lost**: Packet loss count
- **Rate Receiving**: Current receiving rate in Mbps

### SRT Output (📤)
- **Status**: Connection state
- **Connected**: Connection status
- **PID**: Process ID
- **Bandwidth**: Output bandwidth in Mbps
- **Packets Sent**: Total packets transmitted
- **Packets Lost**: Lost packet count
- **Rate Sending**: Current sending rate in Mbps
- **RTT Average**: Round-trip time

### Connections (🔌)
- **Input Status**: connected, disconnected, error
- **Input URL**: Full SRT/RTMP/UDP input URL
- **Output Status**: Connection state
- **Output URL**: Full output URL

---

## Additional Features

### WebSocket Real-Time Updates
All statistics update automatically every second via WebSocket connection, providing:
- Instant status changes
- Live performance metrics
- No page refresh required

### Responsive Design
The interface adapts to different screen sizes for monitoring on various devices.

### Error Handling
Clear error messages and status indicators help diagnose issues quickly.

---

## Notes

- Screenshots show IP addresses partially censored (62.23.\*\*\*.\*\*\*) for security
- Actual monitoring shows real-time values updating every second
- All features work together to provide a complete SRT streaming solution
