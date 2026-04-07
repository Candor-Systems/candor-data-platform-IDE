#!/usr/bin/env python3
"""
Test script for Description-Based Column Mapping System

This script demonstrates the new two-step description generation process:
1. First check JDE configuration for column descriptions
2. If not found, generate AI-based descriptions
3. Use descriptions for column mapping based on similarity
"""

import sys
import os
from typing import List, Dict, Any

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the enhanced mapping functions
try:
    from main import (
        generate_column_description_step_by_step,
        calculate_description_similarity,
        generate_description_based_mappings,
        AIConfig
    )
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the backend directory")
    sys.exit(1)

# Mock data for testing
class MockColumnInfo:
    def __init__(self, name: str, type: str, is_nullable: bool = True, max_length: int = None):
        self.name = name
        self.type = type
        self.isNullable = is_nullable
        self.maxLength = max_length

class MockTableSchema:
    def __init__(self, table_name: str, columns: List[MockColumnInfo]):
        self.tableName = table_name
        self.columns = columns

def test_step_by_step_description_generation():
    """Test the two-step description generation process"""
    print("\n🚀 Testing Step-by-Step Description Generation")
    print("=" * 60)
    
    # Test columns with different scenarios
    test_columns = [
        ("AN8", "INT", False, None),  # Has JDE description
        ("ABALPH", "VARCHAR(40)", True, 40),  # Has JDE description
        ("CUSTOMER_NAME", "VARCHAR(100)", True, 100),  # No JDE description - AI fallback
        ("ORDER_DATE", "DATETIME", False, None),  # No JDE description - AI fallback
        ("TOTAL_AMOUNT", "DECIMAL(10,2)", True, None),  # No JDE description - AI fallback
        ("EMAIL_ADDRESS", "VARCHAR(255)", True, 255),  # No JDE description - AI fallback
        ("PHONE_NUMBER", "VARCHAR(20)", True, 20),  # No JDE description - AI fallback
    ]
    
    ai_config = AIConfig(provider="openai", apiKey="dummy_key_for_testing", model="gpt-4")
    
    for name, col_type, nullable, max_len in test_columns:
        column = MockColumnInfo(name, col_type, nullable, max_len)
        
        # Get JDE description (if exists)
        from main import get_jde_column_description
        jde_desc = get_jde_column_description(name)
        
        # Generate description using step-by-step process
        description = generate_column_description_step_by_step(column, jde_desc, ai_config)
        
        source = "JDE Configuration" if jde_desc else "AI Generated"
        print(f"\n📝 Column: {name} ({col_type})")
        print(f"   Source: {source}")
        print(f"   Description: {description}")
        
        if jde_desc:
            print(f"   JDE Description: {jde_desc[:100]}...")

def test_description_similarity():
    """Test description similarity calculation"""
    print("\n🔍 Testing Description Similarity Calculation")
    print("=" * 60)
    
    # Test pairs of descriptions
    test_pairs = [
        ("Universal party identifier", "Unique identifier for customer records"),
        ("Customer name or business title", "Primary name of the entity"),
        ("Date when the record was created", "Creation timestamp"),
        ("Monetary amount or price value", "Total cost or price"),
        ("Email address for contact purposes", "Business contact email"),
        ("Phone number for contact purposes", "Contact telephone number"),
        ("Address or location information", "Physical address details"),
        ("Status or condition indicator", "Current status field"),
    ]
    
    for desc1, desc2 in test_pairs:
        similarity = calculate_description_similarity(desc1, desc2)
        confidence_level = "🟢 HIGH" if similarity > 0.7 else "🟡 MEDIUM" if similarity > 0.4 else "🟠 LOW"
        print(f"  {confidence_level} {desc1} ↔ {desc2}: {similarity:.3f}")

def test_description_based_mapping():
    """Test the description-based mapping system"""
    print("\n🎯 Testing Description-Based Column Mapping")
    print("=" * 60)
    
    # Create source table with modern column names
    source_columns = [
        MockColumnInfo("customer_id", "INT", False),
        MockColumnInfo("customer_name", "VARCHAR(100)", True, 100),
        MockColumnInfo("email_address", "VARCHAR(255)", True, 255),
        MockColumnInfo("phone_number", "VARCHAR(20)", True, 20),
        MockColumnInfo("order_date", "DATETIME", False),
        MockColumnInfo("total_amount", "DECIMAL(10,2)", True),
        MockColumnInfo("order_status", "VARCHAR(20)", True, 20),
        MockColumnInfo("shipping_address", "VARCHAR(200)", True, 200),
    ]
    
    # Create target table with JDE column names
    target_columns = [
        MockColumnInfo("AN8", "INT", False),  # Address Number
        MockColumnInfo("ALPH", "VARCHAR(40)", True, 40),  # Alpha Name
        MockColumnInfo("EMAL", "VARCHAR(128)", True, 128),  # Email
        MockColumnInfo("PH1", "VARCHAR(20)", True, 20),  # Phone
        MockColumnInfo("DC", "INT", False),  # Date Created
        MockColumnInfo("CRBL", "DECIMAL(15,2)", True),  # Credit Balance
        MockColumnInfo("STTS", "VARCHAR(10)", True, 10),  # Status
        MockColumnInfo("ADD1", "VARCHAR(40)", True, 40),  # Address
    ]
    
    source_table = MockTableSchema("CUSTOMERS_MODERN", source_columns)
    target_table = MockTableSchema("F0101_JDE", target_columns)
    
    print(f"Source Table: {source_table.tableName} ({len(source_table.columns)} columns)")
    print(f"Target Table: {target_table.tableName} ({len(target_table.columns)} columns)")
    
    # Generate description-based mappings
    ai_config = AIConfig(provider="openai", apiKey="dummy_key_for_testing", model="gpt-4")
    mappings = generate_description_based_mappings(source_table, target_table, ai_config)
    
    print(f"\n✅ Generated {len(mappings)} description-based mappings:")
    for mapping in mappings:
        confidence_level = "🟢 HIGH" if mapping.confidence > 0.7 else "🟡 MEDIUM" if mapping.confidence > 0.4 else "🟠 LOW"
        print(f"  {confidence_level} {mapping.sourceColumn} → {mapping.targetColumn} (confidence: {mapping.confidence:.2f})")
        print(f"    Description: {mapping.aiDescription[:100]}...")

def main():
    """Main test function"""
    print("🚀 Description-Based Column Mapping System - Test Suite")
    print("=" * 70)
    
    try:
        # Run all tests
        test_step_by_step_description_generation()
        test_description_similarity()
        test_description_based_mapping()
        
        print("\n✅ All description-based mapping tests completed successfully!")
        print("\n🎉 New Features Demonstrated:")
        print("  ✅ Step-by-step description generation (JDE first, then AI)")
        print("  ✅ Description similarity calculation")
        print("  ✅ Description-based column mapping")
        print("  ✅ Intelligent fallback to AI generation")
        print("  ✅ Business context-aware descriptions")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
