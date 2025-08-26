#!/bin/bash

# DaSi Docker Setup and Start Script
set -e

echo "🐳 Starting DaSi English Learning Platform with Docker..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Determine Docker Compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

print_step "Checking environment configuration..."

# Check if .env file exists, if not copy from template
if [ ! -f "./backend/.env" ]; then
    if [ -f "./backend/.env.docker" ]; then
        print_warning ".env not found, copying from .env.docker template"
        cp ./backend/.env.docker ./backend/.env
        print_warning "Please update ./backend/.env with your actual configuration"
    else
        print_error ".env.docker template not found. Please create environment configuration."
        exit 1
    fi
fi

# Stop any running containers
print_step "Stopping existing containers..."
$DOCKER_COMPOSE down --remove-orphans

# Build images
print_step "Building Docker images..."
$DOCKER_COMPOSE build --no-cache

# Start services
print_step "Starting services..."
if [ "$1" = "prod" ]; then
    print_step "Starting with production profile (includes nginx)"
    $DOCKER_COMPOSE --profile production up -d
else
    print_step "Starting with development profile"
    $DOCKER_COMPOSE up -d
fi

# Wait for services to be ready
print_step "Waiting for services to start..."
sleep 10

# Check service health
print_step "Checking service health..."

# Check backend health
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    print_success "Backend service is healthy"
else
    print_error "Backend service is not responding"
    $DOCKER_COMPOSE logs backend
    exit 1
fi

# Check Redis health
if $DOCKER_COMPOSE exec redis redis-cli ping | grep -q "PONG"; then
    print_success "Redis service is healthy"
else
    print_error "Redis service is not responding"
    $DOCKER_COMPOSE logs redis
    exit 1
fi

print_success "🎉 DaSi platform is running successfully!"
echo ""
echo "🔗 Service URLs:"
echo "   • Backend API: http://localhost:8080"
echo "   • Health Check: http://localhost:8080/health"
echo "   • Metrics: http://localhost:8080/metrics"
echo "   • Redis: localhost:6379"

if [ "$1" = "prod" ]; then
    echo "   • Frontend: http://localhost:80"
    echo "   • Nginx Status: http://localhost:80/health"
fi

echo ""
echo "📊 Useful commands:"
echo "   • View logs: $DOCKER_COMPOSE logs -f [service]"
echo "   • Stop services: $DOCKER_COMPOSE down"
echo "   • Restart service: $DOCKER_COMPOSE restart [service]"
echo "   • View status: $DOCKER_COMPOSE ps"
echo ""

# Show running containers
print_step "Running containers:"
$DOCKER_COMPOSE ps