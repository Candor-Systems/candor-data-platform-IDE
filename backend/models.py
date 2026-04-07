from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="user")
    payments = relationship("Payment", back_populates="user")
    campaigns = relationship("Campaign", back_populates="user")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_type = Column(String(50), nullable=False)
    status = Column(String(50), default="active")
    is_trial = Column(Boolean, default=True)
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    trial_start = Column(DateTime)
    trial_end = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(String(50), default="pending")
    plan_type = Column(String(50), nullable=False)
    stripe_payment_intent_id = Column(String(255))
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="payments")

class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="draft")  # draft, active, completed, archived
    
    # Configuration
    source_config = Column(JSON, nullable=False)  # Database configuration
    target_config = Column(JSON, nullable=False)  # Database configuration
    ai_config = Column(JSON, nullable=False)      # AI configuration
    
    # Table selection
    selected_source_tables = Column(JSON)  # Array of table names
    selected_target_tables = Column(JSON)  # Array of table names
    
    # Mapping results
    mappings = Column(JSON)  # Array of mapping results
    mapping_count = Column(Integer, default=0)
    
    # Execution results
    execution_results = Column(JSON)  # Array of execution results
    execution_status = Column(String(50), default="pending")  # pending, running, completed, failed
    execution_summary = Column(JSON)  # Summary statistics
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="campaigns")
    # executions = relationship("CampaignExecution", back_populates="campaign")  # Commented out until table exists

class CampaignExecution(Base):
    __tablename__ = "campaign_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    execution_type = Column(String(50), nullable=False)  # mapping_generation, data_execution
    status = Column(String(50), default="running")  # running, completed, failed
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime)
    result_summary = Column(JSON)
    error_message = Column(Text)
    
    # Relationships
    # campaign = relationship("Campaign", back_populates="executions")  # Commented out until table exists
