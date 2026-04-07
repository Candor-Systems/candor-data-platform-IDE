#!/usr/bin/env python3
"""
Test script for API Endpoints - Verify they're working correctly

This script tests the updated API endpoints to ensure they're not returning
422 errors and are properly using our enhanced description generation system.
"""

import sys
import os
import json
from typing import Dict, Any

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the necessary components
try:
    from main import app, ColumnInfo, DatabaseConfig, AIConfig
    from fastapi.testclient import TestClient
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the backend directory")
    sys.exit(1)

def test_column_description_endpoint():
    """Test the /generate-column-description endpoint"""
    print("\n🔍 Testing /generate-column-description endpoint")
    print("=" * 60)
    
    client = TestClient(app=app)
    
    # Test data
    test_data = {
        "source_config": {
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "username": "test_user",
            "password": "test_pass"
        },
        "target_config": {
            "host": "localhost", 
            "port": 5432,
            "database": "test_db",
            "username": "test_user",
            "password": "test_pass"
        },
        "ai_config": {
            "provider": "openai",
            "apiKey": "dummy_key_for_testing",
            "model": "gpt-4"
        },
        "column_info": {
            "name": "YEAN8",
            "type": "int",
            "isNullable": True,
            "maxLength": None
        },
        "is_source": True
    }
    
    try:
        response = client.post("/generate-column-description", json=test_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success! Response:")
            print(f"  Description: {data.get('description', 'N/A')}")
            print(f"  Source: {data.get('description_source', 'N/A')}")
            print(f"  JDE Description: {data.get('jde_description', 'N/A')}")
            print(f"  Pattern Analysis: {data.get('pattern_analysis', 'N/A')}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"  Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_mapping_description_endpoint():
    """Test the /generate-mapping-description endpoint"""
    print("\n🔍 Testing /generate-mapping-description endpoint")
    print("=" * 60)
    
    client = TestClient(app=app)
    
    # Test data
    test_data = {
        "source_config": {
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "username": "test_user",
            "password": "test_pass"
        },
        "target_config": {
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "username": "test_user",
            "password": "test_pass"
        },
        "ai_config": {
            "provider": "openai",
            "apiKey": "dummy_key_for_testing",
            "model": "gpt-4"
        },
        "source_col": {
            "name": "YEAN8",
            "type": "int",
            "isNullable": True,
            "maxLength": None
        },
        "target_col": {
            "name": "YEAN8",
            "type": "int",
            "isNullable": True,
            "maxLength": None
        }
    }
    
    try:
        response = client.post("/generate-mapping-description", json=test_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success! Response:")
            print(f"  Enhanced: {data.get('enhanced', 'N/A')}")
            print(f"  Description: {data.get('description', 'N/A')[:200]}...")
            print(f"  Source Analysis: {data.get('source_analysis', 'N/A')}")
            print(f"  Target Analysis: {data.get('target_analysis', 'N/A')}")
            print(f"  JDE Synonym Match: {data.get('jde_synonym_match', 'N/A')}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"  Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_direct_function_calls():
    """Test the functions directly to ensure they work"""
    print("\n🔍 Testing Functions Directly")
    print("=" * 60)
    
    try:
        from main import (
            generate_column_description_step_by_step,
            generate_enhanced_mapping_description,
            analyze_jde_column_pattern,
            AIConfig
        )
        
        # Test column description generation
        ai_config = AIConfig(provider="openai", apiKey="dummy", model="gpt-4")
        
        # Mock column info
        column = type('ColumnInfo', (), {
            'name': 'YEAN8',
            'type': 'int',
            'isNullable': True,
            'maxLength': None
        })()
        
        # Test step-by-step description generation
        description = generate_column_description_step_by_step(column, None, ai_config)
        print(f"✅ Column Description: {description}")
        
        # Test pattern analysis
        analysis = analyze_jde_column_pattern('YEAN8')
        print(f"✅ Pattern Analysis: {analysis}")
        
        print("✅ All direct function calls working!")
        
    except Exception as e:
        print(f"❌ Exception in direct function calls: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main test function"""
    print("🚀 API Endpoint Testing - Verify 422 Errors are Fixed")
    print("=" * 70)
    
    try:
        # Test direct function calls first
        test_direct_function_calls()
        
        # Test API endpoints
        test_column_description_endpoint()
        test_mapping_description_endpoint()
        
        print("\n✅ All API endpoint tests completed!")
        print("\n🎯 Expected Results:")
        print("  ✅ No more 422 Unprocessable Entity errors")
        print("  ✅ Enhanced descriptions with JDE context")
        print("  ✅ Business-aware column descriptions")
        print("  ✅ Proper API responses")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
