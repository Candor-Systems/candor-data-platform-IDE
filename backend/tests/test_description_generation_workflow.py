#!/usr/bin/env python3
"""
Test script for the Description Generation and Mapping Workflow

This script demonstrates the new workflow that ensures:
1. Description generation is 100% completed before mapping begins
2. JDE configuration is checked first for existing descriptions
3. AI-based generation is only used when JDE descriptions are not available
4. Mapping process waits for complete description generation
"""

import sys
import os
import time
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import (
    execute_description_generation_and_mapping_workflow,
    AIConfig,
    TableSchema,
    ColumnInfo
)

def create_test_tables():
    """Create test source and target tables for demonstration"""
    
    # Test source table (JDE-like structure)
    source_columns = [
        ColumnInfo(
            name="AN8",
            type="varchar",
            isNullable=False,
            maxLength=10,
            description="Address Number"
        ),
        ColumnInfo(
            name="ALPH",
            type="varchar",
            isNullable=False,
            maxLength=40,
            description="Name - Alpha"
        ),
        ColumnInfo(
            name="MCU",
            type="varchar",
            isNullable=False,
            maxLength=12,
            description="Business Unit"
        ),
        ColumnInfo(
            name="CUSTOMER_EMAIL",
            type="varchar",
            isNullable=True,
            maxLength=100,
            description="Customer email address"
        ),
        ColumnInfo(
            name="ORDER_DATE",
            type="date",
            isNullable=False,
            maxLength=None,
            description="Date when order was placed"
        )
    ]
    
    source_table = TableSchema(
        tableName="F0101",  # JDE Address Book table
        tableType="TABLE",
        columns=source_columns,
        description="JDE Address Book Master",
        primaryKeys=[],
        foreignKeys=[]
    )
    
    # Test target table (modern system)
    target_columns = [
        ColumnInfo(
            name="customer_id",
            type="varchar",
            isNullable=False,
            maxLength=20,
            description="Unique customer identifier"
        ),
        ColumnInfo(
            name="customer_name",
            type="varchar",
            isNullable=False,
            maxLength=100,
            description="Full customer name"
        ),
        ColumnInfo(
            name="business_unit_code",
            type="varchar",
            isNullable=False,
            maxLength=15,
            description="Business unit identifier"
        ),
        ColumnInfo(
            name="email_address",
            type="varchar",
            isNullable=True,
            maxLength=150,
            description="Customer email for communications"
        ),
        ColumnInfo(
            name="created_date",
            type="timestamp",
            isNullable=False,
            maxLength=None,
            description="Record creation timestamp"
        )
    ]
    
    target_table = TableSchema(
        tableName="customers",
        tableType="TABLE",
        columns=target_columns,
        description="Customer master data",
        primaryKeys=[],
        foreignKeys=[]
    )
    
    return source_table, target_table

def test_workflow():
    """Test the complete description generation and mapping workflow"""
    
    print("🧪 Testing Description Generation and Mapping Workflow")
    print("=" * 60)
    
    # Create test tables
    source_table, target_table = create_test_tables()
    
    print(f"📊 Source Table: {source_table.tableName}")
    print(f"   Columns: {len(source_table.columns)}")
    for col in source_table.columns:
        print(f"     - {col.name}: {col.type}")
    
    print(f"\n🎯 Target Table: {target_table.tableName}")
    print(f"   Columns: {len(target_table.columns)}")
    for col in target_table.columns:
        print(f"     - {col.name}: {col.type}")
    
    # Create AI configuration
    ai_config = AIConfig(
        provider="gemini",
        apiKey="test_key",
        model="gemini-pro",
        temperature=0.3,
        max_tokens=1000
    )
    
    print(f"\n🤖 AI Configuration: {ai_config.provider} - {ai_config.model}")
    
    # Execute the workflow
    print("\n" + "=" * 60)
    print("🚀 EXECUTING WORKFLOW")
    print("=" * 60)
    
    try:
        start_time = time.time()
        
        workflow_results = execute_description_generation_and_mapping_workflow(
            source_table,
            target_table,
            ai_config
        )
        
        execution_time = time.time() - start_time
        
        print(f"\n⏱️ Workflow Execution Time: {execution_time:.2f} seconds")
        
        # Display results summary
        print("\n📋 WORKFLOW RESULTS SUMMARY")
        print("-" * 40)
        
        desc_gen = workflow_results["description_generation"]
        mapping_results = workflow_results["mapping_results"]
        
        print(f"📝 Description Generation:")
        print(f"   Total Columns: {desc_gen['total_columns']}")
        print(f"   JDE Descriptions Found: {desc_gen['jde_descriptions_found']}")
        print(f"   AI Descriptions Generated: {desc_gen['ai_descriptions_generated']}")
        
        print(f"\n🔗 Mapping Results:")
        print(f"   Total Mappings: {mapping_results['total_mappings']}")
        print(f"   High Confidence (≥0.8): {mapping_results['high_confidence_mappings']}")
        print(f"   Medium Confidence (0.6-0.8): {mapping_results['medium_confidence_mappings']}")
        print(f"   Low Confidence (<0.6): {mapping_results['low_confidence_mappings']}")
        
        # Display individual mappings
        print(f"\n🔍 Individual Mappings:")
        for i, mapping in enumerate(mapping_results['mappings'], 1):
            print(f"   {i}. {mapping.sourceColumn} → {mapping.targetColumn}")
            print(f"      Confidence: {mapping.confidence:.2f}")
            print(f"      Description: {mapping.aiDescription}")
            print()
        
        print("✅ Workflow test completed successfully!")
        
    except Exception as e:
        print(f"❌ Workflow test failed: {str(e)}")
        import traceback
        traceback.print_exc()

def test_jde_configuration_integration():
    """Test JDE configuration integration specifically"""
    
    print("\n🔧 Testing JDE Configuration Integration")
    print("=" * 50)
    
    # Test columns that should have JDE descriptions
    jde_test_columns = [
        "AN8",        # Should find JDE description
        "ALPH",       # Should find JDE description  
        "MCU",        # Should find JDE description
        "UNKNOWN_COL" # Should trigger AI generation
    ]
    
    from main import get_jde_column_description
    
    for col_name in jde_test_columns:
        jde_desc = get_jde_column_description(col_name)
        if jde_desc:
            print(f"✅ {col_name}: Found JDE description - {jde_desc}")
        else:
            print(f"🤖 {col_name}: No JDE description - will use AI generation")
    
    print("\n✅ JDE configuration integration test completed!")

if __name__ == "__main__":
    print("🧪 Description Generation and Mapping Workflow Test Suite")
    print("=" * 60)
    
    # First, ensure JDE configuration is properly loaded
    try:
        from main import load_jde_config, fix_jde_config_encoding
        
        print("🔧 Ensuring JDE configuration is properly loaded...")
        fix_jde_config_encoding()  # Fix any encoding issues
        config = load_jde_config()  # Test loading
        
        if not config or not config.get("descriptions"):
            print("⚠️ Warning: JDE configuration may not be fully loaded")
        else:
            print("✅ JDE configuration loaded successfully")
            
    except Exception as e:
        print(f"⚠️ Warning: JDE configuration loading issue: {e}")
    
    # Test JDE configuration integration
    test_jde_configuration_integration()
    
    # Test complete workflow
    test_workflow()
    
    print("\n🎉 All tests completed!")
