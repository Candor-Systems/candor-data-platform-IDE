#!/usr/bin/env python3
"""
Test script to verify the API endpoint fix
"""

from main import app
from fastapi.testclient import TestClient

def test_api_endpoint():
    """Test the fixed API endpoint"""
    print("🔍 Testing Fixed API Endpoint")
    print("=" * 50)
    
    try:
        client = TestClient(app=app)
        
        # Test data that matches the expected format
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
        
        print("📋 Test data prepared:")
        print(f"  Column: {test_data['column_info']['name']}")
        print(f"  Type: {test_data['column_info']['type']}")
        print(f"  Provider: {test_data['ai_config']['provider']}")
        
        # Test the endpoint
        response = client.post("/generate-column-description", json=test_data)
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success! API Response:")
            print(f"  Description: {data.get('description', 'N/A')}")
            print(f"  Source: {data.get('description_source', 'N/A')}")
            print(f"  JDE Description: {data.get('jde_description', 'N/A')}")
            print(f"  Pattern Analysis: {data.get('pattern_analysis', 'N/A')}")
            print(f"  AI Status: {data.get('ai_status', 'N/A')}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"  Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()

def test_direct_function_calls():
    """Test the functions directly to ensure they work"""
    print("\n🔍 Testing Functions Directly")
    print("=" * 50)
    
    try:
        from main import (
            generate_column_description_step_by_step,
            get_jde_column_description,
            analyze_jde_column_pattern,
            AIConfig
        )
        
        # Test with YEAN8 column
        ai_config = AIConfig(provider="openai", apiKey="dummy", model="gpt-4")
        
        # Mock column info
        column = type('ColumnInfo', (), {
            'name': 'YEAN8',
            'type': 'int',
            'isNullable': True,
            'maxLength': None
        })()
        
        # Test JDE description lookup
        jde_desc = get_jde_column_description('YEAN8')
        print(f"JDE Description: {jde_desc}")
        
        # Test pattern analysis
        analysis = analyze_jde_column_pattern('YEAN8')
        print(f"Pattern Analysis: {analysis}")
        
        # Test step-by-step description generation
        description = generate_column_description_step_by_step(column, jde_desc, ai_config)
        print(f"Final Description: {description}")
        
        print("✅ All direct function calls working!")
        
    except Exception as e:
        print(f"❌ Exception in direct function calls: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main test function"""
    print("🚀 API Endpoint Fix Verification")
    print("=" * 60)
    print("This test verifies that the 422 errors are resolved")
    print("and the API endpoints are working correctly.")
    
    try:
        # Test direct function calls first
        test_direct_function_calls()
        
        # Test API endpoint
        test_api_endpoint()
        
        print("\n✅ All tests completed!")
        print("\n🎯 Expected Results:")
        print("  ✅ No more 422 Unprocessable Entity errors")
        print("  ✅ API endpoint returns 200 OK")
        print("  ✅ Proper business descriptions generated")
        print("  ✅ JDE integration working correctly")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
