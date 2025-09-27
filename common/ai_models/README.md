# Common - AI Models

This folder contains AI models, GenAI models, and machine learning model artifacts that can be shared across all components.

## 🏗️ **Architecture**

```
ai-models/
├── fine-tuned/          # Custom fine-tuned models
├── embeddings/          # Embedding models and vectors
├── configs/             # Model configurations and parameters
├── artifacts/           # Model files, weights, and checkpoints
├── templates/           # Model template configurations
└── README.md            # This file
```

## 🎯 **What Goes Here**

### **Fine-Tuned Models** (`ai-models/fine-tuned/`)
- Custom fine-tuned language models
- Domain-specific model adaptations
- Model versioning and metadata

### **Embeddings** (`ai-models/embeddings/`)
- Pre-computed embeddings
- Embedding model configurations
- Vector representations

### **Configurations** (`ai-models/configs/`)
- Model hyperparameters
- Training configurations
- Inference settings

### **Artifacts** (`ai-models/artifacts/`)
- Model weights and checkpoints
- Serialized models
- Model metadata and versioning

### **Templates** (`ai-models/templates/`)
- Model configuration templates
- Standard model setups
- Reusable model patterns

## 🚀 **Usage Across Components**

### **K8s Backend**
- Load models for inference endpoints
- Model health checking and monitoring
- Model configuration management

### **Lyzr Agents**
- Use fine-tuned models for agent tasks
- Access embedding models for vector operations
- Load model configurations for agent behavior

### **PWA Frontend**
- Display model information and status
- Manage model configurations
- Monitor model performance

## 🔧 **Future Integration**

This folder is ready for:
- **Model serving** with TensorFlow Serving, Triton, or similar
- **Model versioning** with MLflow or similar
- **Model monitoring** with Prometheus and Grafana
- **Model deployment** with Kubernetes operators

## 📚 **Next Steps**

When you're ready to add AI models:
1. Add model artifacts to appropriate subfolder
2. Create model configuration files
3. Integrate with backend health checks
4. Add model-specific monitoring
5. Create model deployment manifests

This folder provides a structured foundation for AI model management across the entire GDNA Baseline infrastructure.
