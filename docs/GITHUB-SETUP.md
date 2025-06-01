# GitHub Setup Instructions

## Step 1: Initialize Git Repository

```bash
# Navigate to your project directory
cd /Users/pabloramirezlazaro/Downloads/bdns-web

# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: BDNS Web application with complete documentation"
```

## Step 2: Create GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Click the "+" icon in the top right
3. Select "New repository"
4. Fill in:
   - **Repository name**: `bdns-web`
   - **Description**: `BDNS (Spanish Government Grants) Search System with PostgreSQL integration and real-time sync`
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

## Step 3: Connect Local Repository to GitHub

After creating the repository on GitHub, run these commands:

```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/bdns-web.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Verify Upload

Your repository should now contain:
- ✅ All source code
- ✅ Docker configuration
- ✅ Documentation (README.md, DEPLOYMENT.md, etc.)
- ✅ Deployment scripts
- ✅ Environment template (.env.example)
- ❌ No sensitive files (.env.local is excluded by .gitignore)

## Step 5: Server Deployment Commands

Once your repository is on GitHub, use these commands on your server:

```bash
# On your server, clone the repository
git clone https://github.com/YOUR_USERNAME/bdns-web.git
cd bdns-web

# Run the quick deployment script
chmod +x quick-deploy.sh
./quick-deploy.sh
```

## Important Notes

### What's Included in GitHub:
- Complete application source code
- Docker Compose configuration  
- Comprehensive documentation
- Deployment automation scripts
- Environment template with placeholders

### What's NOT Included (Security):
- Your actual passwords (.env.local)
- Database files
- Log files
- Any sensitive data

### Repository Features:
- **Complete BDNS integration** - Connects to Spain's official grants database
- **PostgreSQL with full-text search** - Optimized for Spanish language
- **Docker deployment** - Easy server setup
- **Automatic sync system** - Keeps data updated
- **Production ready** - Includes monitoring, backups, SSL setup

## After GitHub Upload

You'll be able to deploy on any server with just:

```bash
git clone https://github.com/YOUR_USERNAME/bdns-web.git
cd bdns-web
./quick-deploy.sh
```

The deployment script will:
1. Install Docker if needed
2. Generate secure random passwords
3. Start all services
4. Optionally begin database migration
5. Provide monitoring commands

## Repository Structure

```
bdns-web/
├── README.md                    # Main documentation
├── DEPLOYMENT.md               # Detailed server setup guide  
├── API-CONNECTION.md           # API integration documentation
├── DATABASE-STRUCTURE.md       # Database schema and optimization
├── DOCKER-SETUP.md            # Container architecture guide
├── CLAUDE.md                   # Development context for AI assistants
├── quick-deploy.sh             # Automated deployment script
├── .env.example               # Environment template
├── docker-compose.yml         # Container orchestration
├── Dockerfile                 # Application container
├── src/                       # Application source code
├── data/                      # Database initialization
└── docs/                      # Additional documentation
```

This gives you a complete, documented, and deployable BDNS search system ready for GitHub!