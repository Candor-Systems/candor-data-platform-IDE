#!/usr/bin/env python3
"""
Test script for JDE configuration file encoding fix

This script tests the enhanced JDE configuration loading with encoding fallback
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_jde_config_loading():
    """Test JDE configuration loading with encoding fallback"""
    
    print("🧪 Testing JDE Configuration Loading")
    print("=" * 50)
    
    try:
        # Import the functions
        from main import load_jde_config, fix_jde_config_encoding, get_jde_column_description
        
        print("✅ Successfully imported JDE functions")
        
        # Test configuration loading
        print("\n📖 Loading JDE configuration...")
        config = load_jde_config()
        
        print(f"✅ Configuration loaded successfully!")
        print(f"   📊 Synonym groups: {len(config.get('synonym_groups', []))}")
        print(f"   📝 Descriptions: {len(config.get('descriptions', {}))}")
        print(f"   🗃️ JDE System 00: {len(config.get('jde_system_00', {}))}")
        print(f"   🏢 Business Unit: {len(config.get('jde_business_unit', {}))}")
        
        # Test specific column lookups
        print("\n🔍 Testing column description lookups...")
        
        test_columns = [
            "ABAN8",      # Should be in JDE config
            "ABALPH",     # Should be in JDE config
            "ABMCU",      # Should be in JDE config
            "UNKNOWN"     # Should return None
        ]
        
        for col in test_columns:
            desc = get_jde_column_description(col)
            if desc:
                print(f"   ✅ {col}: {desc}")
            else:
                print(f"   ❌ {col}: No description found")
        
        print("\n✅ JDE configuration loading test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ JDE configuration loading test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_encoding_fix():
    """Test the encoding fix function"""
    
    print("\n🔧 Testing JDE Configuration Encoding Fix")
    print("=" * 50)
    
    try:
        from main import fix_jde_config_encoding
        
        print("🔧 Attempting to fix JDE config file encoding...")
        result = fix_jde_config_encoding()
        
        if result:
            print("✅ Encoding fix completed successfully!")
        else:
            print("⚠️ Encoding fix completed with warnings")
        
        return result
        
    except Exception as e:
        print(f"❌ Encoding fix test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 JDE Configuration Encoding Test Suite")
    print("=" * 60)
    
    # Test encoding fix first
    encoding_fixed = test_encoding_fix()
    
    # Test configuration loading
    config_loaded = test_jde_config_loading()
    
    print("\n📋 Test Results Summary")
    print("-" * 30)
    print(f"🔧 Encoding Fix: {'✅ PASS' if encoding_fixed else '❌ FAIL'}")
    print(f"📖 Config Loading: {'✅ PASS' if config_loaded else '❌ FAIL'}")
    
    if encoding_fixed and config_loaded:
        print("\n🎉 All tests passed! JDE configuration is working correctly.")
    else:
        print("\n⚠️ Some tests failed. Check the output above for details.")
