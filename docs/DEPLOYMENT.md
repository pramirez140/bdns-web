# BDNS Web Deployment Guide

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Options](#deployment-options)
- [Production Deployment](#production-deployment)
- [Configuration](#configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04+ or Debian 11+
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: Minimum 20GB (50GB recommended)
- **CPU**: 2+ cores (4+ recommended)
- **Network**: Static IP or domain name

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Git
- Nginx (for reverse proxy)
- Certbot (for SSL)
- Node.js 18+ (optional, for local builds)

## Quick Start

For a rapid deployment with sensible defaults:

```bash
# Clone and deploy
git clone https://github.com/pramirez140/bdns-web.git
cd bdns-web
sudo ./deploy-production.sh
```

This script will:
- Install all dependencies
- Configure the environment
- Set up Docker containers
- Configure Nginx reverse proxy
- Set up SSL certificates
- Configure automatic backups
- Set up monitoring

## Deployment Options

### Option 1: Docker Compose (Recommended)

Ideal for single-server deployments with all components containerized.

```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Option 2: Kubernetes

For cloud-native deployments with high availability.

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

### Option 3: Traditional Deployment

For environments where Docker is not available.

```bash
# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
```

## Production Deployment

### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  git curl wget \
  nginx certbot python3-certbot-nginx \
  htop iotop nethogs \
  ufw fail2ban

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

### Step 2: Security Configuration

```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

# Configure fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Secure SSH (optional but recommended)
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### Step 3: Application Setup

```bash
# Clone repository
sudo mkdir -p /opt/bdns-web
sudo chown $USER:$USER /opt/bdns-web
git clone https://github.com/pramirez140/bdns-web.git /opt/bdns-web
cd /opt/bdns-web

# Create environment file
cp .env.example .env.local

# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Update .env.local with secure values
sed -i "s/bdns_password/$POSTGRES_PASSWORD/g" .env.local
sed -i "s/bdns-cron-secret-2024/$CRON_SECRET/g" .env.local
```

### Step 4: Docker Deployment

```bash
# Create Docker volumes
docker volume create bdns_postgres_data
docker volume create bdns_pgadmin_data

# Build and start containers
docker-compose build --no-cache
docker-compose up -d

# Verify containers are running
docker-compose ps

# Check logs
docker-compose logs -f --tail=50
```

### Step 5: Database Initialization

```bash
# Wait for PostgreSQL to be ready
until docker-compose exec postgres pg_isready -U bdns_user; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Run migrations
docker-compose exec web npm run db:migrate

# Start initial sync (optional)
docker-compose exec web npm run db:sync
```

## Configuration

### Environment Variables

```bash
# .env.local template
NODE_ENV=production

# Database
DATABASE_URL=postgresql://bdns_user:SECURE_PASSWORD@postgres:5432/bdns_db
POSTGRES_DB=bdns_db
POSTGRES_USER=bdns_user
POSTGRES_PASSWORD=SECURE_PASSWORD

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
PORT=3000

# BDNS API
BDNS_API_BASE=https://www.infosubvenciones.es/bdnstrans
BDNS_API_TIMEOUT=30000

# Sync Configuration
SYNC_BATCH_SIZE=100
SYNC_MAX_RETRIES=3
CRON_SECRET=SECURE_CRON_SECRET

# Optional Services
REDIS_URL=redis://localhost:6379
SENTRY_DSN=your-sentry-dsn
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/bdns-web
upstream bdns_backend {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL configuration will be added by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy configuration
    location / {
        proxy_pass http://bdns_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }
    
    # Static files caching
    location /_next/static {
        proxy_pass http://bdns_backend;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://bdns_backend;
    }
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

```bash
# Enable Nginx configuration
sudo ln -s /etc/nginx/sites-available/bdns-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL/TLS Setup

### Let's Encrypt with Certbot

```bash
# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com \
  --non-interactive --agree-tos \
  --email your-email@example.com

# Test auto-renewal
sudo certbot renew --dry-run

# Set up auto-renewal cron job
echo "0 2 * * * root certbot renew --quiet" | sudo tee /etc/cron.d/certbot-renewal
```

### SSL Security Headers

```nginx
# Additional SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

## Monitoring

### Health Checks

```bash
# Create health check script
cat > /opt/bdns-web/scripts/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:3000/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Health check passed"
    exit 0
else
    echo "Health check failed with status $RESPONSE"
    exit 1
fi
EOF

chmod +x /opt/bdns-web/scripts/health-check.sh

# Add to crontab
echo "*/5 * * * * /opt/bdns-web/scripts/health-check.sh || systemctl restart docker-compose@bdns-web" | sudo tee -a /etc/crontab
```

### Application Monitoring

```bash
# Install monitoring stack (optional)
docker-compose -f docker-compose.monitoring.yml up -d

# This includes:
# - Prometheus (metrics collection)
# - Grafana (visualization)
# - Loki (log aggregation)
# - AlertManager (alerting)
```

### Log Management

```bash
# Configure log rotation
cat > /etc/logrotate.d/bdns-web << EOF
/opt/bdns-web/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        docker-compose -f /opt/bdns-web/docker-compose.yml kill -s USR1 web
    endscript
}
EOF
```

## Backup & Recovery

### Automated Backup System

```bash
# Create backup script
cat > /opt/bdns-web/scripts/backup.sh << 'EOF'
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/backup/bdns"
S3_BUCKET="s3://your-bucket/bdns-backups"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
echo "Starting database backup..."
docker-compose exec -T postgres pg_dump -U bdns_user -d bdns_db \
  --format=custom --compress=9 > $BACKUP_DIR/db_$DATE.dump

# Backup application files
echo "Starting application backup..."
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='logs' \
  /opt/bdns-web

# Upload to S3 (if AWS CLI is configured)
if command -v aws &> /dev/null; then
    echo "Uploading to S3..."
    aws s3 cp $BACKUP_DIR/db_$DATE.dump $S3_BUCKET/
    aws s3 cp $BACKUP_DIR/app_$DATE.tar.gz $S3_BUCKET/
fi

# Clean old backups
find $BACKUP_DIR -name "*.dump" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully"
EOF

chmod +x /opt/bdns-web/scripts/backup.sh

# Schedule daily backups
echo "0 2 * * * root /opt/bdns-web/scripts/backup.sh >> /var/log/bdns-backup.log 2>&1" | sudo tee -a /etc/crontab
```

### Recovery Procedures

```bash
# Restore database from backup
docker-compose exec -T postgres psql -U bdns_user -c "DROP DATABASE IF EXISTS bdns_db;"
docker-compose exec -T postgres psql -U bdns_user -c "CREATE DATABASE bdns_db;"
docker-compose exec -T postgres pg_restore -U bdns_user -d bdns_db < /backup/bdns/db_20240531_020000.dump

# Restore application files
tar -xzf /backup/bdns/app_20240531_020000.tar.gz -C /

# Restart services
docker-compose down
docker-compose up -d
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  web:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
```

### Load Balancer Configuration

```nginx
# nginx.conf for load balancing
upstream bdns_cluster {
    least_conn;
    server web_1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server web_2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server web_3:3000 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

### Database Scaling

```yaml
# PostgreSQL read replicas
services:
  postgres-primary:
    image: postgres:15
    environment:
      - POSTGRES_REPLICATION_MODE=master
      - POSTGRES_REPLICATION_USER=replicator
      - POSTGRES_REPLICATION_PASSWORD=repl_password
  
  postgres-replica:
    image: postgres:15
    environment:
      - POSTGRES_REPLICATION_MODE=slave
      - POSTGRES_MASTER_HOST=postgres-primary
      - POSTGRES_REPLICATION_USER=replicator
      - POSTGRES_REPLICATION_PASSWORD=repl_password
    deploy:
      replicas: 2
```

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker-compose logs web
docker-compose logs postgres

# Check disk space
df -h

# Check memory
free -m

# Restart with fresh build
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Database Connection Failed

```bash
# Test PostgreSQL connection
docker-compose exec postgres pg_isready -U bdns_user

# Check PostgreSQL logs
docker-compose logs postgres | grep ERROR

# Reset database password
docker-compose exec postgres psql -U postgres -c "ALTER USER bdns_user PASSWORD 'new_password';"

# Update .env.local with new password
```

#### High Memory Usage

```bash
# Check container stats
docker stats --no-stream

# Limit container memory
# Add to docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 2G

# Restart containers
docker-compose down
docker-compose up -d
```

#### Sync Failures

```bash
# Check sync logs
tail -f /opt/bdns-web/logs/sync.log

# Manual sync test
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "incremental"}'

# Reset sync status
docker-compose exec postgres psql -U bdns_user -d bdns_db \
  -c "TRUNCATE sync_status RESTART IDENTITY;"
```

### Performance Tuning

```bash
# PostgreSQL optimization
docker-compose exec postgres psql -U bdns_user -d bdns_db << EOF
-- Update statistics
ANALYZE;

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Vacuum tables
VACUUM ANALYZE convocatorias;
EOF

# Application optimization
# Add to .env.local:
NODE_OPTIONS="--max-old-space-size=4096"

# Nginx caching
sudo mkdir -p /var/cache/nginx
sudo chown www-data:www-data /var/cache/nginx
```

### Security Hardening

```bash
# Regular security updates
sudo apt update && sudo apt upgrade -y

# Docker security scanning
docker scan bdns-web:latest

# Check for exposed ports
sudo netstat -tlnp

# Review logs for suspicious activity
sudo grep "Failed password" /var/log/auth.log | tail -20
```

## Maintenance Schedule

### Daily Tasks (Automated)
- Health checks every 5 minutes
- Log rotation at midnight
- Incremental sync at 00:00
- Backup at 02:00

### Weekly Tasks
- Full database vacuum (Sunday 03:00)
- Docker image cleanup (Sunday 04:00)
- Security updates check (Monday 09:00)

### Monthly Tasks
- Full system backup
- Performance analysis
- Security audit
- Certificate renewal check

## Production Checklist

### Pre-deployment
- [ ] Server meets minimum requirements
- [ ] Domain name configured
- [ ] SSL certificates obtained
- [ ] Firewall configured
- [ ] Backup system tested
- [ ] Monitoring configured
- [ ] Environment variables secured

### Post-deployment
- [ ] Application accessible via HTTPS
- [ ] Health checks passing
- [ ] Sync running successfully
- [ ] Backups completing
- [ ] Logs rotating properly
- [ ] Monitoring alerts working
- [ ] Performance acceptable

### Security
- [ ] Default passwords changed
- [ ] SSH hardened
- [ ] Firewall active
- [ ] fail2ban configured
- [ ] SSL/TLS properly configured
- [ ] Regular updates scheduled
- [ ] Backup encryption enabled

## Support

For deployment support:
- Documentation: [/docs](./docs/)
- Issues: [GitHub Issues](https://github.com/pramirez140/bdns-web/issues)
- Email: support@example.com

This deployment guide provides comprehensive instructions for deploying BDNS Web in production environments with security, scalability, and reliability in mind.