#!/bin/bash

# AI Bookmark Architect Deployment Script
# This script helps deploy the application to a production server

set -e

echo "🚀 Starting deployment of AI Bookmark Architect..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ai-bookmark-architect"
DOCKER_IMAGE="yana-arch/ai-bookmark-architect:latest"
COMPOSE_FILE="docker-compose.yml"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Pull latest images
pull_images() {
    print_status "Pulling latest Docker images..."
    docker pull $DOCKER_IMAGE
}

# Stop existing containers
stop_containers() {
    print_status "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE down || true
}

# Start containers
start_containers() {
    print_status "Starting containers..."
    docker-compose -f $COMPOSE_FILE up -d
}

# Health check
health_check() {
    print_status "Performing health check..."
    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/health &> /dev/null; then
            print_status "Health check passed!"
            return 0
        fi

        print_warning "Health check failed (attempt $attempt/$max_attempts). Retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done

    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Show deployment status
show_status() {
    print_status "Deployment completed successfully!"
    print_status "Application is running at: http://localhost"
    print_status "Health check endpoint: http://localhost/health"

    echo ""
    print_status "To check logs: docker-compose logs -f"
    print_status "To stop: docker-compose down"
    print_status "To restart: docker-compose restart"
}

# Main deployment function
deploy() {
    check_docker
    pull_images
    stop_containers
    start_containers

    if health_check; then
        show_status
    else
        print_error "Deployment failed. Check logs with: docker-compose logs"
        exit 1
    fi
}

# Rollback function (stops containers)
rollback() {
    print_warning "Rolling back deployment..."
    docker-compose -f $COMPOSE_FILE down
    print_status "Rollback completed"
}

# Show usage
usage() {
    echo "Usage: $0 [deploy|rollback|status]"
    echo ""
    echo "Commands:"
    echo "  deploy   - Deploy the application"
    echo "  rollback - Rollback the deployment (stop containers)"
    echo "  status   - Show deployment status"
    echo ""
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    status)
        docker-compose ps
        ;;
    *)
        usage
        exit 1
        ;;
esac
