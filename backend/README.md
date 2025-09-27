# K8s Backend - Complete Infrastructure

The complete Kubernetes backend infrastructure for GDNA Baseline. Contains the pure generic backend API, all storage services, deployment charts, and management scripts.

## 🎯 **What This Contains**

- **Pure Generic Backend API** (`app.py`) - Infrastructure services only
- **Backend Services** (`backend-services/`) - Health, config, metrics
- **Storage Services** (`storage/`) - All databases and external services
- **Kubernetes Charts** (`helm/`) - Complete deployment infrastructure
- **Deployment Scripts** (`scripts/`) - Automated deployment and management
- **Configuration Examples** (`examples/`) - Service configuration templates
- **Container Build** (`Dockerfile`) - Backend containerization
- **Dependencies** (`requirements.txt`) - Backend Python packages

## 🏗️ **Architecture**

```
k8s-backend/
├── app.py               # Pure generic backend API
├── backend-services/    # Core backend services
│   ├── config_service.py    # Configuration management
│   ├── health_service.py    # Infrastructure health checking
│   └── metrics_service.py   # Performance monitoring
├── storage/             # All storage services
│   ├── postgresql/      # PostgreSQL database service
│   ├── mongodb/         # MongoDB document service
│   ├── redis/           # Redis cache service
│   ├── rabbitmq/        # RabbitMQ message service
│   ├── minio/           # MinIO object storage service
│   ├── opensearch/      # OpenSearch search service
│   ├── pinecone/        # Pinecone vector database service
│   ├── neo4j/           # Neo4j graph database service
│   ├── weaviate/        # Weaviate vector database service
│   └── custom/          # Custom service templates
├── helm/                # Kubernetes deployment charts
├── scripts/             # Deployment automation
├── examples/            # Configuration templates
├── Dockerfile           # Container build
├── requirements.txt     # Python dependencies
├── test_backend.py      # Backend tests
└── .env.example         # Environment configuration
```

## 🚀 **Quick Start**

### 1. **Local Development**

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Test the backend
python test_backend.py

# Run the backend
python app.py
```

### 2. **Access API Documentation**

- **Swagger UI**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc
- **OpenAPI JSON**: http://localhost:8080/openapi.json

### 3. **Docker Build**

```bash
# Build image
docker build -t gdna-lyzr-baseline-backend .

# Run container
docker run -p 8080:8080 gdna-lyzr-baseline-backend
```

## 📡 **API Endpoints**

| Endpoint | Method | Description | Purpose |
|----------|--------|-------------|---------|
| `/` | GET | Root endpoint - API status | Service discovery |
| `/health` | GET | Infrastructure health check | Monitoring |
| `/ready` | GET | Kubernetes readiness probe | Deployment |
| `/config` | GET | Safe configuration access | Configuration |
| `/metrics` | GET | Service performance metrics | Observability |
| `/info` | GET | Service capabilities | Documentation |

## 🔧 **Configuration**

The backend uses environment variables for configuration:

```bash
# Application
ENVIRONMENT=development
API_VERSION=1.0.0
DEBUG=true
PORT=8080
HOST=0.0.0.0

# Service Configuration
MAX_WORKERS=4
TIMEOUT=30

# Database URLs (for health checks)
POSTGRESQL_URL=postgresql://user:pass@host:port/db
MONGODB_URL=mongodb://user:pass@host:port/db
REDIS_URL=redis://:pass@host:port
RABBITMQ_URL=amqp://user:pass@host:port
MINIO_URL=http://host:port
OPENSEARCH_URL=http://host:port

# API Keys
LYZR_API_KEY=your-api-key

# Operator Configuration
PINECONE_API_KEY=your-pinecone-key
NEO4J_PASSWORD=your-neo4j-password
```

## 🏥 **Health Monitoring**

The backend provides comprehensive health checking:

- **Database connectivity** (PostgreSQL, MongoDB, Redis, RabbitMQ)
- **Object storage** (MinIO)
- **Search engine** (OpenSearch)
- **External operators** (Pinecone, Neo4j)
- **Health summary** with statistics and percentages

## 📊 **Metrics & Observability**

- **Performance metrics** (CPU, memory, disk, network)
- **Request tracking** (count, errors, success rate)
- **System information** (Python version, platform, process details)
- **Infrastructure status** (component health)
- **Uptime tracking** (seconds, minutes, hours, days)

## 🚀 **Deployment**

### **Kubernetes Deployment**

The backend is automatically deployed with the infrastructure:

```bash
# Deploy to local development
make dev-setup

# Deploy to production
make deploy-production

# Deploy to customer
make deploy-customer CUSTOMER=acme-corp
```

### **Helm Configuration**

Backend configuration in `values.yaml`:

```yaml
backend:
  enabled: true
  replicaCount: 1
  apiVersion: "1.0.0"
  debug: false
  maxWorkers: 4
  timeout: 30
  
  image:
    repository: "gdna-lyzr-baseline-backend"
    tag: "latest"
  
  service:
    type: "ClusterIP"
    port: 8080
  
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi
```

## 🔍 **Monitoring & Debugging**

- **Health endpoints** for Kubernetes probes
- **Metrics collection** for Prometheus integration
- **Structured logging** for debugging
- **Service discovery** for infrastructure components
- **Swagger documentation** for API clarity

## 🧪 **Testing**

```bash
# Run backend tests
python test_backend.py

# Test with curl
curl http://localhost:8080/health
curl http://localhost:8080/metrics
curl http://localhost:8080/config
```

## 🔧 **Extension Points**

### **Adding New Services**

1. Create service in `services/` directory
2. Add service to `app.py` lifespan
3. Create endpoints as needed
4. Update health checks if required

### **Adding New Health Checks**

1. Extend `HealthService` in `services/health_service.py`
2. Add new health check method
3. Update the `_check_core_services` method
4. Test with health endpoint

### **Adding New Metrics**

1. Extend `MetricsService` in `services/metrics_service.py`
2. Add new metric collection method
3. Update the `get_metrics` method
4. Test with metrics endpoint

## 📚 **Dependencies**

Only essential dependencies are included:

- **FastAPI** - Web framework with automatic Swagger docs
- **Uvicorn** - ASGI server
- **psutil** - System monitoring
- **Database drivers** - For health checks only
- **HTTP client** - For health checks

## 🎯 **Design Principles**

1. **Purpose-Built** - Designed specifically for Lyzr agent deployment
2. **Clean Architecture** - Clear separation of concerns
3. **Minimal Dependencies** - Only what's actually needed
4. **Clear Interfaces** - Swagger documentation and predictable endpoints
5. **Easy Extension** - Add functionality without complexity
6. **Infrastructure Integration** - Works with the Kubernetes stack

## 🚀 **Use Cases**

### **Generic Infrastructure**
- Health monitoring for any infrastructure
- Configuration management for services
- Metrics collection and performance tracking
- Kubernetes deployment support

### **Full-Stack App Building**
- Backend foundation for web applications
- Infrastructure health monitoring
- Service configuration management
- Performance metrics and observability

### **Lyzr Integration**
- Extend with Lyzr-specific components in `lyzr/` folder
- Add agent endpoints and business logic
- Integrate with Lyzr connectors and tools
- Maintain clean separation of concerns

### **Multiple Projects**
- Reuse this backend across different projects
- Add project-specific functionality in separate layers
- Maintain consistent infrastructure patterns
- Easy migration to AWS native services

## 🚀 **Next Steps**

1. **Deploy locally** - `make dev-setup`
2. **Test functionality** - `python test_backend.py`
3. **Access documentation** - http://localhost:8080/docs
4. **Deploy to production** - `make deploy-production`
5. **Add custom services** - Extend as needed
6. **Integrate with Lyzr agents** - Use the API endpoints

## 🔗 **Integration Points**

- **Kubernetes**: Health probes, deployment, scaling
- **Prometheus**: Metrics collection and monitoring
- **Grafana**: Dashboard creation and visualization
- **Lyzr Agents**: Configuration and health monitoring
- **Infrastructure**: Database, storage, and operator health

The backend is designed to be the clean, focused foundation for your GDNA Lyzr infrastructure - purpose-built for agent deployment without unnecessary complexity.