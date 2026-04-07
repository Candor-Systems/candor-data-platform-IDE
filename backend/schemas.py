from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: str  # Changed from EmailStr to str temporarily
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str  # Changed from EmailStr to str temporarily
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserWithSubscription(UserResponse):
    subscription_status: dict

# Campaign schemas
class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None

class CampaignCreate(CampaignBase):
    source_config: Dict[str, Any]
    target_config: Dict[str, Any]
    ai_config: Dict[str, Any]
    selected_source_tables: Optional[List[str]] = None
    selected_target_tables: Optional[List[str]] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    mappings: Optional[List[Dict[str, Any]]] = None
    execution_results: Optional[List[Dict[str, Any]]] = None
    execution_status: Optional[str] = None
    execution_summary: Optional[Dict[str, Any]] = None

class CampaignResponse(CampaignBase):
    id: int
    user_id: int
    status: str
    source_config: Dict[str, Any]
    target_config: Dict[str, Any]
    ai_config: Dict[str, Any]
    selected_source_tables: Optional[List[str]] = None
    selected_target_tables: Optional[List[str]] = None
    mappings: Optional[List[Dict[str, Any]]] = None
    mapping_count: int
    execution_results: Optional[List[Dict[str, Any]]] = None
    execution_status: str
    execution_summary: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CampaignListResponse(BaseModel):
    campaigns: List[CampaignResponse]
    total: int

# Campaign execution schemas
class CampaignExecutionCreate(BaseModel):
    campaign_id: int
    execution_type: str

class CampaignExecutionUpdate(BaseModel):
    status: str
    result_summary: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class CampaignExecutionResponse(BaseModel):
    id: int
    campaign_id: int
    execution_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    result_summary: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True

# Subscription schemas
class SubscriptionBase(BaseModel):
    plan_type: str

class SubscriptionResponse(BaseModel):
    id: int
    user_id: int
    plan_type: str
    status: str
    is_trial: bool
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    trial_start: Optional[datetime]
    trial_end: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Payment schemas
class PaymentIntentRequest(BaseModel):
    plan_type: str

class PaymentIntentResponse(BaseModel):
    client_secret: str
    amount: float
    currency: str

class PaymentResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    currency: str
    status: str
    plan_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Plan schemas
class PlanFeature(BaseModel):
    name: str
    included: bool

class PlanResponse(BaseModel):
    id: str
    name: str
    price: float
    features: List[str]
    stripe_price_id: str

# Auth response
class AuthResponse(BaseModel):
    user: UserWithSubscription
    message: str
