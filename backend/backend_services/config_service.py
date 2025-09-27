"""
Configuration service for GDNA Lyzr Baseline
Clean configuration management for infrastructure deployment.
"""

import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

class ConfigService:
    """Clean configuration service"""
    
    def __init__(self):
        """Initialize configuration service"""
        load_dotenv()
        self._config = self._load_config()
        logger.info("Configuration service initialized")
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from environment variables"""
        return {
            # Application configuration
            "environment": os.getenv("ENVIRONMENT", "development"),
            "api_version": os.getenv("API_VERSION", "1.0.0"),
            "debug": os.getenv("DEBUG", "false").lower() == "true",
            "port": int(os.getenv("PORT", "8080")),
            "host": os.getenv("HOST", "0.0.0.0"),
            
            # Service configuration
            "max_workers": int(os.getenv("MAX_WORKERS", "4")),
            "timeout": int(os.getenv("TIMEOUT", "30")),
            
            # Database URLs
            "postgresql_url": os.getenv("POSTGRESQL_URL"),
            "mongodb_url": os.getenv("MONGODB_URL"),
            "redis_url": os.getenv("REDIS_URL"),
            "rabbitmq_url": os.getenv("RABBITMQ_URL"),
            "minio_url": os.getenv("MINIO_URL"),
            "opensearch_url": os.getenv("OPENSEARCH_URL"),
            
            # API Keys
            "lyzr_api_key": os.getenv("LYZR_API_KEY"),
            
            # Operator Configuration
            "pinecone_api_key": os.getenv("PINECONE_API_KEY"),
            "pinecone_environment": os.getenv("PINECONE_ENVIRONMENT"),
            "neo4j_password": os.getenv("NEO4J_PASSWORD"),
            "arangodb_password": os.getenv("ARANGODB_PASSWORD"),
        }
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value"""
        return self._config.get(key, default)
    
    def get_safe_config(self) -> Dict[str, Any]:
        """Get safe configuration (excluding sensitive data)"""
        safe_config = self._config.copy()
        
        # Remove sensitive configuration
        sensitive_keys = [
            "lyzr_api_key", 
            "pinecone_api_key", 
            "neo4j_password", 
            "arangodb_password",
            "postgresql_url",
            "mongodb_url",
            "redis_url",
            "rabbitmq_url"
        ]
        
        for key in sensitive_keys:
            if key in safe_config:
                safe_config[key] = "***" if safe_config[key] else None
        
        return safe_config
    
    def is_production(self) -> bool:
        """Check if running in production"""
        return self._config.get("environment") == "production"
    
    def is_development(self) -> bool:
        """Check if running in development"""
        return self._config.get("environment") == "development"
    
    def get_database_config(self) -> Dict[str, Any]:
        """Get database configuration"""
        return {
            "postgresql": self._config.get("postgresql_url"),
            "mongodb": self._config.get("mongodb_url"),
            "redis": self._config.get("redis_url"),
            "rabbitmq": self._config.get("rabbitmq_url"),
            "minio": self._config.get("minio_url"),
            "opensearch": self._config.get("opensearch_url")
        }
    
    def get_operator_config(self) -> Dict[str, Any]:
        """Get operator configuration"""
        return {
            "pinecone": {
                "api_key": self._config.get("pinecone_api_key"),
                "environment": self._config.get("pinecone_environment")
            },
            "neo4j": {
                "password": self._config.get("neo4j_password")
            },
            "arangodb": {
                "password": self._config.get("arangodb_password")
            }
        }
    
    def validate_required_config(self) -> bool:
        """Validate that required configuration is present"""
        required_keys = ["environment", "api_version"]
        
        for key in required_keys:
            if not self._config.get(key):
                logger.error(f"Missing required configuration: {key}")
                return False
        
        return True