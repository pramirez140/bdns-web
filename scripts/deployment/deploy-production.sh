#!/bin/bash

# BDNS Web Production Deployment Script
# This script deploys the latest version to production

set -e

echo "🚀 BDNS Web Production Deployment"
echo "=================================="

# Configuration
REPO_URL="https://github.com/your-username/bdns-web.git"  # Replace with your repository
DEPLOY_DIR="/opt/bdns-web"
BACKUP_DIR="/opt/bdns-backups"
SERVICE_NAME="bdns-web"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "Please run this script as root (sudo)"
    exit 1
fi

# Check if git is available
if ! command -v git &> /dev/null; then
    error "Git is not installed. Installing..."
    apt update && apt install -y git
fi

# Check if docker is available
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create backup directory
log "Creating backup directory..."
mkdir -p "$BACKUP_DIR"

# Backup current deployment if it exists
if [ -d "$DEPLOY_DIR" ]; then
    log "Backing up current deployment..."
    BACKUP_NAME="bdns-web-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    
    # Stop current services
    log "Stopping current services..."
    cd "$DEPLOY_DIR"
    docker-compose down || true
fi

# Create deployment directory
log "Creating deployment directory..."
mkdir -p "$DEPLOY_DIR"

# Clone or update repository
if [ -d "$DEPLOY_DIR/.git" ]; then
    log "Updating existing repository..."
    cd "$DEPLOY_DIR"
    git fetch origin
    git reset --hard origin/main
else
    log "Cloning repository..."
    rm -rf "$DEPLOY_DIR"
    git clone "$REPO_URL" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

# Create production environment file
if [ ! -f "$DEPLOY_DIR/.env.local" ]; then
    log "Creating production environment file..."
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    CRON_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    cat > "$DEPLOY_DIR/.env.local" << EOF
# BDNS Web Production Environment
NODE_ENV=production
DATABASE_URL=postgresql://bdns_user:$DB_PASSWORD@postgres:5432/bdns_db

# BDNS API Configuration
BDNS_API_BASE=https://www.infosubvenciones.es/bdnstrans

# Database Configuration
POSTGRES_DB=bdns_db
POSTGRES_USER=bdns_user
POSTGRES_PASSWORD=$DB_PASSWORD

# Cron Security
CRON_SECRET=$CRON_SECRET

# Application Configuration
NEXT_PUBLIC_APP_NAME=BDNS Web
NEXT_PUBLIC_APP_DESCRIPTION=Base de Datos Nacional de Subvenciones
EOF
    
    success "Production environment file created with secure passwords"
    warning "Database password: $DB_PASSWORD"
    warning "Cron secret: $CRON_SECRET"
    warning "Please save these credentials securely!"
else
    log "Using existing environment file"
fi

# Update docker-compose for production
log "Configuring production docker-compose..."
cp docker-compose.yml docker-compose.prod.yml

# Build and start services
log "Building and starting production services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
log "Waiting for services to start..."
sleep 30

# Check if services are running
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    error "Some containers failed to start"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

# Test API health
log "Testing API health..."
for i in {1..10}; do
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        success "API is responding"
        break
    else
        warning "API not ready, waiting... (attempt $i/10)"
        sleep 10
    fi
done

if ! curl -f -s http://localhost:3000/api/health > /dev/null; then
    error "API failed to start after 100 seconds"
    docker-compose -f docker-compose.prod.yml logs web
    exit 1
fi

# Setup automatic sync cron job for production
log "Setting up automatic sync..."
if [ -f "$DEPLOY_DIR/setup-cron.sh" ]; then
    chmod +x "$DEPLOY_DIR/setup-cron.sh"
    "$DEPLOY_DIR/setup-cron.sh"
    success "Automatic sync configured"
fi

# Setup log rotation
log "Setting up log rotation..."
cat > /etc/logrotate.d/bdns-web << EOF
/opt/bdns-web/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF

# Setup systemd service for auto-restart
log "Creating systemd service..."
cat > /etc/systemd/system/bdns-web.service << EOF
[Unit]
Description=BDNS Web Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bdns-web.service
success "Systemd service created and enabled"

# Setup firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    log "Configuring firewall..."
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow ssh
    success "Firewall configured"
fi

# Create backup script
log "Creating backup script..."
cat > /usr/local/bin/bdns-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/bdns-backups"
DATE=$(date +%Y%m%d_%H%M%S)
DEPLOY_DIR="/opt/bdns-web"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cd $DEPLOY_DIR
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U bdns_user bdns_db > $BACKUP_DIR/bdns_db_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/bdns_app_$DATE.tar.gz -C /opt bdns-web --exclude=node_modules --exclude=.git

# Keep only last 7 days of backups
find $BACKUP_DIR -name "bdns_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "bdns_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/bdns-backup.sh

# Setup backup cron job
log "Setting up automatic backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/bdns-backup.sh >> /var/log/bdns-backup.log 2>&1") | crontab -

# Display deployment summary
echo ""
echo "=============================================="
echo "🎉 BDNS Web Production Deployment Complete!"
echo "=============================================="
echo ""
echo "📊 Deployment Details:"
echo "  • Location: $DEPLOY_DIR"
echo "  • Database: PostgreSQL with existing data"
echo "  • API: http://localhost:3000"
echo "  • Logs: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🔧 Management Commands:"
echo "  • View status: systemctl status bdns-web"
echo "  • Restart: systemctl restart bdns-web"
echo "  • Logs: cd $DEPLOY_DIR && docker-compose -f docker-compose.prod.yml logs -f"
echo "  • Backup: /usr/local/bin/bdns-backup.sh"
echo ""
echo "📈 Database Status:"
curl -s http://localhost:3000/api/sync | jq '.data.database_stats' || echo "  (Connect to check database status)"
echo ""
echo "🛡️  Security:"
echo "  • Automatic backups: Daily at 2:00 AM"
echo "  • Log rotation: Daily, 30 days retention"
echo "  • Automatic sync: Daily at midnight"
echo "  • Firewall: Configured for HTTP/HTTPS"
echo ""
echo "⚠️  Next Steps:"
echo "  1. Configure domain name and SSL (see DEPLOYMENT.md)"
echo "  2. Monitor logs for first 24 hours"
echo "  3. Test automatic sync tomorrow"
echo "  4. Setup monitoring/alerting"
echo ""
success "Production deployment completed successfully!"