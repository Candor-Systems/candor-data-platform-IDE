"""
Test script for FLAN-T5 Local Model Integration

This script tests the FLAN-T5 local model integration with the description generation workflow.
"""

import sys
import os
import asyncio
from typing import Dict, Any

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flan_t5_service import get_flan_t5_service, cleanup_flan_t5_service
from main import AIConfig, ColumnInfo, TableSchema, process_column_description

def test_flan_t5_service():
    """Test the FLAN-T5 service directly"""
    print("🧪 Testing FLAN-T5 Service Directly")
    print("=" * 50)
    
    try:
        # Initialize service
        service = get_flan_t5_service("google/flan-t5-base")
        
        # Test model loading
        print("📥 Loading FLAN-T5 model...")
        if service.load_model():
            print("✅ Model loaded successfully")
            
            # Test description generation
            test_columns = [
                ("CUSTOMER_ID", "VARCHAR(50)", "Customer identification number"),
                ("EMAIL_ADDRESS", "VARCHAR(255)", "Customer email for communication"),
                ("ORDER_DATE", "DATE", "Date when the order was placed"),
                ("TOTAL_AMOUNT", "DECIMAL(10,2)", "Total monetary value of the order"),
                ("STATUS_CODE", "CHAR(1)", "Current status of the record")
            ]
            
            print("\n🔍 Testing column description generation:")
            for col_name, col_type, expected_context in test_columns:
                print(f"\n  Testing: {col_name} ({col_type})")
                description = service.generate_description(col_name, col_type, expected_context)
                if description:
                    print(f"    ✅ Generated: {description}")
                else:
                    print(f"    ❌ Failed to generate description")
            
            # Test mapping description generation
            print("\n🔗 Testing mapping description generation:")
            mapping_desc = service.generate_mapping_description(
                "CUSTOMER_ID", "CUST_ID", 
                "Customer identification number", 
                "Customer identifier"
            )
            if mapping_desc:
                print(f"    ✅ Generated mapping: {mapping_desc}")
            else:
                print(f"    ❌ Failed to generate mapping description")
            
            # Get model info
            model_info = service.get_model_info()
            print(f"\n📊 Model Info: {model_info}")
            
        else:
            print("❌ Failed to load model")
            return False
            
    except Exception as e:
        print(f"❌ Error testing FLAN-T5 service: {str(e)}")
        return False
    finally:
        # Cleanup
        cleanup_flan_t5_service()
    
    return True

def test_integration_with_workflow():
    """Test FLAN-T5 integration with the description generation workflow"""
    print("\n🧪 Testing FLAN-T5 Integration with Workflow")
    print("=" * 50)
    
    try:
        # Create test AI config with FLAN-T5 local as only provider
        ai_config = AIConfig(
            provider="flan-t5-local",
            apiKey="",  # Not needed for local model
            model="google/flan-t5-base",
            useOfflineOnly=True,
            flan_t5_model_name="google/flan-t5-base",
            flan_t5_device="auto",
            provider_priority=["flan-t5-local", "pattern_fallback"]
        )
        
        # Create test columns
        test_columns = [
            ColumnInfo(name="USER_ID", type="INTEGER", isNullable=False),
            ColumnInfo(name="USERNAME", type="VARCHAR(50)", isNullable=False),
            ColumnInfo(name="CREATED_AT", type="TIMESTAMP", isNullable=False),
            ColumnInfo(name="IS_ACTIVE", type="BOOLEAN", isNullable=False),
            ColumnInfo(name="LAST_LOGIN", type="DATETIME", isNullable=True)
        ]
        
        print("🔍 Testing column description processing:")
        for col in test_columns:
            print(f"\n  Processing: {col.name} ({col.type})")
            result = process_column_description(col, "users", ai_config)
            
            print(f"    Description: {result['description']}")
            print(f"    Source: {result['description_source']}")
            print(f"    Status: {result['status']}")
            
            if result['description']:
                print(f"    ✅ Success")
            else:
                print(f"    ❌ Failed")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing workflow integration: {str(e)}")
        return False

def test_ai_config_validation():
    """Test AI configuration validation"""
    print("\n🧪 Testing AI Configuration")
    print("=" * 50)
    
    try:
        # Test default configuration
        config = AIConfig(
            provider="flan-t5-local",
            apiKey="",
            model="google/flan-t5-base"
        )
        
        print(f"✅ Default config created successfully")
        print(f"   Provider: {config.provider}")
        print(f"   Model: {config.model}")
        print(f"   FLAN-T5 Model: {config.flan_t5_model_name}")
        print(f"   Device: {config.flan_t5_device}")
        print(f"   Provider Priority: {config.provider_priority}")
        
        # Test custom configuration
        custom_config = AIConfig(
            provider="flan-t5-local",
            apiKey="",
            model="google/flan-t5-large",
            flan_t5_model_name="google/flan-t5-large",
            flan_t5_device="cuda",
            flan_t5_temperature=0.8,
            flan_t5_max_length=150
        )
        
        print(f"\n✅ Custom config created successfully")
        print(f"   FLAN-T5 Model: {custom_config.flan_t5_model_name}")
        print(f"   Device: {custom_config.flan_t5_device}")
        print(f"   Temperature: {custom_config.flan_t5_temperature}")
        print(f"   Max Length: {custom_config.flan_t5_max_length}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing AI configuration: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 FLAN-T5 Local Model Integration Tests")
    print("=" * 60)
    
    tests = [
        ("AI Configuration Validation", test_ai_config_validation),
        ("FLAN-T5 Service Direct", test_flan_t5_service),
        ("Workflow Integration", test_integration_with_workflow)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            success = test_func()
            results.append((test_name, success))
            if success:
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"❌ {test_name} ERROR: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"  {test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! FLAN-T5 integration is working correctly.")
    else:
        print("⚠️ Some tests failed. Please check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
