"""Helper functions and imports are defined after imports to avoid NameError."""
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
import sqlalchemy
from sqlalchemy import inspect, create_engine, text, func
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import quote_plus
# External AI imports removed - using only FLAN-T5 local model
import os
from difflib import SequenceMatcher
import random
import stripe
from sqlalchemy.orm import Session
# Import FLAN-T5 Local Service
from flan_t5_service import get_flan_t5_service, cleanup_flan_t5_service

# Import our new modules
from database import get_db, create_tables
from models import User, Subscription, Payment, Campaign, CampaignExecution
from schemas import (
    UserCreate, UserLogin, UserResponse, UserWithSubscription,
    SubscriptionResponse, PaymentIntentRequest, PaymentIntentResponse,
    PlanResponse, AuthResponse, CampaignCreate, CampaignUpdate, CampaignResponse,
    CampaignListResponse, CampaignExecutionCreate, CampaignExecutionUpdate, CampaignExecutionResponse
)
from auth import (
    hash_password, authenticate_user, get_user_subscription_status,
    create_trial_subscription
)
from stripe_service import StripeService
from config import Config

# Add schema caching for performance
from functools import lru_cache
import hashlib
try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None  # Optional until installed

# Add similarity calculation and mapping utilities
from difflib import SequenceMatcher
import re
import time
import hashlib
import requests

# ==================== JDE CONFIGURATION LOADING ====================
import json
import os

# Load JDE table configuration from JSON file
def load_jde_config():
    """Load JDE table configuration from jde_table.json file with encoding fallback"""
    config_path = os.path.join(os.path.dirname(__file__), 'jde_table.json')
    
    # Try different encodings to handle various file formats
    encodings_to_try = [
        'utf-8-sig',  # UTF-8 with BOM
        'utf-8',      # Standard UTF-8
        'latin-1',    # Latin-1 encoding
        'cp1252',     # Windows-1252 encoding
        'iso-8859-1'  # ISO-8859-1 encoding
    ]
    
    for encoding in encodings_to_try:
        try:
            with open(config_path, 'r', encoding=encoding) as f:
                config_data = json.load(f)
                print(f"Successfully loaded JDE config file using {encoding} encoding")
                return config_data
        except UnicodeDecodeError as e:
            print(f"Failed to decode with {encoding}: {e}")
            continue
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON with {encoding}: {e}")
            continue
        except Exception as e:
            print(f"Unexpected error with {encoding}: {e}")
            continue
    
    # If all encodings fail, try to read as bytes and decode manually
    try:
        with open(config_path, 'rb') as f:
            content = f.read()
            
        # Try to detect and remove BOM
        if content.startswith(b'\xef\xbb\xbf'):  # UTF-8 BOM
            content = content[3:]
            config_data = json.loads(content.decode('utf-8'))
            print("Successfully loaded JDE config file after removing UTF-8 BOM")
            return config_data
        elif content.startswith(b'\xff\xfe'):  # UTF-16 LE BOM
            config_data = json.loads(content.decode('utf-16-le'))
            print("Successfully loaded JDE config file using UTF-16 LE")
            return config_data
        elif content.startswith(b'\xfe\xff'):  # UTF-16 BE BOM
            config_data = json.loads(content.decode('utf-16-be'))
            print("Successfully loaded JDE config file using UTF-16 BE")
            return config_data
        else:
            # Try to decode as UTF-8 without BOM
            config_data = json.loads(content.decode('utf-8'))
            print("Successfully loaded JDE config file as raw bytes")
            return config_data
            
    except Exception as e:
        print(f"All encoding attempts failed: {e}")
        print("Returning empty JDE configuration")
        return {"synonym_groups": [], "descriptions": {}}

# Load JDE configuration
JDE_CONFIG = load_jde_config()
JDE_SYNONYM_GROUPS = JDE_CONFIG.get("synonym_groups", [])
JDE_COLUMN_DESCRIPTIONS = JDE_CONFIG.get("descriptions", {})

def fix_jde_config_encoding():
    """Fix JDE configuration file encoding issues permanently"""
    config_path = os.path.join(os.path.dirname(__file__), 'jde_table.json')
    
    try:
        # Read the file as bytes first
        with open(config_path, 'rb') as f:
            content = f.read()
        
        # Check if it has a BOM
        if content.startswith(b'\xef\xbb\xbf'):  # UTF-8 BOM
            print("Removing UTF-8 BOM from JDE config file...")
            content = content[3:]
        elif content.startswith(b'\xff\xfe'):  # UTF-16 LE BOM
            print("Converting UTF-16 LE to UTF-8...")
            content = content.decode('utf-16-le').encode('utf-8')
        elif content.startswith(b'\xfe\xff'):  # UTF-16 BE BOM
            print("Converting UTF-16 BE to UTF-8...")
            content = content.decode('utf-16-be').encode('utf-8')
        
        # Parse the JSON to validate it
        try:
            json.loads(content.decode('utf-8'))
        except json.JSONDecodeError:
            print("JSON validation failed, attempting to fix...")
            # Try to decode with different encodings and re-encode as UTF-8
            for encoding in ['latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    decoded = content.decode(encoding)
                    json.loads(decoded)  # Validate JSON
                    content = decoded.encode('utf-8')
                    print(f"Successfully converted from {encoding} to UTF-8")
                    break
                except:
                    continue
        
        # Write back as clean UTF-8
        with open(config_path, 'wb') as f:
            f.write(content)
        
        print("JDE config file encoding fixed successfully!")
        return True
        
    except Exception as e:
        print(f"Failed to fix JDE config file encoding: {e}")
        return False

# JDE Table Descriptions and Metadata - Generated from jde_table.json configuration
JDE_TABLE_DESCRIPTIONS = {}

def generate_jde_table_descriptions_from_config():
    """Generate JDE table descriptions based on the loaded configuration"""
    global JDE_TABLE_DESCRIPTIONS
    
    # Common JDE table patterns and their business purposes
    table_patterns = {
        "F01": {
            "description": "Address Book & Customer Management",
            "business_purpose": "Stores customer, vendor, and employee address information and relationships",
            "common_columns": extract_common_columns_from_config("F01")
        },
        "F03": {
            "description": "Customer Master & Relationships", 
            "business_purpose": "Stores customer-specific information, preferences, and relationship data",
            "common_columns": extract_common_columns_from_config("F03")
        },
        "F42": {
            "description": "Sales Order Management",
            "business_purpose": "Stores sales order header and line item information for order processing",
            "common_columns": extract_common_columns_from_config("F42")
        },
        "F41": {
            "description": "Inventory & Item Management",
            "business_purpose": "Stores item/product master information and inventory location details",
            "common_columns": extract_common_columns_from_config("F41")
        },
        "F09": {
            "description": "General Ledger & Financial",
            "business_purpose": "Stores chart of accounts and general ledger transaction information",
            "common_columns": extract_common_columns_from_config("F09")
        },
        "F43": {
            "description": "Sales & Distribution",
            "business_purpose": "Stores sales document information and distribution channel data",
            "common_columns": extract_common_columns_from_config("F43")
        },
        "F44": {
            "description": "Purchasing & Procurement",
            "business_purpose": "Stores purchase order and procurement information",
            "common_columns": extract_common_columns_from_config("F44")
        },
        "F46": {
            "description": "Warehouse & Logistics",
            "business_purpose": "Stores warehouse operations and logistics movement data",
            "common_columns": extract_common_columns_from_config("F46")
        },
        "F47": {
            "description": "Quality Management",
            "business_purpose": "Stores quality control and inspection information",
            "common_columns": extract_common_columns_from_config("F47")
        },
        "F48": {
            "description": "Project Management",
            "business_purpose": "Stores project information and project-related transactions",
            "common_columns": extract_common_columns_from_config("F48")
        }
    }
    
    # Generate descriptions for specific tables based on patterns
    specific_tables = {
        "F0101": {
            "description": "Address Book Master File",
            "business_purpose": "Central repository for all business entities (customers, vendors, employees) with contact and address information",
            "common_columns": extract_common_columns_from_config("F0101")
        },
        "F03012": {
            "description": "Customer Master File",
            "business_purpose": "Stores customer-specific information, preferences, and relationship data for customer relationship management",
            "common_columns": extract_common_columns_from_config("F03012")
        },
        "F4201": {
            "description": "Sales Order Header File",
            "business_purpose": "Stores sales order header information including customer details, order dates, and order status",
            "common_columns": extract_common_columns_from_config("F4201")
        },
        "F4211": {
            "description": "Sales Order Detail File",
            "business_purpose": "Stores sales order line item details including products, quantities, and pricing information",
            "common_columns": extract_common_columns_from_config("F4211")
        },
        "F4101": {
            "description": "Item Master File",
            "business_purpose": "Stores item/product master information including descriptions, units of measure, and item attributes",
            "common_columns": extract_common_columns_from_config("F4101")
        },
        "F4102": {
            "description": "Item Location File",
            "business_purpose": "Stores item location and quantity information for inventory management and warehouse operations",
            "common_columns": extract_common_columns_from_config("F4102")
        },
        "F0901": {
            "description": "Account Master File",
            "business_purpose": "Stores chart of accounts information for financial reporting and general ledger operations",
            "common_columns": extract_common_columns_from_config("F0901")
        },
        "F0911": {
            "description": "Account Ledger File",
            "business_purpose": "Stores general ledger transactions and journal entries for financial accounting",
            "common_columns": extract_common_columns_from_config("F0911")
        }
    }
    
    # Combine pattern-based and specific table descriptions
    JDE_TABLE_DESCRIPTIONS.update(table_patterns)
    JDE_TABLE_DESCRIPTIONS.update(specific_tables)
    
    print(f"✅ Generated JDE table descriptions for {len(JDE_TABLE_DESCRIPTIONS)} table patterns")

def extract_common_columns_from_config(table_pattern):
    """Extract common columns for a table pattern from the JDE configuration"""
    common_columns = {}
    
    # Get all columns from the configuration that match the table pattern
    for col_name in JDE_COLUMN_DESCRIPTIONS.keys():
        if col_name.startswith(table_pattern[:2]) or table_pattern in col_name:
            # Get the description from configuration
            desc = JDE_COLUMN_DESCRIPTIONS.get(col_name, "")
            # Create a short description
            short_desc = desc.split('.')[0] if desc else f"{col_name} field"
            common_columns[col_name] = short_desc
    
    # If no specific columns found, add some common ones based on the pattern
    if not common_columns:
        if table_pattern.startswith("F01"):
            common_columns.update({
                "ABAN8": "Address Number (Primary Key)",
                "ABALPH": "Alpha Name (Company/Individual Name)",
                "ABMCU": "Business Unit",
                "ABAT1": "Address Type"
            })
        elif table_pattern.startswith("F42"):
            common_columns.update({
                "SDDOCO": "Document Number",
                "SDDCTO": "Document Type",
                "SDAN8": "Address Number (Customer)",
                "SDITM": "Item Number"
            })
        elif table_pattern.startswith("F41"):
            common_columns.update({
                "IMITM": "Item Number (Primary Key)",
                "IMDSC1": "Description Line 1",
                "IMPRP1": "Primary UOM"
            })
        elif table_pattern.startswith("F09"):
            common_columns.update({
                "GMAID": "Account ID",
                "GMOBJ": "Object Account",
                "GMSUB": "Subsidiary Account"
            })
    
    return common_columns

# Fix JDE config file encoding if needed
fix_jde_config_encoding()

# Generate JDE table descriptions on startup
generate_jde_table_descriptions_from_config()

# Enhanced Column Type Mappings for JDE
JDE_COLUMN_TYPE_MAPPINGS = {
    "N": "Numeric",
    "A": "Alpha",
    "P": "Packed Decimal",
    "Z": "Zoned Decimal",
    "B": "Binary",
    "L": "Logical",
    "U": "Unsigned",
    "T": "Time",
    "D": "Date",
    "G": "Graphics",
    "M": "Mixed"
}

app = FastAPI(title="STTM", version="2.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        Config.FRONTEND_URL,
        "http://localhost:5173",  # Vite default port
        "http://localhost:3000",  # Alternative port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Create tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on application shutdown"""
    cleanup_flan_t5_service()

# Simple health check endpoint
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "STTM Backend is running",
        "version": "2.0.0",
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/health",
            "generate_mappings": "/generate-mappings",
            "get_schema": "/get-schema"
        }
    }

# Dependency to get current user
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db = Depends(get_db)):
    # For now, we'll use a simple token system
    # In production, you might want to implement proper JWT or session management
    token = credentials.credentials
    user = db.query(User).filter(User.id == int(token)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate, db = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create trial subscription
    subscription = create_trial_subscription(db, user.id)
    
    # Get subscription status
    subscription_status = get_user_subscription_status(db, user.id)
    
    return AuthResponse(
        user=UserWithSubscription(
            **user.__dict__,
            subscription_status=subscription_status
        ),
        message="User registered successfully with 7-day trial"
    )

@app.post("/auth/login", response_model=AuthResponse)
async def login(user_data: UserLogin, db = Depends(get_db)):
    """Login user"""
    user = authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated"
        )
    
    # Get subscription status
    subscription_status = get_user_subscription_status(db, user.id)
    
    return AuthResponse(
        user=UserWithSubscription(
            **user.__dict__,
            subscription_status=subscription_status
        ),
        message="Login successful"
    )

@app.get("/auth/me", response_model=UserWithSubscription)
async def get_current_user_info(current_user: User = Depends(get_current_user), db = Depends(get_db)):
    """Get current user information with subscription status"""
    subscription_status = get_user_subscription_status(db, current_user.id)
    
    return UserWithSubscription(
        **current_user.__dict__,
        subscription_status=subscription_status
    )

# ==================== SUBSCRIPTION & PAYMENT ENDPOINTS ====================

@app.get("/plans", response_model=List[PlanResponse])
async def get_subscription_plans():
    """Get available subscription plans"""
    plans = []
    for plan_id, plan_data in Config.SUBSCRIPTION_PLANS.items():
        plans.append(PlanResponse(
            id=plan_id,
            name=plan_data["name"],
            price=plan_data["price"],
            features=plan_data["features"],
            stripe_price_id=plan_data["stripe_price_id"]
        ))
    return plans

@app.post("/payments/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    payment_data: PaymentIntentRequest,
    current_user: User = Depends(get_current_user)
):
    """Create a payment intent for subscription"""
    try:
        print(f"Creating payment intent for plan: {payment_data.plan_type}, user: {current_user.email}")
        result = StripeService.create_payment_intent(
            payment_data.plan_type,
            current_user.email
        )
        
        return PaymentIntentResponse(
            client_secret=result["client_secret"],
            amount=result["amount"],
            currency=result["currency"]
        )
    except Exception as e:
        print(f"Error creating payment intent: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/payments/create-checkout-session")
async def create_checkout_session(
    payment_data: PaymentIntentRequest,
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe checkout session for subscription"""
    try:
        print(f"Creating checkout session for plan: {payment_data.plan_type}, user: {current_user.email}")
        result = StripeService.create_checkout_session(
            payment_data.plan_type,
            current_user.email,
            current_user.id
        )
        
        return {
            "session_id": result["session_id"],
            "url": result["url"],
            "amount": result["amount"],
            "currency": result["currency"],
            "plan_type": result["plan_type"]
        }
    except Exception as e:
        print(f"Error creating checkout session: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/payments/webhook")
async def stripe_webhook(request: Request, db = Depends(get_db)):
    """Handle Stripe webhooks for checkout session completion"""
    try:
        # Get the webhook secret from config
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
        
        # Get the raw body
        body = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        if not webhook_secret or not sig_header:
            logging.warning("Missing webhook secret or signature header")
            return {"status": "error", "message": "Missing webhook configuration"}
        
        try:
            # Verify the webhook signature
            event = stripe.Webhook.construct_event(
                body, sig_header, webhook_secret
            )
        except ValueError as e:
            logging.error(f"Invalid payload: {e}")
            return {"status": "error", "message": "Invalid payload"}
        except stripe.error.SignatureVerificationError as e:
            logging.error(f"Invalid signature: {e}")
            return {"status": "error", "message": "Invalid signature"}
        
        # Handle the event
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            
            # Extract data from the session
            plan_type = session["metadata"].get("plan_type")
            user_email = session["metadata"].get("user_email")
            user_id = session["metadata"].get("user_id")
            
            if plan_type and user_email and user_id:
                logging.info(f"Processing completed checkout session for user {user_email}, plan {plan_type}")
                
                try:
                    # Get the user
                    user = db.query(User).filter(User.id == int(user_id)).first()
                    if not user:
                        logging.error(f"User not found: {user_id}")
                        return {"status": "error", "message": "User not found"}
                    
                    # Create or update subscription
                    existing_subscription = db.query(Subscription).filter(
                        Subscription.user_id == user.id
                    ).first()
                    
                    if existing_subscription:
                        # Update existing subscription
                        existing_subscription.plan_type = plan_type
                        existing_subscription.status = "active"
                        existing_subscription.is_trial = True
                        existing_subscription.trial_start = datetime.now(timezone.utc)
                        existing_subscription.trial_end = datetime.now(timezone.utc) + timedelta(days=Config.TRIAL_DAYS)
                        existing_subscription.current_period_start = datetime.now(timezone.utc)
                        existing_subscription.current_period_end = datetime.now(timezone.utc) + timedelta(days=Config.TRIAL_DAYS)
                    else:
                        # Create new subscription
                        subscription = Subscription(
                            user_id=user.id,
                            plan_type=plan_type,
                            status="active",
                            is_trial=True,
                            trial_start=datetime.now(timezone.utc),
                            trial_end=datetime.now(timezone.utc) + timedelta(days=Config.TRIAL_DAYS),
                            current_period_start=datetime.now(timezone.utc),
                            current_period_end=datetime.now(timezone.utc) + timedelta(days=Config.TRIAL_DAYS)
                        )
                        db.add(subscription)
                    
                    # Create payment record
                    payment = Payment(
                        user_id=user.id,
                        stripe_payment_intent_id=session.get("payment_intent"),
                        amount=Config.SUBSCRIPTION_PLANS[plan_type]["price"],
                        currency="usd",
                        status="succeeded",
                        plan_type=plan_type
                    )
                    db.add(payment)
                    
                    db.commit()
                    logging.info(f"Successfully processed checkout session for user {user_email}")
                    
                except Exception as e:
                    logging.error(f"Error processing checkout session: {str(e)}")
                    db.rollback()
                    return {"status": "error", "message": f"Error processing session: {str(e)}"}
        
        return {"status": "success"}
        
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/subscriptions/cancel")
async def cancel_subscription(current_user: User = Depends(get_current_user), db = Depends(get_db)):
    """Cancel user subscription"""
    success = StripeService.cancel_subscription(db, current_user.id)
    if success:
        return {"message": "Subscription cancelled successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to cancel subscription"
        )

# ==================== EXISTING AI MAPPING ENDPOINTS ====================

class DatabaseConfig(BaseModel):
    type: str
    host: str
    port: str
    database: str
    username: str
    password: str
    name: str

class AIConfig(BaseModel):
    provider: str
    apiKey: str
    model: str
    # Hybrid scoring weights (0..1). Defaults preserve current behavior bias.
    w_name: float = 0.35
    w_desc: float = 0.35
    w_synonym: float = 0.15
    w_type: float = 0.10
    w_pattern: float = 0.05
    # Threshold bands
    min_accept_confidence: float = 0.75
    min_candidate_confidence: float = 0.45
    # Offline mode: when true, never call network AIs; rely on JDE config + patterns + local similarity
    useOfflineOnly: bool = True
    # FLAN-T5 Local Model Configuration
    flan_t5_model_name: str = "google/flan-t5-base"  # Model to use for local FLAN-T5
    flan_t5_device: str = "auto"  # Device for FLAN-T5 (auto, cpu, cuda, mps)
    flan_t5_max_length: int = 100  # Maximum length for generated descriptions
    flan_t5_temperature: float = 0.7  # Temperature for text generation
    flan_t5_top_p: float = 0.9  # Top-p for text generation
    # Provider priority: Only FLAN-T5 local model and pattern fallback
    provider_priority: List[str] = [
        "flan-t5-local",  # FLAN-T5 Local Model (primary)
        "pattern_fallback"  # Pattern-based fallback only
    ]

def _call_ai_with_failover(prompt: str, ai_config: AIConfig) -> Optional[str]:
    """Generate description using FLAN-T5 local model only.
    Returns generated text or None if generation fails.
    """
    try:
        # Only use FLAN-T5 Local Model
        print(f"🤖 Using FLAN-T5 Local Model for description generation")
        flan_service = get_flan_t5_service(ai_config.flan_t5_model_name)
        
        # Extract column info from prompt if possible
        column_name = ""
        column_type = ""
        context = ""
        
        # Try to parse column info from the prompt
        if "column" in prompt.lower() and "'" in prompt:
            try:
                # Look for pattern like "column 'COLUMN_NAME' of type 'TYPE'"
                import re
                col_match = re.search(r"column\s+'([^']+)'", prompt, re.IGNORECASE)
                type_match = re.search(r"type\s+'([^']+)'", prompt, re.IGNORECASE)
                
                if col_match:
                    column_name = col_match.group(1)
                if type_match:
                    column_type = type_match.group(1)
            except:
                pass
        
        # Generate description using FLAN-T5 local service
        description = flan_service.generate_description(column_name, column_type, context)
        if description:
            print(f"✅ FLAN-T5 Local ({ai_config.flan_t5_model_name}) generated description: {description}")
            return description
        else:
            print(f"❌ FLAN-T5 Local ({ai_config.flan_t5_model_name}) failed to generate description")
            return None
            
    except Exception as e:
        print(f"❌ FLAN-T5 Local error: {str(e)}")
        return None

class TestAIConfig(BaseModel):
    provider: str
    apiKey: str
    model: str

class ColumnInfo(BaseModel):
    name: str
    type: str
    isNullable: bool
    defaultValue: Optional[str] = None
    maxLength: Optional[int] = None
    precision: Optional[int] = None
    scale: Optional[int] = None

class ForeignKeyInfo(BaseModel):
    columnName: str
    foreignTableName: str
    foreignColumnName: str

class TableSchema(BaseModel):
    tableName: str
    columns: List[ColumnInfo]
    primaryKeys: List[str]
    foreignKeys: List[ForeignKeyInfo]

class SchemaAnalysis(BaseModel):
    tables: List[TableSchema]
    relationships: List[Dict]

class TableSelectionRequest(BaseModel):
    sourceTables: List[str]
    targetTables: List[str]

class MappingRequest(BaseModel):
    sourceConfig: DatabaseConfig
    targetConfig: DatabaseConfig
    aiConfig: AIConfig
    tableSelection: Optional[TableSelectionRequest] = None

class MappingResult(BaseModel):
    sourceColumn: str
    sourceTable: str
    sourceType: str
    targetColumn: str
    targetTable: str
    targetType: str
    confidence: float
    aiDescription: str
    similarityScore: float

class CandidateMapping(BaseModel):
    sourceColumn: str
    sourceTable: str
    targetColumn: str
    targetTable: str
    score: float
    percent: float
    components: Dict[str, float]

class ExecuteRequest(BaseModel):
    mappings: List[MappingResult]

class ExecutionResult(BaseModel):
    sourceColumn: str
    sourceTable: str
    targetColumn: str
    targetTable: str
    status: str
    rowsProcessed: int
    rowsSuccessful: int
    errorMessage: Optional[str] = None
    executionTime: float

class AIStatusResponse(BaseModel):
    status: str
    message: str
    provider: str
    model: str

# Helper functions for mapping generation
def calculate_similarity(str1: str, str2: str) -> float:
    """Calculate similarity between two strings using multiple methods"""
    if not str1 or not str2:
        return 0.0
    
    # Normalize strings
    str1_clean = re.sub(r'[^a-zA-Z0-9]', '', str1.lower())
    str2_clean = re.sub(r'[^a-zA-Z0-9]', '', str2.lower())
    
    # Sequence matcher similarity
    seq_similarity = SequenceMatcher(None, str1_clean, str2_clean).ratio()
    
    # Exact match bonus
    exact_bonus = 1.0 if str1_clean == str2_clean else 0.0
    
    # Contains bonus
    contains_bonus = 0.5 if str1_clean in str2_clean or str2_clean in str1_clean else 0.0
    
    # Word overlap bonus
    words1 = set(str1_clean.split())
    words2 = set(str2_clean.split())
    if words1 and words2:
        word_overlap = len(words1.intersection(words2)) / max(len(words1), len(words2))
    else:
        word_overlap = 0.0
    
    # Combine all similarity measures
    final_similarity = (seq_similarity * 0.4 + exact_bonus * 0.3 + contains_bonus * 0.2 + word_overlap * 0.1)
    
    return min(final_similarity, 1.0)

def analyze_unmapped_columns(source_tables: List[TableSchema], target_tables: List[TableSchema], mappings: List[MappingResult]) -> dict:
    """Analyze unmapped columns and provide human mapping recommendations"""
    
    # Get all mapped columns
    mapped_source_cols = {m.sourceColumn for m in mappings}
    mapped_target_cols = {m.targetColumn for m in mappings}
    
    # Find unmapped columns
    unmapped_source = []
    unmapped_target = []
    
    for table in source_tables:
        for col in table.columns:
            if col.name not in mapped_source_cols:
                unmapped_source.append({
                    'table': table.tableName,
                    'column': col.name,
                    'type': col.type,
                    'nullable': col.isNullable,
                    'max_length': getattr(col, 'maxLength', None)
                })
    
    for table in target_tables:
        for col in table.columns:
            if col.name not in mapped_target_cols:
                unmapped_target.append({
                    'table': table.tableName,
                    'column': col.name,
                    'type': col.type,
                    'nullable': col.isNullable,
                    'max_length': getattr(col, 'maxLength', None)
                })
    
    # Generate manual mapping suggestions
    manual_mapping_suggestions = []
    
    for source_col_info in unmapped_source:
        source_col = source_col_info['column']
        suggestions = []
        
        for target_col_info in unmapped_target:
            target_col = target_col_info['column']
            
            # Calculate similarity using multiple algorithms
            similarity = calculate_name_similarity(source_col, target_col)
            
            # Check type compatibility
            type_compatibility = calculate_type_compatibility(source_col_info['type'], target_col_info['type'])
            
            # Business context scoring
            business_score = 0.0
            source_lower = source_col.lower()
            target_lower = target_col.lower()
            
            # Customer/Client context
            if any(word in source_lower for word in ['customer', 'client', 'user', 'account']):
                if any(word in target_lower for word in ['customer', 'client', 'user', 'account']):
                    business_score = 0.3
            
            # Product/Item context
            elif any(word in source_lower for word in ['product', 'item', 'goods', 'service']):
                if any(word in target_lower for word in ['product', 'item', 'goods', 'service']):
                    business_score = 0.3
            
            # Order/Transaction context
            elif any(word in source_lower for word in ['order', 'transaction', 'sale', 'purchase']):
                if any(word in target_lower for word in ['order', 'transaction', 'sale', 'purchase']):
                    business_score = 0.3
            
            # Date/Time context
            elif any(word in source_lower for word in ['date', 'time', 'created', 'modified', 'timestamp']):
                if any(word in target_lower for word in ['date', 'time', 'created', 'modified', 'timestamp']):
                    business_score = 0.2
            
            # Amount/Quantity context
            elif any(word in source_lower for word in ['amount', 'price', 'cost', 'quantity', 'qty', 'total']):
                if any(word in target_lower for word in ['amount', 'price', 'cost', 'quantity', 'qty', 'total']):
                    business_score = 0.2
            
            # Calculate overall score
            overall_score = (similarity * 0.4 + type_compatibility * 0.3 + business_score * 0.3)
            
            if overall_score > 0.3:  # Lower threshold for suggestions
                suggestions.append({
                    'target_column': target_col,
                    'target_table': target_col_info['table'],
                    'similarity': similarity,
                    'type_compatibility': type_compatibility,
                    'business_score': business_score,
                    'overall_score': overall_score
                })
        
        # Sort suggestions by overall score
        suggestions.sort(key=lambda x: x['overall_score'], reverse=True)
        
        if suggestions:
            manual_mapping_suggestions.append({
                'source_column': source_col,
                'source_table': source_col_info['table'],
                'source_type': source_col_info['type'],
                'suggestions': suggestions[:5]  # Top 5 suggestions
            })
    
    # Business impact assessment
    critical_patterns = ['id', 'key', 'code', 'number', 'name', 'date', 'amount', 'customer', 'product', 'order']
    critical_unmapped_source = [col for col in unmapped_source if any(pattern in col['column'].lower() for pattern in critical_patterns)]
    
    # Generate human mapping workflow
    human_mapping_workflow = {
        "phase_1": {
            "title": "Critical Column Review",
            "description": "Review unmapped columns with critical business patterns",
            "columns": [col['column'] for col in critical_unmapped_source[:10]],
            "priority": "HIGH",
            "estimated_time": "2-4 hours"
        },
        "phase_2": {
            "title": "Business Context Analysis",
            "description": "Analyze remaining unmapped columns for business context",
            "columns": [col['column'] for col in unmapped_source if col['column'] not in [c['column'] for c in critical_unmapped_source]],
            "priority": "MEDIUM",
            "estimated_time": "4-8 hours"
        },
        "phase_3": {
            "title": "Data Transformation Planning",
            "description": "Plan data transformations for incompatible mappings",
            "columns": [col['column'] for col in unmapped_source if col['type'] not in ['VARCHAR', 'INT', 'DATETIME']],
            "priority": "MEDIUM",
            "estimated_time": "2-4 hours"
        }
    }
    
    return {
        "unmapped_source_count": len(unmapped_source),
        "unmapped_target_count": len(unmapped_target),
        "unmapped_source_columns": unmapped_source,
        "unmapped_target_columns": unmapped_target,
        "manual_mapping_suggestions": manual_mapping_suggestions,
        "critical_columns": critical_unmapped_source,
        "human_mapping_workflow": human_mapping_workflow,
        "business_impact": {
            "high_impact": len(critical_unmapped_source),
            "medium_impact": len(unmapped_source) - len(critical_unmapped_source),
            "low_impact": len(unmapped_target)
        }
    }

def generate_column_mappings(source_table: TableSchema, target_table: TableSchema, ai_config: AIConfig, table_similarity: float) -> List[MappingResult]:
    """Generate column mappings between source and target tables with enhanced JDE support"""
    mappings: List[MappingResult] = []
    print(f"🔍 Generating column mappings between {source_table.tableName} and {target_table.tableName}")

    # 1) Direct mappings
    direct_mappings = generate_direct_mappings(source_table, target_table)
    mappings.extend(direct_mappings)
    mapped_source_cols = {m.sourceColumn for m in direct_mappings}
    mapped_target_cols = {m.targetColumn for m in direct_mappings}

    # 2) Build candidate list using hybrid scorer
    candidates: List[Tuple[float, any, any, Dict[str, float]]] = []
    for s in source_table.columns:
        if s.name in mapped_source_cols:
            continue
        for t in target_table.columns:
            if t.name in mapped_target_cols:
                continue
            det = compute_hybrid_confidence(s, t, ai_config)
            if det['final'] >= ai_config.min_candidate_confidence:
                candidates.append((det['final'], s, t, det))

    # 3) Greedy one-to-one selection
    candidates.sort(key=lambda x: x[0], reverse=True)
    for score, s, t, det in candidates:
        if s.name in mapped_source_cols or t.name in mapped_target_cols:
            continue
        mapping = MappingResult(
            sourceColumn=s.name,
            sourceTable=source_table.tableName,
            sourceType=s.type,
            targetColumn=t.name,
            targetTable=target_table.tableName,
            targetType=t.type,
            confidence=score,
            aiDescription=(
                f"Hybrid score (name={det['name']:.2f}, desc={det['desc']:.2f}, syn={det['synonym']:.2f}, type={det['type']:.2f}, pat={det['pattern']:.2f})"
            ),
            similarityScore=score
        )
        mappings.append(mapping)
        mapped_source_cols.add(s.name)
        mapped_target_cols.add(t.name)
        print(f"  🔗 {s.name} → {t.name} (score: {score:.2f})")

    # Report summary
    print(f"\n📊 MAPPING SUMMARY REPORT")
    print("=" * 60)
    high_confidence = len([m for m in mappings if m.confidence >= ai_config.min_accept_confidence])
    medium_confidence = len([m for m in mappings if ai_config.min_candidate_confidence <= m.confidence < ai_config.min_accept_confidence])
    low_confidence = len([m for m in mappings if m.confidence < ai_config.min_candidate_confidence])
    print(f"✅ High Confidence (≥{ai_config.min_accept_confidence:.2f}): {high_confidence}")
    print(f"🟡 Medium Confidence (≥{ai_config.min_candidate_confidence:.2f}): {medium_confidence}")
    print(f"🟠 Low Confidence (<{ai_config.min_candidate_confidence:.2f}): {low_confidence}")

    # Non-mapped columns suggestions (simple name-based hints)
    unmapped_source = [col.name for col in source_table.columns if col.name not in mapped_source_cols]
    unmapped_target = [col.name for col in target_table.columns if col.name not in mapped_target_cols]
    if unmapped_source:
        for col in unmapped_source:
            suggestions = []
            for t in target_table.columns:
                if t.name not in mapped_target_cols:
                    sim = calculate_name_similarity(col, t.name)
                    if sim > 0.3:
                        suggestions.append((t.name, sim))
            suggestions.sort(key=lambda x: x[1], reverse=True)
            if suggestions[:1]:
                top = suggestions[:1][0]
                print(f"  💡 Suggest: {col} → {top[0]} (sim {top[1]:.2f})")

    return mappings

def calculate_type_compatibility(source_type: str, target_type: str) -> float:
    """Calculate compatibility between data types"""
    source_lower = source_type.lower()
    target_lower = target_type.lower()
    
    # Exact type match
    if source_lower == target_lower:
        return 1.0
    
    # Numeric type compatibility
    numeric_types = ['int', 'integer', 'bigint', 'smallint', 'tinyint', 'decimal', 'numeric', 'float', 'double', 'real']
    if any(num in source_lower for num in numeric_types) and any(num in target_lower for num in numeric_types):
        return 0.8
    
    # String type compatibility
    string_types = ['varchar', 'char', 'text', 'longtext', 'mediumtext', 'tinytext']
    if any(str_type in source_lower for str_type in string_types) and any(str_type in target_lower for str_type in string_types):
        return 0.7
    
    # Date/time type compatibility
    date_types = ['date', 'datetime', 'timestamp', 'time', 'year']
    if any(date_type in source_lower for date_type in date_types) and any(date_type in target_lower for date_type in date_types):
        return 0.8
    
    # Boolean type compatibility
    bool_types = ['bool', 'boolean', 'bit']
    if any(bool_type in source_lower for bool_type in bool_types) and any(bool_type in target_lower for bool_type in bool_types):
        return 0.9
    
    # Default compatibility for unknown types
    return 0.3

def generate_ai_mapping_description(source_col: ColumnInfo, target_col: ColumnInfo, ai_config: AIConfig, confidence: float) -> str:
    """Generate AI-powered description for column mapping"""
    # For now, generate a descriptive mapping description
    # In production, this would call your AI service
    
    confidence_level = "high" if confidence > 0.7 else "medium" if confidence > 0.4 else "low"
    
    description = f"Mapping from {source_col.name} ({source_col.type}) to {target_col.name} ({target_col.type}) with {confidence_level} confidence"
    
    # Add type compatibility note
    if source_col.type.lower() == target_col.type.lower():
        description += " - Exact type match"
    elif calculate_type_compatibility(source_col.type, target_col.type) > 0.7:
        description += " - Compatible types"
    else:
        description += " - Type conversion may be needed"
    
    return description

# Add subscription check middleware for AI endpoints
def check_subscription_access(current_user: User = Depends(get_current_user), db = Depends(get_db)):
    """Check if user has active subscription or trial"""
    subscription_status = get_user_subscription_status(db, current_user.id)
    
    if subscription_status["is_expired"] and not subscription_status["is_trial"]:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Subscription expired. Please upgrade to continue using the service."
        )
    
    return current_user

@app.post("/test-connection")
async def test_connection(config: DatabaseConfig):
    """Test database connection and permissions"""
    try:
        # Create connection string based on database type
        if config.type.lower() == "mysql":
            connection_string = f"mysql+pymysql://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
        elif config.type.lower() == "postgresql":
            connection_string = f"postgresql://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
        elif config.type.lower() == "sqlserver":
            connection_string = f"mssql+pyodbc://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}?driver=ODBC+Driver+17+for+SQL+Server"
        else:
            raise HTTPException(status_code=400, detail="Unsupported database type")
        
        # Test connection with optimized timeout
        engine = create_engine(
            connection_string,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            connect_args={
                "connect_timeout": 10,  # Reduced connection timeout for faster testing
                "read_timeout": 10,     # Reduced read timeout for faster testing
            }
        )
        
        with engine.connect() as connection:
            # Test basic connection
            connection.execute(text("SELECT 1"))
            
            # Test table access permissions
            if config.type.lower() == "mysql":
                try:
                    # Test INFORMATION_SCHEMA access
                    result = connection.execute(text("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"))
                    table_count = result.scalar()
                    
                    # Test SHOW TABLES access
                    result = connection.execute(text("SHOW TABLES"))
                    show_tables = [row[0] for row in result]
                    
                    return {
                        "status": "success", 
                        "message": f"Database connection successful. Found {table_count} tables. User has proper permissions.",
                        "table_count": table_count,
                        "sample_tables": show_tables[:5] if show_tables else []
                    }
                except Exception as perm_error:
                    return {
                        "status": "warning", 
                        "message": f"Connection successful but limited permissions: {str(perm_error)}. Some features may not work.",
                        "table_count": 0,
                        "sample_tables": []
                    }
            else:
                return {"status": "success", "message": "Database connection successful"}
        
    except Exception as e:
        return {"status": "error", "message": f"Connection failed: {str(e)}"}
    try:
        # Create connection string based on database type
        if config.type.lower() == "mysql":
            connection_string = f"mysql+pymysql://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
        elif config.type.lower() == "postgresql":
            connection_string = f"postgresql://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
        elif config.type.lower() == "sqlserver":
            connection_string = f"mssql+pyodbc://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}?driver=ODBC+Driver+17+for+SQL+Server"
        else:
            raise HTTPException(status_code=400, detail="Unsupported database type")
        
        # Test connection with optimized timeout
        engine = create_engine(
            connection_string,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            connect_args={
                "connect_timeout": 10,  # Reduced connection timeout for faster testing
                "read_timeout": 10,     # Reduced read timeout for faster testing
            }
        )
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        
        return {"status": "success", "message": "Database connection successful"}
    except Exception as e:
        return {"status": "error", "message": f"Connection failed: {str(e)}"}

@app.post("/test-ai-connection", response_model=AIStatusResponse)
async def test_ai_connection(config: TestAIConfig):
    """Deprecated: AI connection testing is disabled."""
    return AIStatusResponse(
        status="error",
        message="AI features are disabled",
        provider=config.provider,
        model=config.model
    )

@lru_cache(maxsize=100)
def _get_schema_cache_key(config_hash: str) -> str:
    """Generate cache key for schema requests"""
    return config_hash

@app.post("/get-schema", response_model=SchemaAnalysis)
async def get_schema(config: DatabaseConfig):
    """Get database schema with caching for performance"""
    try:
        # Validate input parameters
        if not config.database or not config.host or not config.username:
            raise HTTPException(
                status_code=400, 
                detail="Missing required database parameters: database, host, and username are required"
            )
        
        print(f"🔍 Getting schema for database: {config.database} on {config.host}:{config.port}")
        print(f"👤 User: {config.username}")
        print(f"🗄️  Type: {config.type}")
        # Create cache key from database configuration
        config_hash = hashlib.md5(
            f"{config.type}:{config.host}:{config.port}:{config.database}:{config.username}".encode()
        ).hexdigest()
        
        # Check if we have cached schema for this database
        cache_key = _get_schema_cache_key(config_hash)
        if hasattr(get_schema, '_cache') and cache_key in get_schema._cache:
            print(f"📋 Returning cached schema for {config.database}")
            return get_schema._cache[cache_key]
        
        # Create connection string based on database type
        if config.type.lower() == "mysql":
            connection_string = f"mysql+pymysql://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
        elif config.type.lower() == "postgresql":
            connection_string = f"postgresql://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
        elif config.type.lower() == "sqlserver":
            connection_string = f"mssql+pyodbc://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}?driver=ODBC+Driver+17+for+SQL+Server"
        else:
            raise HTTPException(status_code=400, detail="Unsupported database type")
        
        # Get schema with optimized connection pooling and parallel processing
        print(f"🔌 Creating database connection...")
        engine = create_engine(
            connection_string,
            pool_pre_ping=True,
            pool_recycle=3600,
            pool_size=20,  # Increased pool size for parallel operations
            max_overflow=30,  # Allow more connections when needed
            pool_timeout=30,  # Wait up to 30 seconds for available connection
            connect_args={
                "connect_timeout": 15,  # Reduced connection timeout
                "read_timeout": 30,     # Reduced read timeout
            }
        )
        
        print(f"🔍 Testing database connection...")
        try:
            # Test the connection first
            with engine.connect() as test_conn:
                test_conn.execute(text("SELECT 1"))
            print(f"✅ Database connection successful")
        except Exception as conn_error:
            print(f"❌ Database connection failed: {str(conn_error)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to connect to database: {str(conn_error)}"
            )
        
        inspector = inspect(engine)
        
        # Get table names first
        print(f"📋 Getting table names...")
        table_names = inspector.get_table_names()
        print(f"🔍 Found {len(table_names)} tables to analyze")
        if table_names:
            print(f"📋 Table names: {', '.join(table_names[:10])}{'...' if len(table_names) > 10 else ''}")
        else:
            print("⚠️  No tables found! This might indicate:")
            print("   - Database is empty")
            print("   - User lacks permissions to view tables")
            print("   - Database connection issue")
            print("   - Wrong database selected")
            
            # Try to get more information about what the user can see
            try:
                with engine.connect() as connection:
                    # Test basic access
                    result = connection.execute(text("SHOW TABLES"))
                    show_tables = [row[0] for row in result]
                    print(f"🔍 SHOW TABLES result: {show_tables}")
                    
                    # Test information schema access
                    result = connection.execute(text("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"))
                    info_schema_count = result.scalar()
                    print(f"🔍 INFORMATION_SCHEMA.TABLES count: {info_schema_count}")
                    
            except Exception as debug_error:
                print(f"🔍 Debug query failed: {debug_error}")
        
        # Use parallel processing for faster schema fetching
        import concurrent.futures
        from functools import partial
        
        def analyze_table(table_name: str) -> TableSchema:
            """Analyze a single table efficiently with database-specific optimizations"""
            try:
                # Get all table information in parallel
                with engine.connect() as connection:
                    if config.type.lower() == "mysql":
                        try:
                            # Try INFORMATION_SCHEMA first (fastest)
                            columns_result = connection.execute(text(f"""
                                SELECT 
                                    COLUMN_NAME as name,
                                    DATA_TYPE as type,
                                    IS_NULLABLE as is_nullable,
                                    COLUMN_DEFAULT as default_value,
                                    CHARACTER_MAXIMUM_LENGTH as max_length,
                                    NUMERIC_PRECISION as precision,
                                    NUMERIC_SCALE as scale
                                FROM INFORMATION_SCHEMA.COLUMNS 
                                WHERE TABLE_NAME = '{table_name}' 
                                AND TABLE_SCHEMA = '{config.database}'
                                ORDER BY ORDINAL_POSITION
                            """))
                            
                            # Get primary keys
                            pk_result = connection.execute(text(f"""
                                SELECT COLUMN_NAME
                                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                                WHERE TABLE_NAME = '{table_name}' 
                                AND TABLE_SCHEMA = '{config.database}'
                                AND CONSTRAINT_NAME = 'PRIMARY'
                                ORDER BY ORDINAL_POSITION
                            """))
                            primary_keys = [row.COLUMN_NAME for row in pk_result]
                            
                            # Get foreign keys
                            fk_result = connection.execute(text(f"""
                                SELECT 
                                    COLUMN_NAME,
                                    REFERENCED_TABLE_NAME,
                                    REFERENCED_COLUMN_NAME
                                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                                WHERE TABLE_NAME = '{table_name}' 
                                AND TABLE_SCHEMA = '{config.database}'
                                AND REFERENCED_TABLE_NAME IS NOT NULL
                                ORDER BY ORDINAL_POSITION
                            """))
                            
                        except Exception as info_schema_error:
                            print(f"⚠ INFORMATION_SCHEMA failed for {table_name}, trying alternative method: {info_schema_error}")
                            # Fallback to SHOW COLUMNS if INFORMATION_SCHEMA fails
                            columns_result = connection.execute(text(f"SHOW COLUMNS FROM `{table_name}`"))
                            primary_keys = []
                            fk_result = []
                            
                            # Parse SHOW COLUMNS output
                            columns = []
                            for row in columns_result:
                                col_info = ColumnInfo(
                                    name=row.Field,
                                    type=row.Type,
                                    isNullable=row.Null == 'YES',
                                    defaultValue=row.Default,
                                    maxLength=None,  # Would need parsing from Type field
                                    precision=None,
                                    scale=None
                                )
                                columns.append(col_info)
                                
                                # Check if it's a primary key
                                if row.Key == 'PRI':
                                    primary_keys.append(row.Field)
                            
                            # Create minimal table schema
                            table_schema = TableSchema(
                                tableName=table_name,
                                columns=columns,
                                primaryKeys=primary_keys,
                                foreignKeys=[]
                            )
                            print(f"✓ Completed table: {table_name} ({len(columns)} columns) using SHOW COLUMNS")
                            return table_schema
                        
                    elif config.type.lower() == "postgresql":
                        # PostgreSQL optimized queries
                        columns_result = connection.execute(text(f"""
                            SELECT 
                                column_name as name,
                                data_type as type,
                                is_nullable as is_nullable,
                                column_default as default_value,
                                character_maximum_length as max_length,
                                numeric_precision as precision,
                                numeric_scale as scale
                            FROM information_schema.columns 
                            WHERE table_name = '{table_name}' 
                            AND table_schema = 'public'
                            ORDER BY ordinal_position
                        """))
                        
                        # Get primary keys
                        pk_result = connection.execute(text(f"""
                            SELECT column_name
                            FROM information_schema.key_column_usage 
                            WHERE table_name = '{table_name}' 
                            AND table_schema = 'public'
                            AND constraint_name IN (
                                SELECT constraint_name 
                                FROM information_schema.table_constraints 
                                WHERE table_name = '{table_name}' 
                                AND table_schema = 'public'
                                AND constraint_type = 'PRIMARY KEY'
                            )
                            ORDER BY ordinal_position
                        """))
                        primary_keys = [row.column_name for row in pk_result]
                        
                        # Get foreign keys
                        fk_result = connection.execute(text(f"""
                            SELECT 
                                column_name,
                                referenced_table_name,
                                referenced_column_name
                            FROM information_schema.key_column_usage 
                            WHERE table_name = '{table_name}' 
                            AND table_schema = 'public'
                            AND referenced_table_name IS NOT NULL
                            ORDER BY ordinal_position
                        """))
                        
                    else:
                        # Fallback to SQLAlchemy inspector for other databases
                        columns_result = inspector.get_columns(table_name)
                        primary_keys = inspector.get_pk_constraint(table_name)['constrained_columns']
                        fk_result = inspector.get_foreign_keys(table_name)
                        
                        # Convert to standard format
                        columns = []
                        for column in columns_result:
                            col_info = ColumnInfo(
                                name=column['name'],
                                type=str(column['type']),
                                isNullable=column['nullable'],
                                defaultValue=column.get('default'),
                                maxLength=getattr(column['type'], 'length', None),
                                precision=getattr(column['type'], 'precision', None),
                                scale=getattr(column['type'], 'scale', None)
                            )
                            columns.append(col_info)
                        
                        foreign_keys = []
                        for fk in fk_result:
                            fk_info = ForeignKeyInfo(
                                columnName=fk['constrained_columns'][0],
                                foreignTableName=fk['referred_table'],
                                foreignColumnName=fk['referred_columns'][0]
                            )
                            foreign_keys.append(fk_info)
                        
                        table_schema = TableSchema(
                            tableName=table_name,
                            columns=columns,
                            primaryKeys=primary_keys,
                            foreignKeys=foreign_keys
                        )
                        print(f"✓ Completed table: {table_name} ({len(columns)} columns)")
                        return table_schema
                    
                    # Process results for MySQL and PostgreSQL
                    columns = []
                    for row in columns_result:
                        col_info = ColumnInfo(
                            name=row.name,
                            type=row.type,
                            isNullable=row.is_nullable == 'YES' if hasattr(row, 'is_nullable') else True,
                            defaultValue=row.default_value,
                            maxLength=row.max_length,
                            precision=row.precision,
                            scale=row.scale
                        )
                        columns.append(col_info)
                    
                    foreign_keys = []
                    for row in fk_result:
                        fk_info = ForeignKeyInfo(
                            columnName=row.COLUMN_NAME if hasattr(row, 'COLUMN_NAME') else row.column_name,
                            foreignTableName=row.REFERENCED_TABLE_NAME if hasattr(row, 'REFERENCED_TABLE_NAME') else row.referenced_table_name,
                            foreignColumnName=row.REFERENCED_COLUMN_NAME if hasattr(row, 'REFERENCED_COLUMN_NAME') else row.referenced_column_name
                        )
                        foreign_keys.append(fk_info)
                
                table_schema = TableSchema(
                    tableName=table_name,
                    columns=columns,
                    primaryKeys=primary_keys,
                    foreignKeys=foreign_keys
                )
                print(f"✓ Completed table: {table_name} ({len(columns)} columns)")
                return table_schema
                
            except Exception as table_error:
                print(f"⚠ Error analyzing table {table_name}: {str(table_error)}")
                # Return a minimal table schema instead of failing
                return TableSchema(
                    tableName=table_name,
                    columns=[],
                    primaryKeys=[],
                    foreignKeys=[]
                )
        
        # Process tables in parallel for maximum speed
        tables = []
        print(f"🚀 Starting parallel analysis of {len(table_names)} tables...")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            # Submit all table analysis tasks
            future_to_table = {executor.submit(analyze_table, table_name): table_name for table_name in table_names}
            print(f"📋 Submitted {len(future_to_table)} table analysis tasks")
            
            # Collect results as they complete
            completed_count = 0
            for future in concurrent.futures.as_completed(future_to_table):
                table_name = future_to_table[future]
                completed_count += 1
                try:
                    table_schema = future.result()
                    # Include ALL tables, even if they have no columns (they might be empty tables)
                    tables.append(table_schema)
                    print(f"✅ [{completed_count}/{len(table_names)}] Added table: {table_schema.tableName} with {len(table_schema.columns)} columns")
                except Exception as exc:
                    print(f"⚠ [{completed_count}/{len(table_names)}] Table {table_name} generated an exception: {exc}")
                    continue
        
        print(f"🎯 Schema analysis complete! Found {len(tables)} tables")
        
        # Cache the schema for future requests
        schema_result = SchemaAnalysis(tables=tables, relationships=[])
        if not hasattr(get_schema, '_cache'):
            get_schema._cache = {}
        get_schema._cache[cache_key] = schema_result
        print(f"💾 Cached schema for {config.database} with {len(tables)} tables")
        
        return schema_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schema: {str(e)}")

@app.post("/analyze-schema", response_model=SchemaAnalysis)
async def analyze_schema(
    source_config: DatabaseConfig,
    current_user: User = Depends(check_subscription_access)
):
    """Analyze database schema - requires active subscription"""
    # Your existing schema analysis logic here
    # This is a placeholder - implement your actual logic
    return SchemaAnalysis(tables=[], relationships=[])

@app.post("/generate-mappings")
async def generate_mappings(
    mapping_request: MappingRequest,
    current_user: User = Depends(check_subscription_access)
):
    """Generate column mappings using AI and similarity analysis with enhanced JDE support"""
    try:
        print(f"🚀 Starting enhanced mapping generation for user {current_user.email}")
        
        # Get the actual schemas from the database configurations
        print("📥 Fetching source schema...")
        source_schema = await get_schema(mapping_request.sourceConfig)
        print(f"✅ Source schema loaded: {len(source_schema.tables)} tables")
            
        print("📥 Fetching target schema...")
        target_schema = await get_schema(mapping_request.targetConfig)
        print(f"✅ Target schema loaded: {len(target_schema.tables)} tables")
        
        if not source_schema.tables:
            raise HTTPException(status_code=400, detail="Source schema has no tables")
        if not target_schema.tables:
            raise HTTPException(status_code=400, detail="Target schema has no tables")
        
        print(f"🔍 Analyzing {len(source_schema.tables)} source tables and {len(target_schema.tables)} target tables")
        
        # Generate mappings using enhanced AI and similarity analysis
        mappings = []
        
        # Determine which tables to process based on tableSelection
        source_tables_to_process = source_schema.tables
        target_tables_to_process = target_schema.tables
        
        if mapping_request.tableSelection and mapping_request.tableSelection.sourceTables and mapping_request.tableSelection.targetTables:
            # Filter to only selected tables
            source_tables_to_process = [t for t in source_schema.tables if t.tableName in mapping_request.tableSelection.sourceTables]
            target_tables_to_process = [t for t in target_schema.tables if t.tableName in mapping_request.tableSelection.targetTables]
            print(f"🎯 Processing selected tables: {len(source_tables_to_process)} source tables and {len(target_tables_to_process)} target tables")
        else:
            print(f"🔍 No specific table selection - processing all tables")
        
        # Process each source table
        for source_table in source_tables_to_process:
            print(f"📋 Processing source table: {source_table.tableName}")
            
            # Find best matching target table from the selected target tables
            best_target_table = None
            best_table_similarity = 0
            
            for target_table in target_tables_to_process:
                # Calculate table name similarity
                similarity = calculate_similarity(source_table.tableName.lower(), target_table.tableName.lower())
                if similarity > best_table_similarity:
                    best_table_similarity = similarity
                    best_target_table = target_table
            
            if best_target_table and best_table_similarity > 0.3:  # Minimum similarity threshold
                print(f"🎯 Best target table match: {best_target_table.tableName} (similarity: {best_table_similarity:.2f})")
                
                # Generate enhanced column mappings between these tables
                table_mappings = generate_column_mappings(
                    source_table, 
                    best_target_table, 
                    mapping_request.aiConfig,
                    best_table_similarity
                )
                mappings.extend(table_mappings)
                print(f"✅ Generated {len(table_mappings)} enhanced column mappings for table pair")
            else:
                print(f"⚠️  No good target table match found for {source_table.tableName}")
        
        print(f"🎉 Enhanced mapping generation complete! Generated {len(mappings)} total mappings")

        # Force confidence display to 0 for all mappings (UI shows 0%)
        zero_conf_mappings = []
        for m in mappings:
            md = m.dict() if hasattr(m, 'dict') else dict(m)
            md['confidence'] = 0.0
            zero_conf_mappings.append(md)

        # Build unmapped source coverage with best candidate (may be 0)
        mapped_pairs = {(m.sourceTable, m.sourceColumn) for m in mappings}
        unmapped_sources = []
        for st in source_tables_to_process:
            for sc in st.columns:
                if (st.tableName, sc.name) in mapped_pairs:
                    continue
                best = {"targetColumn": None, "targetTable": None, "score": 0.0, "percent": 0.0}
                # Find best name-sim candidate across all targets
                top_score = -1.0
                top_tcol = None
                top_ttbl = None
                for tt in target_tables_to_process:
                    for tc in tt.columns:
                        sim = calculate_name_similarity(sc.name, tc.name)
                        if sim > top_score:
                            top_score = sim
                            top_tcol = tc
                            top_ttbl = tt
                if top_score > 0:
                    best = {
                        "targetColumn": top_tcol.name if top_tcol else None,
                        "targetTable": top_ttbl.tableName if top_ttbl else None,
                        "score": float(top_score),
                        "percent": float(round(top_score * 100.0, 2))
                    }
                unmapped_sources.append({
                    "sourceColumn": sc.name,
                    "sourceTable": st.tableName,
                    "sourceType": sc.type,
                    "bestCandidate": best
                })
        
        if not mappings:
            return {
                "mappings": [],
                "ai_status": AIStatusResponse(
                    status="success",
                    message="No mappings generated",
                    provider=mapping_request.aiConfig.provider,
                    model=mapping_request.aiConfig.model
                )
            }
        
        return {
            "mappings": zero_conf_mappings,
            "unmapped_sources": unmapped_sources,
            "thresholds": {
                "min_accept_confidence": mapping_request.aiConfig.min_accept_confidence,
                "min_candidate_confidence": mapping_request.aiConfig.min_candidate_confidence
            },
            "ai_status": AIStatusResponse(
                status="success",
                message=f"Successfully generated {len(mappings)} enhanced mappings with JDE support",
                provider=mapping_request.aiConfig.provider,
                model=mapping_request.aiConfig.model
            )
        }
        
    except Exception as e:
        print(f"❌ Error in enhanced mapping generation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate enhanced mappings: {str(e)}")

@app.post("/generate-enhanced-mappings")
async def generate_enhanced_mappings(
    mapping_request: MappingRequest,
    current_user: User = Depends(check_subscription_access)
):
    """Generate enhanced column mappings with detailed JDE analysis and direct mapping support"""
    try:
        print(f"🚀 Starting enhanced JDE mapping generation for user {current_user.email}")
        
        # Get the actual schemas from the database configurations
        print("📥 Fetching source schema...")
        source_schema = await get_schema(mapping_request.sourceConfig)
        print(f"✅ Source schema loaded: {len(source_schema.tables)} tables")
            
        print("📥 Fetching target schema...")
        target_schema = await get_schema(mapping_request.targetConfig)
        print(f"✅ Target schema loaded: {len(target_schema.tables)} tables")
        
        if not source_schema.tables:
            raise HTTPException(status_code=400, detail="Source schema has no tables")
        if not target_schema.tables:
            raise HTTPException(status_code=400, detail="Target schema has no tables")
        
        print(f"🔍 Enhanced analysis of {len(source_schema.tables)} source tables and {len(target_schema.tables)} target tables")
        
        # Generate enhanced mappings with JDE analysis
        mappings = []
        mapping_summary = {
            "direct_mappings": 0,
            "pattern_mappings": 0,
            "similarity_mappings": 0,
            "jde_tables_detected": 0,
            "total_mappings": 0
        }
        
        # Determine which tables to process based on tableSelection
        source_tables_to_process = source_schema.tables
        target_tables_to_process = target_schema.tables
        
        if mapping_request.tableSelection and mapping_request.tableSelection.sourceTables and mapping_request.tableSelection.targetTables:
            source_tables_to_process = [t for t in source_schema.tables if t.tableName in mapping_request.tableSelection.sourceTables]
            target_tables_to_process = [t for t in target_schema.tables if t.tableName in mapping_request.tableSelection.targetTables]
            print(f"🎯 Processing selected tables: {len(source_tables_to_process)} source tables and {len(target_tables_to_process)} target tables")
        
        # Process each source table with enhanced analysis
        for source_table in source_tables_to_process:
            print(f"📋 Processing source table: {source_table.tableName}")
            
            # Check if this is a JDE table
            source_jde_info = get_jde_table_info(source_table.tableName)
            if source_jde_info["description"] != "JDE Table":
                mapping_summary["jde_tables_detected"] += 1
                print(f"  🏢 JDE Table detected: {source_jde_info['description']}")
            
            # Find best matching target table
            best_target_table = None
            best_table_similarity = 0
            
            for target_table in target_tables_to_process:
                similarity = calculate_similarity(source_table.tableName.lower(), target_table.tableName.lower())
                if similarity > best_table_similarity:
                    best_table_similarity = similarity
                    best_target_table = target_table
            
            if best_target_table and best_table_similarity > 0.3:
                print(f"🎯 Best target table match: {best_target_table.tableName} (similarity: {best_table_similarity:.2f})")
                
                # Generate enhanced column mappings
                table_mappings = generate_column_mappings(
                    source_table, 
                    best_target_table, 
                    mapping_request.aiConfig,
                    best_table_similarity
                )
                
                # Categorize mappings
                for mapping in table_mappings:
                    if "DIRECT MAPPING" in mapping.aiDescription:
                        mapping_summary["direct_mappings"] += 1
                    elif "JDE PATTERN MATCH" in mapping.aiDescription:
                        mapping_summary["pattern_mappings"] += 1
                    else:
                        mapping_summary["similarity_mappings"] += 1
                
                mappings.extend(table_mappings)
                print(f"✅ Generated {len(table_mappings)} enhanced mappings for table pair")
            else:
                print(f"⚠️  No good target table match found for {source_table.tableName}")
        
        mapping_summary["total_mappings"] = len(mappings)

        # Build unmapped source coverage for enhanced endpoint
        mapped_pairs = {(m.sourceTable, m.sourceColumn) for m in mappings}
        unmapped_sources = []
        for st in source_tables_to_process:
            for sc in st.columns:
                if (st.tableName, sc.name) in mapped_pairs:
                    continue
                best = {"targetColumn": None, "targetTable": None, "score": 0.0, "percent": 0.0}
                top_score = -1.0
                top_tcol = None
                top_ttbl = None
                for tt in target_tables_to_process:
                    for tc in tt.columns:
                        sim = calculate_name_similarity(sc.name, tc.name)
                        if sim > top_score:
                            top_score = sim
                            top_tcol = tc
                            top_ttbl = tt
                if top_score > 0:
                    best = {
                        "targetColumn": top_tcol.name if top_tcol else None,
                        "targetTable": top_ttbl.tableName if top_ttbl else None,
                        "score": float(top_score),
                        "percent": float(round(top_score * 100.0, 2))
                    }
                unmapped_sources.append({
                    "sourceColumn": sc.name,
                    "sourceTable": st.tableName,
                    "sourceType": sc.type,
                    "bestCandidate": best
                })
        
        # Generate comprehensive non-mapped columns analysis
        print(f"\n🚨 ANALYZING NON-MAPPED COLUMNS")
        print("=" * 60)
        
        unmapped_analysis = analyze_unmapped_columns(source_tables_to_process, target_tables_to_process, mappings)
        mapping_summary["unmapped_analysis"] = unmapped_analysis
        
        print(f"🎉 Enhanced JDE mapping generation complete!")
        print(f"📊 Mapping Summary:")
        print(f"  - Direct Mappings: {mapping_summary['direct_mappings']}")
        print(f"  - JDE Pattern Mappings: {mapping_summary['pattern_mappings']}")
        print(f"  - Similarity Mappings: {mapping_summary['similarity_mappings']}")
        print(f"  - JDE Tables Detected: {mapping_summary['jde_tables_detected']}")
        print(f"  - Total Mappings: {mapping_summary['total_mappings']}")
        print(f"  - Unmapped Source Columns: {unmapped_analysis['unmapped_source_count']}")
        print(f"  - Unmapped Target Columns: {unmapped_analysis['unmapped_target_count']}")
        
        if not mappings:
            return {
                "mappings": [],
                "mapping_summary": mapping_summary,
                "unmapped_analysis": unmapped_analysis,
                "unmapped_sources": unmapped_sources,
                "thresholds": {
                    "min_accept_confidence": mapping_request.aiConfig.min_accept_confidence,
                    "min_candidate_confidence": mapping_request.aiConfig.min_candidate_confidence
                },
                "ai_status": AIStatusResponse(
                    status="success",
                    message="No mappings generated",
                    provider=mapping_request.aiConfig.provider,
                    model=mapping_request.aiConfig.model
                )
            }
        
        # Force 0% confidence for all mappings
        zero_conf_mappings = []
        for m in mappings:
            md = m.dict() if hasattr(m, 'dict') else dict(m)
            md['confidence'] = 0.0
            zero_conf_mappings.append(md)

        return {
            "mappings": zero_conf_mappings,
            "mapping_summary": mapping_summary,
            "unmapped_analysis": unmapped_analysis,
            "unmapped_sources": unmapped_sources,
            "thresholds": {
                "min_accept_confidence": mapping_request.aiConfig.min_accept_confidence,
                "min_candidate_confidence": mapping_request.aiConfig.min_candidate_confidence
            },
            "ai_status": AIStatusResponse(
                status="success",
                message=f"Successfully generated {len(mappings)} enhanced mappings with JDE analysis",
                provider=mapping_request.aiConfig.provider,
                model=mapping_request.aiConfig.model
            )
        }
        
    except Exception as e:
        print(f"❌ Error in enhanced JDE mapping generation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate enhanced JDE mappings: {str(e)}")

@app.get("/jde-table-info/{table_name}")
async def get_jde_table_information(
    table_name: str,
    current_user: User = Depends(check_subscription_access)
):
    """Get detailed JDE table information and column analysis"""
    try:
        print(f"🔍 Getting JDE table info for: {table_name}")
        
        # Get JDE table information
        jde_info = get_jde_table_info(table_name)
        
        # Analyze table name patterns
        table_analysis = {
            "table_name": table_name,
            "jde_info": jde_info,
            "column_patterns": {},
            "business_context": {},
            "mapping_suggestions": []
        }
        
        # Analyze common JDE patterns in the table name
        table_upper = table_name.upper()
        
        # Determine table category
        if table_upper.startswith("F01"):
            table_analysis["business_context"]["category"] = "Address Book & Customer Management"
            table_analysis["business_context"]["module"] = "Customer Relationship Management"
        elif table_upper.startswith("F03"):
            table_analysis["business_context"]["category"] = "Customer Master"
            table_analysis["business_context"]["module"] = "Customer Management"
        elif table_upper.startswith("F42"):
            table_analysis["business_context"]["category"] = "Sales Order Management"
            table_analysis["business_context"]["module"] = "Sales & Distribution"
        elif table_upper.startswith("F41"):
            table_analysis["business_context"]["category"] = "Inventory Management"
            table_analysis["business_context"]["module"] = "Materials Management"
        elif table_upper.startswith("F09"):
            table_analysis["business_context"]["category"] = "General Ledger"
            table_analysis["business_context"]["module"] = "Financial Management"
        elif table_upper.startswith("F55"):
            table_analysis["business_context"]["category"] = "Purchase Order Management"
            table_analysis["business_context"]["module"] = "Procurement"
        else:
            table_analysis["business_context"]["category"] = "Other"
            table_analysis["business_context"]["module"] = "Unknown"
        
        # Generate mapping suggestions based on table type
        if "Address Book" in jde_info["description"]:
            table_analysis["mapping_suggestions"] = [
                "Map to customer/vendor master tables",
                "Consider address standardization",
                "Handle multiple address types (C/V/E)",
                "Map business unit relationships"
            ]
        elif "Sales Order" in jde_info["description"]:
            table_analysis["mapping_suggestions"] = [
                "Map to order management systems",
                "Handle line item relationships",
                "Consider order status workflows",
                "Map customer relationships"
            ]
        elif "Item Master" in jde_info["description"]:
            table_analysis["mapping_suggestions"] = [
                "Map to product catalog systems",
                "Handle unit of measure conversions",
                "Consider item hierarchies",
                "Map to inventory systems"
            ]
        elif "General Ledger" in jde_info["description"]:
            table_analysis["mapping_suggestions"] = [
                "Map to financial systems",
                "Handle chart of accounts",
                "Consider fiscal periods",
                "Map to reporting systems"
            ]
        
        return {
            "status": "success",
            "table_analysis": table_analysis
        }
        
    except Exception as e:
        print(f"❌ Error getting JDE table info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get JDE table information: {str(e)}")

@app.get("/jde-column-analysis/{column_name}")
async def analyze_jde_column(
    column_name: str,
    current_user: User = Depends(check_subscription_access)
):
    """Analyze JDE column naming patterns and provide business insights"""
    try:
        print(f"🔍 Analyzing JDE column: {column_name}")
        
        # Get column analysis
        column_analysis = analyze_jde_column_pattern(column_name)
        
        # Get JDE column description from configuration
        jde_description = get_jde_column_description(column_name)
        synonyms = find_column_synonyms(column_name)
        
        # Add additional insights
        column_analysis["column_name"] = column_name
        column_analysis["jde_description"] = jde_description
        column_analysis["jde_synonyms"] = synonyms
        column_analysis["jde_conventions"] = {
            "naming_pattern": "Standard JDE naming convention",
            "business_meaning": column_analysis["business_meaning"],
            "data_type_hints": [],
            "validation_rules": []
        }
        
        # Add data type hints based on patterns
        column_upper = column_name.upper()
        
        if any(date_pattern in column_upper for date_pattern in ["DATE", "DT", "J", "T"]):
            column_analysis["jde_conventions"]["data_type_hints"].append("Likely DATE or TIMESTAMP type")
            column_analysis["jde_conventions"]["validation_rules"].append("Validate date format (Julian dates common in JDE)")
        elif any(qty_pattern in column_upper for qty_pattern in ["QTY", "QOH", "QOO", "QTS", "QTO", "QRS", "QRL"]):
            column_analysis["jde_conventions"]["data_type_hints"].append("Likely NUMERIC type")
            column_analysis["jde_conventions"]["validation_rules"].append("Validate positive numbers")
        elif any(amt_pattern in column_upper for amt_pattern in ["AMT", "AM", "TOT", "NET", "GROSS"]):
            column_analysis["jde_conventions"]["data_type_hints"].append("Likely DECIMAL type")
            column_analysis["jde_conventions"]["validation_rules"].append("Validate decimal precision")
        elif any(status_pattern in column_upper for status_pattern in ["ST", "STAT", "STS"]):
            column_analysis["jde_conventions"]["data_type_hints"].append("Likely CHAR or VARCHAR type")
            column_analysis["jde_conventions"]["validation_rules"].append("Validate against status code lists")
        
        return {
            "status": "success",
            "column_analysis": column_analysis
        }
        
    except Exception as e:
        print(f"❌ Error analyzing JDE column: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze JDE column: {str(e)}")

@app.get("/jde-config-info")
async def get_jde_config_info(
    current_user: User = Depends(check_subscription_access)
):
    """Get information about the loaded JDE configuration"""
    try:
        print("🔍 Getting JDE configuration information")
        
        config_info = {
            "total_synonym_groups": len(JDE_SYNONYM_GROUPS),
            "total_column_descriptions": len(JDE_COLUMN_DESCRIPTIONS),
            "synonym_groups_sample": JDE_SYNONYM_GROUPS[:5] if JDE_SYNONYM_GROUPS else [],
            "column_descriptions_sample": dict(list(JDE_COLUMN_DESCRIPTIONS.items())[:5]) if JDE_COLUMN_DESCRIPTIONS else {},
            "config_loaded": bool(JDE_CONFIG),
            "config_keys": list(JDE_CONFIG.keys()) if JDE_CONFIG else []
        }
        
        return {
            "status": "success",
            "jde_config_info": config_info
        }
        
    except Exception as e:
        print(f"❌ Error getting JDE config info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get JDE config info: {str(e)}")

# ==================== CAMPAIGN MANAGEMENT ENDPOINTS ====================

@app.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(
    campaign_data: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a new campaign for the user"""
    try:
        print(f"🚀 Creating campaign '{campaign_data.name}' for user {current_user.email}")
        
        # Create new campaign
        campaign = Campaign(
            user_id=current_user.id,
            name=campaign_data.name,
            description=campaign_data.description,
            source_config=campaign_data.source_config,
            target_config=campaign_data.target_config,
            ai_config=campaign_data.ai_config,
            selected_source_tables=campaign_data.selected_source_tables or [],
            selected_target_tables=campaign_data.selected_target_tables or [],
            status="draft"
        )
        
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        
        print(f"✅ Campaign '{campaign.name}' created successfully with ID {campaign.id}")
        return campaign
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {str(e)}")

@app.get("/campaigns", response_model=CampaignListResponse)
async def get_user_campaigns(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get all campaigns for the current user"""
    try:
        campaigns = db.query(Campaign).filter(
            Campaign.user_id == current_user.id
        ).order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()
        
        total = db.query(Campaign).filter(
            Campaign.user_id == current_user.id
        ).count()
        
        return CampaignListResponse(campaigns=campaigns, total=total)
        
    except Exception as e:
        print(f"❌ Error fetching campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaigns: {str(e)}")

@app.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get a specific campaign by ID"""
    try:
        campaign = db.query(Campaign).filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id
        ).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        return campaign
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get campaign: {str(e)}")

@app.post("/store-mappings-to-target")
async def store_mappings_to_target(
    request: dict,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Store approved mappings data to target database and create a new table named after campaign"""
    try:
        campaign_name = request.get('campaign_name')
        campaign_description = request.get('campaign_description', '')
        source_config = request.get('source_config')
        target_config = request.get('target_config')
        ai_config = request.get('ai_config')
        approved_mappings = request.get('approved_mappings', [])
        
        print(f"🚀 Starting data storage process for campaign: {campaign_name}")
        print(f"📊 Processing {len(approved_mappings)} approved mappings")
        
        if not approved_mappings:
            raise HTTPException(status_code=400, detail="No approved mappings provided")
        
        # Sanitize campaign name for table name (remove spaces, special chars)
        table_name = "campaign_" + re.sub(r'[^a-zA-Z0-9_]', '_', campaign_name.lower())
        print(f"📝 Processing campaign: {campaign_name} (table prefix: {table_name})")
        
        # Connect to source database
        if source_config['type'].lower() == "mysql":
            source_connection_string = f"mysql+pymysql://{source_config['username']}:{source_config['password']}@{source_config['host']}:{source_config['port']}/{source_config['database']}"
        elif source_config['type'].lower() == "postgresql":
            source_connection_string = f"postgresql://{source_config['username']}:{source_config['password']}@{source_config['host']}:{source_config['port']}/{source_config['database']}"
        elif source_config['type'].lower() == "sqlserver":
            source_connection_string = f"mssql+pyodbc://{source_config['username']}:{source_config['password']}@{source_config['host']}:{source_config['port']}/{source_config['database']}?driver=ODBC+Driver+17+for+SQL+Server"
        else:
            raise HTTPException(status_code=400, detail="Unsupported source database type")
        
        source_engine = create_engine(
            source_connection_string,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10
        )
        
        # Connect to target database
        if target_config['type'].lower() == "mysql":
            target_connection_string = f"mysql+pymysql://{target_config['username']}:{target_config['password']}@{target_config['host']}:{target_config['port']}/{target_config['database']}"
        elif target_config['type'].lower() == "postgresql":
            target_connection_string = f"postgresql://{target_config['username']}:{target_config['password']}@{target_config['host']}:{target_config['port']}/{target_config['database']}"
        elif target_config['type'].lower() == "sqlserver":
            target_connection_string = f"mssql+pyodbc://{target_config['username']}:{target_config['password']}@{target_config['host']}:{target_config['port']}/{target_config['database']}?driver=ODBC+Driver+17+for+SQL+Server"
        else:
            raise HTTPException(status_code=400, detail="Unsupported target database type")
        
        target_engine = create_engine(
            target_connection_string,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10
        )
        
        # Start timing the execution
        start_time = time.time()
        
        # Skip main data table creation - only create mapping review table
        print("🔧 Creating mapping review table only (no main data table)...")
        
        # Create a comprehensive mapping review table to store all mapping details
        mapping_review_table = f"{table_name}_review"
        try:
            with target_engine.connect() as target_conn:
                if target_config['type'].lower() == "mysql":
                    review_table_sql = f"""CREATE TABLE IF NOT EXISTS {mapping_review_table} (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        campaign_name VARCHAR(255),
                        campaign_description TEXT,
                        source_table VARCHAR(255),
                        source_column VARCHAR(255),
                        target_table VARCHAR(255),
                        target_column VARCHAR(255),
                        source_type VARCHAR(100),
                        target_type VARCHAR(100),
                        confidence_score DECIMAL(5,2),
                        mapping_status VARCHAR(50),
                        ai_reasoning TEXT,
                        user_notes TEXT,
                        is_approved BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_campaign (campaign_name),
                        INDEX idx_status (mapping_status),
                        INDEX idx_approved (is_approved)
                    );"""
                elif target_config['type'].lower() == "postgresql":
                    review_table_sql = f"""CREATE TABLE IF NOT EXISTS {mapping_review_table} (
                        id SERIAL PRIMARY KEY,
                        campaign_name VARCHAR(255),
                        campaign_description TEXT,
                        source_table VARCHAR(255),
                        source_column VARCHAR(255),
                        target_table VARCHAR(255),
                        target_column VARCHAR(255),
                        source_type VARCHAR(100),
                        target_type VARCHAR(100),
                        confidence_score DECIMAL(5,2),
                        mapping_status VARCHAR(50),
                        ai_reasoning TEXT,
                        user_notes TEXT,
                        is_approved BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS idx_campaign_{mapping_review_table} ON {mapping_review_table} (campaign_name);
                    CREATE INDEX IF NOT EXISTS idx_status_{mapping_review_table} ON {mapping_review_table} (mapping_status);
                    CREATE INDEX IF NOT EXISTS idx_approved_{mapping_review_table} ON {mapping_review_table} (is_approved);"""
                elif target_config['type'].lower() == "sqlserver":
                    review_table_sql = f"""IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='{mapping_review_table}' AND xtype='U')
                    CREATE TABLE {mapping_review_table} (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        campaign_name VARCHAR(255),
                        campaign_description TEXT,
                        source_table VARCHAR(255),
                        source_column VARCHAR(255),
                        target_table VARCHAR(255),
                        target_column VARCHAR(255),
                        source_type VARCHAR(100),
                        target_type VARCHAR(100),
                        confidence_score DECIMAL(5,2),
                        mapping_status VARCHAR(50),
                        ai_reasoning TEXT,
                        user_notes TEXT,
                        is_approved BIT DEFAULT 0,
                        created_at DATETIME2 DEFAULT GETDATE(),
                        updated_at DATETIME2 DEFAULT GETDATE()
                    );
                    CREATE INDEX idx_campaign_{mapping_review_table} ON {mapping_review_table} (campaign_name);
                    CREATE INDEX idx_status_{mapping_review_table} ON {mapping_review_table} (mapping_status);
                    CREATE INDEX idx_approved_{mapping_review_table} ON {mapping_review_table} (is_approved);"""
                
                target_conn.execute(text(review_table_sql))
                
                # Insert all mapping review data (both approved and pending)
                for mapping in approved_mappings:
                    # Determine if this mapping was approved
                    is_approved = mapping.get('status', 'pending') == 'approved'
                    
                    # Get confidence score (convert to decimal if it exists)
                    confidence_score = None
                    if 'confidence' in mapping:
                        try:
                            confidence_score = float(mapping['confidence'])
                        except (ValueError, TypeError):
                            confidence_score = None
                    
                    # Get AI reasoning
                    ai_reasoning = mapping.get('reasoning', '')
                    
                    # Get user notes if any
                    user_notes = mapping.get('notes', '')
                    
                    # Insert mapping review record
                    if target_config['type'].lower() == "mysql":
                        review_insert_sql = f"""
                            INSERT INTO {mapping_review_table} 
                            (campaign_name, campaign_description, source_table, source_column, target_table, target_column, 
                             source_type, target_type, confidence_score, mapping_status, ai_reasoning, user_notes, is_approved)
                            VALUES (:campaign_name, :campaign_description, :source_table, :source_column, :target_table, :target_column, 
                             :source_type, :target_type, :confidence_score, :mapping_status, :ai_reasoning, :user_notes, :is_approved)
                        """
                        target_conn.execute(text(review_insert_sql), {
                            'campaign_name': campaign_name,
                            'campaign_description': campaign_description,
                            'source_table': mapping['sourceTable'],
                            'source_column': mapping['sourceColumn'],
                            'target_table': mapping['targetTable'],
                            'target_column': mapping['targetColumn'],
                            'source_type': mapping.get('sourceType', 'unknown'),
                            'target_type': mapping.get('targetType', 'unknown'),
                            'confidence_score': confidence_score,
                            'mapping_status': mapping.get('status', 'pending'),
                            'ai_reasoning': ai_reasoning,
                            'user_notes': user_notes,
                            'is_approved': is_approved
                        })
                    elif target_config['type'].lower() == "postgresql":
                        review_insert_sql = f"""
                            INSERT INTO {mapping_review_table} 
                            (campaign_name, campaign_description, source_table, source_column, target_table, target_column, 
                             source_type, target_type, confidence_score, mapping_status, ai_reasoning, user_notes, is_approved)
                            VALUES (:campaign_name, :campaign_description, :source_table, :source_column, :target_table, :target_column, 
                             :source_type, :target_type, :confidence_score, :mapping_status, :ai_reasoning, :user_notes, :is_approved)
                        """
                        target_conn.execute(text(review_insert_sql), {
                            'campaign_name': campaign_name,
                            'campaign_description': campaign_description,
                            'source_table': mapping['sourceTable'],
                            'source_column': mapping['sourceColumn'],
                            'target_table': mapping['targetTable'],
                            'target_column': mapping['targetColumn'],
                            'source_type': mapping.get('sourceType', 'unknown'),
                            'target_type': mapping.get('targetType', 'unknown'),
                            'confidence_score': confidence_score,
                            'mapping_status': mapping.get('status', 'pending'),
                            'ai_reasoning': ai_reasoning,
                            'user_notes': user_notes,
                            'is_approved': is_approved
                        })
                    elif target_config['type'].lower() == "sqlserver":
                        review_insert_sql = f"""
                            INSERT INTO {mapping_review_table} 
                            (campaign_name, campaign_description, source_table, source_column, target_table, target_column, 
                             source_type, target_type, confidence_score, mapping_status, ai_reasoning, user_notes, is_approved)
                            VALUES (:campaign_name, :campaign_description, :source_table, :source_column, :target_table, :target_column, 
                             :source_type, :target_type, :confidence_score, :mapping_status, :ai_reasoning, :user_notes, :is_approved)
                        """
                        target_conn.execute(text(review_insert_sql), {
                            'campaign_name': campaign_name,
                            'campaign_description': campaign_description,
                            'source_table': mapping['sourceTable'],
                            'source_column': mapping['sourceColumn'],
                            'target_table': mapping['targetTable'],
                            'target_column': mapping['targetColumn'],
                            'source_type': mapping.get('sourceType', 'unknown'),
                            'target_type': mapping.get('targetType', 'unknown'),
                            'confidence_score': confidence_score,
                            'mapping_status': mapping.get('status', 'pending'),
                            'ai_reasoning': ai_reasoning,
                            'user_notes': user_notes,
                            'is_approved': is_approved
                        })
                
                target_conn.commit()
                print(f"✅ Mapping review table created: {mapping_review_table}")
                print(f"📊 Stored {len(approved_mappings)} mapping review records")
                
        except Exception as e:
            print(f"⚠️ Warning: Could not create mapping review table: {e}")
            import traceback
            traceback.print_exc()
        
        # Step 3: Skip data processing - only metadata tables were created
        print("🔄 Step 3: Skipping data processing - only metadata tables created...")
        
        # Create simple execution results summary
        execution_results = [{
            'source_tables': [],
            'target_table': 'N/A (no data table created)',
            'mapping_review_table': f"{table_name}_review",
            'mapping_reference_table': 'N/A (no reference table created)',
            'status': 'success',
            'rows_processed': 0,
            'rows_successful': 0,
            'rows_failed': 0,
            'execution_time': time.time() - start_time,
            'error_message': None,
            'mappings_processed': len(approved_mappings),
            'source_columns': [f"{m['sourceTable']}.{m['sourceColumn']}" for m in approved_mappings],
            'target_columns': [f"{m['targetTable']}.{m['targetColumn']}" for m in approved_mappings],
            'tables_created': [
                f"{table_name}_review"
            ]
        }]
        
        # Close connections
        source_engine.dispose()
        target_engine.dispose()
        
        # Create campaign record in our database
        try:
            campaign = Campaign(
                user_id=current_user.id,
                name=campaign_name,
                description=campaign_description,
                source_config=source_config,
                target_config=target_config,
                ai_config=ai_config,
                mappings=approved_mappings,
                mapping_count=len(approved_mappings),
                execution_results=execution_results,
                execution_status="completed",
                execution_summary={
                    'total_mappings': len(approved_mappings),
                    'successful_mappings': len([r for r in execution_results if r['status'] == 'success']),
                    'failed_mappings': len([r for r in execution_results if r['status'] == 'failed']),
                    'target_table': table_name,
                    'total_rows_processed': sum(r['rows_processed'] for r in execution_results),
                    'total_rows_successful': sum(r['rows_successful'] for r in execution_results)
                },
                status="completed",
                started_at=func.now(),
                completed_at=func.now()
            )
            
            db.add(campaign)
            db.commit()
            db.refresh(campaign)
            print(f"✅ Campaign record created with ID: {campaign.id}")
            
        except Exception as db_error:
            print(f"⚠️ Warning: Failed to create campaign record: {str(db_error)}")
            # Continue even if campaign record creation fails
        
        success_count = len([r for r in execution_results if r['status'] == 'success'])
        
        return {
            'success': True,
            'message': f'Successfully created mapping review table for {len(approved_mappings)} mappings. Created table: "{table_name}_review" (mapping review). No main data table or reference table created.',
            'results': execution_results,
            'target_table': 'N/A (no data table created)',
            'mapping_review_table': f"{table_name}_review",
            'mapping_reference_table': 'N/A (no reference table created)',
            'summary': {
                'total_mappings': len(approved_mappings),
                'successful_mappings': success_count,
                'failed_mappings': len([r for r in execution_results if r['status'] == 'failed']),
                'target_table': 'N/A (no data table created)',
                'total_rows_processed': 0,
                'total_rows_successful': 0
            }
        }
        
    except Exception as e:
        print(f"❌ Error in store_mappings_to_target: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to store mappings: {str(e)}")

# ==================== PAYMENT ENDPOINTS ====================

@app.put("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    campaign_update: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Update a campaign"""
    try:
        campaign = db.query(Campaign).filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id
        ).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Update fields
        update_data = campaign_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(campaign, field, value)
        
        campaign.updated_at = datetime.now()
        db.commit()
        db.refresh(campaign)
        
        print(f"✅ Campaign '{campaign.name}' updated successfully")
        return campaign
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating campaign {campaign_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update campaign: {str(e)}")

@app.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Delete a campaign"""
    try:
        campaign = db.query(Campaign).filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id
        ).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Note: campaign_executions table may not exist in current database
        # If it exists and has foreign key constraints, we would need to delete related records first
        # For now, we'll proceed with direct campaign deletion
        
        # Now delete the campaign
        db.delete(campaign)
        db.commit()
        
        print(f"✅ Campaign '{campaign.name}' deleted successfully")
        return {"message": "Campaign deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting campaign {campaign_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete campaign: {str(e)}")

@app.post("/campaigns/{campaign_id}/execute-mappings")
async def execute_campaign_mappings(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Execute mapping generation for a campaign"""
    try:
        campaign = db.query(Campaign).filter(
            Campaign.id == campaign_id,
            Campaign.user_id == current_user.id
        ).first()
        
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        print(f"🚀 Executing mappings for campaign '{campaign.name}'")
        
        # Create execution record
        execution = CampaignExecution(
            campaign_id=campaign.id,
            execution_type="mapping_generation",
            status="running"
        )
        db.add(execution)
        db.commit()
        
        try:
            # Generate mappings using existing logic
            source_schema = await get_schema(campaign.source_config)
            target_schema = await get_schema(campaign.target_config)
            
            if not source_schema.tables:
                raise HTTPException(status_code=400, detail="Source schema has no tables")
            if not target_schema.tables:
                raise HTTPException(status_code=400, detail="Target schema has no tables")
            
            # Generate mappings
            mappings = []
            source_tables_to_process = source_schema.tables
            target_tables_to_process = target_schema.tables
            
            if campaign.selected_source_tables and campaign.selected_target_tables:
                source_tables_to_process = [t for t in source_schema.tables if t.tableName in campaign.selected_source_tables]
                target_tables_to_process = [t for t in target_schema.tables if t.tableName in campaign.selected_target_tables]
            
            for source_table in source_tables_to_process:
                best_target_table = None
                best_table_similarity = 0
                
                for target_table in target_tables_to_process:
                    similarity = calculate_similarity(source_table.tableName.lower(), target_table.tableName.lower())
                    if similarity > best_table_similarity:
                        best_table_similarity = similarity
                        best_target_table = target_table
                
                if best_target_table and best_table_similarity > 0.3:
                    table_mappings = generate_column_mappings(
                        source_table, 
                        best_target_table, 
                        campaign.ai_config,
                        best_table_similarity
                    )
                    mappings.extend(table_mappings)
            
            # Update campaign with mappings
            campaign.mappings = [m.dict() for m in mappings]
            campaign.mapping_count = len(mappings)
            campaign.status = "mappings_generated"
            campaign.updated_at = datetime.now()
            
            # Update execution record
            execution.status = "completed"
            execution.completed_at = datetime.now()
            execution.result_summary = {
                "mappings_generated": len(mappings),
                "source_tables": len(source_tables_to_process),
                "target_tables": len(target_tables_to_process)
            }
            
            db.commit()
            
            print(f"✅ Campaign '{campaign.name}' mappings generated successfully: {len(mappings)} mappings")
            return {
                "message": "Mappings generated successfully",
                "mappings_count": len(mappings),
                "campaign_id": campaign.id
            }
            
        except Exception as mapping_error:
            # Update execution record with error
            execution.status = "failed"
            execution.completed_at = datetime.now()
            execution.error_message = str(mapping_error)
            db.commit()
            
            raise mapping_error
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error executing campaign mappings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to execute campaign mappings: {str(e)}")

@app.post("/execute-mappings", response_model=List[ExecutionResult])
async def execute_mappings(
    execute_request: ExecuteRequest,
    current_user: User = Depends(check_subscription_access)
):
    """Execute column mappings - requires active subscription"""
    # Your existing execution logic here
    # This is a placeholder - implement your actual logic
    return []

@app.post("/generate-column-description")
async def generate_column_description(request: Request):
    """Generate description using FLAN-T5 local model with JDE config fallback. Accepts flexible body to avoid 422 validation errors."""
    try:
        # Extract column info safely
        body = await request.json()
        col = (body or {}).get("column_info") or {}
        column_name = col.get("name") or ""
        column_type = col.get("type") or ""

        if not column_name:
            raise HTTPException(status_code=400, detail="column_info.name is required")

        # Step 1: Check JDE configuration first
        jde_description = get_jde_column_description(column_name)
        if jde_description:
            return {
                "description": jde_description,
                "description_source": "jde_config",
                "jde_description": jde_description,
                "pattern_analysis": analyze_jde_column_pattern(column_name),
                "ai_status": {
                    "status": "jde_config_used",
                    "message": "Description from JDE configuration",
                    "provider": "jde_config",
                    "model": "jde_config"
                }
            }

        # Step 2: Try FLAN-T5 Local AI generation
        ai_cfg = (body or {}).get("ai_config") or {}
        ai_config = AIConfig(
            provider="flan-t5-local",
            apiKey="",
            model=ai_cfg.get("model", "google/flan-t5-base"),
            useOfflineOnly=True,
            flan_t5_model_name=ai_cfg.get("flan_t5_model_name", "google/flan-t5-base"),
            flan_t5_device=ai_cfg.get("flan_t5_device", "auto"),
            provider_priority=["flan-t5-local", "pattern_fallback"]
        )

        print(f"🤖 Using FLAN-T5 Local ({ai_config.flan_t5_model_name}) for column: {column_name}")
        flan_service = get_flan_t5_service(ai_config.flan_t5_model_name)
        ai_description = flan_service.generate_description(column_name, column_type, "")

        if ai_description:
            print(f"✅ FLAN-T5 Local ({ai_config.flan_t5_model_name}) generated: {ai_description}")
            return {
                "description": ai_description,
                "description_source": "flan_t5_local",
                "jde_description": None,
                "pattern_analysis": analyze_jde_column_pattern(column_name),
                "ai_status": {
                    "status": "success",
                    "message": f"Description generated using FLAN-T5 Local ({ai_config.flan_t5_model_name})",
                    "provider": "flan-t5-local",
                    "model": ai_config.flan_t5_model_name
                }
            }

        # Step 3: Pattern-based fallback
        pattern_description = generate_pattern_based_description(column_name, column_type) or ""
        return {
            "description": pattern_description,
            "description_source": "pattern_fallback" if pattern_description else "missing",
            "jde_description": None,
            "pattern_analysis": analyze_jde_column_pattern(column_name),
            "ai_status": {
                "status": "pattern_fallback" if pattern_description else "failed",
                "message": "Pattern-based description" if pattern_description else "No description available",
                "provider": "pattern_fallback",
                "model": "pattern_fallback"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating description for {column_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate description: {str(e)}")

@app.post("/generate-mapping-description")
async def generate_mapping_description(
    source_config: DatabaseConfig,
    target_config: DatabaseConfig,
    ai_config: AIConfig,
    source_col: ColumnInfo,
    target_col: ColumnInfo
):
    """Return a simple description-only mapping rationale; AI disabled."""
    try:
        src_desc = get_jde_column_description(source_col.name) or ""
        tgt_desc = get_jde_column_description(target_col.name) or ""
        explanation = "Mapping based on description similarity" if src_desc and tgt_desc else "Insufficient descriptions"
        return {
            "description": explanation,
            "enhanced": False,
            "source_analysis": analyze_jde_column_pattern(source_col.name),
            "target_analysis": analyze_jde_column_pattern(target_col.name),
            "jde_synonym_match": is_jde_column_match(source_col.name, target_col.name),
            "ai_status": {
                "status": "disabled",
                "message": "AI features are disabled",
                "provider": getattr(ai_config, "provider", None),
                "model": getattr(ai_config, "model", None)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate mapping description: {str(e)}")

# ==================== HEALTH CHECK ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}

@app.get("/test")
async def test_endpoint():
    """Simple test endpoint for debugging"""
    return {
        "message": "Test endpoint working",
        "timestamp": datetime.now().isoformat(),
        "test_data": {
            "string": "test string",
            "number": 42,
            "boolean": True,
            "array": [1, 2, 3]
        }
    }

@app.get("/test-db")
async def test_database():
    """Test database connectivity and table creation"""
    try:
        from database import get_db
        from models import Campaign, User
        from sqlalchemy import text
        
        db = next(get_db())
        
        # Test basic connection
        result = db.execute(text("SELECT 1"))
        connection_ok = result.fetchone()[0] == 1
        
        # Test if tables exist
        tables_exist = False
        try:
            # Try to query the campaigns table
            campaign_count = db.query(Campaign).count()
            tables_exist = True
        except Exception as e:
            tables_exist = False
        
        # Test if we can create a simple record
        can_create = False
        try:
            # Try to create a test user (will be rolled back)
            test_user = User(
                email="test@example.com",
                username="testuser",
                password_hash="test_hash"
            )
            db.add(test_user)
            db.rollback()  # Rollback to not actually create the user
            can_create = True
        except Exception as e:
            can_create = False
        
        db.close()
        
        return {
            "message": "Database test completed",
            "timestamp": datetime.now().isoformat(),
            "database_status": {
                "connection": "✅ OK" if connection_ok else "❌ Failed",
                "tables_exist": "✅ OK" if tables_exist else "❌ Failed",
                "can_create_records": "✅ OK" if can_create else "❌ Failed"
            }
        }
        
    except Exception as e:
        return {
            "message": "Database test failed",
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "database_status": {
                "connection": "❌ Failed",
                "tables_exist": "❌ Failed",
                "can_create_records": "❌ Failed"
            }
        }

@app.post("/test-campaign")
async def test_campaign_creation():
    """Test campaign creation without authentication"""
    try:
        from database import get_db
        from models import Campaign, User
        
        db = next(get_db())
        
        # Create a test user first
        test_user = User(
            email="test@example.com",
            username="testuser",
            password_hash="test_hash"
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        # Create a test campaign
        test_campaign = Campaign(
            user_id=test_user.id,
            name="Test Campaign",
            description="This is a test campaign to verify database storage",
            source_config={
                "database": "test_source",
                "host": "localhost",
                "port": 3306,
                "type": "mysql"
            },
            target_config={
                "database": "test_target",
                "host": "localhost",
                "port": 3306,
                "type": "mysql"
            },
            ai_config={
                "provider": "openai",
                "model": "gpt-4"
            },
            status="draft"
        )
        
        db.add(test_campaign)
        db.commit()
        db.refresh(test_campaign)
        
        # Get the campaign back to verify storage
        stored_campaign = db.query(Campaign).filter(Campaign.id == test_campaign.id).first()
        
        # Clean up test data
        db.delete(test_campaign)
        db.delete(test_user)
        db.commit()
        
        db.close()
        
        return {
            "message": "Campaign test completed successfully",
            "timestamp": datetime.now().isoformat(),
            "test_results": {
                "user_created": True,
                "campaign_created": True,
                "campaign_stored": stored_campaign is not None,
                "campaign_id": test_campaign.id if stored_campaign else None,
                "campaign_name": stored_campaign.name if stored_campaign else None
            }
        }
        
    except Exception as e:
        return {
            "message": "Campaign test failed",
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "test_results": {
                "user_created": False,
                "campaign_created": False,
                "campaign_stored": False,
                "campaign_id": None,
                "campaign_name": None
            }
        }

@app.post("/debug-schema")
async def debug_schema(config: DatabaseConfig):
    """Debug endpoint to test database configuration"""
    try:
        print(f"🔍 DEBUG: Received config: {config}")
        print(f"🔍 DEBUG: Database: {config.database}")
        print(f"🔍 DEBUG: Host: {config.host}")
        print(f"🔍 DEBUG: Port: {config.port}")
        print(f"🔍 DEBUG: Username: {config.username}")
        print(f"🔍 DEBUG: Type: {config.type}")
        
        # Test basic connection
        if config.type.lower() == "mysql":
            connection_string = f"mysql+pymysql://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
        elif config.type.lower() == "postgresql":
            connection_string = f"postgresql://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
        else:
            connection_string = f"mysql+pymysql://{config.username}:{config.password}@{config.host}:{config.port}/{config.database}"
        
        print(f"🔍 DEBUG: Connection string: {connection_string}")
        
        return {
            "status": "debug",
            "config": {
                "database": config.database,
                "host": config.host,
                "port": config.port,
                "username": config.username,
                "type": config.type
            },
            "connection_string": connection_string
        }
        
    except Exception as e:
        print(f"❌ DEBUG Error: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/test-payment")
async def test_payment_intent():
    """Test endpoint for payment intent creation (no auth required)"""
    try:
        print(f"=== TEST PAYMENT INTENT ===")
        print(f"Available plans: {list(Config.SUBSCRIPTION_PLANS.keys())}")
        
        # Test with basic plan
        result = StripeService.create_payment_intent("basic", "test@example.com")
        print(f"Test result: {result}")
        
        return {
            "message": "Test payment intent created successfully",
            "result": result
        }
    except Exception as e:
        print(f"=== TEST PAYMENT INTENT ERROR ===")
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

# ==================== ENHANCED COLUMN MAPPING WITH JDE SUPPORT ====================

def get_jde_table_info(table_name: str) -> dict:
    """Get JDE table information including description, business purpose, and common columns"""
    table_name_upper = table_name.upper()
    
    # Check for exact match first
    if table_name_upper in JDE_TABLE_DESCRIPTIONS:
        return JDE_TABLE_DESCRIPTIONS[table_name_upper]
    
    # Check for pattern match (first 3 characters)
    table_pattern = table_name_upper[:3]
    if table_pattern in JDE_TABLE_DESCRIPTIONS:
        pattern_info = JDE_TABLE_DESCRIPTIONS[table_pattern].copy()
        pattern_info["description"] = f"{pattern_info['description']} - {table_name_upper}"
        return pattern_info
    
    # Check for partial pattern match (first 2 characters)
    table_pattern_2 = table_name_upper[:2]
    if table_pattern_2 in JDE_TABLE_DESCRIPTIONS:
        pattern_info = JDE_TABLE_DESCRIPTIONS[table_pattern_2].copy()
        pattern_info["description"] = f"{pattern_info['description']} - {table_name_upper}"
        return pattern_info
    
    # Generate intelligent description based on table name analysis
    intelligent_info = generate_intelligent_table_description(table_name_upper)
    if intelligent_info:
        return intelligent_info
    
    # Default response for unknown tables
    return {
        "description": "JDE Table",
        "business_purpose": "Enterprise resource planning table",
        "common_columns": {}
    }

def generate_intelligent_table_description(table_name: str) -> dict:
    """Generate intelligent table description based on table name analysis and JDE configuration"""
    
    # Analyze table name patterns
    table_analysis = analyze_table_name_pattern(table_name)
    
    # Extract relevant columns from configuration
    relevant_columns = extract_relevant_columns_for_table(table_name)
    
    # Generate business purpose based on analysis
    business_purpose = generate_business_purpose_from_analysis(table_analysis, relevant_columns)
    
    return {
        "description": f"{table_analysis['category']} - {table_name}",
        "business_purpose": business_purpose,
        "common_columns": relevant_columns,
        "analysis": table_analysis
    }

def analyze_table_name_pattern(table_name: str) -> dict:
    """Analyze JDE table name pattern to determine category and purpose"""
    
    # Common JDE table patterns
    patterns = {
        "F01": {"category": "Address Book & Customer Management", "module": "Customer Relationship Management"},
        "F02": {"category": "Customer Master", "module": "Customer Management"},
        "F03": {"category": "Customer Relationships", "module": "Customer Management"},
        "F04": {"category": "Customer Billing", "module": "Billing & Collections"},
        "F05": {"category": "Customer Pricing", "module": "Pricing Management"},
        "F06": {"category": "Customer Credit", "module": "Credit Management"},
        "F07": {"category": "Customer Marketing", "module": "Marketing Management"},
        "F08": {"category": "Customer Analytics", "module": "Business Intelligence"},
        "F09": {"category": "General Ledger", "module": "Financial Management"},
        "F10": {"category": "Accounts Payable", "module": "Financial Management"},
        "F11": {"category": "Accounts Receivable", "module": "Financial Management"},
        "F12": {"category": "Asset Management", "module": "Financial Management"},
        "F13": {"category": "Budget Management", "module": "Financial Management"},
        "F14": {"category": "Cost Management", "module": "Financial Management"},
        "F15": {"category": "Tax Management", "module": "Financial Management"},
        "F20": {"category": "Sales Management", "module": "Sales & Distribution"},
        "F21": {"category": "Sales Orders", "module": "Sales & Distribution"},
        "F22": {"category": "Sales Contracts", "module": "Sales & Distribution"},
        "F23": {"category": "Sales Pricing", "module": "Sales & Distribution"},
        "F24": {"category": "Sales Commissions", "module": "Sales & Distribution"},
        "F25": {"category": "Sales Analytics", "module": "Business Intelligence"},
        "F30": {"category": "Purchasing", "module": "Procurement"},
        "F31": {"category": "Purchase Orders", "module": "Procurement"},
        "F32": {"category": "Purchase Contracts", "module": "Procurement"},
        "F33": {"category": "Purchase Pricing", "module": "Procurement"},
        "F34": {"category": "Purchase Analytics", "module": "Business Intelligence"},
        "F40": {"category": "Inventory Management", "module": "Materials Management"},
        "F41": {"category": "Item Master", "module": "Materials Management"},
        "F42": {"category": "Sales Orders", "module": "Sales & Distribution"},
        "F43": {"category": "Sales Documents", "module": "Sales & Distribution"},
        "F44": {"category": "Purchase Orders", "module": "Procurement"},
        "F45": {"category": "Purchase Documents", "module": "Procurement"},
        "F46": {"category": "Warehouse Management", "module": "Logistics"},
        "F47": {"category": "Quality Management", "module": "Quality Assurance"},
        "F48": {"category": "Project Management", "module": "Project Management"},
        "F49": {"category": "Service Management", "module": "Service Management"},
        "F50": {"category": "Manufacturing", "module": "Production Planning"},
        "F51": {"category": "Production Orders", "module": "Production Planning"},
        "F52": {"category": "Work Centers", "module": "Production Planning"},
        "F53": {"category": "Routing", "module": "Production Planning"},
        "F54": {"category": "Bill of Materials", "module": "Production Planning"},
        "F55": {"category": "Production Analytics", "module": "Business Intelligence"},
        "F60": {"category": "Human Resources", "module": "Human Capital Management"},
        "F61": {"category": "Employee Master", "module": "Human Capital Management"},
        "F62": {"category": "Payroll", "module": "Human Capital Management"},
        "F63": {"category": "Benefits", "module": "Human Capital Management"},
        "F64": {"category": "Time & Attendance", "module": "Human Capital Management"},
        "F65": {"category": "HR Analytics", "module": "Business Intelligence"},
        "F70": {"category": "Plant Maintenance", "module": "Plant Maintenance"},
        "F71": {"category": "Equipment Master", "module": "Plant Maintenance"},
        "F72": {"category": "Maintenance Orders", "module": "Plant Maintenance"},
        "F73": {"category": "Preventive Maintenance", "module": "Plant Maintenance"},
        "F74": {"category": "Maintenance Analytics", "module": "Business Intelligence"},
        "F80": {"category": "Business Intelligence", "module": "Business Intelligence"},
        "F81": {"category": "Reporting", "module": "Business Intelligence"},
        "F82": {"category": "Analytics", "module": "Business Intelligence"},
        "F83": {"category": "Data Warehouse", "module": "Business Intelligence"},
        "F84": {"category": "Performance Management", "module": "Business Intelligence"},
        "F90": {"category": "System Administration", "module": "System Administration"},
        "F91": {"category": "User Management", "module": "System Administration"},
        "F92": {"category": "Security", "module": "System Administration"},
        "F93": {"category": "Audit", "module": "System Administration"},
        "F94": {"category": "Configuration", "module": "System Administration"},
        "F95": {"category": "Integration", "module": "System Administration"},
        "F96": {"category": "Workflow", "module": "Workflow Management"},
        "F97": {"category": "Document Management", "module": "Document Management"},
        "F98": {"category": "Communication", "module": "Communication Management"},
        "F99": {"category": "Utilities", "module": "System Utilities"}
    }
    
    # Get the first 2 characters for pattern matching
    pattern = table_name[:2]
    
    if pattern in patterns:
        return patterns[pattern]
    else:
        # Try to infer from table name content
        table_lower = table_name.lower()
        if any(word in table_lower for word in ['cust', 'customer', 'addr', 'address']):
            return {"category": "Customer Management", "module": "Customer Relationship Management"}
        elif any(word in table_lower for word in ['item', 'inv', 'inventory', 'prod', 'product']):
            return {"category": "Inventory Management", "module": "Materials Management"}
        elif any(word in table_lower for word in ['order', 'sales', 'sale']):
            return {"category": "Sales Management", "module": "Sales & Distribution"}
        elif any(word in table_lower for word in ['purch', 'buy', 'procure']):
            return {"category": "Purchasing", "module": "Procurement"}
        elif any(word in table_lower for word in ['gl', 'ledger', 'account', 'fin']):
            return {"category": "Financial Management", "module": "Financial Management"}
        elif any(word in table_lower for word in ['emp', 'employee', 'hr', 'personnel']):
            return {"category": "Human Resources", "module": "Human Capital Management"}
        else:
            return {"category": "Business Process", "module": "Enterprise Resource Planning"}

def extract_relevant_columns_for_table(table_name: str) -> dict:
    """Extract relevant columns for a specific table from JDE configuration"""
    relevant_columns = {}
    
    # Get table pattern
    table_pattern = table_name[:2]
    
    # Find columns that match the table pattern or are commonly used in that module
    for col_name, description in JDE_COLUMN_DESCRIPTIONS.items():
        # Check if column name starts with table pattern
        if col_name.startswith(table_pattern):
            # Create short description
            short_desc = description.split('.')[0] if description else f"{col_name} field"
            relevant_columns[col_name] = short_desc
        # Check for common business columns
        elif any(word in col_name.lower() for word in ['id', 'name', 'date', 'status', 'type', 'code']):
            if len(relevant_columns) < 10:  # Limit to 10 common columns
                short_desc = description.split('.')[0] if description else f"{col_name} field"
                relevant_columns[col_name] = short_desc
    
    return relevant_columns

def generate_business_purpose_from_analysis(analysis: dict, columns: dict) -> str:
    """Generate business purpose based on table analysis and columns"""
    
    category = analysis.get('category', 'Business Process')
    module = analysis.get('module', 'Enterprise Resource Planning')
    
    if category == "Address Book & Customer Management":
        return f"Stores customer, vendor, and employee address information and relationships for {module.lower()}"
    elif category == "Inventory Management":
        return f"Manages item/product master information and inventory details for {module.lower()}"
    elif category == "Sales Management":
        return f"Handles sales order processing and customer order management for {module.lower()}"
    elif category == "Financial Management":
        return f"Manages financial transactions and accounting information for {module.lower()}"
    elif category == "Human Resources":
        return f"Stores employee information and HR data for {module.lower()}"
    elif category == "Purchasing":
        return f"Manages purchase orders and procurement processes for {module.lower()}"
    else:
        return f"Supports {category.lower()} processes within the {module.lower()} module"

def get_jde_column_description(column_name: str) -> str:
    """Get JDE column description from configuration file"""
    # First check exact match in descriptions
    if column_name in JDE_COLUMN_DESCRIPTIONS:
        return JDE_COLUMN_DESCRIPTIONS[column_name]
    
    # Check if column name is in any synonym group
    for synonym_group in JDE_SYNONYM_GROUPS:
        if column_name in synonym_group:
            # Find the primary JDE column name (usually the first one)
            primary_column = synonym_group[0]
            if primary_column in JDE_COLUMN_DESCRIPTIONS:
                return JDE_COLUMN_DESCRIPTIONS[primary_column]
            break
    
    # Return None if no description found
    return None

def find_column_synonyms(column_name: str) -> list:
    """Find synonyms for a given column name"""
    synonyms = []
    
    # Check if column is in any synonym group
    for synonym_group in JDE_SYNONYM_GROUPS:
        if column_name in synonym_group:
            synonyms = [col for col in synonym_group if col != column_name]
            break
    
    return synonyms

def is_jde_column_match(source_col: str, target_col: str) -> bool:
    """Check if source and target columns are JDE synonyms"""
    # Check if both columns are in the same synonym group
    for synonym_group in JDE_SYNONYM_GROUPS:
        if source_col in synonym_group and target_col in synonym_group:
            return True
    
    return False

def analyze_jde_column_pattern(column_name: str) -> dict:
    """Analyze JDE column naming patterns and provide insights using configuration"""
    analysis = {
        "pattern_type": "Unknown",
        "business_meaning": "Unknown",
        "common_usage": "Unknown",
        "suggestions": []
    }
    
    column_upper = column_name.upper()
    
    # First, try to get description from JDE configuration
    jde_description = get_jde_column_description(column_name)
    if jde_description:
        # Extract short description (first sentence)
        short_desc = jde_description.split('.')[0] if '.' in jde_description else jde_description
        analysis["business_meaning"] = short_desc
        analysis["common_usage"] = "From JDE Configuration"
    
    # Determine pattern type based on column prefix and JDE patterns
    if column_upper.startswith("AB") or "AB" in column_upper:
        analysis["pattern_type"] = "Address Book"
        if not jde_description:
            analysis["business_meaning"] = "Address book related field"
    elif column_upper.startswith("SD") or "SD" in column_upper:
        analysis["pattern_type"] = "Sales Document"
        if not jde_description:
            analysis["business_meaning"] = "Sales document related field"
    elif column_upper.startswith("IM") or "IM" in column_upper:
        analysis["pattern_type"] = "Item Master"
        if not jde_description:
            analysis["business_meaning"] = "Item master related field"
    elif column_upper.startswith("GM") or "GM" in column_upper:
        analysis["pattern_type"] = "Account Master"
        if not jde_description:
            analysis["business_meaning"] = "Account master related field"
    elif column_upper.startswith("CU") or "CU" in column_upper:
        analysis["pattern_type"] = "Customer Master"
        if not jde_description:
            analysis["business_meaning"] = "Customer master related field"
    elif column_upper.startswith("F") or any(jde_pattern in column_upper for jde_pattern in ["AN8", "ALPH", "DOCO", "ITM", "DSC", "MCU", "EMAL", "PH", "ADD", "CTY", "ST", "ZIP", "CTR"]):
        analysis["pattern_type"] = "JDE Table"
        if not jde_description:
            analysis["business_meaning"] = "JDE table field"
    
    # Enhanced pattern recognition for common JDE fields
    if not jde_description:
        # Check for common JDE field patterns
        if "AN8" in column_upper:
            analysis["pattern_type"] = "Address Book"
            analysis["business_meaning"] = "Address Number (Customer/Vendor/Employee ID)"
        elif "ALPH" in column_upper:
            analysis["pattern_type"] = "Address Book"
            analysis["business_meaning"] = "Alpha Name (Company/Individual Name)"
        elif "DOCO" in column_upper:
            analysis["pattern_type"] = "Sales Document"
            analysis["business_meaning"] = "Document Number"
        elif "DCTO" in column_upper:
            analysis["pattern_type"] = "Sales Document"
            analysis["business_meaning"] = "Document Type"
        elif "ITM" in column_upper:
            analysis["pattern_type"] = "Item Master"
            analysis["business_meaning"] = "Item Number"
        elif "DSC" in column_upper:
            analysis["pattern_type"] = "Item Master"
            analysis["business_meaning"] = "Description"
        elif "MCU" in column_upper:
            analysis["pattern_type"] = "Business Unit"
            analysis["business_meaning"] = "Business Unit"
        elif "EMAL" in column_upper:
            analysis["pattern_type"] = "Contact"
            analysis["business_meaning"] = "Email Address"
        elif "PH" in column_upper and len(column_upper) <= 4:
            analysis["pattern_type"] = "Contact"
            analysis["business_meaning"] = "Phone Number"
        elif "ADD" in column_upper:
            analysis["pattern_type"] = "Address"
            analysis["business_meaning"] = "Address Information"
        elif "CTY" in column_upper or "CITY" in column_upper:
            analysis["pattern_type"] = "Address"
            analysis["business_meaning"] = "City"
        elif "ST" in column_upper and len(column_upper) <= 4:
            analysis["pattern_type"] = "Address"
            analysis["business_meaning"] = "State/Province"
        elif "ZIP" in column_upper or "POST" in column_upper:
            analysis["pattern_type"] = "Address"
            analysis["business_meaning"] = "Postal Code"
        elif "CTR" in column_upper or "COUNTRY" in column_upper:
            analysis["pattern_type"] = "Address"
            analysis["business_meaning"] = "Country"
        elif "JBCD" in column_upper:
            analysis["pattern_type"] = "Job/Batch"
            analysis["business_meaning"] = "Job or batch code identifier"
        elif "POS" in column_upper and len(column_upper) <= 6:
            analysis["pattern_type"] = "Position"
            analysis["business_meaning"] = "Position or location identifier"
        elif "DATE" in column_upper or "DT" in column_upper or "J" in column_upper:
            analysis["pattern_type"] = "Date/Time"
            analysis["business_meaning"] = "Date or time field"
        elif "QTY" in column_upper or "QOH" in column_upper or "QOO" in column_upper:
            analysis["pattern_type"] = "Quantity"
            analysis["business_meaning"] = "Quantity field"
        elif "AMT" in column_upper or "PRICE" in column_upper or "COST" in column_upper:
            analysis["pattern_type"] = "Amount"
            analysis["business_meaning"] = "Monetary amount field"
        elif "STAT" in column_upper or "STS" in column_upper:
            analysis["pattern_type"] = "Status"
            analysis["business_meaning"] = "Status indicator"
        elif "TYPE" in column_upper:
            analysis["pattern_type"] = "Classification"
            analysis["business_meaning"] = "Type classification"
        elif "CODE" in column_upper:
            analysis["pattern_type"] = "Code"
            analysis["business_meaning"] = "Code or identifier"
        elif "ID" in column_upper:
            analysis["pattern_type"] = "Identifier"
            analysis["business_meaning"] = "Unique identifier"
        elif "NAME" in column_upper:
            analysis["pattern_type"] = "Name"
            analysis["business_meaning"] = "Name or title"
        elif "DESC" in column_upper:
            analysis["pattern_type"] = "Description"
            analysis["business_meaning"] = "Descriptive text"
    
    return analysis

def generate_enhanced_mapping_description(
    source_col: ColumnInfo, 
    target_col: ColumnInfo, 
    ai_config: AIConfig, 
    confidence: float,
    source_table: TableSchema,
    target_table: TableSchema
) -> str:
    """Generate enhanced AI-powered description for column mapping with JDE insights"""
    
    # Get JDE table information
    source_jde_info = get_jde_table_info(source_table.tableName)
    target_jde_info = get_jde_table_info(target_table.tableName)
    
    # Analyze column patterns
    source_analysis = analyze_jde_column_pattern(source_col.name)
    target_analysis = analyze_jde_column_pattern(target_col.name)
    
    # Check for JDE column descriptions from configuration
    source_jde_desc = get_jde_column_description(source_col.name)
    target_jde_desc = get_jde_column_description(target_col.name)
    
    # Check if columns are JDE synonyms
    is_jde_synonym = is_jde_column_match(source_col.name, target_col.name)
    
    # Build enhanced description
    description_parts = []
    
    # Basic mapping info
    confidence_level = "High" if confidence > 0.7 else "Medium" if confidence > 0.4 else "Low"
    description_parts.append(f"**{confidence_level} Confidence Mapping**")
    
    # Source column details
    description_parts.append(f"**Source:** {source_col.name} ({source_col.type})")
    if source_jde_desc:
        description_parts.append(f"  - JDE Description: {source_jde_desc}")
    elif source_analysis["pattern_type"] != "Unknown":
        description_parts.append(f"  - Pattern: {source_analysis['pattern_type']}")
        description_parts.append(f"  - Business Meaning: {source_analysis['business_meaning']}")
    
    # Target column details
    description_parts.append(f"**Target:** {target_col.name} ({target_col.type})")
    if target_jde_desc:
        description_parts.append(f"  - JDE Description: {target_jde_desc}")
    elif target_analysis["pattern_type"] != "Unknown":
        description_parts.append(f"  - Pattern: {target_analysis['pattern_type']}")
        description_parts.append(f"  - Business Meaning: {target_analysis['business_meaning']}")
    
    # JDE Synonym Information
    if is_jde_synonym:
        source_synonyms = find_column_synonyms(source_col.name)
        target_synonyms = find_column_synonyms(target_col.name)
        description_parts.append("**JDE Synonym Match:** ✅ Columns are semantic equivalents")
        if source_synonyms:
            description_parts.append(f"  - Source Synonyms: {', '.join(source_synonyms[:5])}")
        if target_synonyms:
            description_parts.append(f"  - Target Synonyms: {', '.join(target_synonyms[:5])}")
    
    # Table context - Always show table information since we already have it
    description_parts.append(f"**Source Table:** {source_table.tableName} - {source_jde_info['description']}")
    description_parts.append(f"  - Purpose: {source_jde_info['business_purpose']}")
    
    description_parts.append(f"**Target Table:** {target_table.tableName} - {target_jde_info['description']}")
    description_parts.append(f"  - Purpose: {target_jde_info['business_purpose']}")
    
    # Type compatibility analysis
    type_compatibility = calculate_type_compatibility(source_col.type, target_col.type)
    if source_col.type.lower() == target_col.type.lower():
        description_parts.append("**Type Compatibility:** ✅ Exact type match")
    elif type_compatibility > 0.7:
        description_parts.append("**Type Compatibility:** ✅ Compatible types")
    else:
        description_parts.append("**Type Compatibility:** ⚠️ Type conversion may be needed")
    
    # Business logic suggestions
    if is_jde_synonym:
        description_parts.append("**Business Logic:** ✅ JDE Synonym Match - High confidence semantic mapping")
    elif source_analysis["pattern_type"] == target_analysis["pattern_type"] and source_analysis["pattern_type"] != "Unknown":
        description_parts.append("**Business Logic:** ✅ Same business pattern - likely direct mapping")
    elif source_analysis["business_meaning"] == target_analysis["business_meaning"] and source_analysis["business_meaning"] != "Unknown":
        description_parts.append("**Business Logic:** ✅ Same business meaning - semantic match")
    else:
        description_parts.append("**Business Logic:** 🔍 Review business context for validation")
    
    # Data quality considerations
    if source_col.isNullable and not target_col.isNullable:
        description_parts.append("**Data Quality:** ⚠️ Source allows NULL, target doesn't - consider default values")
    elif not source_col.isNullable and target_col.isNullable:
        description_parts.append("**Data Quality:** ✅ Target allows NULL - safe mapping")
    else:
        description_parts.append("**Data Quality:** ✅ NULL handling compatible")
    
    # Length/precision considerations
    if source_col.maxLength and target_col.maxLength:
        if source_col.maxLength > target_col.maxLength:
            description_parts.append("**Data Truncation:** ⚠️ Source longer than target - data may be truncated")
        else:
            description_parts.append("**Data Truncation:** ✅ Target can accommodate source length")
    
    return "\n".join(description_parts)

def get_gemini_jde_description(field_code: str, ai_config: AIConfig) -> str:
    """Deprecated: AI disabled. Return JDE config only."""
    return get_jde_column_description(field_code) or ""

def generate_column_description_step_by_step(column: ColumnInfo, jde_description: str, ai_config: AIConfig) -> str:
    """Return only JDE description; no AI or pattern fallback."""
    if jde_description:
        return jde_description
    return ""

def generate_pattern_based_description(column_name: str, column_type: str) -> str:
    """Generate description based on column name patterns and type"""
    
    column_upper = column_name.upper()
    column_lower = column_name.lower()
    
    # JDE-specific patterns (high priority)
    if "AN8" in column_upper:
        return "Address Number (Customer/Vendor/Employee ID)"
    elif "ALPH" in column_upper:
        return "Alpha Name (Company/Individual Name)"
    elif "EMAL" in column_upper:
        return "Email Address for contact purposes"
    elif "PH" in column_upper and len(column_upper) <= 4:
        return "Phone Number for contact purposes"
    elif "MCU" in column_upper:
        return "Business Unit identifier"
    elif "JBCD" in column_upper:
        return "Job or batch code identifier"
    elif "POS" in column_upper and len(column_upper) <= 6:
        return "Position or location identifier"
    elif "DOCO" in column_upper:
        return "Document Number identifier"
    elif "ITM" in column_upper:
        return "Item Number identifier"
    elif "DSC" in column_upper:
        return "Description or descriptive text"
    
    # Business context patterns
    if any(word in column_lower for word in ['id', 'key', 'code', 'number']):
        if 'customer' in column_lower:
            return f"Unique identifier for customer records"
        elif 'order' in column_lower:
            return f"Unique identifier for order records"
        elif 'product' in column_lower or 'item' in column_lower:
            return f"Unique identifier for product/item records"
        else:
            return f"Unique identifier field"
    
    elif any(word in column_lower for word in ['name', 'title', 'label']):
        if 'customer' in column_lower:
            return f"Customer name or business title"
        elif 'product' in column_lower or 'item' in column_lower:
            return f"Product name or item description"
        else:
            return f"Name or title field"
    
    elif any(word in column_lower for word in ['date', 'time', 'created', 'updated', 'modified']):
        if 'created' in column_lower:
            return f"Date when the record was created"
        elif 'updated' in column_lower or 'modified' in column_lower:
            return f"Date when the record was last updated"
        else:
            return f"Date or time field"
    
    elif any(word in column_lower for word in ['amount', 'price', 'cost', 'value', 'total']):
        return f"Monetary amount or price value"
    
    elif any(word in column_lower for word in ['quantity', 'qty', 'count', 'number']):
        return f"Quantity or count value"
    
    elif any(word in column_lower for word in ['status', 'state', 'condition']):
        return f"Status or condition indicator"
    
    elif any(word in column_lower for word in ['email', 'mail']):
        return f"Email address for contact purposes"
    
    elif any(word in column_lower for word in ['phone', 'tel', 'mobile']):
        return f"Phone number for contact purposes"
    
    elif any(word in column_lower for word in ['address', 'street', 'city', 'zip', 'country']):
        return f"Address or location information"
    
    elif any(word in column_lower for word in ['description', 'desc', 'notes', 'comment']):
        return f"Descriptive text or notes"
    
    else:
        # Generic description based on data type
        if 'int' in column_type.lower() or 'number' in column_type.lower():
            return f"Numeric field for {column_name.lower().replace('_', ' ')}"
        elif 'varchar' in column_type.lower() or 'char' in column_type.lower() or 'text' in column_type.lower():
            return f"Text field for {column_name.lower().replace('_', ' ')}"
        elif 'date' in column_type.lower() or 'time' in column_type.lower():
            return f"Date/time field for {column_name.lower().replace('_', ' ')}"
        else:
            return f"Data field for {column_name.lower().replace('_', ' ')}"

def generate_direct_mappings(source_table: TableSchema, target_table: TableSchema) -> List[MappingResult]:
    """Generate direct mappings based on exact name matches and JDE synonyms"""
    direct_mappings = []
    
    print(f"🎯 Generating direct mappings for {source_table.tableName} → {target_table.tableName}")
    
    # Exact name matches (highest priority)
    for source_col in source_table.columns:
        for target_col in target_table.columns:
            if source_col.name.lower() == target_col.name.lower():
                mapping = MappingResult(
                    sourceColumn=source_col.name,
                    sourceTable=source_table.tableName,
                    sourceType=source_col.type,
                    targetColumn=target_col.name,
                    targetTable=target_table.tableName,
                    targetType=target_col.type,
                    confidence=1.0,
                    aiDescription=f"**DIRECT MAPPING** - Exact name match: {source_col.name}",
                    similarityScore=1.0
                )
                direct_mappings.append(mapping)
                print(f"  ✅ Direct match: {source_col.name}")
                break
    
    # JDE Synonym matches (very high priority)
    for source_col in source_table.columns:
        for target_col in target_table.columns:
            if is_jde_column_match(source_col.name, target_col.name):
                # Check if not already mapped
                if not any(m.sourceColumn == source_col.name and m.targetColumn == target_col.name for m in direct_mappings):
                    # Get JDE descriptions
                    source_desc = get_jde_column_description(source_col.name)
                    target_desc = get_jde_column_description(target_col.name)
                    
                    confidence = 0.95  # Very high confidence for JDE synonyms
                    mapping = MappingResult(
                        sourceColumn=source_col.name,
                        sourceTable=source_table.tableName,
                        sourceType=source_col.type,
                        targetColumn=target_col.name,
                        targetTable=target_table.tableName,
                        targetType=target_col.type,
                        confidence=confidence,
                        aiDescription=f"**JDE SYNONYM MATCH** - Semantic equivalent: {source_col.name} ↔ {target_col.name}",
                        similarityScore=confidence
                    )
                    direct_mappings.append(mapping)
                    print(f"  🔄 JDE synonym: {source_col.name} ↔ {target_col.name}")
                    break
    
    # Enhanced JDE pattern matching with fuzzy logic
    jde_patterns = [
        ("AN8", "Address Number", ["customer_id", "vendor_id", "employee_id", "party_id", "contact_id"]),
        ("ALPH", "Alpha Name", ["name", "full_name", "customer_name", "company_name", "business_name"]),
        ("ITM", "Item Number", ["product_id", "sku", "item_code", "part_number"]),
        ("DSC", "Description", ["description", "desc", "long_desc", "short_desc", "notes"]),
        ("MCU", "Business Unit", ["business_unit", "division", "department", "cost_center"]),
        ("CO", "Company", ["company", "corp", "organization", "entity"]),
        ("DOCO", "Document Number", ["order_number", "invoice_number", "reference", "doc_id"]),
        ("DCTO", "Document Type", ["type", "category", "classification", "doc_type"]),
        ("LNID", "Line Number", ["line_number", "sequence", "row_id", "line_id"]),
        ("QTY", "Quantity", ["quantity", "qty", "amount", "count", "total"]),
        ("UOM", "Unit of Measure", ["unit", "measure", "uom", "currency"]),
        ("DATE", "Date", ["date", "created", "modified", "timestamp", "time"]),
        ("AMT", "Amount", ["amount", "price", "cost", "value", "total"]),
        ("ST", "Status", ["status", "state", "condition", "flag"]),
        ("PH", "Phone", ["phone", "telephone", "mobile", "contact"]),
        ("EMAL", "Email", ["email", "e_mail", "mail", "contact_email"]),
        ("ADD", "Address", ["address", "street", "location", "place"]),
        ("CITY", "City", ["city", "town", "municipality", "locality"]),
        ("ZIP", "Zip Code", ["zip", "postal_code", "zipcode", "pincode"]),
        ("CTRY", "Country", ["country", "nation", "state", "province"])
    ]
    
    for pattern, description, synonyms in jde_patterns:
        for source_col in source_table.columns:
            source_lower = source_col.name.lower()
            if (pattern.lower() in source_lower or 
                any(syn.lower() in source_lower for syn in synonyms)):
                
                for target_col in target_table.columns:
                    target_lower = target_col.name.lower()
                    if (pattern.lower() in target_lower or 
                        any(syn.lower() in target_lower for syn in synonyms)):
                        
                        # Check if not already mapped
                        if not any(m.sourceColumn == source_col.name and m.targetColumn == target_col.name for m in direct_mappings):
                            
                            # Calculate enhanced confidence based on similarity
                            base_confidence = 0.85
                            if source_lower == target_lower:
                                confidence = 0.95
                            elif any(syn.lower() in source_lower and syn.lower() in target_lower for syn in synonyms):
                                confidence = 0.9
                            else:
                                confidence = base_confidence
                            
                            mapping = MappingResult(
                                sourceColumn=source_col.name,
                                sourceTable=source_table.tableName,
                                sourceType=source_col.type,
                                targetColumn=target_col.name,
                                targetTable=target_table.tableName,
                                targetType=target_col.type,
                                confidence=confidence,
                                aiDescription=f"**ENHANCED JDE PATTERN MATCH** - {description} pattern: {source_col.name} → {target_col.name}",
                                similarityScore=confidence
                            )
                            direct_mappings.append(mapping)
                            print(f"  🔄 Enhanced JDE pattern: {source_col.name} → {target_col.name} ({description}) - Confidence: {confidence:.2f}")
                            break
    
    # Type-based intelligent matching
    type_mappings = {
        "INT": ["INT", "BIGINT", "SMALLINT", "TINYINT", "NUMBER", "DECIMAL"],
        "VARCHAR": ["VARCHAR", "CHAR", "TEXT", "STRING", "NVARCHAR"],
        "DATETIME": ["DATETIME", "TIMESTAMP", "DATE", "TIME", "DATETIME2"],
        "DECIMAL": ["DECIMAL", "NUMERIC", "FLOAT", "DOUBLE", "REAL", "MONEY"],
        "BOOLEAN": ["BOOLEAN", "BIT", "BOOL", "TINYINT(1)"]
    }
    
    for source_col in source_table.columns:
        if not any(m.sourceColumn == source_col.name for m in direct_mappings):
            source_type = source_col.type.upper().split('(')[0]  # Remove size constraints
            
            for target_col in target_table.columns:
                if not any(m.targetColumn == target_col.name for m in direct_mappings):
                    target_type = target_col.type.upper().split('(')[0]
                    
                    # Check type compatibility
                    if (source_type in type_mappings and target_type in type_mappings[source_type]) or source_type == target_type:
                        # Look for semantic similarity in names
                        similarity = calculate_name_similarity(source_col.name, target_col.name)
                        if similarity > 0.6:  # Higher threshold for type-based matching
                            confidence = 0.75 + (similarity * 0.15)  # 0.75 to 0.9 range
                            
                            mapping = MappingResult(
                                sourceColumn=source_col.name,
                                sourceTable=source_table.tableName,
                                sourceType=source_col.type,
                                targetColumn=target_col.name,
                                targetTable=target_table.tableName,
                                targetType=target_col.type,
                                confidence=confidence,
                                aiDescription=f"**TYPE-BASED INTELLIGENT MATCH** - Compatible types with semantic similarity: {source_col.name} ({source_type}) → {target_col.name} ({target_type})",
                                similarityScore=similarity
                            )
                            direct_mappings.append(mapping)
                            print(f"  🔍 Type-based match: {source_col.name} → {target_col.name} (Type: {source_type}→{target_type}, Similarity: {similarity:.2f})")
                            break
    
    return direct_mappings

def calculate_name_similarity(name1: str, name2: str) -> float:
    """Calculate similarity between two column names using multiple algorithms"""
    name1_lower = name1.lower()
    name2_lower = name2.lower()
    
    # Exact match
    if name1_lower == name2_lower:
        return 1.0
    
    # Jaro-Winkler similarity
    jaro_sim = SequenceMatcher(None, name1_lower, name2_lower).ratio()
    
    # Token-based similarity
    tokens1 = set(name1_lower.replace('_', ' ').replace('-', ' ').split())
    tokens2 = set(name2_lower.replace('_', ' ').replace('-', ' ').split())
    
    if tokens1 and tokens2:
        token_intersection = len(tokens1.intersection(tokens2))
        token_union = len(tokens1.union(tokens2))
        token_sim = token_intersection / token_union if token_union > 0 else 0
    else:
        token_sim = 0
    
    # Acronym similarity
    acronym1 = ''.join([c for c in name1_lower if c.isupper() or c.isdigit()])
    acronym2 = ''.join([c for c in name2_lower if c.isupper() or c.isdigit()])
    
    if acronym1 and acronym2:
        acronym_sim = SequenceMatcher(None, acronym1, acronym2).ratio()
    else:
        acronym_sim = 0
    
    # Weighted combination
    final_similarity = (jaro_sim * 0.4 + token_sim * 0.4 + acronym_sim * 0.2)
    
    return min(final_similarity, 1.0)

def calculate_description_similarity(desc1: str, desc2: str) -> float:
    """Calculate similarity between two column descriptions"""
    if not desc1 or not desc2:
        return 0.0
    
    desc1_lower = desc1.lower()
    desc2_lower = desc2.lower()
    
    # Exact match
    if desc1_lower == desc2_lower:
        return 1.0
    
    # Token-based similarity
    tokens1 = set(desc1_lower.split())
    tokens2 = set(desc2_lower.split())
    
    if not tokens1 or not tokens2:
        return 0.0
    
    # Jaccard similarity
    intersection = len(tokens1.intersection(tokens2))
    union = len(tokens1.union(tokens2))
    
    if union == 0:
        return 0.0
    
    jaccard_sim = intersection / union
    
    # Keyword-based similarity
    business_keywords = ['customer', 'order', 'product', 'item', 'id', 'name', 'date', 'amount', 'quantity', 'status', 'email', 'phone', 'address']
    
    keyword_score = 0.0
    for keyword in business_keywords:
        if keyword in desc1_lower and keyword in desc2_lower:
            keyword_score += 0.1
    
    keyword_score = min(keyword_score, 0.3)  # Cap at 0.3
    
    # Combined similarity
    final_similarity = (jaccard_sim * 0.7 + keyword_score)
    return min(final_similarity, 1.0)

def _normalize_name(name: str) -> str:
    text = name.lower().replace('-', ' ').replace('_', ' ')
    replacements = {
        'addr': 'address',
        'zip': 'postal code',
        'zipcode': 'postal code',
        'cust': 'customer',
        'custs': 'customers',
        'qty': 'quantity',
        'tel': 'phone',
        'ph': 'phone',
        'num': 'number'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return ' '.join(text.split())

def _type_compatibility_score(source_type: str, target_type: str) -> float:
    s = source_type.upper().split('(')[0]
    t = target_type.upper().split('(')[0]
    families = {
        'INT': {'INT', 'BIGINT', 'SMALLINT', 'TINYINT', 'NUMBER', 'DECIMAL'},
        'DECIMAL': {'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL', 'MONEY', 'NUMBER'},
        'VARCHAR': {'VARCHAR', 'CHAR', 'TEXT', 'STRING', 'NVARCHAR'},
        'DATETIME': {'DATETIME', 'TIMESTAMP', 'DATE', 'TIME', 'DATETIME2'},
        'BOOLEAN': {'BOOLEAN', 'BIT', 'BOOL', 'TINYINT(1)'}
    }
    for fam, members in families.items():
        if s in members and t in members:
            return 1.0
    if s == t:
        return 1.0
    # Safe numeric widening casts
    if s == 'INT' and t in families['DECIMAL']:
        return 0.8
    return 0.0

def _jde_pattern_bonus(src: str, tgt: str) -> float:
    src_l = src.upper()
    tgt_l = tgt.upper()
    patterns = ['AN8', 'ALPH', 'DSC', 'ITM', 'MCU', 'DOCO', 'DCTO', 'LNID', 'QTY', 'UOM', 'DATE', 'AMT', 'ST', 'PH', 'EMAL']
    for p in patterns:
        if p in src_l and p in tgt_l:
            return 1.0
    return 0.0

def _synonym_bonus(source_col: str, target_col: str) -> float:
    try:
        return 1.0 if is_jde_column_match(source_col, target_col) else 0.0
    except Exception:
        return 0.0

def compute_hybrid_confidence(source_col, target_col, ai_config: AIConfig) -> Dict[str, float]:
    name_sim = calculate_name_similarity(_normalize_name(source_col.name), _normalize_name(target_col.name))
    syn_bonus = _synonym_bonus(source_col.name, target_col.name)
    pat_bonus = _jde_pattern_bonus(source_col.name, target_col.name)

    # Description similarity via SBERT if available from jde_table.json
    src_desc = get_jde_column_description(source_col.name) or ''
    tgt_desc = get_jde_column_description(target_col.name) or ''
    if src_desc and tgt_desc:
        src_emb = _encode_with_cache([src_desc])
        tgt_emb = _encode_with_cache([tgt_desc])
        desc_sim = float(_cosine_similarity_matrix(src_emb, tgt_emb)[0, 0])
    else:
        desc_sim = calculate_description_similarity(src_desc, tgt_desc)

    type_score = _type_compatibility_score(source_col.type, target_col.type)

    weighted = (
        ai_config.w_name * name_sim +
        ai_config.w_desc * desc_sim +
        ai_config.w_synonym * syn_bonus +
        ai_config.w_type * type_score +
        ai_config.w_pattern * pat_bonus
    )

    # Clamp
    final_score = max(0.0, min(1.0, float(weighted)))
    return {
        'final': final_score,
        'name': float(name_sim),
        'desc': float(desc_sim),
        'synonym': float(syn_bonus),
        'type': float(type_score),
        'pattern': float(pat_bonus)
    }

# ==================== DESCRIPTION EMBEDDING (SENTENCE TRANSFORMER) ====================
_sentence_model = None
_embedding_cache: Dict[str, np.ndarray] = {}

def get_sentence_model():
    global _sentence_model, SentenceTransformer
    if SentenceTransformer is None:
        # Graceful fallback: indicate model unavailable
        return None
    if _sentence_model is None:
        _sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _sentence_model

def _cosine_similarity_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-10)
    b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-10)
    return np.matmul(a_norm, b_norm.T)

def _encode_with_cache(descriptions: List[str]) -> np.ndarray:
    """Encode descriptions using sentence model with a simple in-memory cache."""
    model = get_sentence_model()
    # If SBERT unavailable, return zero vectors to force token-sim fallback elsewhere
    if model is None:
        return np.zeros((len(descriptions), 384), dtype=np.float32)
    embeddings: List[np.ndarray] = []
    to_encode: List[str] = []
    indices_to_fill: List[int] = []

    for idx, text in enumerate(descriptions):
        key = text.strip()
        if not key:
            embeddings.append(np.zeros((384,), dtype=np.float32))
            continue
        cached = _embedding_cache.get(key)
        if cached is None:
            embeddings.append(None)  # type: ignore
            to_encode.append(key)
            indices_to_fill.append(idx)
        else:
            embeddings.append(cached)

    if to_encode:
        encoded = model.encode(to_encode, convert_to_numpy=True)
        for fill_idx, vec in zip(indices_to_fill, encoded):
            key = descriptions[fill_idx].strip()
            _embedding_cache[key] = vec
            embeddings[fill_idx] = vec

    # Replace any remaining None (shouldn't happen) with zeros
    for i in range(len(embeddings)):
        if embeddings[i] is None:  # type: ignore
            embeddings[i] = np.zeros((384,), dtype=np.float32)  # type: ignore

    return np.vstack(embeddings)  # type: ignore

def generate_description_based_mappings(source_table: TableSchema, target_table: TableSchema, ai_config: AIConfig) -> List[MappingResult]:
    """Generate mappings using only sentence-transformer similarity of JDE descriptions."""
    print(f"🔍 Generating description-only mappings for {source_table.tableName} → {target_table.tableName}")

    source_cols = source_table.columns
    target_cols = target_table.columns
    if not source_cols or not target_cols:
        return []

    src_desc = [get_jde_column_description(c.name) or "" for c in source_cols]
    tgt_desc = [get_jde_column_description(c.name) or "" for c in target_cols]

    # Skip entirely if no descriptions at all
    if not any(src_desc) or not any(tgt_desc):
        return []

    model = get_sentence_model()
    if model is None:
        # Fallback: token similarity on descriptions
        sim = np.zeros((len(src_desc), len(tgt_desc)), dtype=np.float32)
        for i, sd in enumerate(src_desc):
            for j, td in enumerate(tgt_desc):
                sim[i, j] = calculate_description_similarity(sd, td)
    else:
        src_emb = _encode_with_cache(src_desc)
        tgt_emb = _encode_with_cache(tgt_desc)
        sim = _cosine_similarity_matrix(src_emb, tgt_emb)

    mappings: List[MappingResult] = []
    threshold = 0.45
    for i, s_col in enumerate(source_cols):
        if not src_desc[i]:
            continue
        j = int(np.argmax(sim[i]))
        score = float(sim[i, j])
        if score < threshold:
            continue
        t_col = target_cols[j]
        mapping = MappingResult(
            sourceColumn=s_col.name,
            sourceTable=source_table.tableName,
            sourceType=s_col.type,
            targetColumn=t_col.name,
            targetTable=target_table.tableName,
            targetType=t_col.type,
            confidence=score,
            aiDescription="Mapping based on description similarity",
            similarityScore=score
        )
        mappings.append(mapping)
        print(f"  🔗 {s_col.name} → {t_col.name} (sim: {score:.2f})")

    return mappings

def execute_description_generation_and_mapping_workflow(
    source_table: TableSchema, 
    target_table: TableSchema, 
    ai_config: AIConfig
) -> Dict[str, any]:
    """
    Execute the complete workflow: Description Generation Steps followed by Mapping Process
    
    Description Generation Steps:
    1. Check jde_table.json for existing column descriptions
    2. If column name exists, use its description directly
    3. If column name is not found, proceed with AI-based description generation
    
    Mapping Process:
    1. Ensure description generation is 100% completed before starting mapping
    2. If description generation is not yet complete, wait until it finishes
    3. Once complete, proceed with mapping
    """
    
    print("🚀 Starting Description Generation and Mapping Workflow")
    print(f"📊 Source Table: {source_table.tableName}")
    print(f"🎯 Target Table: {target_table.tableName}")
    
    # ==================== PHASE 1: DESCRIPTION GENERATION ====================
    print("\n📝 PHASE 1: Description Generation")
    print("=" * 50)
    
    # Track description generation status
    description_status = {
        "source_table": {"table_name": source_table.tableName, "columns": {}},
        "target_table": {"table_name": target_table.tableName, "columns": {}},
        "total_columns": len(source_table.columns) + len(target_table.columns),
        "completed_columns": 0,
        "jde_descriptions_found": 0,
        "ai_descriptions_generated": 0,
        "is_complete": False
    }
    
    # Process source table columns
    print(f"\n🔍 Processing source table columns ({len(source_table.columns)} columns):")
    for col in source_table.columns:
        col_status = process_column_description(col, "source", ai_config)
        description_status["source_table"]["columns"][col.name] = col_status
        description_status["completed_columns"] += 1
        
        if col_status["description_source"] == "jde_config":
            description_status["jde_descriptions_found"] += 1
        else:
            description_status["ai_descriptions_generated"] += 1
    
    # Process target table columns
    print(f"\n🔍 Processing target table columns ({len(target_table.columns)} columns):")
    for col in target_table.columns:
        col_status = process_column_description(col, "target", ai_config)
        description_status["target_table"]["columns"][col.name] = col_status
        description_status["completed_columns"] += 1
        
        if col_status["description_source"] == "jde_config":
            description_status["jde_descriptions_found"] += 1
        else:
            description_status["ai_descriptions_generated"] += 1
    
    # Mark description generation as complete
    description_status["is_complete"] = True
    
    print(f"\n✅ Description Generation Complete!")
    print(f"   📊 Total Columns: {description_status['total_columns']}")
    print(f"   🎯 JDE Descriptions Found: {description_status['jde_descriptions_found']}")
    # AI disabled; keep metric but not used
    print(f"   🤖 AI Descriptions Generated: {description_status['ai_descriptions_generated']}")
    
    # ==================== PHASE 2: MAPPING PROCESS ====================
    print("\n🔗 PHASE 2: Mapping Process")
    print("=" * 50)
    
    # Verify description generation is complete
    if not description_status["is_complete"]:
        raise Exception("Description generation is not complete. Cannot proceed with mapping.")
    
    print("✅ Description generation verified as complete. Proceeding with mapping...")
    
    # Generate mappings using the completed descriptions
    mappings = generate_description_based_mappings_with_status(
        source_table, 
        target_table, 
        ai_config, 
        description_status
    )
    
    # Compile final results
    workflow_results = {
        "description_generation": description_status,
        "mapping_results": {
            "total_mappings": len(mappings),
            "high_confidence_mappings": len([m for m in mappings if m.confidence >= 0.8]),
            "medium_confidence_mappings": len([m for m in mappings if 0.6 <= m.confidence < 0.8]),
            "low_confidence_mappings": len([m for m in mappings if m.confidence < 0.6]),
            "mappings": mappings
        },
        "workflow_status": "completed",
        "timestamp": datetime.now().isoformat()
    }
    
    print(f"\n🎉 Workflow Complete!")
    print(f"   🔗 Total Mappings Generated: {len(mappings)}")
    print(f"   🎯 High Confidence: {workflow_results['mapping_results']['high_confidence_mappings']}")
    print(f"   ⚡ Medium Confidence: {workflow_results['mapping_results']['medium_confidence_mappings']}")
    print(f"   ⚠️ Low Confidence: {workflow_results['mapping_results']['low_confidence_mappings']}")
    
    return workflow_results

def process_column_description(column: ColumnInfo, table_type: str, ai_config: AIConfig) -> Dict[str, any]:
    """
    Process a single column for description generation following the specified steps
    """
    print(f"  🔍 Processing {table_type} column: {column.name}")
    
    # Step 1: Check if column name exists in jde_table.json
    jde_description = get_jde_column_description(column.name)
    
    if jde_description:
        print(f"    ✅ Found JDE description: {jde_description}")
        return {
            "column_name": column.name,
            "description": jde_description,
            "description_source": "jde_config",
            "processing_time": 0.0,
            "status": "completed"
        }
    
    # Step 2: Try FLAN-T5 Local AI generation first (preferred for offline mode)
    ai_desc = None
    if ai_config.provider_priority and "flan-t5-local" in ai_config.provider_priority:
        try:
            print(f"    🤖 Using FLAN-T5 Local ({ai_config.flan_t5_model_name}) for column: {column.name}")
            flan_service = get_flan_t5_service(ai_config.flan_t5_model_name)
            ai_desc = flan_service.generate_description(column.name, column.type, f"{table_type} table")
            if ai_desc:
                print(f"    ✅ FLAN-T5 Local ({ai_config.flan_t5_model_name}) generated: {ai_desc}")
        except Exception as e:
            print(f"    ❌ FLAN-T5 Local ({ai_config.flan_t5_model_name}) failed: {str(e)}")
    
    # Step 3: Fallback to other AI providers if FLAN-T5 Local failed
    if not ai_desc:
        ai_prompt = f"Generate a concise business description for column '{column.name}' of type '{column.type}'."
        ai_desc = _call_ai_with_failover(ai_prompt, ai_config)

    # Step 4: Pattern-based fallback description when AI/JDE missing
    pattern_desc = ai_desc or generate_pattern_based_description(column.name, column.type)
    
    # Determine description source
    if ai_desc:
        if ai_config.provider_priority and "flan-t5-local" in ai_config.provider_priority:
            description_source = "flan_t5_local"
        else:
            description_source = "ai_generated"
    else:
        description_source = "pattern_fallback" if pattern_desc else "missing"
    
    return {
        "column_name": column.name,
        "description": (ai_desc or pattern_desc or ""),
        "description_source": description_source,
        "processing_time": 0.0,
        "status": "completed"
    }

def generate_description_based_mappings_with_status(
    source_table: TableSchema,
    target_table: TableSchema,
    ai_config: AIConfig,
    description_status: Dict[str, any]
) -> List[MappingResult]:
    """Generate mappings using SBERT on completed descriptions only (no name similarity)."""
    print(f"🔗 Generating mappings using completed descriptions...")

    # Build ordered lists aligned to columns
    src_cols = [c for c in source_table.columns if description_status["source_table"]["columns"].get(c.name, {}).get("status") == "completed"]
    tgt_cols = [c for c in target_table.columns if description_status["target_table"]["columns"].get(c.name, {}).get("status") == "completed"]

    if not src_cols or not tgt_cols:
        return []

    src_desc = [description_status["source_table"]["columns"][c.name]["description"] for c in src_cols]
    tgt_desc = [description_status["target_table"]["columns"][c.name]["description"] for c in tgt_cols]

    # Filter out empties
    if not any(src_desc) or not any(tgt_desc):
        return []

    model = get_sentence_model()
    if model is None:
        sim = np.zeros((len(src_desc), len(tgt_desc)), dtype=np.float32)
        for i, sd in enumerate(src_desc):
            for j, td in enumerate(tgt_desc):
                sim[i, j] = calculate_description_similarity(sd, td)
    else:
        src_emb = _encode_with_cache(src_desc)
        tgt_emb = _encode_with_cache(tgt_desc)
        sim = _cosine_similarity_matrix(src_emb, tgt_emb)

    threshold = 0.45
    mappings: List[MappingResult] = []
    for i, s_col in enumerate(src_cols):
        if not src_desc[i]:
            continue
        j = int(np.argmax(sim[i]))
        score = float(sim[i, j])
        if score < threshold:
            continue
        t_col = tgt_cols[j]
        mapping = MappingResult(
            sourceColumn=s_col.name,
            sourceTable=source_table.tableName,
            sourceType=s_col.type,
            targetColumn=t_col.name,
            targetTable=target_table.tableName,
            targetType=t_col.type,
            confidence=score,
            aiDescription="Mapping based on description similarity",
            similarityScore=score
        )
        mappings.append(mapping)
        print(f"    ✅ Mapped to: {t_col.name} (sim: {score:.2f})")

    return mappings

@app.post("/execute-description-generation-and-mapping")
async def execute_description_generation_and_mapping_workflow_endpoint(
    request: Request,
    source_table: TableSchema,
    target_table: TableSchema,
    ai_config: AIConfig,
    db: Session = Depends(get_db)
):
    """
    Execute the complete workflow: Description Generation Steps followed by Mapping Process
    
    This endpoint ensures that:
    1. Description generation is 100% completed before mapping begins
    2. JDE configuration is checked first for existing descriptions
    3. AI-based generation is only used when JDE descriptions are not available
    4. Mapping process waits for complete description generation
    """
    
    try:
        # Execute the complete workflow
        workflow_results = execute_description_generation_and_mapping_workflow(
            source_table, 
            target_table, 
            ai_config
        )
        
        return {
            "success": True,
            "message": "Description generation and mapping workflow completed successfully",
            "results": workflow_results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Workflow execution failed: {str(e)}"
        )