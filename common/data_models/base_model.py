"""
Base model for all data models in the GDNA Lyzr Baseline system.
Provides common functionality for model validation, serialization, and API generation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Type
from pydantic import BaseModel, Field
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for MongoDB integration with Pydantic."""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)
    
    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


class BaseDataModel(BaseModel):
    """
    Base class for all data models.
    Provides common fields and functionality for API generation.
    """
    
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = Field(default=1, description="Version for optimistic locking")
    
    class Config:
        validate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "created_at": "2025-01-04T23:00:00Z",
                "updated_at": "2025-01-04T23:00:00Z", 
                "version": 1
            }
        }
    
    @classmethod
    def get_collection_name(cls) -> str:
        """Get the MongoDB collection name for this model."""
        return f"{cls.__name__.lower()}s"
    
    @classmethod
    def get_api_prefix(cls) -> str:
        """Get the API endpoint prefix for this model."""
        return f"/{cls.__name__.lower()}s"
    
    def dict_for_mongo(self) -> Dict[str, Any]:
        """Convert to dict suitable for MongoDB insertion."""
        data = self.dict(by_alias=True, exclude_unset=True)
        if "_id" in data and data["_id"] is None:
            del data["_id"]
        return data
    
    def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow()
        self.version += 1


class ModelRegistry:
    """Registry for all data models to enable automatic API generation."""
    
    _models: Dict[str, Type[BaseDataModel]] = {}
    
    @classmethod
    def register(cls, model_class: Type[BaseDataModel]):
        """Register a model class for API generation."""
        cls._models[model_class.__name__] = model_class
        return model_class
    
    @classmethod
    def get_models(cls) -> Dict[str, Type[BaseDataModel]]:
        """Get all registered models."""
        return cls._models.copy()
    
    @classmethod
    def get_model(cls, name: str) -> Optional[Type[BaseDataModel]]:
        """Get a specific model by name."""
        return cls._models.get(name)


def register_model(model_class: Type[BaseDataModel]):
    """Decorator to register a model for automatic API generation."""
    return ModelRegistry.register(model_class)
