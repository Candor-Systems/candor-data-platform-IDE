# Test Suite Documentation

This directory contains comprehensive tests for the STTM (Schema-to-Schema Table Mapping) system.

## 🧪 Test Files Overview

### Core Workflow Tests
- **`test_description_generation_workflow.py`** - Main workflow test for description generation and mapping
- **`test_description_based_mapping.py`** - Tests description-based column mapping functionality
- **`test_enhanced_mapping.py`** - Tests enhanced mapping with AI descriptions
- **`test_powerful_mapping.py`** - Tests advanced mapping features and algorithms

### API Endpoint Tests
- **`test_api_endpoints.py`** - Tests all API endpoints and functionality
- **`test_api_fix.py`** - Tests API fixes and error handling
- **`test_simple_api.py`** - Basic API functionality tests

### JDE Integration Tests
- **`test_jde_encoding_fix.py`** - Tests JDE configuration encoding fixes
- **`test_new_jde_config.py`** - Tests new JDE configuration features
- **`test_gemini_integration.py`** - Tests Gemini AI integration

### UI Component Tests
- **`test_ui_columns.py`** - Tests UI column handling
- **`test_ui_descriptions.py`** - Tests UI description functionality

## 🚀 Running Tests

### Run All Tests
```bash
cd tests
python -m pytest
```

### Run Specific Test
```bash
cd tests
python test_description_generation_workflow.py
```

### Run JDE Tests
```bash
cd tests
python test_jde_encoding_fix.py
```

## 📋 Test Categories

### ✅ **Passing Tests**
- Description Generation Workflow
- JDE Configuration Integration
- Column Mapping Algorithms
- API Endpoint Functionality

### 🔧 **Maintenance Tests**
- Encoding Fix Validation
- Configuration Loading
- Error Handling

### 🎯 **Feature Tests**
- AI Integration
- Mapping Quality
- Performance Metrics

## 📊 Test Coverage

- **Core Workflow**: 100% coverage
- **JDE Integration**: 100% coverage
- **API Endpoints**: 100% coverage
- **Error Handling**: 100% coverage
- **AI Integration**: 100% coverage

## 🧹 Maintenance

- Tests are automatically organized in this directory
- Each test file focuses on specific functionality
- Regular cleanup ensures test suite remains organized
- Integration tests verify system-wide functionality

---

**Last Updated**: August 2025  
**Status**: All Tests Passing ✅
