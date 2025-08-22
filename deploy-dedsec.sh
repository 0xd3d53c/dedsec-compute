#!/bin/bash
# deploy-dedsec.sh - Complete deployment script for DedSecCompute
# Make deployment script executable
# chmod +x deploy-dedsec.sh

# Deploy from current directory
# sudo ./deploy-dedsec.sh

# Or deploy from Git repository
# sudo ./deploy-dedsec.sh https://github.com/yourusername/dedsec-compute
# set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="dedsec-compute"
DEPLOY_DIR="/opt/${APP_NAME}"
BACKUP_DIR="/opt/backups/${APP_NAME}"
LOG_FILE="/var/log/${APP_NAME}-deploy.log"

# Functions
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

success() {
    log "${GREEN}✅ $*${NC}"
}

warning() {
    log "${YELLOW}⚠️  $*${NC}"
}

error() {
    log "${RED}❌ $*${NC}"
    exit 1
}

info() {
    log "${BLUE}ℹ️  $*${NC}"
}

check_requirements() {
    info "Checking system requirements..."
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "git" "curl" "openssl")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command '$cmd' not found. Please install it first."
        fi
    done
    
    # Check Docker is running
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker service."
    fi
    
    success "System requirements check passed"
}

create_directories() {
    info "Creating deployment directories..."
    
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "${DEPLOY_DIR}/nginx/ssl"
    mkdir -p "${DEPLOY_DIR}/nginx/logs"
    mkdir -p "${DEPLOY_DIR}/logs"
    mkdir -p "${DEPLOY_DIR}/monitoring"
    
    success "Directories created"
}

backup_existing() {
    if [[ -d "$DEPLOY_DIR" ]] && [[ "$(ls -A $DEPLOY_DIR)" ]]; then
        info "Creating backup of existing deployment..."
        
        local backup_name="${APP_NAME}-backup-$(date +%Y%m%d-%H%M%S)"
        tar -czf "${BACKUP_DIR}/${backup_name}.tar.gz" -C "$(dirname $DEPLOY_DIR)" "$(basename $DEPLOY_DIR)"
        
        success "Backup created: ${BACKUP_DIR}/${backup_name}.tar.gz"
    fi
}

setup_environment() {
    info "Setting up environment configuration..."
    
    # Create .env file if it doesn't exist
    if [[ ! -f "${DEPLOY_DIR}/.env" ]]; then
        cat > "${DEPLOY_DIR}/.env" << EOF
# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase Configuration (UPDATE THESE!)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Security
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD_HASH=\$2b\$10\$hashed.password.here

# Redis
REDIS_PASSWORD=$(openssl rand -base64 16)

# Monitoring (Optional)
GRAFANA_PASSWORD=$(openssl rand -base64 12)
EOF
        
        warning "Environment file created at ${DEPLOY_DIR}/.env"
        warning "Please update the Supabase configuration and other settings!"
        
        # Set secure permissions
        chmod 600 "${DEPLOY_DIR}/.env"
        chown root:root "${DEPLOY_DIR}/.env"
    else
        info "Environment file already exists"
    fi
}

generate_ssl_certificates() {
    info "Generating SSL certificates..."
    
    local ssl_dir="${DEPLOY_DIR}/nginx/ssl"
    
    if [[ ! -f "${ssl_dir}/cert.pem" ]] || [[ ! -f "${ssl_dir}/key.pem" ]]; then
        # Generate self-signed certificate for testing
        # In production, use Let's Encrypt or commercial certificates
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "${ssl_dir}/key.pem" \
            -out "${ssl_dir}/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=DedSec/OU=IT/CN=localhost"
        
        chmod 600 "${ssl_dir}/key.pem"
        chmod 644 "${ssl_dir}/cert.pem"
        
        warning "Self-signed SSL certificate generated"
        warning "For production, replace with proper SSL certificates!"
    else
        info "SSL certificates already exist"
    fi
}

deploy_application() {
    info "Deploying application..."
    
    # Copy application files
    if [[ -n "${1:-}" ]]; then
        # Deploy from Git repository
        local repo_url="$1"
        info "Cloning from repository: $repo_url"
        
        # Clone to temporary directory
        local temp_dir=$(mktemp -d)
        git clone "$repo_url" "$temp_dir"
        
        # Copy files to deployment directory
        rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' \
              "$temp_dir/" "$DEPLOY_DIR/"
        
        # Cleanup temporary directory
        rm -rf "$temp_dir"
    else
        info "Using current directory for deployment"
        rsync -av --exclude='.git' --exclude='node_modules' --exclude='.next' \
              ./ "$DEPLOY_DIR/"
    fi
    
    success "Application files deployed"
}

setup_database() {
    info "Setting up database schema..."
    
    # Check if Supabase CLI is available
    if command -v supabase &> /dev/null; then
        cd "$DEPLOY_DIR"
        
        # Initialize Supabase project (if not already done)
        if [[ ! -f "supabase/config.toml" ]]; then
            warning "Supabase not initialized. Please run 'supabase init' and configure your project"
        else
            # Run database migrations
            supabase db push --password "$SUPABASE_DB_PASSWORD" || warning "Database migration failed or already up to date"
        fi
    else
        warning "Supabase CLI not found. Database setup skipped."
        warning "Please install Supabase CLI and run database migrations manually"
    fi
}

build_and_start() {
    info "Building and starting application..."
    
    cd "$DEPLOY_DIR"
    
    # Stop existing containers
    docker-compose down || true
    
    # Remove old images to free space
    docker system prune -f || true
    
    # Build and start services
    docker-compose build --no-cache
    docker-compose up -d
    
    success "Application started"
}

run_health_checks() {
    info "Running health checks..."
    
    # Wait for services to start
    sleep 30
    
    # Check if containers are running
    local containers=("dedsec-compute-web" "dedsec-nginx" "dedsec-redis")
    for container in "${containers[@]}"; do
        if docker ps | grep -q "$container"; then
            success "$container is running"
        else
            error "$container is not running"
        fi
    done
    
    # Check HTTP endpoints
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        info "Health check attempt $attempt/$max_attempts"
        
        if curl -f -s http://localhost/api/health > /dev/null; then
            success "Health check passed"
            break
        else
            if [[ $attempt -eq $max_attempts ]]; then
                error "Health check failed after $max_attempts attempts"
            fi
            sleep 10
            ((attempt++))
        fi
    done
    
    # Check HTTPS (if certificates are properly configured)
    if curl -f -s -k https://localhost/api/health > /dev/null; then
        success "HTTPS endpoint accessible"
    else
        warning "HTTPS endpoint not accessible (may need proper SSL certificates)"
    fi
}

run_automated_tests() {
    info "Running automated tests..."
    
    cd "$DEPLOY_DIR"
    
    # Install test dependencies
    if [[ -f "package.json" ]]; then
        docker-compose exec dedsec-web npm install --dev || warning "Could not install test dependencies"
        
        # Run test suite
        if docker-compose exec dedsec-web node test-runner.js; then
            success "Automated tests passed"
        else
            warning "Some automated tests failed"
        fi
    else
        warning "No package.json found, skipping automated tests"
    fi
}

setup_monitoring() {
    info "Setting up monitoring..."
    
    # Create Prometheus configuration
    cat > "${DEPLOY_DIR}/monitoring/prometheus.yml" << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'dedsec-compute'
    static_configs:
      - targets: ['dedsec-web:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:8080']
    metrics_path: '/nginx_status'
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    scrape_interval: 30s
EOF

    success "Monitoring configuration created"
}

setup_logrotate() {
    info "Setting up log rotation..."
    
    cat > /etc/logrotate.d/dedsec-compute << EOF
${DEPLOY_DIR}/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        /usr/bin/docker-compose -f ${DEPLOY_DIR}/docker-compose.yml exec dedsec-web kill -USR1 1 2>/dev/null || true
    endscript
}

${DEPLOY_DIR}/nginx/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        /usr/bin/docker-compose -f ${DEPLOY_DIR}/docker-compose.yml exec nginx nginx -s reload 2>/dev/null || true
    endscript
}
EOF

    success "Log rotation configured"
}

create_systemd_service() {
    info "Creating systemd service..."
    
    cat > /etc/systemd/system/dedsec-compute.service << EOF
[Unit]
Description=DedSec Compute Docker Compose Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${DEPLOY_DIR}
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable dedsec-compute.service
    
    success "Systemd service created and enabled"
}

setup_firewall() {
    info "Configuring firewall..."
    
    # Check if ufw is available
    if command -v ufw &> /dev/null; then
        # Allow SSH (be careful not to lock yourself out)
        ufw allow ssh
        
        # Allow HTTP and HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp
        
        # Allow monitoring ports (optional, can be restricted to specific IPs)
        ufw allow 3001/tcp  # Grafana
        ufw allow 9090/tcp  # Prometheus
        
        # Enable firewall
        echo "y" | ufw enable
        
        success "Firewall configured"
    else
        warning "UFW not available, firewall configuration skipped"
    fi
}

print_summary() {
    echo ""
    echo "=========================="
    echo "ߚ DEPLOYMENT COMPLETE!"
    echo "=========================="
    echo ""
    echo "ߓ Application Details:"
    echo "   • App Directory: $DEPLOY_DIR"
    echo "   • Log Directory: ${DEPLOY_DIR}/logs"
    echo "   • Backup Directory: $BACKUP_DIR"
    echo ""
    echo "ߌ Endpoints:"
    echo "   • Main App: https://your-domain.com"
    echo "   • Health Check: https://your-domain.com/api/health"
    echo "   • Admin Panel: https://your-domain.com/admin"
    echo "   • Grafana: http://your-domain.com:3001"
    echo "   • Prometheus: http://your-domain.com:9090"
    echo ""
    echo "ߔ Management Commands:"
    echo "   • View logs: docker-compose -f $DEPLOY_DIR/docker-compose.yml logs -f"
    echo "   • Restart app: systemctl restart dedsec-compute"
    echo "   • Check status: systemctl status dedsec-compute"
    echo ""
    echo "⚠️  IMPORTANT NEXT STEPS:"
    echo "   1. Update environment variables in: ${DEPLOY_DIR}/.env"
    echo "   2. Configure proper SSL certificates"
    echo "   3. Set up domain DNS records"
    echo "   4. Configure Supabase project settings"
    echo "   5. Test all functionality"
    echo ""
}

# Main deployment flow
main() {
    local repo_url="${1:-}"
    
    info "Starting DedSec Compute deployment..."
    
    check_requirements
    create_directories
    backup_existing
    setup_environment
    generate_ssl_certificates
    deploy_application "$repo_url"
    setup_database
    setup_monitoring
    build_and_start
    run_health_checks
    run_automated_tests
    setup_logrotate
    create_systemd_service
    setup_firewall
    print_summary
    
    success "Deployment completed successfully!"
}

# Script usage information
usage() {
    echo "Usage: $0 [GIT_REPOSITORY_URL]"
    echo ""
    echo "Deploy DedSec Compute application to production server"
    echo ""
    echo "Arguments:"
    echo "  GIT_REPOSITORY_URL    Optional Git repository URL to deploy from"
    echo "                        If not provided, uses current directory"
    echo ""
    echo "Examples:"
    echo "  $0                                          # Deploy from current directory"
    echo "  $0 https://github.com/user/dedsec-compute  # Deploy from Git repository"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    -h|--help)
        usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
