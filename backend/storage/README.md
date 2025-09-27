# Storage - Services

This folder contains all storage service configurations and integrations for the GDNA Baseline infrastructure. All storage services are treated equally - whether they're traditional databases, message queues, object storage, or specialized services.

## 🏗️ **Architecture**

```
storage/
├── postgresql/            # PostgreSQL database service
│   ├── config.yaml        # Service configuration
│   ├── client.py          # Database client wrapper
│   ├── health.py          # Health check implementation
│   ├── deployment.yaml    # Kubernetes deployment
│   └── README.md          # PostgreSQL-specific documentation
├── mongodb/               # MongoDB document service
│   ├── config.yaml        # Service configuration
│   ├── client.py          # Database client wrapper
│   ├── health.py          # Health check implementation
│   ├── deployment.yaml    # Kubernetes deployment
│   └── README.md          # MongoDB-specific documentation
├── redis/                 # Redis cache service
│   ├── config.yaml        # Service configuration
│   ├── client.py          # Redis client wrapper
│   ├── health.py          # Health check implementation
│   ├── deployment.yaml    # Kubernetes deployment
│   └── README.md          # Redis-specific documentation
├── rabbitmq/              # RabbitMQ message service
│   ├── config.yaml        # Service configuration
│   ├── client.py          # Message queue client wrapper
│   ├── health.py          # Health check implementation
│   ├── deployment.yaml    # Kubernetes deployment
│   └── README.md          # RabbitMQ-specific documentation
├── minio/                 # MinIO object storage service
│   ├── config.yaml        # Service configuration
│   ├── client.py          # Storage client wrapper
│   ├── health.py          # Health check implementation
│   ├── deployment.yaml    # Kubernetes deployment
│   └── README.md          # MinIO-specific documentation
├── opensearch/            # OpenSearch search service
│   ├── config.yaml        # Service configuration
│   ├── client.py          # Search client wrapper
│   ├── health.py          # Health check implementation
│   ├── deployment.yaml    # Kubernetes deployment
│   └── README.md          # OpenSearch-specific documentation
├── pinecone/              # Pinecone vector database service
│   ├── config.yaml        # Service configuration
│   ├── client.py          # Pinecone client wrapper
│   ├── health.py          # Health check implementation
│   └── README.md          # Pinecone-specific documentation
├── neo4j/                 # Neo4j graph database service
│   ├── config.yaml        # Service configuration
│   ├── client.py          # Neo4j client wrapper
│   ├── health.py          # Health check implementation
│   ├── deployment.yaml    # Kubernetes deployment
│   └── README.md          # Neo4j-specific documentation
├── weaviate/              # Weaviate vector database service
│   ├── config.yaml        # Service configuration
│   ├── client.py          # Weaviate client wrapper
│   ├── health.py          # Health check implementation
│   ├── deployment.yaml    # Kubernetes deployment
│   └── README.md          # Weaviate-specific documentation
├── custom/                # Custom service templates
│   ├── template.yaml      # Service template
│   ├── example.py         # Example implementation
│   └── README.md          # Custom service guide
├── docker-compose.yml     # Local service development setup
└── helm/                  # Helm charts for all storage services
```

## 🚀 **Local Development**

### **Quick Start**
```bash
# Start local operators with Docker Compose
cd storage/operators
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f neo4j
```

### **Individual Operator Setup**

#### **Neo4j (Local)**
```bash
# Start Neo4j
cd storage/operators/neo4j
docker-compose up -d

# Access Neo4j Browser
open http://localhost:7474

# Default credentials
# Username: neo4j
# Password: password
```

#### **Weaviate (Local)**
```bash
# Start Weaviate
cd storage/operators/weaviate
docker-compose up -d

# Check health
curl http://localhost:8080/v1/.well-known/ready

# Access Weaviate Console
open http://localhost:8080
```

#### **Pinecone (Cloud)**
```bash
# Set environment variables
export PINECONE_API_KEY="your-api-key"
export PINECONE_ENVIRONMENT="us-west1-gcp"
export PINECONE_INDEX_NAME="gdna-baseline"

# Test connection
cd storage/operators/pinecone
python -c "
from client import PineconeClient
client = PineconeClient()
print(client.health_check())
"
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Pinecone
PINECONE_API_KEY=your-api-key
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME=gdna-baseline

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Weaviate
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=your-api-key
```

### **Operator Configuration**
```yaml
# storage/operators/config.yaml
operators:
  pinecone:
    enabled: true
    api_key: ${PINECONE_API_KEY}
    environment: ${PINECONE_ENVIRONMENT}
    index_name: ${PINECONE_INDEX_NAME}
    
  neo4j:
    enabled: true
    uri: ${NEO4J_URI}
    user: ${NEO4J_USER}
    password: ${NEO4J_PASSWORD}
    
  weaviate:
    enabled: true
    url: ${WEAVIATE_URL}
    api_key: ${WEAVIATE_API_KEY}
```

## 🏥 **Health Checks**

### **Integration with Generic Backend**
Each operator implements health checks that integrate with the generic backend's health service:

```python
# Example: storage/operators/pinecone/health.py
from pinecone import Pinecone
from typing import Dict, Any
import os

class PineconeHealthCheck:
    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.environment = os.getenv("PINECONE_ENVIRONMENT")
        
    async def check_health(self) -> Dict[str, Any]:
        try:
            if not self.api_key:
                return {
                    "status": "not_configured",
                    "operator": "pinecone",
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            pc = Pinecone(api_key=self.api_key)
            # Simple health check
            return {
                "status": "healthy",
                "operator": "pinecone",
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "operator": "pinecone",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
```

## 🚀 **Deployment Integration**

### **Kubernetes Deployment**
```yaml
# storage/operators/neo4j/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neo4j
spec:
  replicas: 1
  selector:
    matchLabels:
      app: neo4j
  template:
    metadata:
      labels:
        app: neo4j
    spec:
      containers:
      - name: neo4j
        image: neo4j:5
        ports:
        - containerPort: 7474  # HTTP
        - containerPort: 7687  # Bolt
        env:
        - name: NEO4J_AUTH
          value: "neo4j/password"
        - name: NEO4J_PLUGINS
          value: '["apoc"]'
        volumeMounts:
        - name: neo4j-data
          mountPath: /data
        - name: neo4j-logs
          mountPath: /logs
      volumes:
      - name: neo4j-data
        persistentVolumeClaim:
          claimName: neo4j-data-pvc
      - name: neo4j-logs
        persistentVolumeClaim:
          claimName: neo4j-logs-pvc
```

### **Helm Integration**
```yaml
# storage/operators/values.yaml
neo4j:
  enabled: true
  image:
    repository: neo4j
    tag: "5"
  auth:
    neo4jPassword: "password"
  persistence:
    data:
      enabled: true
      size: 10Gi
    logs:
      enabled: true
      size: 5Gi
  service:
    http:
      port: 7474
    bolt:
      port: 7687
```

## 📊 **Monitoring & Metrics**

### **Prometheus Integration**
```yaml
# storage/operators/neo4j/monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: neo4j-monitor
spec:
  selector:
    matchLabels:
      app: neo4j
  endpoints:
  - port: metrics
    interval: 30s
```

### **Custom Metrics**
```python
# Example metrics collection for operators
from prometheus_client import Counter, Histogram, Gauge

# Operator-specific metrics
operator_requests = Counter('operator_requests_total', 'Total operator requests', ['operator', 'operation'])
operator_latency = Histogram('operator_latency_seconds', 'Operator operation latency', ['operator', 'operation'])
operator_errors = Counter('operator_errors_total', 'Total operator errors', ['operator', 'operation'])
```

## 🔒 **Security**

### **Network Policies**
```yaml
# storage/operators/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: operator-network-policy
spec:
  podSelector:
    matchLabels:
      app: operator
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend
    ports:
    - protocol: TCP
      port: 7474
    - protocol: TCP
      port: 7687
```

### **Secrets Management**
```yaml
# storage/operators/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: operator-secrets
type: Opaque
data:
  pinecone-api-key: eW91ci1hcGkta2V5  # base64 encoded
  neo4j-password: cGFzc3dvcmQ=
  weaviate-api-key: eW91ci1hcGkta2V5
```

## 🧪 **Testing**

### **Local Testing**
```bash
# Test operator connections
cd storage/operators
python -m pytest tests/

# Test health checks
python -c "
from neo4j.health import Neo4jHealthCheck
import asyncio

async def test():
    health = Neo4jHealthCheck()
    result = await health.check_health()
    print(result)

asyncio.run(test())
"
```

### **Integration Testing**
```bash
# Test with generic backend
cd ../../
python -c "
from services.health_service import HealthService
import asyncio

async def test():
    health = HealthService()
    result = await health.check_health()
    print(result)

asyncio.run(test())
"
```

## 🔌 **Custom Operators**

### **Creating a Custom Operator**
```python
# storage/operators/custom/example.py
from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseOperator(ABC):
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    async def connect(self) -> bool:
        pass
    
    @abstractmethod
    async def disconnect(self) -> bool:
        pass

class CustomOperator(BaseOperator):
    async def health_check(self) -> Dict[str, Any]:
        # Implement health check
        return {"status": "healthy", "operator": "custom"}
    
    async def connect(self) -> bool:
        # Implement connection
        return True
    
    async def disconnect(self) -> bool:
        # Implement disconnection
        return True
```

## 📚 **Documentation**

- [Pinecone Setup](./pinecone/README.md)
- [Neo4j Setup](./neo4j/README.md)
- [Weaviate Setup](./weaviate/README.md)
- [Custom Operators](./custom/README.md)

## 🎯 **Next Steps**

1. **Local Development**: Use Docker Compose for local operator setup
2. **Health Integration**: Implement health checks for generic backend
3. **Deployment**: Create Kubernetes manifests and Helm charts
4. **Monitoring**: Add Prometheus metrics and Grafana dashboards
5. **Custom Operators**: Build custom operators for your specific needs

This operators layer provides external service integrations for the GDNA Baseline infrastructure with clear local development patterns and deployment integration.