import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from models import User, Subscription
from config import Config

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def get_user_subscription_status(db: Session, user_id: int) -> dict:
    """Get user's subscription status and trial information"""
    try:
        subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        
        if not subscription:
            return {
                "has_subscription": False,
                "is_trial": False,
                "is_expired": True,
                "plan_type": None,
                "days_remaining": 0,
                "trial_days_remaining": 0
            }
        
        now = datetime.now(timezone.utc)
        
        # Helper function to make datetime timezone-aware
        def make_timezone_aware(dt):
            if dt is None:
                return None
            if dt.tzinfo is None:
                # If naive, assume UTC
                return dt.replace(tzinfo=timezone.utc)
            return dt
        
        # Check if subscription is active
        if subscription.status == "active":
            if subscription.current_period_end:
                current_period_end = make_timezone_aware(subscription.current_period_end)
                if current_period_end and current_period_end > now:
                    days_remaining = (current_period_end - now).days
                    return {
                        "has_subscription": True,
                        "is_trial": subscription.is_trial,
                        "is_expired": False,
                        "plan_type": subscription.plan_type,
                        "days_remaining": days_remaining,
                        "trial_days_remaining": 0
                    }
        
        # Check trial status
        if subscription.is_trial and subscription.trial_end:
            trial_end = make_timezone_aware(subscription.trial_end)
            if trial_end and trial_end > now:
                trial_days_remaining = (trial_end - now).days
                return {
                    "has_subscription": True,
                    "is_trial": True,
                    "is_expired": False,
                    "plan_type": subscription.plan_type,
                    "days_remaining": 0,
                    "trial_days_remaining": trial_days_remaining
                }
        
        return {
            "has_subscription": True,
            "is_trial": False,
            "is_expired": True,
            "plan_type": subscription.plan_type,
            "days_remaining": 0,
            "trial_days_remaining": 0
        }
    except Exception as e:
        print(f"Error in get_user_subscription_status: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return a safe default response
        return {
            "has_subscription": False,
            "is_trial": False,
            "is_expired": True,
            "plan_type": None,
            "days_remaining": 0,
            "trial_days_remaining": 0
        }

def create_trial_subscription(db: Session, user_id: int) -> Subscription:
    """Create a trial subscription for a new user"""
    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=Config.TRIAL_DAYS)
    
    subscription = Subscription(
        user_id=user_id,
        plan_type="basic",
        status="trialing",
        trial_start=now,
        trial_end=trial_end,
        is_trial=True
    )
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription
