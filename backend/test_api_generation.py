#!/usr/bin/env python3
"""
Test script for API generation functionality.
"""

import sys
import os

# Add parent directory to path for common imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

try:
    from common.data_models import get_all_models
    
    print("🔧 Testing API generation from data models...")
    print()
    
    models = get_all_models()
    print(f"📋 Found {len(models)} registered data models:")
    
    for name, model_class in models.items():
        collection = model_class.get_collection_name()
        prefix = model_class.get_api_prefix()
        print(f"   - {name}: {prefix} → {collection} collection")
    
    print()
    print("✅ API endpoints will be auto-generated for these models")
    print("🚀 Start the backend to see generated routes: make run-backend")
    print("📖 View API docs at: http://localhost:8080/docs")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Make sure the common/data_models package is properly set up")
except Exception as e:
    print(f"❌ Error: {e}")
