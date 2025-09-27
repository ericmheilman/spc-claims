"""
Example data models for the GDNA Lyzr Baseline system.
These demonstrate how to create models that automatically generate APIs.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import Field, EmailStr
from .base_model import BaseDataModel, register_model


@register_model
class User(BaseDataModel):
    """User model with automatic API generation."""
    
    email: EmailStr = Field(..., description="User's email address")
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    full_name: Optional[str] = Field(None, max_length=100, description="User's full name")
    is_active: bool = Field(default=True, description="Whether the user account is active")
    roles: List[str] = Field(default_factory=list, description="User roles/permissions")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "john_doe",
                "full_name": "John Doe",
                "is_active": True,
                "roles": ["user"],
                "last_login": "2025-01-04T23:00:00Z"
            }
        }


@register_model
class Project(BaseDataModel):
    """Project model for managing GDNA projects."""
    
    name: str = Field(..., min_length=1, max_length=100, description="Project name")
    description: Optional[str] = Field(None, max_length=500, description="Project description")
    owner_id: str = Field(..., description="ID of the project owner")
    status: str = Field(default="active", description="Project status")
    tags: List[str] = Field(default_factory=list, description="Project tags")
    settings: dict = Field(default_factory=dict, description="Project-specific settings")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "My GDNA Project",
                "description": "A sample project for demonstration",
                "owner_id": "user123",
                "status": "active",
                "tags": ["demo", "gdna"],
                "settings": {"theme": "dark", "notifications": True}
            }
        }


@register_model
class Document(BaseDataModel):
    """Document model for storing and managing documents."""
    
    title: str = Field(..., min_length=1, max_length=200, description="Document title")
    content: str = Field(..., description="Document content")
    content_type: str = Field(default="text/plain", description="MIME type of the content")
    project_id: Optional[str] = Field(None, description="Associated project ID")
    author_id: str = Field(..., description="ID of the document author")
    is_public: bool = Field(default=False, description="Whether the document is publicly accessible")
    metadata: dict = Field(default_factory=dict, description="Additional document metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Sample Document",
                "content": "This is the content of the document...",
                "content_type": "text/markdown",
                "project_id": "project123",
                "author_id": "user123",
                "is_public": False,
                "metadata": {"word_count": 150, "language": "en"}
            }
        }


@register_model
class Task(BaseDataModel):
    """Task model for project management and workflows."""
    
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, max_length=1000, description="Task description")
    status: str = Field(default="pending", description="Task status")
    priority: str = Field(default="medium", description="Task priority")
    assignee_id: Optional[str] = Field(None, description="ID of the assigned user")
    project_id: Optional[str] = Field(None, description="Associated project ID")
    due_date: Optional[datetime] = Field(None, description="Task due date")
    completed_at: Optional[datetime] = Field(None, description="Task completion timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Implement user authentication",
                "description": "Add JWT-based authentication to the API",
                "status": "in_progress",
                "priority": "high",
                "assignee_id": "user123",
                "project_id": "project123",
                "due_date": "2025-01-10T23:59:59Z"
            }
        }
