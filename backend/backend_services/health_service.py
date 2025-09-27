"""
Health service for GDNA Lyzr Baseline
Clean health checking for infrastructure components.
"""

import asyncio
from typing import Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class HealthService:
    """Clean health checking service"""
    
    def __init__(self, config_service):
        """Initialize health service"""
        self.config = config_service
        self.version = self.config.get("api_version", "1.0.0")
    
    async def check_health(self) -> Dict[str, Any]:
        """Check overall system health"""
        try:
            services = await self._check_core_services()
            
            overall_status = "healthy" if all(
                status == "healthy" for status in services.values()
            ) else "degraded"
            
            return {
                "status": overall_status,
                "timestamp": datetime.utcnow().isoformat(),
                "version": self.version,
                "services": services,
                "summary": self._get_health_summary(services)
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e),
                "version": self.version
            }
    
    async def check_readiness(self) -> bool:
        """Check if service is ready to handle requests"""
        try:
            # Check if core services are accessible
            services = await self._check_core_services()
            core_services = ["postgresql", "mongodb", "redis"]
            
            return all(
                services.get(service) == "healthy" 
                for service in core_services
            )
        except Exception as e:
            logger.error(f"Readiness check failed: {e}")
            return False
    
    async def _check_core_services(self) -> Dict[str, str]:
        """Check core infrastructure services"""
        services = {}
        
        # Check core databases
        services["postgresql"] = await self._check_postgresql()
        services["mongodb"] = await self._check_mongodb()
        services["redis"] = await self._check_redis()
        
        # Check message broker
        services["rabbitmq"] = await self._check_rabbitmq()
        
        # Check storage
        services["minio"] = await self._check_minio()
        
        # Check search engine
        services["opensearch"] = await self._check_opensearch()
        
        # Check external operators (if configured)
        if self.config.get("pinecone_api_key"):
            services["pinecone"] = "configured"
        if self.config.get("neo4j_password"):
            services["neo4j"] = "configured"
        
        return services
    
    async def _check_postgresql(self) -> str:
        """Check PostgreSQL health"""
        try:
            url = self.config.get("postgresql_url")
            if not url:
                return "not_configured"
            
            # Simple connection test
            import psycopg2
            conn = psycopg2.connect(url, connect_timeout=5)
            conn.close()
            return "healthy"
        except Exception as e:
            logger.warning(f"PostgreSQL health check failed: {e}")
            return "unhealthy"
    
    async def _check_mongodb(self) -> str:
        """Check MongoDB health"""
        try:
            url = self.config.get("mongodb_url")
            if not url:
                return "not_configured"
            
            # Simple connection test
            from pymongo import MongoClient
            client = MongoClient(url, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            client.close()
            return "healthy"
        except Exception as e:
            logger.warning(f"MongoDB health check failed: {e}")
            return "unhealthy"
    
    async def _check_redis(self) -> str:
        """Check Redis health"""
        try:
            url = self.config.get("redis_url")
            if not url:
                return "not_configured"
            
            # Simple connection test
            import redis.asyncio as redis
            r = redis.from_url(url)
            await r.ping()
            await r.close()
            return "healthy"
        except Exception as e:
            logger.warning(f"Redis health check failed: {e}")
            return "unhealthy"
    
    async def _check_rabbitmq(self) -> str:
        """Check RabbitMQ health"""
        try:
            url = self.config.get("rabbitmq_url")
            if not url:
                return "not_configured"
            
            # Simple connection test
            import pika
            connection = pika.BlockingConnection(pika.URLParameters(url))
            connection.close()
            return "healthy"
        except Exception as e:
            logger.warning(f"RabbitMQ health check failed: {e}")
            return "unhealthy"
    
    async def _check_minio(self) -> str:
        """Check MinIO health"""
        try:
            url = self.config.get("minio_url")
            if not url:
                return "not_configured"
            
            # Simple HTTP check
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/minio/health/live", timeout=5) as response:
                    if response.status == 200:
                        return "healthy"
                    return "unhealthy"
        except Exception as e:
            logger.warning(f"MinIO health check failed: {e}")
            return "unhealthy"
    
    async def _check_opensearch(self) -> str:
        """Check OpenSearch health"""
        try:
            url = self.config.get("opensearch_url")
            if not url:
                return "not_configured"
            
            # Simple connection test
            from opensearchpy import OpenSearch
            client = OpenSearch([url])
            health = client.cluster.health()
            return "healthy" if health else "unhealthy"
        except Exception as e:
            logger.warning(f"OpenSearch health check failed: {e}")
            return "unhealthy"
    
    def _get_health_summary(self, services: Dict[str, str]) -> Dict[str, Any]:
        """Get health summary statistics"""
        total_services = len(services)
        healthy_services = sum(1 for status in services.values() if status == "healthy")
        configured_services = sum(1 for status in services.values() if status in ["healthy", "configured"])
        
        return {
            "total": total_services,
            "healthy": healthy_services,
            "configured": configured_services,
            "unhealthy": total_services - healthy_services - configured_services,
            "health_percentage": round((healthy_services / total_services) * 100, 1) if total_services > 0 else 0
        }