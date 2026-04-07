"""
FLAN-T5 Local Model Service for Description Generation

This module provides a local FLAN-T5 model service for generating column descriptions
without requiring external API calls. The model runs entirely on the local machine.
"""

import os
import logging
from typing import Optional, Dict, Any
from transformers import T5ForConditionalGeneration, T5Tokenizer
import torch
import gc

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FLANT5LocalService:
    """
    Local FLAN-T5 model service for description generation.
    
    This class handles loading, caching, and inference with FLAN-T5 models
    running entirely on the local machine without external API calls.
    """
    
    def __init__(self, model_name: str = "google/flan-t5-base", device: str = "auto"):
        """
        Initialize the FLAN-T5 local service.
        
        Args:
            model_name: Hugging Face model identifier (default: google/flan-t5-base)
            device: Device to run the model on ("auto", "cpu", "cuda", "mps")
        """
        self.model_name = model_name
        self.device = self._get_device(device)
        self.model = None
        self.tokenizer = None
        self.is_loaded = False
        
        logger.info(f"Initializing FLAN-T5 Local Service with model: {model_name}")
        logger.info(f"Target device: {self.device}")
    
    def _get_device(self, device: str) -> str:
        """Determine the best available device for model inference."""
        if device == "auto":
            if torch.cuda.is_available():
                return "cuda"
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                return "mps"
            else:
                return "cpu"
        return device
    
    def load_model(self) -> bool:
        """
        Load the FLAN-T5 model and tokenizer.
        
        Returns:
            bool: True if model loaded successfully, False otherwise
        """
        try:
            logger.info(f"Loading FLAN-T5 model: {self.model_name}")
            
            # Load tokenizer
            self.tokenizer = T5Tokenizer.from_pretrained(
                self.model_name,
                cache_dir=os.path.join(os.getcwd(), "models_cache")
            )
            
            # Load model
            self.model = T5ForConditionalGeneration.from_pretrained(
                self.model_name,
                cache_dir=os.path.join(os.getcwd(), "models_cache"),
                torch_dtype=torch.float16 if self.device != "cpu" else torch.float32
            )
            
            # Move model to device
            self.model = self.model.to(self.device)
            self.model.eval()
            
            self.is_loaded = True
            logger.info(f"✅ FLAN-T5 model ({self.model_name}) loaded successfully on {self.device}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load FLAN-T5 model: {str(e)}")
            self.is_loaded = False
            return False
    
    def unload_model(self):
        """Unload the model to free memory."""
        if self.model is not None:
            del self.model
            self.model = None
        if self.tokenizer is not None:
            del self.tokenizer
            self.tokenizer = None
        
        self.is_loaded = False
        
        # Clear CUDA cache if using GPU
        if self.device == "cuda":
            torch.cuda.empty_cache()
        
        # Force garbage collection
        gc.collect()
        
        logger.info("🧹 FLAN-T5 model unloaded and memory freed")
    
    def generate_description(self, column_name: str, column_type: str, context: str = "") -> Optional[str]:
        """
        Generate a business description for a database column.
        
        Args:
            column_name: Name of the database column
            column_type: Data type of the column
            context: Optional context about the table or system
            
        Returns:
            str: Generated description or None if generation fails
        """
        if not self.is_loaded:
            logger.warning("Model not loaded, attempting to load...")
            if not self.load_model():
                return None
        
        try:
            # Create a focused prompt for column description generation
            prompt = self._create_column_prompt(column_name, column_type, context)
            
            # Tokenize input
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True
            ).to(self.device)
            
            # Generate description
            with torch.no_grad():
                outputs = self.model.generate(
                    inputs.input_ids,
                    max_length=100,
                    min_length=10,
                    num_beams=4,
                    early_stopping=True,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9,
                    repetition_penalty=1.1
                )
            
            # Decode output
            description = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Clean up the description
            description = self._clean_description(description, column_name)
            
            logger.info(f"Generated description for '{column_name}' using {self.model_name}: {description}")
            return description
            
        except Exception as e:
            logger.error(f"Failed to generate description for '{column_name}': {str(e)}")
            return None
    
    def generate_mapping_description(self, source_col: str, target_col: str, 
                                   source_desc: str = "", target_desc: str = "") -> Optional[str]:
        """
        Generate a description for a column mapping.
        
        Args:
            source_col: Source column name
            target_col: Target column name
            source_desc: Source column description
            target_desc: Target column description
            
        Returns:
            str: Generated mapping description or None if generation fails
        """
        if not self.is_loaded:
            logger.warning("Model not loaded, attempting to load...")
            if not self.load_model():
                return None
        
        try:
            # Create a focused prompt for mapping description
            prompt = self._create_mapping_prompt(source_col, target_col, source_desc, target_desc)
            
            # Tokenize input
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True
            ).to(self.device)
            
            # Generate description
            with torch.no_grad():
                outputs = self.model.generate(
                    inputs.input_ids,
                    max_length=150,
                    min_length=20,
                    num_beams=4,
                    early_stopping=True,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9,
                    repetition_penalty=1.1
                )
            
            # Decode output
            description = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Clean up the description
            description = self._clean_mapping_description(description)
            
            logger.info(f"Generated mapping description using {self.model_name}: {source_col} → {target_col}")
            return description
            
        except Exception as e:
            logger.error(f"Failed to generate mapping description: {str(e)}")
            return None
    
    def _create_column_prompt(self, column_name: str, column_type: str, context: str = "") -> str:
        """Create a focused prompt for column description generation."""
        base_prompt = f"Generate a concise business description for database column '{column_name}' of type '{column_type}'."
        
        if context:
            base_prompt += f" Context: {context}"
        
        base_prompt += " Description:"
        
        return base_prompt
    
    def _create_mapping_prompt(self, source_col: str, target_col: str, 
                              source_desc: str = "", target_desc: str = "") -> str:
        """Create a focused prompt for mapping description generation."""
        prompt = f"Explain why database column '{source_col}' maps to '{target_col}'."
        
        if source_desc and target_desc:
            prompt += f" Source: {source_desc}. Target: {target_desc}."
        
        prompt += " Mapping reason:"
        
        return prompt
    
    def _clean_description(self, description: str, column_name: str) -> str:
        """Clean and format the generated description."""
        # Remove common prefixes that the model might add
        prefixes_to_remove = [
            "Description:",
            "The column",
            "This column",
            "Column",
            f"'{column_name}'",
            "is",
            "represents",
            "stores"
        ]
        
        cleaned = description.strip()
        
        # Remove prefixes
        for prefix in prefixes_to_remove:
            if cleaned.lower().startswith(prefix.lower()):
                cleaned = cleaned[len(prefix):].strip()
                # Remove leading punctuation
                while cleaned and cleaned[0] in ".,:;":
                    cleaned = cleaned[1:].strip()
        
        # Ensure it starts with a capital letter
        if cleaned and not cleaned[0].isupper():
            cleaned = cleaned[0].upper() + cleaned[1:]
        
        # Remove trailing punctuation if it's incomplete
        if cleaned.endswith(('...', '..', '.')) and len(cleaned) < 20:
            cleaned = cleaned.rstrip('.')
        
        return cleaned.strip()
    
    def _clean_mapping_description(self, description: str) -> str:
        """Clean and format the generated mapping description."""
        # Remove common prefixes
        prefixes_to_remove = [
            "Mapping reason:",
            "The mapping",
            "This mapping",
            "Mapping",
            "because",
            "since"
        ]
        
        cleaned = description.strip()
        
        for prefix in prefixes_to_remove:
            if cleaned.lower().startswith(prefix.lower()):
                cleaned = cleaned[len(prefix):].strip()
                # Remove leading punctuation
                while cleaned and cleaned[0] in ".,:;":
                    cleaned = cleaned[1:].strip()
        
        # Ensure it starts with a capital letter
        if cleaned and not cleaned[0].isupper():
            cleaned = cleaned[0].upper() + cleaned[1:]
        
        return cleaned.strip()
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        return {
            "model_name": self.model_name,
            "device": self.device,
            "is_loaded": self.is_loaded,
            "model_parameters": self.model.num_parameters() if self.model else 0,
            "memory_usage": self._get_memory_usage()
        }
    
    def _get_memory_usage(self) -> Dict[str, Any]:
        """Get current memory usage information."""
        memory_info = {
            "device": self.device,
            "cuda_allocated": 0,
            "cuda_reserved": 0,
            "cuda_max_allocated": 0
        }
        
        if self.device == "cuda" and torch.cuda.is_available():
            memory_info.update({
                "cuda_allocated": torch.cuda.memory_allocated(),
                "cuda_reserved": torch.cuda.memory_reserved(),
                "cuda_max_allocated": torch.cuda.max_memory_allocated()
            })
        
        return memory_info


# Global instance for singleton pattern
_flan_t5_service: Optional[FLANT5LocalService] = None

def get_flan_t5_service(model_name: str = "google/flan-t5-base") -> FLANT5LocalService:
    """
    Get or create the global FLAN-T5 service instance.
    
    Args:
        model_name: Hugging Face model identifier
        
    Returns:
        FLANT5LocalService: The global service instance
    """
    global _flan_t5_service
    
    if _flan_t5_service is None or _flan_t5_service.model_name != model_name:
        if _flan_t5_service is not None:
            _flan_t5_service.unload_model()
        
        _flan_t5_service = FLANT5LocalService(model_name)
    
    return _flan_t5_service

def cleanup_flan_t5_service():
    """Clean up the global FLAN-T5 service instance."""
    global _flan_t5_service
    
    if _flan_t5_service is not None:
        _flan_t5_service.unload_model()
        _flan_t5_service = None
        logger.info("🧹 Global FLAN-T5 service cleaned up")
