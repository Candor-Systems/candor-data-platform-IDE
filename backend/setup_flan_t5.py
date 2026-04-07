"""
FLAN-T5 Local Model Setup Script

This script helps set up the FLAN-T5 local model environment and dependencies.
"""

import os
import sys
import subprocess
import platform

def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python version...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} is compatible")
    return True

def check_pip():
    """Check if pip is available"""
    print("📦 Checking pip availability...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                      check=True, capture_output=True)
        print("✅ pip is available")
        return True
    except subprocess.CalledProcessError:
        print("❌ pip is not available")
        return False

def install_dependencies():
    """Install required dependencies"""
    print("📥 Installing FLAN-T5 dependencies...")
    
    dependencies = [
        "transformers>=4.35.0",
        "torch>=2.0.0",
        "accelerate>=0.24.0",
        "tokenizers>=0.15.0"
    ]
    
    print("ℹ️ Note: External AI dependencies (Gemini, OpenAI) have been removed")
    print("ℹ️ Only FLAN-T5 local model will be used for AI description generation")
    
    for dep in dependencies:
        print(f"  Installing {dep}...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", dep], 
                          check=True, capture_output=True)
            print(f"    ✅ {dep} installed successfully")
        except subprocess.CalledProcessError as e:
            print(f"    ❌ Failed to install {dep}: {e}")
            return False
    
    return True

def check_torch_installation():
    """Check if PyTorch is properly installed"""
    print("🔥 Checking PyTorch installation...")
    try:
        import torch
        print(f"✅ PyTorch {torch.__version__} is installed")
        
        # Check CUDA availability
        if torch.cuda.is_available():
            print(f"✅ CUDA is available (GPU: {torch.cuda.get_device_name(0)})")
        else:
            print("ℹ️ CUDA not available, will use CPU")
        
        return True
    except ImportError:
        print("❌ PyTorch is not properly installed")
        return False

def check_transformers():
    """Check if transformers library is available"""
    print("🤗 Checking Transformers library...")
    try:
        import transformers
        print(f"✅ Transformers {transformers.__version__} is installed")
        return True
    except ImportError:
        print("❌ Transformers library is not installed")
        return False

def create_models_directory():
    """Create models cache directory"""
    print("📁 Creating models cache directory...")
    models_dir = os.path.join(os.getcwd(), "models_cache")
    try:
        os.makedirs(models_dir, exist_ok=True)
        print(f"✅ Models directory created: {models_dir}")
        return True
    except Exception as e:
        print(f"❌ Failed to create models directory: {e}")
        return False

def test_flan_t5_import():
    """Test if FLAN-T5 service can be imported"""
    print("🧪 Testing FLAN-T5 service import...")
    try:
        from flan_t5_service import get_flan_t5_service
        print("✅ FLAN-T5 service can be imported")
        return True
    except ImportError as e:
        print(f"❌ Failed to import FLAN-T5 service: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 FLAN-T5 Local Model Setup")
    print("=" * 50)
    
    checks = [
        ("Python Version", check_python_version),
        ("Pip Availability", check_pip),
        ("Dependencies Installation", install_dependencies),
        ("PyTorch Installation", check_torch_installation),
        ("Transformers Library", check_transformers),
        ("Models Directory", create_models_directory),
        ("FLAN-T5 Service Import", test_flan_t5_import)
    ]
    
    results = []
    
    for check_name, check_func in checks:
        print(f"\n{'='*20} {check_name} {'='*20}")
        try:
            success = check_func()
            results.append((check_name, success))
            if success:
                print(f"✅ {check_name} completed successfully")
            else:
                print(f"❌ {check_name} failed")
        except Exception as e:
            print(f"❌ {check_name} error: {str(e)}")
            results.append((check_name, False))
    
    # Summary
    print(f"\n{'='*50}")
    print("📊 SETUP SUMMARY")
    print(f"{'='*50}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for check_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"  {check_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🎉 FLAN-T5 setup completed successfully!")
        print("\nNext steps:")
        print("1. Run the test script: python test_flan_t5_integration.py")
        print("2. Start the server: python main.py")
        print("3. The FLAN-T5 model will be downloaded automatically on first use")
    else:
        print("\n⚠️ Setup incomplete. Please fix the failed checks above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
