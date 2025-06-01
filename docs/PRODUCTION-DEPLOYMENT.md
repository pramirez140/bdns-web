# BDNS Web Production Deployment Guide

## Overview

This guide covers deploying the enhanced BDNS Web application to production with all latest features including automatic sync, URL state management, and comprehensive grant management.

## 🚀 Quick Production Deployment

### Option 1: Automated Deployment Script

The fastest way to deploy to production:

```bash
# On your production server
git clone https://github.com/your-username/bdns-web.git
cd bdns-web
sudo ./deploy-production.sh
```

This script handles:
- ✅ Full production environment setup
- ✅ Secure password generation
- ✅ Docker container configuration
- ✅ Automatic backup setup
- ✅ Systemd service installation
- ✅ Firewall configuration
- ✅ Cron job setup for sync and backups

### Option 2: Manual Deployment

For custom deployments or if you prefer manual control:

## 📋 Prerequisites

- Ubuntu 20.04+ or Debian 11+ server
- Docker & Docker Compose installed
- Git installed
- Root/sudo access
- Domain name (optional, for SSL)

## 🔧 Step-by-Step Manual Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y git curl wget nginx certbot python3-certbot-nginx

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Logout and login again to apply Docker permissions
```

### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-username/bdns-web.git /opt/bdns-web
cd /opt/bdns-web

# Create production environment
cp .env.example .env.local
```

Edit `.env.local` with production values:

```bash
# BDNS Web Production Environment
NODE_ENV=production
DATABASE_URL=postgresql://bdns_user:SECURE_PASSWORD_HERE@postgres:5432/bdns_db

# BDNS API Configuration
BDNS_API_BASE=https://www.infosubvenciones.es/bdnstrans

# Database Configuration
POSTGRES_DB=bdns_db
POSTGRES_USER=bdns_user
POSTGRES_PASSWORD=SECURE_PASSWORD_HERE

# Cron Security
CRON_SECRET=SECURE_CRON_SECRET_HERE

# Application Configuration
NEXT_PUBLIC_APP_NAME=BDNS Web
NEXT_PUBLIC_APP_DESCRIPTION=Base de Datos Nacional de Subvenciones
```

### 3. Start Services

```bash
# Build and start production containers
docker-compose up -d --build

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f
```

### 4. Setup Automatic Sync

```bash
# Install automatic sync cron job
chmod +x setup-cron.sh
sudo ./setup-cron.sh

# Verify cron installation
crontab -l
```

### 5. Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/bdns-web
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Rate limiting for API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/bdns-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL with Let's Encrypt

```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 7. Setup Systemd Service

```bash
# Create systemd service file
sudo nano /etc/systemd/system/bdns-web.service
```

Add this content:

```ini
[Unit]
Description=BDNS Web Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/bdns-web
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable bdns-web.service
sudo systemctl start bdns-web.service
```

## 🔒 Security Configuration

### Firewall Setup

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block direct access to application port
sudo ufw deny 3000/tcp
```

### Database Security

```bash
# Change default passwords in .env.local
# Use strong, unique passwords for:
# - POSTGRES_PASSWORD
# - CRON_SECRET

# Limit database connections
# Edit docker-compose.yml to add:
# POSTGRES_MAX_CONNECTIONS=50
```

### Application Security

- ✅ Environment variables in `.env.local` (not committed to git)
- ✅ Cron API protected with secret header
- ✅ Nginx rate limiting on API endpoints
- ✅ Security headers configured
- ✅ SSL/TLS encryption with Let's Encrypt

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Check application health
curl https://your-domain.com/api/health

# Check database status
curl https://your-domain.com/api/sync | jq '.data.database_stats'

# Check container status
docker-compose ps

# View logs
docker-compose logs -f web
docker-compose logs -f postgres
```

### Automatic Backups

The deployment script sets up automatic backups:

- **Database**: Daily at 2:00 AM
- **Application**: Daily at 2:00 AM
- **Retention**: 7 days
- **Location**: `/opt/bdns-backups/`

Manual backup:

```bash
# Run backup manually
sudo /usr/local/bin/bdns-backup.sh

# View backup files
ls -la /opt/bdns-backups/
```

### Log Management

Logs are automatically rotated:

- **Application logs**: `docker-compose logs`
- **Sync logs**: `/opt/bdns-web/logs/cron-sync.log`
- **Backup logs**: `/var/log/bdns-backup.log`
- **Rotation**: Daily, 30 days retention

### Performance Monitoring

```bash
# Monitor resource usage
docker stats

# Check disk space
df -h

# Monitor database size
docker exec bdns-web_postgres_1 psql -U bdns_user -d bdns_db -c "SELECT pg_size_pretty(pg_database_size('bdns_db'));"
```

## 🔄 Updates and Maintenance

### Application Updates

```bash
cd /opt/bdns-web

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Clean old images
docker image prune -f
```

### Database Maintenance

```bash
# Full sync (weekly recommended)
curl -X POST https://your-domain.com/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'

# Check sync status
curl https://your-domain.com/api/sync

# Database optimization (monthly)
docker exec bdns-web_postgres_1 psql -U bdns_user -d bdns_db -c "VACUUM ANALYZE;"
```

### System Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker
sudo apt install docker-ce docker-ce-cli containerd.io

# Restart services after updates
sudo systemctl restart bdns-web
```

## 📈 Scaling and Performance

### For High Traffic

1. **Database Optimization**:
   ```yaml
   # In docker-compose.yml
   postgres:
     environment:
       POSTGRES_SHARED_BUFFERS: 1GB
       POSTGRES_WORK_MEM: 64MB
       POSTGRES_MAINTENANCE_WORK_MEM: 512MB
   ```

2. **Application Scaling**:
   ```yaml
   # Multiple app instances
   web:
     deploy:
       replicas: 3
   ```

3. **Load Balancer**:
   - Configure Nginx upstream
   - Use Redis for session storage
   - Implement CDN for static assets

### Performance Tuning

```bash
# Optimize PostgreSQL
echo "shared_buffers = 256MB" >> /opt/bdns-web/postgresql.conf
echo "work_mem = 16MB" >> /opt/bdns-web/postgresql.conf
echo "maintenance_work_mem = 128MB" >> /opt/bdns-web/postgresql.conf
```

## 🚨 Troubleshooting

### Common Issues

1. **Container won't start**:
   ```bash
   docker-compose logs
   docker-compose restart
   ```

2. **Database connection error**:
   ```bash
   # Check PostgreSQL logs
   docker-compose logs postgres
   
   # Verify database is running
   docker exec -it bdns-web_postgres_1 psql -U bdns_user -d bdns_db
   ```

3. **Sync failing**:
   ```bash
   # Check sync logs
   tail -f /opt/bdns-web/logs/cron-sync.log
   
   # Manual sync test
   curl -X POST http://localhost:3000/api/sync/cron \
     -H "x-cron-secret: YOUR_CRON_SECRET" \
     -H "Content-Type: application/json"
   ```

4. **SSL certificate issues**:
   ```bash
   sudo certbot renew
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Emergency Recovery

```bash
# Restore from backup
cd /opt/bdns-backups
# Find latest backup
ls -lt *.sql | head -1

# Restore database
docker exec -i bdns-web_postgres_1 psql -U bdns_user -d bdns_db < latest_backup.sql

# Restart services
docker-compose restart
```

## 📞 Support and Maintenance

### Regular Maintenance Schedule

- **Daily**: Automatic sync and backups
- **Weekly**: Check logs and disk space
- **Monthly**: Update system and optimize database
- **Quarterly**: Security audit and performance review

### Monitoring Checklist

- [ ] Application responding (health check)
- [ ] Database sync working
- [ ] Backups completing
- [ ] SSL certificate valid
- [ ] Disk space sufficient
- [ ] Logs rotated properly
- [ ] Security updates applied

## 🎯 Production Features Included

✅ **Complete Grant Database**: 562k+ grants with historical data  
✅ **Real-time Search**: Spanish full-text search with advanced filtering  
✅ **URL State Management**: Bookmarkable searches and navigation  
✅ **Automatic Daily Sync**: Midnight sync with progress monitoring  
✅ **Grant Detail Pages**: Comprehensive grant information display  
✅ **Responsive Design**: Mobile-optimized interface  
✅ **Security**: Rate limiting, SSL, secure authentication  
✅ **Monitoring**: Health checks, logging, and statistics  
✅ **Backup System**: Automated daily backups with retention  
✅ **Documentation**: Complete API and user documentation  

This production deployment provides a robust, scalable, and secure BDNS Web application ready for public use.