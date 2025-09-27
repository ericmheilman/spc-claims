"""
Automatic API generator for data models.
Creates CRUD endpoints dynamically from data model definitions.
"""

import logging
from typing import Any, Dict, List, Optional, Type
from fastapi import APIRouter, HTTPException, Query, Path
from pymongo import MongoClient
from pymongo.collection import Collection
from bson import ObjectId
from bson.errors import InvalidId

# Import from common data models
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from common.data_models import BaseDataModel, ModelRegistry, get_all_models

logger = logging.getLogger(__name__)


class CRUDGenerator:
    """Generates CRUD operations for data models."""
    
    def __init__(self, mongo_client: MongoClient, database_name: str = "gdna_baseline"):
        self.mongo_client = mongo_client
        self.database = mongo_client[database_name]
        self.logger = logging.getLogger(__name__)
    
    def get_collection(self, model_class: Type[BaseDataModel]) -> Collection:
        """Get MongoDB collection for a model."""
        collection_name = model_class.get_collection_name()
        return self.database[collection_name]
    
    def create_item(self, model_class: Type[BaseDataModel], item_data: dict) -> dict:
        """Create a new item in the database."""
        try:
            # Validate and create model instance
            item = model_class(**item_data)
            
            # Insert into MongoDB
            collection = self.get_collection(model_class)
            result = collection.insert_one(item.dict_for_mongo())
            
            # Return the created item with ID
            created_item = collection.find_one({"_id": result.inserted_id})
            created_item["_id"] = str(created_item["_id"])
            
            self.logger.info(f"Created {model_class.__name__} with ID: {result.inserted_id}")
            return created_item
            
        except Exception as e:
            self.logger.error(f"Error creating {model_class.__name__}: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    def get_item(self, model_class: Type[BaseDataModel], item_id: str) -> Optional[dict]:
        """Get a single item by ID."""
        try:
            collection = self.get_collection(model_class)
            item = collection.find_one({"_id": ObjectId(item_id)})
            
            if item:
                item["_id"] = str(item["_id"])
                return item
            return None
            
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid ID format")
        except Exception as e:
            self.logger.error(f"Error getting {model_class.__name__} {item_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    def get_items(self, model_class: Type[BaseDataModel], 
                  skip: int = 0, limit: int = 100, 
                  filters: Optional[dict] = None) -> List[dict]:
        """Get multiple items with pagination and filtering."""
        try:
            collection = self.get_collection(model_class)
            query = filters or {}
            
            cursor = collection.find(query).skip(skip).limit(limit)
            items = []
            
            for item in cursor:
                item["_id"] = str(item["_id"])
                items.append(item)
            
            return items
            
        except Exception as e:
            self.logger.error(f"Error getting {model_class.__name__} items: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    def update_item(self, model_class: Type[BaseDataModel], 
                    item_id: str, update_data: dict) -> Optional[dict]:
        """Update an existing item."""
        try:
            collection = self.get_collection(model_class)
            
            # Update timestamp and version
            update_data["updated_at"] = update_data.get("updated_at", "2025-01-04T23:00:00Z")
            
            result = collection.update_one(
                {"_id": ObjectId(item_id)},
                {"$set": update_data, "$inc": {"version": 1}}
            )
            
            if result.modified_count == 0:
                return None
            
            # Return updated item
            updated_item = collection.find_one({"_id": ObjectId(item_id)})
            updated_item["_id"] = str(updated_item["_id"])
            
            self.logger.info(f"Updated {model_class.__name__} with ID: {item_id}")
            return updated_item
            
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid ID format")
        except Exception as e:
            self.logger.error(f"Error updating {model_class.__name__} {item_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")
    
    def delete_item(self, model_class: Type[BaseDataModel], item_id: str) -> bool:
        """Delete an item by ID."""
        try:
            collection = self.get_collection(model_class)
            result = collection.delete_one({"_id": ObjectId(item_id)})
            
            if result.deleted_count > 0:
                self.logger.info(f"Deleted {model_class.__name__} with ID: {item_id}")
                return True
            return False
            
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid ID format")
        except Exception as e:
            self.logger.error(f"Error deleting {model_class.__name__} {item_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal server error")


class APIGenerator:
    """Generates FastAPI routes for data models."""
    
    def __init__(self, crud_generator: CRUDGenerator):
        self.crud_generator = crud_generator
        self.logger = logging.getLogger(__name__)
    
    def generate_routes_for_model(self, model_class: Type[BaseDataModel]) -> APIRouter:
        """Generate CRUD routes for a specific model."""
        router = APIRouter()
        model_name = model_class.__name__.lower()
        
        # Create item
        @router.post(f"/{model_name}s/", response_model=dict, tags=[model_name])
        async def create_item(item: model_class):
            """Create a new item."""
            return self.crud_generator.create_item(model_class, item.dict())
        
        # Get item by ID
        @router.get(f"/{model_name}s/{{item_id}}", response_model=dict, tags=[model_name])
        async def get_item(item_id: str = Path(..., description=f"{model_name} ID")):
            """Get a single item by ID."""
            item = self.crud_generator.get_item(model_class, item_id)
            if not item:
                raise HTTPException(status_code=404, detail=f"{model_name} not found")
            return item
        
        # Get items with pagination
        @router.get(f"/{model_name}s/", response_model=List[dict], tags=[model_name])
        async def get_items(
            skip: int = Query(0, ge=0, description="Number of items to skip"),
            limit: int = Query(100, ge=1, le=1000, description="Number of items to return")
        ):
            """Get multiple items with pagination."""
            return self.crud_generator.get_items(model_class, skip=skip, limit=limit)
        
        # Update item
        @router.put(f"/{model_name}s/{{item_id}}", response_model=dict, tags=[model_name])
        async def update_item(
            item_id: str = Path(..., description=f"{model_name} ID"),
            update_data: dict = None
        ):
            """Update an existing item."""
            if not update_data:
                raise HTTPException(status_code=400, detail="Update data required")
            
            item = self.crud_generator.update_item(model_class, item_id, update_data)
            if not item:
                raise HTTPException(status_code=404, detail=f"{model_name} not found")
            return item
        
        # Delete item
        @router.delete(f"/{model_name}s/{{item_id}}", tags=[model_name])
        async def delete_item(item_id: str = Path(..., description=f"{model_name} ID")):
            """Delete an item by ID."""
            success = self.crud_generator.delete_item(model_class, item_id)
            if not success:
                raise HTTPException(status_code=404, detail=f"{model_name} not found")
            return {"message": f"{model_name} deleted successfully"}
        
        return router
    
    def generate_all_routes(self) -> APIRouter:
        """Generate routes for all registered models."""
        main_router = APIRouter()
        models = get_all_models()
        
        self.logger.info(f"Generating API routes for {len(models)} models")
        
        for model_name, model_class in models.items():
            try:
                model_router = self.generate_routes_for_model(model_class)
                main_router.include_router(model_router, prefix="/api/v1")
                self.logger.info(f"Generated routes for {model_name}")
            except Exception as e:
                self.logger.error(f"Error generating routes for {model_name}: {str(e)}")
        
        return main_router


def create_api_generator(mongo_url: str) -> APIGenerator:
    """Create and configure the API generator."""
    try:
        mongo_client = MongoClient(mongo_url)
        crud_generator = CRUDGenerator(mongo_client)
        api_generator = APIGenerator(crud_generator)
        
        logger.info("API generator created successfully")
        return api_generator
        
    except Exception as e:
        logger.error(f"Error creating API generator: {str(e)}")
        raise
