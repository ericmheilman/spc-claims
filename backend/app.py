#!/usr/bin/env python3
"""
GDNA Baseline - Pure Generic Backend Service
A clean, reusable backend foundation for any infrastructure deployment.
No Lyzr, no storage specifics - just pure infrastructure services.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import uvicorn
import os
import sys
import logging
from typing import Dict, Any

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend_services.config_service import ConfigService
from backend_services.health_service import HealthService
from backend_services.metrics_service import MetricsService
from backend_services.api_generator import create_api_generator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service instances
config_service: ConfigService = None
health_service: HealthService = None
metrics_service: MetricsService = None
api_generator = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global config_service, health_service, metrics_service, api_generator
    
    logger.info("Starting GDNA Baseline Generic Backend Service...")
    
    # Initialize services
    config_service = ConfigService()
    health_service = HealthService(config_service)
    metrics_service = MetricsService(config_service)
    
    # Initialize auto-generated API routes if MongoDB is available
    try:
        mongo_url = config_service.get("MONGO_URL")
        if mongo_url:
            api_generator = create_api_generator(mongo_url)
            generated_routes = api_generator.generate_all_routes()
            app.include_router(generated_routes)
            logger.info("Auto-generated API routes included successfully")
        else:
            logger.warning("MongoDB URL not configured - skipping auto-generated routes")
    except Exception as e:
        logger.warning(f"Could not initialize auto-generated routes: {str(e)}")
    
    logger.info("Generic backend services initialized successfully")
    
    yield
    
    logger.info("Shutting down GDNA Baseline Generic Backend Service...")

# Read version from file
def get_version():
    try:
        with open(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'VERSION'), 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        return "1.0.0"

VERSION = get_version()

# Create FastAPI app
app = FastAPI(
    title="GDNA Baseline Generic API",
    description="Pure generic backend foundation for infrastructure deployment. No business logic, no storage specifics - just infrastructure services.",
    version=VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure appropriately for production
)

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint - API status"""
    return {
        "message": "GDNA Baseline Generic API",
        "status": "running",
        "version": VERSION,
        "purpose": "Pure generic backend foundation for infrastructure deployment",
        "type": "generic-infrastructure-backend",
        "note": "No business logic, no storage specifics - extend with your own layers"
    }

@app.get("/health", response_model=Dict[str, Any])
async def health_check():
    """Health check endpoint for infrastructure components"""
    if not health_service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return await health_service.check_health()

@app.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes deployment"""
    if not health_service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    is_ready = await health_service.check_readiness()
    if not is_ready:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    return {"status": "ready"}

@app.get("/config")
async def get_config():
    """Get current configuration (safe, non-sensitive)"""
    if not config_service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return config_service.get_safe_config()

@app.get("/metrics")
async def get_metrics():
    """Get service metrics and performance data"""
    if not metrics_service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    return await metrics_service.get_metrics()

@app.get("/info")
async def get_info():
    """Get service information and capabilities"""
    return {
        "service": "GDNA Baseline Generic Backend",
        "version": VERSION,
        "purpose": "Pure generic backend foundation for infrastructure deployment",
        "type": "generic-infrastructure-backend",
        "capabilities": [
            "Infrastructure health monitoring",
            "Service configuration management",
            "Metrics collection and export",
            "Kubernetes deployment support",
            "Generic service endpoints"
        ],
        "endpoints": {
            "health": "/health - Infrastructure health status",
            "ready": "/ready - Kubernetes readiness probe",
            "config": "/config - Safe configuration access",
            "metrics": "/metrics - Service metrics",
            "docs": "/docs - API documentation (Swagger)",
            "redoc": "/redoc - Alternative API documentation"
        },
        "deployment": {
            "kubernetes": "Ready with health probes",
            "docker": "Containerized and portable",
            "cloud_native": "Designed for cloud deployment",
            "migration_path": "Clear path to AWS native services"
        },
        "extension_layers": {
            "storage": "Add in storage/ folder",
            "lyzr": "Add in lyzr/ folder", 
            "common": "Add in common/ folder",
            "frontend": "Add in pwa-frontend/ folder"
        }
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting generic backend on {host}:{port}")
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info"
    )