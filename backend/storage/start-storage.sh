#!/bin/bash

# GDNA Baseline - Storage Services Startup Script
# Starts all core storage services for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi

print_status "Starting GDNA Baseline storage services..."

# Start services
docker-compose up -d

print_status "Waiting for services to be ready..."

# Wait for PostgreSQL
print_status "Waiting for PostgreSQL..."
until docker exec gdna-postgresql pg_isready -U gdna_user -d gdna_baseline >/dev/null 2>&1; do
    sleep 2
done
print_success "PostgreSQL is ready"

# Wait for MongoDB
print_status "Waiting for MongoDB..."
until docker exec gdna-mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; do
    sleep 2
done
print_success "MongoDB is ready"

# Wait for Redis
print_status "Waiting for Redis..."
until docker exec gdna-redis redis-cli --no-auth-warning -a dev_password ping >/dev/null 2>&1; do
    sleep 2
done
print_success "Redis is ready"

# Wait for RabbitMQ
print_status "Waiting for RabbitMQ..."
until docker exec gdna-rabbitmq rabbitmq-diagnostics ping >/dev/null 2>&1; do
    sleep 2
done
print_success "RabbitMQ is ready"

# Wait for MinIO
print_status "Waiting for MinIO..."
until docker exec gdna-minio curl -f http://localhost:9000/minio/health/live >/dev/null 2>&1; do
    sleep 2
done
print_success "MinIO is ready"

# Wait for OpenSearch
print_status "Waiting for OpenSearch..."
until docker exec gdna-opensearch curl -f http://localhost:9200/_cluster/health >/dev/null 2>&1; do
    sleep 2
done
print_success "OpenSearch is ready"

print_success "All storage services are running!"
echo ""
echo "Service URLs:"
echo "============="
echo "PostgreSQL:  localhost:5432 (user: gdna_user, password: dev_password, db: gdna_baseline)"
echo "MongoDB:     localhost:27017 (user: admin, password: dev_password)"
echo "Redis:       localhost:6379 (password: dev_password)"
echo "RabbitMQ:    localhost:5672 (user: gdna_user, password: dev_password)"
echo "RabbitMQ UI: http://localhost:15672 (user: gdna_user, password: dev_password)"
echo "MinIO:       http://localhost:9000 (user: minioadmin, password: dev_password)"
echo "MinIO UI:    http://localhost:9001 (user: minioadmin, password: dev_password)"
echo "OpenSearch:  http://localhost:9200"
echo ""
echo "To stop services: docker-compose down"
echo "To view logs: docker-compose logs -f [service-name]"
echo "To check status: docker-compose ps"
