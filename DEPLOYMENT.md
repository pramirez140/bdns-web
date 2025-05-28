# BDNS Web Deployment Guide

## Server Setup Instructions

### Prerequisites
- Ubuntu 20.04+ or Debian 11+ server
- Root or sudo access
- Domain name (optional but recommended)

## Step 1: Initial Server Setup

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

# Logout and login again for Docker permissions
exit
# SSH back in
```

## Step 2: Clone Repository

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/bdns-web.git
cd bdns-web

# Create environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

### Environment Configuration (.env.local)

```bash
NODE_ENV=production
DATABASE_URL=postgresql://bdns_user:your_strong_password_here@postgres:5432/bdns_db

# PostgreSQL Configuration
POSTGRES_DB=bdns_db
POSTGRES_USER=bdns_user
POSTGRES_PASSWORD=your_strong_password_here

# Change these passwords!
PGADMIN_DEFAULT_EMAIL=admin@yourdomain.com
PGADMIN_DEFAULT_PASSWORD=your_admin_password_here
```

## Step 3: Deploy with Docker

```bash
# Start the services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Wait for containers to be healthy (check with)
docker-compose ps
```

## Step 4: Initial Database Migration

```bash
# Wait for containers to be fully ready (30-60 seconds)
sleep 60

# Test API health
curl http://localhost:3000/api/health

# Start initial complete migration (this will take 2-3 hours)
curl -X POST http://localhost:3000/api/extract-budgets \
  -H "Content-Type: application/json" \
  -d '{"mode": "complete"}' | jq '.'

# Monitor migration progress
curl http://localhost:3000/api/extract-budgets | jq '.'
```

## Step 5: Setup Nginx Reverse Proxy (Optional)

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/bdns-web
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

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
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/bdns-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Step 6: Setup Automatic Backups

```bash
# Create backup script
sudo nano /usr/local/bin/bdns-backup.sh
```

Add this script:

```bash
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec bdns-web-postgres-1 pg_dump -U bdns_user bdns_db > $BACKUP_DIR/bdns_backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "bdns_backup_*.sql" -mtime +7 -delete

echo "Backup completed: bdns_backup_$DATE.sql"
```

```bash
# Make script executable
sudo chmod +x /usr/local/bin/bdns-backup.sh

# Setup daily backup cron job
crontab -e
# Add this line:
0 2 * * * /usr/local/bin/bdns-backup.sh >> /var/log/bdns-backup.log 2>&1
```

## Step 7: Setup Automatic Sync

```bash
# Create sync script
nano /home/$USER/bdns-sync.sh
```

Add this script:

```bash
#!/bin/bash
cd /home/$USER/bdns-web

# Daily incremental sync
curl -X POST http://localhost:3000/api/extract-budgets \
  -H "Content-Type: application/json" \
  -d '{"mode": "incremental"}' >> /var/log/bdns-sync.log 2>&1

echo "$(date): Incremental sync completed" >> /var/log/bdns-sync.log
```

```bash
# Make script executable
chmod +x /home/$USER/bdns-sync.sh

# Setup daily sync cron job
crontab -e
# Add this line:
0 3 * * * /home/$USER/bdns-sync.sh
```

## Step 8: Monitoring and Maintenance

### Check System Status
```bash
# Check containers
docker-compose ps

# Check logs
docker-compose logs web
docker-compose logs postgres

# Check disk usage
df -h

# Check database size
docker exec bdns-web-postgres-1 psql -U bdns_user -d bdns_db -c "SELECT pg_size_pretty(pg_database_size('bdns_db'));"
```

### Weekly Maintenance
```bash
# Run full sync weekly
curl -X POST http://localhost:3000/api/extract-budgets \
  -H "Content-Type: application/json" \
  -d '{"mode": "full"}'

# Clean Docker system
docker system prune -f

# Update containers (if needed)
docker-compose pull
docker-compose up -d --build
```

## Firewall Configuration

```bash
# Setup UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Block direct access to application port (optional)
sudo ufw deny 3000
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs

# Restart containers
docker-compose restart

# Rebuild if needed
docker-compose up --build -d
```

### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Connect to database manually
docker exec -it bdns-web-postgres-1 psql -U bdns_user -d bdns_db
```

### Migration Stuck/Failed
```bash
# Check migration status
curl http://localhost:3000/api/extract-budgets | jq '.'

# Restart migration if needed
curl -X POST http://localhost:3000/api/extract-budgets \
  -H "Content-Type: application/json" \
  -d '{"mode": "incremental"}'
```

### Low Disk Space
```bash
# Clean old Docker images
docker image prune -a

# Clean old backups
find /home/$USER/backups -name "*.sql" -mtime +7 -delete

# Check largest files
du -sh /* | sort -hr | head -10
```

## Performance Tuning for Small Servers

For servers with 4GB RAM or less, update `docker-compose.yml`:

```yaml
postgres:
  environment:
    POSTGRES_SHARED_BUFFERS: 512MB
    POSTGRES_WORK_MEM: 32MB
    POSTGRES_MAINTENANCE_WORK_MEM: 256MB
    POSTGRES_MAX_CONNECTIONS: 50
```

## Security Checklist

- [ ] Changed default passwords in `.env.local`
- [ ] Setup firewall rules
- [ ] Enabled SSL certificates
- [ ] Setup automatic backups
- [ ] Limited database access
- [ ] Setup log rotation
- [ ] Regular security updates scheduled

## Updates and Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker containers
cd /home/$USER/bdns-web
git pull
docker-compose pull
docker-compose up -d --build

# Clean old images
docker image prune -f
```

This deployment will give you a fully functional BDNS search system with automatic synchronization and proper backups.