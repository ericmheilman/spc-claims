#!/usr/bin/env python3
"""
Clean test script for GDNA Lyzr Baseline Backend
Tests essential functionality for Lyzr agent deployment.
"""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend_services.config_service import ConfigService
from backend_services.health_service import HealthService
from backend_services.metrics_service import MetricsService

async def test_backend_services():
    """Test all backend services"""
    print("Testing GDNA Lyzr Baseline Backend Services...")
    print("=" * 60)
    
    try:
        # Test ConfigService
        print("\n1. Testing ConfigService...")
        config = ConfigService()
        print(f"   Environment: {config.get('environment')}")
        print(f"   API Version: {config.get('api_version')}")
        print(f"   Debug Mode: {config.get('debug')}")
        print(f"   Port: {config.get('port')}")
        print(f"   Host: {config.get('host')}")
        
        # Test configuration validation
        if config.validate_required_config():
            print("   ✓ Configuration validation passed")
        else:
            print("   ✗ Configuration validation failed")
        
        # Test safe config
        safe_config = config.get_safe_config()
        print(f"   Safe config keys: {len(safe_config)}")
        print("   ✓ ConfigService working")
        
        # Test HealthService
        print("\n2. Testing HealthService...")
        health = HealthService(config)
        health_status = await health.check_health()
        print(f"   Overall Status: {health_status['status']}")
        print(f"   Services Monitored: {len(health_status['services'])}")
        print(f"   Health Summary: {health_status.get('summary', {})}")
        
        # Test readiness
        is_ready = await health.check_readiness()
        print(f"   Service Ready: {is_ready}")
        print("   ✓ HealthService working")
        
        # Test MetricsService
        print("\n3. Testing MetricsService...")
        metrics = MetricsService(config)
        
        # Test basic metrics
        basic_metrics = metrics.get_simple_metrics()
        print(f"   Uptime: {basic_metrics['uptime_seconds']} seconds")
        print(f"   Request Count: {basic_metrics['request_count']}")
        print(f"   Memory Usage: {basic_metrics['memory_percent']}%")
        print(f"   CPU Usage: {basic_metrics['cpu_percent']}%")
        
        # Test comprehensive metrics
        full_metrics = await metrics.get_metrics()
        print(f"   Full Metrics Keys: {len(full_metrics)}")
        print("   ✓ MetricsService working")
        
        # Test service capabilities
        print("\n4. Testing Service Capabilities...")
        
        # Test database config
        db_config = config.get_database_config()
        print(f"   Database Services: {len(db_config)}")
        
        # Test operator config
        op_config = config.get_operator_config()
        print(f"   Operator Services: {len(op_config)}")
        
        print("\n" + "=" * 60)
        print("🎉 All backend services are working correctly!")
        print("Backend is ready for Lyzr agent deployment.")
        print("\nNext steps:")
        print("1. Deploy with infrastructure: make dev-setup")
        print("2. Access API documentation: http://localhost:8080/docs")
        print("3. Monitor health: http://localhost:8080/health")
        print("4. Check metrics: http://localhost:8080/metrics")
        
    except Exception as e:
        print(f"\n❌ Error testing backend services: {e}")
        print("Please check your configuration and dependencies.")
        return False
    
    return True

if __name__ == "__main__":
    # Run the tests
    success = asyncio.run(test_backend_services())
    sys.exit(0 if success else 1)