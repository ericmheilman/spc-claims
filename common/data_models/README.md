# Common - Data Models

This folder contains shared data models and schemas used across all components of the GDNA Baseline infrastructure.

## 🎯 **What This Contains**

### **API Schemas**
- Pydantic models for API request/response validation
- Shared data structures for component communication
- Configuration models for system validation

### **Shared Models**
- Common data types used across multiple components
- Standardized response formats
- Error handling schemas

## 🚀 **Usage Across Components**

### **K8s Backend**
```python
from common.data_models.health import HealthResponse
from common.data_models.config import ConfigModel

# Use in API endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy")
```

### **Lyzr Agents**
```python
from common.data_models.agent import AgentRequest, AgentResponse

# Use for agent communication
class MyAgent:
    async def process(self, request: AgentRequest) -> AgentResponse:
        return AgentResponse(result="processed")
```

### **PWA Frontend**
```typescript
// Use TypeScript definitions generated from Pydantic models
import { HealthResponse, ConfigModel } from '../types/api'

const healthData: HealthResponse = await api.get('/health')
```

## 🔧 **Development Pattern**

1. **Define once** - Create Pydantic model in common/data-models/
2. **Use everywhere** - Import in all components that need it
3. **Consistent validation** - Same validation logic across all components
4. **Type safety** - Strong typing for all data structures

## 📚 **Future Extensions**

When you need new data models:
1. Add Pydantic model to appropriate module
2. Export from `__init__.py`
3. Use in components that need it
4. Generate TypeScript types for frontend (optional)

This ensures consistent data handling across the entire GDNA Baseline infrastructure.
