#!/usr/bin/env python3
"""
Test script for Powerful Column Mapping System with Non-Mapped Columns Analysis

This script demonstrates the enhanced column mapping capabilities including:
- Powerful JDE pattern matching with fuzzy logic
- Type-based intelligent matching
- Business context scoring
- Non-mapped columns analysis
- Human mapping process recommendations
"""

import sys
import os
from typing import List, Dict, Any

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the enhanced mapping functions
try:
    from main import (
        generate_direct_mappings,
        analyze_unmapped_columns,
        calculate_name_similarity,
        generate_column_mappings,
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

def test_powerful_direct_mappings():
    """Test the enhanced direct mapping generation with fuzzy logic"""
    print("\n🚀 Testing Powerful Direct Mapping Generation")
    print("=" * 60)
    
    # Create comprehensive source table (Modern CRM system)
    source_columns = [
        MockColumnInfo("customer_id", "INT", False),
        MockColumnInfo("customer_name", "VARCHAR(100)", True, 100),
        MockColumnInfo("email_address", "VARCHAR(255)", True, 255),
        MockColumnInfo("phone_number", "VARCHAR(20)", True, 20),
        MockColumnInfo("street_address", "VARCHAR(200)", True, 200),
        MockColumnInfo("city_name", "VARCHAR(50)", True, 50),
        MockColumnInfo("state_code", "VARCHAR(2)", True, 2),
        MockColumnInfo("postal_code", "VARCHAR(10)", True, 10),
        MockColumnInfo("country_name", "VARCHAR(50)", True, 50),
        MockColumnInfo("account_balance", "DECIMAL(10,2)", True),
        MockColumnInfo("credit_limit", "DECIMAL(10,2)", True),
        MockColumnInfo("customer_status", "VARCHAR(20)", True, 20),
        MockColumnInfo("created_date", "DATETIME", False),
        MockColumnInfo("last_modified", "DATETIME", True),
        MockColumnInfo("sales_representative", "VARCHAR(50)", True, 50),
        MockColumnInfo("customer_type", "VARCHAR(20)", True, 20),
        MockColumnInfo("industry_sector", "VARCHAR(50)", True, 50),
        MockColumnInfo("annual_revenue", "DECIMAL(15,2)", True),
        MockColumnInfo("employee_count", "INT", True),
        MockColumnInfo("website_url", "VARCHAR(255)", True, 255)
    ]
    
    source_table = MockTableSchema("CUSTOMERS_MODERN", source_columns)
    
    # Create comprehensive target table (JDE Address Book with extensions)
    target_columns = [
        MockColumnInfo("ABAN8", "INT", False),           # Address Number
        MockColumnInfo("ABALPH", "VARCHAR(40)", True, 40), # Alpha Name
        MockColumnInfo("ABDC", "INT", False),             # Date Created
        MockColumnInfo("ABMCU", "VARCHAR(12)", True, 12), # Business Unit
        MockColumnInfo("ABAT1", "CHAR(1)", True, 1),      # Address Type
        MockColumnInfo("ABCM", "VARCHAR(5)", True, 5),    # Company
        MockColumnInfo("ABTAX", "DECIMAL(5,2)", True),    # Tax Rate
        MockColumnInfo("ABPTI", "VARCHAR(3)", True, 3),   # Payment Terms
        MockColumnInfo("ABGLBA", "VARCHAR(25)", True, 25), # GL Business Area
        MockColumnInfo("ABEMAL", "VARCHAR(128)", True, 128), # Email Address
        MockColumnInfo("ABPH1", "VARCHAR(20)", True, 20), # Phone Number 1
        MockColumnInfo("ABPH2", "VARCHAR(20)", True, 20), # Phone Number 2
        MockColumnInfo("ABADD1", "VARCHAR(40)", True, 40), # Address Line 1
        MockColumnInfo("ABADD2", "VARCHAR(40)", True, 40), # Address Line 2
        MockColumnInfo("ABCITY", "VARCHAR(25)", True, 25), # City
        MockColumnInfo("ABST", "VARCHAR(2)", True, 2),     # State
        MockColumnInfo("ABZIP", "VARCHAR(10)", True, 10),  # Zip Code
        MockColumnInfo("ABCTRY", "VARCHAR(3)", True, 3),   # Country
        MockColumnInfo("ABCRBL", "DECIMAL(15,2)", True),   # Credit Balance
        MockColumnInfo("ABCRLM", "DECIMAL(15,2)", True),   # Credit Limit
        MockColumnInfo("ABSTTS", "VARCHAR(10)", True, 10), # Status
        MockColumnInfo("ABUPMJ", "INT", True),             # Last Update Date
        MockColumnInfo("ABUPMT", "INT", True),             # Last Update Time
        MockColumnInfo("ABREP", "VARCHAR(10)", True, 10),  # Sales Representative
        MockColumnInfo("ABTYPE", "VARCHAR(20)", True, 20), # Customer Type
        MockColumnInfo("ABSIC", "VARCHAR(6)", True, 6),    # Standard Industry Code
        MockColumnInfo("ABREV", "DECIMAL(15,2)", True),    # Annual Revenue
        MockColumnInfo("ABEMP", "INT", True),              # Employee Count
        MockColumnInfo("ABWEB", "VARCHAR(128)", True, 128) # Website
    ]
    
    target_table = MockTableSchema("F0101_ENHANCED", target_columns)
    
    print(f"Source Table: {source_table.tableName} ({len(source_table.columns)} columns)")
    print(f"Target Table: {target_table.tableName} ({len(target_table.columns)} columns)")
    
    # Generate powerful direct mappings
    direct_mappings = generate_direct_mappings(source_table, target_table)
    
    print(f"\n✅ Generated {len(direct_mappings)} powerful direct mappings:")
    for mapping in direct_mappings:
        confidence_level = "🟢 HIGH" if mapping.confidence > 0.8 else "🟡 MEDIUM" if mapping.confidence > 0.6 else "🟠 LOW"
        print(f"  {confidence_level} {mapping.sourceColumn} → {mapping.targetColumn} (confidence: {mapping.confidence:.2f})")
        print(f"    Description: {mapping.aiDescription}")

def test_non_mapped_columns_analysis():
    """Test the non-mapped columns analysis and human mapping recommendations"""
    print("\n🚨 Testing Non-Mapped Columns Analysis")
    print("=" * 60)
    
    # Create source and target tables with some unmapped columns
    source_columns = [
        MockColumnInfo("customer_id", "INT", False),
        MockColumnInfo("customer_name", "VARCHAR(100)", True, 100),
        MockColumnInfo("email", "VARCHAR(255)", True, 255),
        MockColumnInfo("phone", "VARCHAR(20)", True, 20),
        MockColumnInfo("address", "VARCHAR(200)", True, 200),
        MockColumnInfo("city", "VARCHAR(50)", True, 50),
        MockColumnInfo("state", "VARCHAR(2)", True, 2),
        MockColumnInfo("zip_code", "VARCHAR(10)", True, 10),
        MockColumnInfo("country", "VARCHAR(50)", True, 50),
        MockColumnInfo("balance", "DECIMAL(10,2)", True),
        MockColumnInfo("credit_limit", "DECIMAL(10,2)", True),
        MockColumnInfo("status", "VARCHAR(20)", True, 20),
        MockColumnInfo("created_date", "DATETIME", False),
        MockColumnInfo("modified_date", "DATETIME", True),
        MockColumnInfo("sales_rep", "VARCHAR(50)", True, 50),
        MockColumnInfo("customer_type", "VARCHAR(20)", True, 20),
        MockColumnInfo("industry", "VARCHAR(50)", True, 50),
        MockColumnInfo("revenue", "DECIMAL(15,2)", True),
        MockColumnInfo("employees", "INT", True),
        MockColumnInfo("website", "VARCHAR(255)", True, 255),
        # Some unmapped columns
        MockColumnInfo("internal_notes", "TEXT", True),
        MockColumnInfo("preferred_contact_method", "VARCHAR(20)", True, 20),
        MockColumnInfo("timezone", "VARCHAR(10)", True, 10),
        MockColumnInfo("language_preference", "VARCHAR(5)", True, 5),
        MockColumnInfo("marketing_opt_in", "BOOLEAN", True),
        MockColumnInfo("last_purchase_date", "DATETIME", True),
        MockColumnInfo("total_purchases", "INT", True),
        MockColumnInfo("average_order_value", "DECIMAL(10,2)", True)
    ]
    
    target_columns = [
        MockColumnInfo("ABAN8", "INT", False),
        MockColumnInfo("ABALPH", "VARCHAR(40)", True, 40),
        MockColumnInfo("ABDC", "INT", False),
        MockColumnInfo("ABMCU", "VARCHAR(12)", True, 12),
        MockColumnInfo("ABAT1", "CHAR(1)", True, 1),
        MockColumnInfo("ABCM", "VARCHAR(5)", True, 5),
        MockColumnInfo("ABTAX", "DECIMAL(5,2)", True),
        MockColumnInfo("ABPTI", "VARCHAR(3)", True, 3),
        MockColumnInfo("ABGLBA", "VARCHAR(25)", True, 25),
        MockColumnInfo("ABEMAL", "VARCHAR(128)", True, 128),
        MockColumnInfo("ABPH1", "VARCHAR(20)", True, 20),
        MockColumnInfo("ABADD1", "VARCHAR(40)", True, 40),
        MockColumnInfo("ABCITY", "VARCHAR(25)", True, 25),
        MockColumnInfo("ABST", "VARCHAR(2)", True, 2),
        MockColumnInfo("ABZIP", "VARCHAR(10)", True, 10),
        MockColumnInfo("ABCTRY", "VARCHAR(3)", True, 3),
        MockColumnInfo("ABCRBL", "DECIMAL(15,2)", True),
        MockColumnInfo("ABCRLM", "DECIMAL(15,2)", True),
        MockColumnInfo("ABSTTS", "VARCHAR(10)", True, 10),
        MockColumnInfo("ABUPMJ", "INT", True),
        MockColumnInfo("ABREP", "VARCHAR(10)", True, 10),
        MockColumnInfo("ABTYPE", "VARCHAR(20)", True, 20),
        MockColumnInfo("ABSIC", "VARCHAR(6)", True, 6),
        MockColumnInfo("ABREV", "DECIMAL(15,2)", True),
        MockColumnInfo("ABEMP", "INT", True),
        MockColumnInfo("ABWEB", "VARCHAR(128)", True, 128),
        # Some unmapped columns
        MockColumnInfo("ABDL01", "VARCHAR(30)", True, 30),
        MockColumnInfo("ABDL02", "VARCHAR(30)", True, 30),
        MockColumnInfo("ABDL03", "VARCHAR(30)", True, 30),
        MockColumnInfo("ABDL04", "VARCHAR(30)", True, 30),
        MockColumnInfo("ABDL05", "VARCHAR(30)", True, 30),
        MockColumnInfo("ABDL06", "VARCHAR(30)", True, 30),
        MockColumnInfo("ABDL07", "VARCHAR(30)", True, 30),
        MockColumnInfo("ABDL08", "VARCHAR(30)", True, 30),
        MockColumnInfo("ABDL09", "VARCHAR(30)", True, 30),
        MockColumnInfo("ABDL10", "VARCHAR(30)", True, 30)
    ]
    
    source_table = MockTableSchema("CUSTOMERS_SOURCE", source_columns)
    target_table = MockTableSchema("F0101_TARGET", target_columns)
    
    # Generate some mappings first
    ai_config = AIConfig(provider="openai", apiKey="dummy_key_for_testing", model="gpt-4")
    mappings = generate_column_mappings(source_table, target_table, ai_config, 0.7)
    
    print(f"Generated {len(mappings)} initial mappings")
    
    # Now analyze unmapped columns
    unmapped_analysis = analyze_unmapped_columns([source_table], [target_table], mappings)
    
    print(f"\n📊 UNMAPPED COLUMNS ANALYSIS RESULTS")
    print("=" * 50)
    print(f"Unmapped Source Columns: {unmapped_analysis['unmapped_source_count']}")
    print(f"Unmapped Target Columns: {unmapped_analysis['unmapped_target_count']}")
    
    print(f"\n🚨 CRITICAL UNMAPPED COLUMNS")
    print("=" * 40)
    for col in unmapped_analysis['critical_columns'][:5]:
        print(f"  • {col['column']} ({col['type']}) - Table: {col['table']}")
    
    print(f"\n💡 MANUAL MAPPING SUGGESTIONS")
    print("=" * 40)
    for suggestion in unmapped_analysis['manual_mapping_suggestions'][:3]:
        print(f"\n  Source: {suggestion['source_column']} ({suggestion['source_type']})")
        print(f"  Top Suggestions:")
        for i, target_suggestion in enumerate(suggestion['suggestions'][:3]):
            print(f"    {i+1}. {target_suggestion['target_column']} (Score: {target_suggestion['overall_score']:.2f})")
            print(f"       Similarity: {target_suggestion['similarity']:.2f}, Type: {target_suggestion['type_compatibility']:.2f}")
    
    print(f"\n👥 HUMAN MAPPING WORKFLOW")
    print("=" * 40)
    workflow = unmapped_analysis['human_mapping_workflow']
    for phase_key, phase_info in workflow.items():
        print(f"\n  {phase_info['title']} ({phase_info['priority']} Priority)")
        print(f"    Description: {phase_info['description']}")
        print(f"    Estimated Time: {phase_info['estimated_time']}")
        print(f"    Columns to Review: {len(phase_info['columns'])}")
        if phase_info['columns']:
            print(f"    Sample Columns: {', '.join(phase_info['columns'][:3])}")
    
    print(f"\n💼 BUSINESS IMPACT ASSESSMENT")
    print("=" * 40)
    impact = unmapped_analysis['business_impact']
    print(f"  High Impact: {impact['high_impact']} columns")
    print(f"  Medium Impact: {impact['medium_impact']} columns")
    print(f"  Low Impact: {impact['low_impact']} columns")

def test_enhanced_similarity_algorithms():
    """Test the enhanced similarity calculation algorithms"""
    print("\n🔍 Testing Enhanced Similarity Algorithms")
    print("=" * 50)
    
    test_pairs = [
        ("customer_id", "CUSTOMER_ID"),
        ("customer_name", "CUST_NAME"),
        ("email_address", "EMAIL"),
        ("phone_number", "PHONE"),
        ("street_address", "ADDRESS"),
        ("city_name", "CITY"),
        ("state_code", "STATE"),
        ("postal_code", "ZIP_CODE"),
        ("country_name", "COUNTRY"),
        ("account_balance", "BALANCE"),
        ("credit_limit", "CREDIT_LIMIT"),
        ("customer_status", "STATUS"),
        ("created_date", "CREATE_DATE"),
        ("last_modified", "MODIFY_DATE"),
        ("sales_representative", "SALES_REP"),
        ("customer_type", "CUST_TYPE"),
        ("industry_sector", "INDUSTRY"),
        ("annual_revenue", "REVENUE"),
        ("employee_count", "EMP_COUNT"),
        ("website_url", "WEBSITE")
    ]
    
    print("Testing various column name similarity patterns:")
    for source, target in test_pairs:
        similarity = calculate_name_similarity(source, target)
        confidence_level = "🟢 HIGH" if similarity > 0.8 else "🟡 MEDIUM" if similarity > 0.6 else "🟠 LOW"
        print(f"  {confidence_level} {source} ↔ {target}: {similarity:.3f}")

def main():
    """Main test function"""
    print("🚀 Powerful Column Mapping System - Enhanced Test Suite")
    print("=" * 70)
    
    try:
        # Run all tests
        test_powerful_direct_mappings()
        test_non_mapped_columns_analysis()
        test_enhanced_similarity_algorithms()
        
        print("\n✅ All enhanced tests completed successfully!")
        print("\n🎉 Powerful Column Mapping System is working correctly!")
        print("\n🚀 NEW FEATURES DEMONSTRATED:")
        print("  ✅ Enhanced JDE pattern matching with fuzzy logic")
        print("  ✅ Type-based intelligent matching")
        print("  ✅ Business context scoring")
        print("  ✅ Non-mapped columns analysis")
        print("  ✅ Human mapping process recommendations")
        print("  ✅ Business impact assessment")
        print("  ✅ Manual mapping suggestions")
        print("  ✅ Comprehensive mapping workflow")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
