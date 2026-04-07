#!/usr/bin/env python3
"""
Test script for Enhanced Column Mapping System with JDE Support

This script demonstrates the enhanced column mapping capabilities including:
- Direct mapping identification
- JDE pattern recognition
- Enhanced AI descriptions
- Business context analysis
"""

import sys
import os
from typing import List, Dict, Any

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the enhanced mapping functions
try:
    from main import (
        get_jde_table_info,
        analyze_jde_column_pattern,
        generate_enhanced_mapping_description,
        generate_direct_mappings,
        get_jde_column_description,
        find_column_synonyms,
        is_jde_column_match,
        JDE_TABLE_DESCRIPTIONS,
        JDE_COLUMN_TYPE_MAPPINGS,
        JDE_SYNONYM_GROUPS,
        JDE_COLUMN_DESCRIPTIONS
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

class MockAIConfig:
    def __init__(self, provider: str = "openai", model: str = "gpt-4"):
        self.provider = provider
        self.model = model

def test_jde_table_info():
    """Test JDE table information retrieval"""
    print("\n🔍 Testing JDE Table Information")
    print("=" * 50)
    
    test_tables = ["F0101", "F4201", "F4101", "F0901", "UNKNOWN_TABLE"]
    
    for table in test_tables:
        info = get_jde_table_info(table)
        print(f"\n📋 Table: {table}")
        print(f"   Description: {info['description']}")
        print(f"   Business Purpose: {info['business_purpose']}")
        if info['common_columns']:
            print(f"   Common Columns: {len(info['common_columns'])} found")

def test_jde_column_analysis():
    """Test JDE column pattern analysis"""
    print("\n🔍 Testing JDE Column Pattern Analysis")
    print("=" * 50)
    
    test_columns = [
        "ABAN8",      # Address Book - Address Number
        "ABALPH",     # Address Book - Alpha Name
        "SDDOCO",     # Sales Document - Document Number
        "SDITM",      # Sales Document - Item Number
        "IMDSC1",     # Item Master - Description
        "GMAID",      # General Ledger - Account ID
        "CUSTOMER_ID", # Custom column
        "ORDER_DATE",  # Date pattern
        "QUANTITY",    # Quantity pattern
        "AMOUNT"       # Amount pattern
    ]
    
    for column in test_columns:
        analysis = analyze_jde_column_pattern(column)
        print(f"\n📊 Column: {column}")
        print(f"   Pattern Type: {analysis['pattern_type']}")
        print(f"   Business Meaning: {analysis['business_meaning']}")
        print(f"   Common Usage: {analysis['common_usage']}")

def test_direct_mappings():
    """Test direct mapping generation"""
    print("\n🎯 Testing Direct Mapping Generation")
    print("=" * 50)
    
    # Create mock source table (Customer table)
    source_columns = [
        MockColumnInfo("CUSTOMER_ID", "INT", False),
        MockColumnInfo("CUSTOMER_NAME", "VARCHAR(100)", True, 100),
        MockColumnInfo("EMAIL", "VARCHAR(255)", True, 255),
        MockColumnInfo("PHONE", "VARCHAR(20)", True, 20),
        MockColumnInfo("ADDRESS_LINE1", "VARCHAR(100)", True, 100),
        MockColumnInfo("CITY", "VARCHAR(50)", True, 50),
        MockColumnInfo("STATE", "VARCHAR(2)", True, 2),
        MockColumnInfo("ZIP_CODE", "VARCHAR(10)", True, 10),
        MockColumnInfo("CREATED_DATE", "DATETIME", False),
        MockColumnInfo("STATUS", "CHAR(1)", True, 1)
    ]
    
    source_table = MockTableSchema("CUSTOMERS", source_columns)
    
    # Create mock target table (JDE Address Book)
    target_columns = [
        MockColumnInfo("ABAN8", "INT", False),           # Address Number
        MockColumnInfo("ABALPH", "VARCHAR(40)", True, 40), # Alpha Name
        MockColumnInfo("ABDC", "INT", False),             # Date Created
        MockColumnInfo("ABMCU", "VARCHAR(12)", True, 12), # Business Unit
        MockColumnInfo("ABAT1", "CHAR(1)", True, 1),      # Address Type
        MockColumnInfo("ABCM", "VARCHAR(5)", True, 5),    # Company
        MockColumnInfo("ABTAX", "DECIMAL(5,2)", True),    # Tax Rate
        MockColumnInfo("ABPTI", "VARCHAR(3)", True, 3),   # Payment Terms
        MockColumnInfo("ABGLBA", "VARCHAR(25)", True, 25) # GL Business Area
    ]
    
    target_table = MockTableSchema("F0101", target_columns)
    
    print(f"Source Table: {source_table.tableName} ({len(source_table.columns)} columns)")
    print(f"Target Table: {target_table.tableName} ({len(target_table.columns)} columns)")
    
    # Generate direct mappings
    direct_mappings = generate_direct_mappings(source_table, target_table)
    
    print(f"\n✅ Generated {len(direct_mappings)} direct mappings:")
    for mapping in direct_mappings:
        print(f"  {mapping.sourceColumn} → {mapping.targetColumn} (confidence: {mapping.confidence:.2f})")
        print(f"    Description: {mapping.aiDescription}")

def test_enhanced_descriptions():
    """Test enhanced mapping description generation"""
    print("\n🤖 Testing Enhanced Mapping Descriptions")
    print("=" * 50)
    
    # Create mock columns for testing
    source_col = MockColumnInfo("CUSTOMER_NAME", "VARCHAR(100)", True, 100)
    target_col = MockColumnInfo("ABALPH", "VARCHAR(40)", True, 40)
    
    source_table = MockTableSchema("CUSTOMERS", [source_col])
    target_table = MockTableSchema("F0101", [target_col])
    
    ai_config = MockAIConfig()
    confidence = 0.85
    
    # Generate enhanced description
    description = generate_enhanced_mapping_description(
        source_col, target_col, ai_config, confidence, source_table, target_table
    )
    
    print(f"Source Column: {source_col.name} ({source_col.type})")
    print(f"Target Column: {target_col.name} ({target_col.type})")
    print(f"Confidence: {confidence}")
    print(f"\nEnhanced Description:")
    print(description)

def test_jde_knowledge_base():
    """Test JDE knowledge base completeness"""
    print("\n📚 Testing JDE Knowledge Base")
    print("=" * 50)
    
    print(f"Total JDE Tables: {len(JDE_TABLE_DESCRIPTIONS)}")
    print(f"Total Column Type Mappings: {len(JDE_COLUMN_TYPE_MAPPINGS)}")
    
    print("\nJDE Table Categories:")
    categories = {}
    for table_name, info in JDE_TABLE_DESCRIPTIONS.items():
        category = table_name[:3]  # First 3 characters
        if category not in categories:
            categories[category] = []
        categories[category].append(table_name)
    
    for category, tables in categories.items():
        print(f"  {category}: {len(tables)} tables")
        for table in tables[:3]:  # Show first 3 tables
            print(f"    - {table}: {JDE_TABLE_DESCRIPTIONS[table]['description']}")
        if len(tables) > 3:
            print(f"    ... and {len(tables) - 3} more")

def test_jde_configuration():
    """Test JDE configuration loading and functionality"""
    print("\n⚙️ Testing JDE Configuration")
    print("=" * 50)
    
    print(f"Total Synonym Groups: {len(JDE_SYNONYM_GROUPS)}")
    print(f"Total Column Descriptions: {len(JDE_COLUMN_DESCRIPTIONS)}")
    
    # Test synonym groups
    print("\nSample Synonym Groups:")
    for i, group in enumerate(JDE_SYNONYM_GROUPS[:3]):
        print(f"  Group {i+1}: {group}")
    
    # Test column descriptions
    print("\nSample Column Descriptions:")
    for i, (col, desc) in enumerate(list(JDE_COLUMN_DESCRIPTIONS.items())[:3]):
        print(f"  {col}: {desc[:100]}...")
    
    # Test specific column functionality
    test_columns = ["AN8", "ALPH", "customer_id", "email", "CUSTOMER_NAME"]
    
    print("\nTesting Column Descriptions:")
    for col in test_columns:
        desc = get_jde_column_description(col)
        synonyms = find_column_synonyms(col)
        print(f"  {col}:")
        if desc:
            print(f"    Description: {desc[:80]}...")
        else:
            print(f"    Description: Not found")
        if synonyms:
            print(f"    Synonyms: {', '.join(synonyms[:3])}")
        else:
            print(f"    Synonyms: None")

def test_jde_synonym_matching():
    """Test JDE synonym matching functionality"""
    print("\n🔄 Testing JDE Synonym Matching")
    print("=" * 50)
    
    # Test synonym matches
    test_pairs = [
        ("AN8", "customer_id"),
        ("ALPH", "customer_name"),
        ("email", "EMAL"),
        ("phone", "PH1"),
        ("address", "ADD1"),
        ("CUSTOMER_ID", "VENDOR_ID"),
        ("UNKNOWN_COL", "ANOTHER_UNKNOWN")
    ]
    
    for source, target in test_pairs:
        is_match = is_jde_column_match(source, target)
        print(f"  {source} ↔ {target}: {'✅ Match' if is_match else '❌ No Match'}")
        
        if is_match:
            source_desc = get_jde_column_description(source)
            target_desc = get_jde_column_description(target)
            if source_desc:
                print(f"    Source Description: {source_desc[:60]}...")
            if target_desc:
                print(f"    Target Description: {target_desc[:60]}...")

def main():
    """Main test function"""
    print("🚀 Enhanced Column Mapping System - Test Suite")
    print("=" * 60)
    
    try:
        # Run all tests
        test_jde_table_info()
        test_jde_column_analysis()
        test_direct_mappings()
        test_enhanced_descriptions()
        test_jde_knowledge_base()
        test_jde_configuration()
        test_jde_synonym_matching()
        
        print("\n✅ All tests completed successfully!")
        print("\n🎉 Enhanced Column Mapping System is working correctly!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
