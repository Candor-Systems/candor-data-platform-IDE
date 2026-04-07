#!/usr/bin/env python3
"""
Test script for the generate-column-description endpoint
"""

import requests
import json

def test_generate_column_description():
    """Test the generate-column-description endpoint"""
    url = 'http://localhost:8000/generate-column-description'
    
    # Test data - using a column that should trigger FLAN-T5
    data = {
        'column_info': {
            'name': 'CUSTOMER_EMAIL',
            'type': 'VARCHAR(255)'
        },
        'ai_config': {
            'flan_t5_model_name': 'google/flan-t5-base',
            'flan_t5_device': 'auto'
        }
    }
    
    try:
        print("🧪 Testing generate-column-description endpoint...")
        print(f"📤 Sending request to: {url}")
        print(f"📋 Request data: {json.dumps(data, indent=2)}")
        
        response = requests.post(url, json=data)
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success!")
            print(f"📝 Description: {result['description']}")
            print(f"🔍 Source: {result['description_source']}")
            print(f"🤖 AI Status: {result['ai_status']}")
            return True
        else:
            print(f"❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

if __name__ == "__main__":
    success = test_generate_column_description()
    if success:
        print("\n🎉 Test passed!")
    else:
        print("\n⚠️ Test failed!")
