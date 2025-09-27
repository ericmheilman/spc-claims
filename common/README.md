# Common Layer

This folder contains shared utilities, patterns, and configurations that can be used across different layers of the GDNA Baseline infrastructure.

## 🏗️ **Architecture**

```
common/
├── data-models/        # API data models and schemas
│   ├── __init__.py     # Package initialization
│   └── README.md       # Data models documentation
├── ai-models/          # AI/GenAI models and artifacts
│   └── README.md       # AI models documentation
└── utils/              # Shared utility functions
    ├── logging.py      # Common logging configuration
    ├── validation.py   # Data validation utilities
    ├── security.py     # Security utilities and helpers
    ├── time.py         # Time and date utilities
    └── README.md       # Utils documentation
```

## 🎯 **What Goes Here**

### **Data Models** (`common/data-models/`)
- **API Schemas**: Pydantic models for API request/response validation
- **Shared Data Structures**: Common data models used across components
- **Configuration Models**: Data models for configuration validation

### **AI Models** (`common/ai-models/`)
- **GenAI Models**: Custom fine-tuned language models
- **Embedding Models**: Vector embeddings and model configurations
- **Model Artifacts**: Model weights, checkpoints, and metadata
- **Model Templates**: Reusable model configuration patterns

### **Utils** (`common/utils/`)
- **Logging**: Common logging configuration and patterns
- **Validation**: Data validation utilities and schemas
- **Security**: Security helpers, encryption, authentication
- **Time**: Date/time utilities and formatting
- **Network**: Network and connectivity utilities
- **File**: File handling and path utilities

## 🚀 **Integration with Other Layers**

### **K8s Backend**
- Uses common data models for API schemas
- Uses common utilities for logging, validation, security
- Can load AI models for inference (future use)

### **Lyzr Layer**
- Uses common data models for agent communication
- Uses common utilities for agent development
- Can use AI models for agent capabilities

### **PWA Frontend**
- Uses common data models for API integration
- Uses common utilities for validation and security
- Can display AI model information and status

## 🔧 **Development Pattern**

1. **Common Layer**: Shared utilities, patterns, and configurations
2. **Other Layers**: Extend and use common components
3. **Clear Reuse**: Common components used across all layers
4. **Consistent Patterns**: Same patterns across all implementations

## 📚 **Documentation**

- [Utility Functions](./utils/README.md)
- [Design Patterns](./patterns/README.md)
- [Configuration Management](./config/README.md)
- [Data Schemas](./schemas/README.md)
- [Testing Utilities](./tests/README.md)

## 🎯 **Benefits of This Structure**

- **Code Reuse**: Common utilities used across all layers
- **Consistent Patterns**: Same patterns across all implementations
- **Easy Maintenance**: Common code maintained in one place
- **Standardization**: Consistent approach across projects
- **Testing**: Shared test utilities and patterns

## 🚀 **Usage Examples**

### **Using Common Logging**
```python
from common.utils.logging import setup_logger

logger = setup_logger(__name__)
logger.info("Using common logging pattern")
```

### **Using Common Health Pattern**
```python
from common.patterns.health import HealthChecker

class MyService:
    def __init__(self):
        self.health_checker = HealthChecker()
    
    async def health_check(self):
        return await self.health_checker.check()
```

### **Using Common Configuration**
```python
from common.config.base import load_config

config = load_config()
```

This common layer ensures consistency and reusability across all components of the GDNA Baseline infrastructure.