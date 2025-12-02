# Authentication Setup Guide

This application uses JWT authentication to secure the web control panel (port 4670) while leaving SRT streaming ports (5000-6999) open for legitimate streaming traffic.

## Important Security Notes

- **Port 4670 (Web UI)**: Protected by JWT authentication
- **Ports 5000-6999 (SRT streams)**: Open by design (no authentication)
- **First user**: Automatically becomes admin
- **Subsequent users**: Only admins can create new users

## Initial Setup (Fresh Install)

### Method 1: Via Web UI (Recommended)

1. **Start the server:**
   ```bash
   npm install
   npm run setup  # Installs deps + builds frontend
   npm start
   ```

2. **Open browser:**
   ```
   http://localhost:4670
   ```

3. **Create first admin account:**
   - You'll see "Initial Setup" screen
   - Enter username (min 3 characters)
   - Enter password (min 6 characters)
   - Click "🚀 Create Admin Account"
   - Auto-login to system

### Method 2: Via CLI Script

1. **Start server ONCE to create database tables:**
   ```bash
   npm start
   ```
   Wait for "✅ SRT Router listening on :4670"
   Then stop with Ctrl+C

2. **Run admin creation script:**
   ```bash
   npm run create-admin
   ```

3. **Enter credentials when prompted:**
   ```
   Username: admin
   Password: YourSecurePassword123
   Confirm password: YourSecurePassword123
   ```

4. **Start server and login:**
   ```bash
   npm start
   ```
   Navigate to `http://localhost:4670/login`

## Creating Additional Users

### Option 1: Admin Panel (Recommended)

1. Login as admin
2. Click "⚙️ Admin" button in header
3. Fill in user creation form:
   - Username
   - Password
   - Role (Operator or Viewer)
4. Click "✨ Create User"

### Option 2: CLI Script

```bash
npm run create-admin
```

**Note:** Only admins can create users. The backend enforces this even if you use the CLI.

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access + user management |
| **Operator** | Create, edit, start, stop routes |
| **Viewer** | Read-only access (monitoring) |

## Password Reset

If admin forgets password:

```bash
node scripts/resetAdminPassword.mjs admin NewSecurePassword123
```

## Security Best Practices

### For Testing (HTTP)
- ⚠️ Passwords transmitted in plain text over network
- ⚠️ JWT tokens visible to network sniffers
- ✅ OK for short-term testing on trusted networks
- ❌ NOT OK for production

### For Production (HTTPS Required)

**Option 1: Let's Encrypt (if you have a domain)**
```bash
sudo certbot certonly --standalone -d yourdomain.com
# Update server.js to use certificates
```

**Option 2: Cloudflare Tunnel (no domain needed)**
```bash
cloudflared tunnel --url http://localhost:4670
# Gives you https://random.trycloudflare.com for free
```

**Option 3: Reverse Proxy (Nginx + Let's Encrypt)**
```nginx
server {
  listen 443 ssl;
  ssl_certificate /etc/letsencrypt/live/domain/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/domain/privkey.pem;

  location / {
    proxy_pass http://localhost:4670;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## Environment Variables

### JWT_SECRET (CRITICAL)

**Default:** `"CHANGE_THIS_IN_PRODUCTION_PLEASE"`

**⚠️ YOU MUST CHANGE THIS IN PRODUCTION!**

```bash
# Generate secure secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Set in environment
export JWT_SECRET="your-generated-secret-here-very-long-and-random"
npm start
```

Or use `.env` file (recommended):
```bash
# .env
JWT_SECRET=your-super-secret-key-here-1234567890abcdef
JWT_EXPIRES_IN=7d
```

### JWT_EXPIRES_IN

**Default:** `7d` (7 days)

**Options:**
- `1h` = 1 hour
- `24h` = 24 hours
- `7d` = 7 days
- `30d` = 30 days

## Troubleshooting

### "No such table: users"

**Cause:** Database tables not created yet.

**Solution:** Start the server once to run migrations:
```bash
npm start
# Wait for server to start, then Ctrl+C
# Now run your script
npm run create-admin
```

### Can't login after creating admin

**Solution 1:** Clear browser cache
```javascript
// In browser console (F12):
localStorage.clear()
window.location.href = '/login'
```

**Solution 2:** Use incognito/private window

### 401 Unauthorized on API calls

**Cause:** Token expired or invalid.

**Solution:** Logout and login again. Token is valid for JWT_EXPIRES_IN duration.

### "Only admins can create new users"

**Correct!** After the first admin is created, only admins can create additional users. This is intentional security.

## API Endpoints

### Public (No Authentication)
- `GET /health` - Health check
- `POST /auth/login` - Login (returns JWT token)
- `GET /auth/check` - Check if initial setup needed
- `POST /auth/register` - Register first user only (auto-admin)

### Protected (Requires Bearer Token)
- `GET /auth/me` - Get current user info
- `GET /auth/users` - List all users (admin only)
- `POST /auth/register` - Create user (admin only, after initial setup)
- All `/routes/*` endpoints
- All `/presets/*` endpoints
- All `/collisions/*`, `/ports/*`, `/probe/*`, `/stats/*` endpoints

## Example: Create User via API

```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:4670/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourPassword"}' \
  | jq -r '.token')

# Create new operator
curl -X POST http://localhost:4670/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"operator1","password":"Pass123","role":"operator"}'
```

## Production Deployment Checklist

- [ ] Set JWT_SECRET environment variable (NOT the default!)
- [ ] Enable HTTPS (Let's Encrypt, Cloudflare Tunnel, or Nginx)
- [ ] Create initial admin user
- [ ] Test login/logout flow
- [ ] Create operator accounts for your team
- [ ] Configure firewall (allow 4670 for HTTPS, 5000-6999 for SRT)
- [ ] Set strong passwords (min 12 characters recommended)
- [ ] Document admin password in secure location (password manager)
- [ ] Test from external network
- [ ] Monitor auth logs

## Security Considerations

### What's Protected
✅ Web UI (port 4670) - JWT authentication required
✅ All configuration changes
✅ All route CRUD operations
✅ All monitoring/stats access

### What's NOT Protected (By Design)
✅ SRT streaming ports (5000-6999) - Business requirement
✅ Incoming/outgoing SRT streams - Must be accessible

This is intentional: The application receives/sends video streams on SRT ports, which must remain open. Only the control panel requires authentication.

## Migration from HTTP to HTTPS

When you're ready to enable HTTPS:

1. **Get certificates** (Let's Encrypt or Cloudflare)
2. **No code changes needed** - Just configure reverse proxy
3. **Update bookmarks** from http:// to https://
4. **Change all passwords** (they were transmitted in plain text over HTTP)

The JWT system works identically over HTTP and HTTPS. You just add encryption at the transport layer (TLS).
