# Deployment Scripts

This directory contains all deployment and setup scripts for the BDNS Web application.

## Scripts

### Production Deployment
- **`deploy-production.sh`** - Production deployment script
- **`quick-deploy.sh`** - Quick deployment for development/staging

### Environment Setup  
- **`get-docker.sh`** - Docker installation script
- **`setup-cron.sh`** - Cron job setup for automatic sync

## Usage

### Production Deployment
```bash
# Full production deployment
./scripts/deployment/deploy-production.sh

# Quick deployment (development/staging)
./scripts/deployment/quick-deploy.sh
```

### Initial Setup
```bash
# Install Docker (if needed)
./scripts/deployment/get-docker.sh

# Setup cron jobs for automatic sync
./scripts/deployment/setup-cron.sh
```

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database configured
- Environment variables set in `.env.local`
- SMTP configuration for email functionality

## Security Notes

- All scripts should be run with appropriate permissions
- Review scripts before execution in production
- Ensure sensitive data is not logged during deployment