#!/usr/bin/env python3
"""
Test script for new JDE configuration
"""

from main import generate_column_description_step_by_step, AIConfig

def test_new_jde_config():
    """Test the new JDE configuration with problematic columns"""
    print("🔍 Testing New JDE Configuration")
    print("=" * 50)
    
    ai_config = AIConfig(provider="openai", apiKey="dummy", model="gpt-4")
    
    # Test the problematic columns from the UI
    test_columns = [
        ("YEAN8", "int"),
        ("YEHMCU", "varchar(10)"),
        ("YEJBCD", "varchar(10)"),
        ("YEPOS", "varchar(10)")
    ]
    
    for col_name, col_type in test_columns:
        # Create mock column
        column = type('ColumnInfo', (), {
            'name': col_name,
            'type': col_type,
            'isNullable': True,
            'maxLength': 10 if col_type == 'varchar(10)' else None
        })()
        
        # Generate description
        description = generate_column_description_step_by_step(column, None, ai_config)
        
        print(f"\n📝 {col_name} ({col_type}):")
        print(f"   Description: {description}")
    
    print("\n✅ All columns tested successfully!")

if __name__ == "__main__":
    test_new_jde_config()
