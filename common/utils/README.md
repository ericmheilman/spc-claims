# Common - Utilities

This folder contains shared utility functions used across all layers of the GDNA Baseline infrastructure.

## 🏗️ **Architecture**

```
utils/
├── logging.py          # Common logging configuration
├── validation.py       # Data validation utilities
├── security.py         # Security utilities and helpers
├── time.py             # Time and date utilities
├── crypto.py           # Encryption and hashing utilities
├── network.py          # Network and HTTP utilities
├── file.py             # File and path utilities
├── __init__.py         # Package initialization
└── README.md           # This file
```

## 🚀 **Local Development**

### **Quick Start**
```bash
# Install common utilities
cd common/utils
pip install -r requirements.txt

# Run tests
python -m pytest tests/

# Use utilities in your code
python -c "
from common.utils.logging import setup_logger
from common.utils.validation import validate_email

logger = setup_logger(__name__)
logger.info('Testing utilities')

is_valid = validate_email('test@example.com')
print(f'Email valid: {is_valid}')
"
```

### **Development Setup**
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install in development mode
pip install -e .
```

## 🔧 **Utility Functions**

### **Logging** (`logging.py`)
```python
from common.utils.logging import setup_logger, get_logger

# Setup logger for a module
logger = setup_logger(__name__)

# Get existing logger
logger = get_logger(__name__)

# Usage
logger.info("Application started")
logger.error("An error occurred", exc_info=True)
logger.debug("Debug information")
```

### **Validation** (`validation.py`)
```python
from common.utils.validation import validate_email, validate_url, validate_phone

# Email validation
is_valid = validate_email("user@example.com")

# URL validation
is_valid = validate_url("https://example.com")

# Phone validation
is_valid = validate_phone("+1-555-123-4567")
```

### **Security** (`security.py`)
```python
from common.utils.security import hash_password, verify_password, generate_token

# Password hashing
hashed = hash_password("my_password")
is_valid = verify_password("my_password", hashed)

# Token generation
token = generate_token(user_id="123", expires_in=3600)
```

### **Time** (`time.py`)
```python
from common.utils.time import format_timestamp, parse_timestamp, get_utc_now

# Format timestamp
formatted = format_timestamp(timestamp, format="%Y-%m-%d %H:%M:%S")

# Parse timestamp
timestamp = parse_timestamp("2024-01-01 12:00:00")

# Get current UTC time
now = get_utc_now()
```

### **Crypto** (`crypto.py`)
```python
from common.utils.crypto import encrypt_data, decrypt_data, generate_key

# Generate encryption key
key = generate_key()

# Encrypt data
encrypted = encrypt_data("sensitive data", key)

# Decrypt data
decrypted = decrypt_data(encrypted, key)
```

### **Network** (`network.py`)
```python
from common.utils.network import is_port_open, get_local_ip, ping_host

# Check if port is open
is_open = is_port_open("localhost", 8080)

# Get local IP address
local_ip = get_local_ip()

# Ping host
is_reachable = ping_host("google.com")
```

### **File** (`file.py`)
```python
from common.utils.file import ensure_dir, safe_filename, get_file_size

# Ensure directory exists
ensure_dir("/path/to/directory")

# Create safe filename
safe_name = safe_filename("file name with spaces.txt")

# Get file size
size = get_file_size("/path/to/file.txt")
```

## 🏥 **Health Checks**

### **Integration with Generic Backend**
Utilities can be used to enhance health checks and monitoring:

```python
# Example: Enhanced health check with utilities
from common.utils.logging import setup_logger
from common.utils.time import get_utc_now
from common.utils.validation import validate_url

class EnhancedHealthCheck:
    def __init__(self):
        self.logger = setup_logger(__name__)
    
    async def check_health(self):
        start_time = get_utc_now()
        
        try:
            # Perform health check
            is_healthy = await self._perform_check()
            
            if is_healthy:
                self.logger.info("Health check passed")
            else:
                self.logger.warning("Health check failed")
            
            return {
                "status": "healthy" if is_healthy else "unhealthy",
                "timestamp": start_time.isoformat(),
                "duration": (get_utc_now() - start_time).total_seconds()
            }
        except Exception as e:
            self.logger.error(f"Health check error: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": start_time.isoformat()
            }
```

## 🚀 **Deployment Integration**

### **Kubernetes Deployment**
```yaml
# common/utils/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: common-utils
spec:
  replicas: 1
  selector:
    matchLabels:
      app: common-utils
  template:
    metadata:
      labels:
        app: common-utils
    spec:
      containers:
      - name: utils
        image: common-utils:latest
        ports:
        - containerPort: 8080
        env:
        - name: LOG_LEVEL
          value: "INFO"
        - name: ENVIRONMENT
          value: "production"
```

### **Helm Integration**
```yaml
# common/utils/values.yaml
common:
  utils:
    enabled: true
    image:
      repository: common-utils
      tag: "latest"
    config:
      logLevel: "INFO"
      environment: "production"
    resources:
      limits:
        cpu: 500m
        memory: 512Mi
      requests:
        cpu: 250m
        memory: 256Mi
```

## 📊 **Monitoring & Metrics**

### **Prometheus Integration**
```yaml
# common/utils/monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: common-utils-monitor
spec:
  selector:
    matchLabels:
      app: common-utils
  endpoints:
  - port: metrics
    interval: 30s
```

### **Custom Metrics**
```python
# Example metrics collection for utilities
from prometheus_client import Counter, Histogram, Gauge

# Utility usage metrics
utility_calls = Counter('utility_calls_total', 'Total utility function calls', ['utility', 'function'])
utility_duration = Histogram('utility_duration_seconds', 'Utility function duration', ['utility', 'function'])
utility_errors = Counter('utility_errors_total', 'Total utility errors', ['utility', 'function'])

# Decorator for automatic metrics
def track_utility(utility_name, function_name):
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                utility_calls.labels(utility=utility_name, function=function_name).inc()
                return result
            except Exception as e:
                utility_errors.labels(utility=utility_name, function=function_name).inc()
                raise
            finally:
                duration = time.time() - start_time
                utility_duration.labels(utility=utility_name, function=function_name).observe(duration)
        return wrapper
    return decorator
```

## 🔒 **Security**

### **Input Validation**
```python
# Example: Secure input validation
from common.utils.validation import validate_input, sanitize_string

class SecureInputHandler:
    def __init__(self):
        self.allowed_patterns = {
            'email': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
            'username': r'^[a-zA-Z0-9_-]{3,20}$',
            'filename': r'^[a-zA-Z0-9._-]+$'
        }
    
    def validate_and_sanitize(self, input_data: str, input_type: str) -> str:
        # Validate input
        if not validate_input(input_data, self.allowed_patterns[input_type]):
            raise ValueError(f"Invalid {input_type} format")
        
        # Sanitize input
        return sanitize_string(input_data)
```

### **Secrets Management**
```python
# Example: Secure secrets handling
from common.utils.security import encrypt_secret, decrypt_secret
from common.utils.crypto import generate_key

class SecretsManager:
    def __init__(self, master_key: str):
        self.master_key = master_key
    
    def store_secret(self, secret_name: str, secret_value: str) -> str:
        # Encrypt secret before storage
        encrypted = encrypt_secret(secret_value, self.master_key)
        return encrypted
    
    def retrieve_secret(self, secret_name: str, encrypted_value: str) -> str:
        # Decrypt secret for use
        decrypted = decrypt_secret(encrypted_value, self.master_key)
        return decrypted
```

## 🧪 **Testing**

### **Local Testing**
```bash
# Run utility tests
cd common/utils
python -m pytest tests/

# Test specific utility
python -c "
from validation import validate_email
print('Email validation test:', validate_email('test@example.com'))
"
```

### **Integration Testing**
```bash
# Test utilities with other components
cd ../../
python -c "
from common.utils.logging import setup_logger
from common.utils.validation import validate_email

logger = setup_logger('test')
logger.info('Testing utility integration')

is_valid = validate_email('test@example.com')
logger.info(f'Email validation result: {is_valid}')
"
```

## 📚 **Documentation**

- [Logging Guide](./logging.md)
- [Validation Guide](./validation.md)
- [Security Guide](./security.md)
- [Time Utilities](./time.md)
- [Crypto Utilities](./crypto.md)
- [Network Utilities](./network.md)
- [File Utilities](./file.md)

## 🎯 **Next Steps**

1. **Local Development**: Set up development environment and run tests
2. **Utility Integration**: Use utilities in other components
3. **Deployment**: Create Kubernetes manifests and Helm charts
4. **Monitoring**: Add Prometheus metrics and Grafana dashboards
5. **Security**: Implement secure input validation and secrets management

This utilities layer provides shared functionality across all components of the GDNA Baseline infrastructure with clear local development patterns and deployment integration.