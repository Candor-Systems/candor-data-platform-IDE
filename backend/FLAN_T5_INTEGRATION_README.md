# FLAN-T5 Local Model Integration

This document describes the integration of FLAN-T5 as a local AI model for description generation in the STTM system.

## 🎯 Overview

The FLAN-T5 local model integration provides:
- **Local AI Processing**: No external API calls required
- **Offline Capability**: Works without internet connection
- **High Performance**: Optimized for description generation tasks
- **Memory Efficient**: Automatic model loading/unloading
- **Fallback Support**: Graceful degradation to pattern-based descriptions

## 🚀 Quick Start

### 1. Install Dependencies

Run the setup script to install all required dependencies:

```bash
cd backend
python setup_flan_t5.py
```

### 2. Test the Integration

Run the test script to verify everything is working:

```bash
python test_flan_t5_integration.py
```

### 3. Start the Server

The FLAN-T5 model will be loaded automatically when needed:

```bash
python main.py
```

## 📋 Features

### Local Model Support
- **Model**: Google FLAN-T5 (base, large, xl variants)
- **Device**: Auto-detection (CPU, CUDA, MPS)
- **Memory Management**: Automatic cleanup and garbage collection
- **Caching**: Model caching for improved performance

### Description Generation
- **Column Descriptions**: Business-focused descriptions for database columns
- **Mapping Descriptions**: Explanations for column mappings
- **Context Awareness**: Uses table context and column types
- **Quality Control**: Built-in description cleaning and formatting

### Configuration Options
- **Model Selection**: Choose from different FLAN-T5 variants
- **Device Control**: Specify CPU, CUDA, or MPS
- **Generation Parameters**: Temperature, top-p, max length
- **Provider Priority**: Control fallback order

## 🔧 Configuration

### AI Configuration

The `AIConfig` class now supports FLAN-T5 local model configuration:

```python
ai_config = AIConfig(
    provider="flan-t5-local",
    apiKey="",  # Not needed for local model
    model="google/flan-t5-base",
    useOfflineOnly=True,
    # FLAN-T5 specific settings
    flan_t5_model_name="google/flan-t5-base",  # Model variant
    flan_t5_device="auto",  # Device selection
    flan_t5_max_length=100,  # Max description length
    flan_t5_temperature=0.7,  # Generation temperature
    flan_t5_top_p=0.9,  # Top-p sampling
    provider_priority=["flan-t5-local", "pattern_fallback"]
)
```

### Model Variants

Available FLAN-T5 model variants:

| Model | Size | Parameters | Recommended Use |
|-------|------|------------|-----------------|
| `google/flan-t5-base` | ~250MB | 220M | Development, testing |
| `google/flan-t5-large` | ~800MB | 770M | Production, better quality |
| `google/flan-t5-xl` | ~3GB | 3B | High-quality descriptions |

### Device Configuration

Device options for model execution:

- **`auto`**: Automatically select best available device
- **`cpu`**: Force CPU execution (slower but works everywhere)
- **`cuda`**: Use NVIDIA GPU (requires CUDA)
- **`mps`**: Use Apple Silicon GPU (macOS only)

## 📊 Usage Examples

### Basic Description Generation

```python
from flan_t5_service import get_flan_t5_service

# Get the service instance
service = get_flan_t5_service("google/flan-t5-base")

# Generate column description
description = service.generate_description(
    column_name="CUSTOMER_ID",
    column_type="VARCHAR(50)",
    context="Customer master table"
)
print(description)  # "Unique identifier for customer records"
```

### Integration with Workflow

```python
from main import AIConfig, process_column_description, ColumnInfo

# Configure AI for FLAN-T5 local
ai_config = AIConfig(
    provider="flan-t5-local",
    apiKey="",
    model="google/flan-t5-base",
    useOfflineOnly=True,
    provider_priority=["flan-t5-local"]
)

# Process a column
column = ColumnInfo(name="ORDER_DATE", type="DATE", nullable=False)
result = process_column_description(column, "orders", ai_config)

print(f"Description: {result['description']}")
print(f"Source: {result['description_source']}")  # "flan_t5_local"
```

### Mapping Description Generation

```python
# Generate mapping description
mapping_desc = service.generate_mapping_description(
    source_col="CUST_ID",
    target_col="CUSTOMER_ID",
    source_desc="Customer identifier in source system",
    target_desc="Primary key for customer records"
)
print(mapping_desc)  # "Both columns represent customer identification..."
```

## 🏗️ Architecture

### Service Layer

The `FLANT5LocalService` class provides:

- **Model Management**: Loading, unloading, caching
- **Inference**: Text generation with configurable parameters
- **Memory Management**: Automatic cleanup and optimization
- **Error Handling**: Graceful failure and fallback

### Integration Layer

The main application integrates FLAN-T5 through:

- **Provider Priority**: FLAN-T5 local as primary provider
- **Fallback Chain**: JDE config → FLAN-T5 local → Pattern-based
- **Configuration**: Centralized AI configuration
- **Status Tracking**: Description source tracking

### Workflow Integration

The description generation workflow:

1. **JDE Check**: First check existing JDE descriptions
2. **FLAN-T5 Local**: Generate descriptions using local model
3. **Fallback**: Use pattern-based descriptions if needed
4. **Status Tracking**: Record description source and quality

## 🔍 Monitoring and Debugging

### Model Information

Get detailed model information:

```python
service = get_flan_t5_service()
info = service.get_model_info()
print(f"Model: {info['model_name']}")
print(f"Device: {info['device']}")
print(f"Parameters: {info['model_parameters']}")
print(f"Memory Usage: {info['memory_usage']}")
```

### Logging

The service provides detailed logging:

```
🤖 Using FLAN-T5 Local Model for description generation
📥 Loading FLAN-T5 model: google/flan-t5-base
✅ FLAN-T5 model loaded successfully on cuda
✅ FLAN-T5 Local generated description: Customer identification number
```

### Performance Monitoring

Monitor memory usage and performance:

```python
# Check memory usage
memory_info = service._get_memory_usage()
print(f"CUDA Allocated: {memory_info['cuda_allocated']}")
print(f"CUDA Reserved: {memory_info['cuda_reserved']}")
```

## 🚨 Troubleshooting

### Common Issues

#### Model Loading Failures
**Symptoms**: "Failed to load FLAN-T5 model"

**Solutions**:
1. Check internet connection for initial download
2. Verify sufficient disk space (3GB+ for large models)
3. Check available memory (4GB+ RAM recommended)
4. Verify PyTorch installation

#### CUDA Out of Memory
**Symptoms**: "CUDA out of memory"

**Solutions**:
1. Use smaller model variant (`flan-t5-base`)
2. Set device to "cpu" in configuration
3. Reduce batch size or max length
4. Close other GPU applications

#### Slow Performance
**Symptoms**: Very slow description generation

**Solutions**:
1. Use GPU if available (set device to "cuda")
2. Use smaller model for faster inference
3. Reduce max_length parameter
4. Check system resources

### Debug Mode

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Model Cache Issues

Clear model cache if needed:

```bash
rm -rf models_cache/
```

## 📈 Performance Optimization

### Model Selection

Choose the right model for your needs:

- **Development**: `flan-t5-base` (fast, small)
- **Production**: `flan-t5-large` (balanced)
- **High Quality**: `flan-t5-xl` (best quality)

### Memory Optimization

- **Automatic Cleanup**: Service automatically unloads models
- **Garbage Collection**: Forced cleanup after model unloading
- **CUDA Cache**: Automatic CUDA memory management

### Device Optimization

- **GPU First**: Use CUDA if available
- **CPU Fallback**: Automatic fallback to CPU
- **Memory Monitoring**: Track memory usage

## 🔒 Security Considerations

### Local Processing
- **No External Calls**: All processing happens locally
- **Data Privacy**: No data sent to external services
- **Offline Capability**: Works without internet connection

### Model Security
- **Verified Models**: Uses official Hugging Face models
- **Local Storage**: Models cached locally
- **No Telemetry**: No usage data sent externally

## 📚 API Reference

### FLANT5LocalService

#### Methods

- `load_model()`: Load the FLAN-T5 model
- `unload_model()`: Unload and cleanup model
- `generate_description(column_name, column_type, context)`: Generate column description
- `generate_mapping_description(source_col, target_col, source_desc, target_desc)`: Generate mapping description
- `get_model_info()`: Get model information

#### Properties

- `model_name`: Name of the loaded model
- `device`: Device the model is running on
- `is_loaded`: Whether the model is currently loaded

### Global Functions

- `get_flan_t5_service(model_name)`: Get or create service instance
- `cleanup_flan_t5_service()`: Cleanup global service

## 🧪 Testing

### Test Scripts

1. **Setup Test**: `python setup_flan_t5.py`
2. **Integration Test**: `python test_flan_t5_integration.py`
3. **Unit Tests**: Run existing test suite

### Test Coverage

- ✅ Model loading and unloading
- ✅ Description generation
- ✅ Mapping description generation
- ✅ Configuration validation
- ✅ Error handling and fallback
- ✅ Memory management
- ✅ Device detection

## 🔄 Migration Guide

### From External AI to FLAN-T5 Local

1. **Update Configuration**:
   ```python
   # Old configuration
   ai_config = AIConfig(provider="gemini", ...)
   
   # New configuration
   ai_config = AIConfig(
       provider="flan-t5-local",
       useOfflineOnly=True,
       provider_priority=["flan-t5-local"]
   )
   ```

2. **Install Dependencies**:
   ```bash
   python setup_flan_t5.py
   ```

3. **Test Integration**:
   ```bash
   python test_flan_t5_integration.py
   ```

### Backward Compatibility

The integration maintains backward compatibility:
- Existing API endpoints work unchanged
- Configuration schema extended, not replaced
- Fallback to external AI still supported

## 📞 Support

### Getting Help

1. **Check Logs**: Review application logs for errors
2. **Run Tests**: Use test scripts to diagnose issues
3. **Verify Setup**: Ensure all dependencies are installed
4. **Check Resources**: Verify sufficient memory and disk space

### Common Commands

```bash
# Check installation
python setup_flan_t5.py

# Test integration
python test_flan_t5_integration.py

# Check model info
python -c "from flan_t5_service import get_flan_t5_service; print(get_flan_t5_service().get_model_info())"
```

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Status**: Production Ready ✅
