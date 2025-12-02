# Prism SRT - Production Deployment Guide

Complete guide for deploying Prism SRT in production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Server Provisioning](#server-provisioning)
3. [Security Hardening](#security-hardening)
4. [Performance Tuning](#performance-tuning)
5. [Monitoring Setup](#monitoring-setup)
6. [Backup Strategy](#backup-strategy)
7. [Update Procedures](#update-procedures)
8. [Disaster Recovery](#disaster-recovery)

---

## Pre-Deployment Checklist

### Hardware Requirements

**Minimum (Passthrough Mode):**
- CPU: 2 cores @ 2.4 GHz
- RAM: 4 GB
- Network: 1 Gbps NIC
- Storage: 20 GB SSD

**Recommended (Transcode Mode):**
- CPU: 8+ cores @ 3.0 GHz (or GPU with NVENC/QSV)
- RAM: 16 GB
- Network: 10 Gbps NIC
- Storage: 100 GB NVMe SSD

**Enterprise (High-Density):**
- CPU: 16+ cores (AMD EPYC / Intel Xeon)
- RAM: 64 GB ECC
- Network: 25/40 Gbps NIC with SR-IOV
- Storage: 500 GB NVMe RAID

### Software Requirements

- Ubuntu 22.04 LTS or Debian 12 (recommended)
- Node.js 20.x LTS
- FFmpeg 6.0+ with SRT support
- srt-tools (srt-live-transmit)
- srtla_rec (if using SRTLA bonding)

### Network Requirements

- **Ports**:
  - 4670/TCP: Web UI
  - 5000-8000/UDP: SRT/SRTLA inputs
  - 6000-9000/UDP: SRT outputs
- **Multicast**: 239.1.0.0/16 routable on local network
- **Bandwidth**: Upstream = sum of all outputs × 1.2

---

## Server Provisioning

### Cloud Providers

#### AWS EC2

**Recommended instance:**
```
Type: c6i.2xlarge
vCPUs: 8
RAM: 16 GB
Network: Up to 12.5 Gbps
Storage: 100 GB gp3
Cost: ~$0.34/hour
```

#### DigitalOcean

**Recommended droplet:**
```
CPU-Optimized
8 vCPUs / 16 GB RAM
Cost: ~$168/month
```

#### Bare Metal

**Hosting providers:**
- OVH (budget-friendly)
- Hetzner (EU, excellent bandwidth)
- Leaseweb (global locations)

---

## Security Hardening

### 1. Enable Authentication

**Edit `.env`:**
```env
AUTH_ENABLED=true
JWT_SECRET=<generate-strong-secret>
```

**Generate secret:**
```bash
openssl rand -base64 32
```

**Create admin:**
```bash
npm run create-admin
```

### 2. Firewall Configuration

**UFW:**
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow from YOUR_IP to any port 4670 proto tcp
sudo ufw allow 5000:8000/udp
sudo ufw enable
```

### 3. Reverse Proxy (Nginx + HTTPS)

```nginx
server {
  listen 443 ssl http2;
  server_name prism.yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/prism.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/prism.yourdomain.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:4670;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

---

## Performance Tuning

### System Limits

**/etc/sysctl.conf:**
```
# UDP buffers (critical for SRT)
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728

# Multicast
net.ipv4.igmp_max_memberships = 100

# TCP (Web UI)
net.ipv4.tcp_congestion_control = bbr
```

**Apply:**
```bash
sudo sysctl -p
```

### CPU Governor

```bash
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils
sudo systemctl restart cpufrequtils
```

---

## Monitoring Setup

### PM2 Monitoring

```bash
pm2 monit
```

### Health Checks

```bash
curl http://localhost:4670/health
```

### Log Rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 10
```

---

## Backup Strategy

### Automated Backups

**Crontab:**
```bash
0 2 * * * /opt/prism-srt/scripts/backup-database.sh
```

**What to backup:**
- data/routes.json
- data/gateway.db
- data/metrics.db (optional)

---

## Update Procedures

### Zero-Downtime Update

```bash
cd /opt/prism-srt
git pull
npm run setup
pm2 restart prism-srt
```

### Rollback

```bash
git checkout v1.0.0
pm2 restart prism-srt
```

---

## Disaster Recovery

### RTO Target

< 30 minutes

### Recovery Steps

1. Provision new server (20 min)
2. Install Prism SRT (5 min)
3. Restore from backup (3 min)
4. Start routes (2 min)

---

**Need help?** Contact stephane.bhiri@gmail.com
