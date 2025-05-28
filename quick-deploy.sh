#!/bin/bash

# BDNS Web Quick Deployment Script
# Run this script on your server after cloning the repository

set -e

echo "🚀 Starting BDNS Web deployment..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please run this script as a regular user (not root)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "⚠️  Docker installed. Please logout and login again, then re-run this script."
    exit 0
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo apt install -y docker-compose-plugin
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚙️  Creating environment file..."
    cp .env.example .env.local
    
    # Generate random passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Replace placeholders
    sed -i "s/CHANGE_THIS_PASSWORD/$DB_PASSWORD/g" .env.local
    sed -i "s/CHANGE_THIS_ADMIN_PASSWORD/$ADMIN_PASSWORD/g" .env.local
    sed -i "s/admin@yourdomain.com/admin@$(hostname)/g" .env.local
    
    echo "✅ Environment file created with random passwords"
else
    echo "✅ Environment file already exists"
fi

# Start Docker services
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start (60 seconds)..."
sleep 60

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Some containers failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Test API health
echo "🏥 Testing API health..."
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ API is responding"
else
    echo "❌ API is not responding. Check logs with: docker-compose logs web"
    exit 1
fi

# Ask about initial migration
echo ""
echo "🎯 Deployment successful!"
echo ""
echo "Next steps:"
echo "1. Your BDNS Web application is running at: http://$(curl -s ifconfig.me):3000"
echo "2. Or locally at: http://localhost:3000"
echo ""
echo "Would you like to start the initial database migration now?"
echo "This will download ~500k grants from BDNS (takes 2-3 hours)"
read -p "Start migration? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Starting complete database migration..."
    curl -X POST http://localhost:3000/api/extract-budgets \
        -H "Content-Type: application/json" \
        -d '{"mode": "complete"}' | jq '.' || echo "Migration started (JSON parser not available)"
    
    echo ""
    echo "✅ Migration started! Monitor progress at:"
    echo "   http://localhost:3000/api/extract-budgets"
    echo ""
    echo "Or check with: curl http://localhost:3000/api/extract-budgets | jq '.'"
else
    echo ""
    echo "Migration skipped. You can start it later with:"
    echo "curl -X POST http://localhost:3000/api/extract-budgets -H 'Content-Type: application/json' -d '{\"mode\": \"complete\"}'"
fi

echo ""
echo "📝 Useful commands:"
echo "  View logs:      docker-compose logs -f"
echo "  Stop services:  docker-compose down"
echo "  Start services: docker-compose up -d"
echo "  Check status:   docker-compose ps"
echo ""
echo "🔧 For production setup with domain and SSL, see DEPLOYMENT.md"
echo ""
echo "🎉 Deployment complete!"