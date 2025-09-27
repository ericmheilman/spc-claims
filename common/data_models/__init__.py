"""
Data models package for GDNA Lyzr Baseline.
Provides base model functionality and example models for automatic API generation.
"""

from .base_model import BaseDataModel, ModelRegistry, register_model, PyObjectId
from .example_models import User, Project, Document, Task

# Export all models and utilities
__all__ = [
    "BaseDataModel",
    "ModelRegistry", 
    "register_model",
    "PyObjectId",
    "User",
    "Project", 
    "Document",
    "Task"
]

# Get all registered models for API generation
def get_all_models():
    """Get all registered models for API generation."""
    return ModelRegistry.get_models()