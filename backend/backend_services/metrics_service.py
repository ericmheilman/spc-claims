"""
Metrics service for GDNA Lyzr Baseline
Clean metrics collection for infrastructure monitoring and performance tracking.
"""

import time
import psutil
import asyncio
from typing import Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class MetricsService:
    """Clean metrics collection service"""
    
    def __init__(self, config_service):
        """Initialize metrics service"""
        self.config = config_service
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get comprehensive service metrics"""
        try:
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "service": "gdna-lyzr-baseline-backend",
                "uptime": self._get_uptime(),
                "performance": await self._get_performance_metrics(),
                "requests": self._get_request_metrics(),
                "system": self._get_system_metrics(),
                "infrastructure": await self._get_infrastructure_metrics()
            }
        except Exception as e:
            logger.error(f"Error collecting metrics: {e}")
            return {
                "error": "Failed to collect metrics",
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _get_uptime(self) -> Dict[str, Any]:
        """Get service uptime information"""
        uptime_seconds = time.time() - self.start_time
        return {
            "seconds": int(uptime_seconds),
            "minutes": int(uptime_seconds // 60),
            "hours": int(uptime_seconds // 3600),
            "days": int(uptime_seconds // 86400)
        }
    
    async def _get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance-related metrics"""
        return {
            "memory_usage": psutil.virtual_memory().percent,
            "cpu_usage": psutil.cpu_percent(interval=1),
            "disk_usage": psutil.disk_usage('/').percent,
            "network_io": self._get_network_io()
        }
    
    def _get_request_metrics(self) -> Dict[str, Any]:
        """Get request-related metrics"""
        return {
            "total_requests": self.request_count,
            "error_requests": self.error_count,
            "success_rate": self._calculate_success_rate()
        }
    
    def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system-level metrics"""
        return {
            "python_version": f"{psutil.sys.version_info.major}.{psutil.sys.version_info.minor}.{psutil.sys.version_info.micro}",
            "platform": psutil.sys.platform,
            "process_id": psutil.Process().pid,
            "thread_count": psutil.Process().num_threads()
        }
    
    async def _get_infrastructure_metrics(self) -> Dict[str, Any]:
        """Get infrastructure connectivity metrics"""
        # This would integrate with your health service
        # For now, return basic structure
        return {
            "status": "operational",
            "last_check": datetime.utcnow().isoformat(),
            "components": {
                "databases": "monitored",
                "operators": "monitored",
                "storage": "monitored"
            }
        }
    
    def _get_network_io(self) -> Dict[str, Any]:
        """Get network I/O statistics"""
        try:
            net_io = psutil.net_io_counters()
            return {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            }
        except Exception:
            return {"error": "Unable to collect network metrics"}
    
    def _calculate_success_rate(self) -> float:
        """Calculate request success rate"""
        if self.request_count == 0:
            return 100.0
        return round(((self.request_count - self.error_count) / self.request_count) * 100, 2)
    
    def increment_request_count(self):
        """Increment total request count"""
        self.request_count += 1
    
    def increment_error_count(self):
        """Increment error request count"""
        self.error_count += 1
    
    def get_simple_metrics(self) -> Dict[str, Any]:
        """Get simplified metrics for basic monitoring"""
        return {
            "uptime_seconds": int(time.time() - self.start_time),
            "request_count": self.request_count,
            "error_count": self.error_count,
            "memory_percent": psutil.virtual_memory().percent,
            "cpu_percent": psutil.cpu_percent(interval=1)
        }