import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Frontend Configuration
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Backend Configuration
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
    
    # Database Configuration - Using your MySQL database with PyMySQL driver
    DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://SKR:Kumar%403322@localhost:3306/helix_social")
    
    # Stripe Configuration - Using live keys
    STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_live_51Rpf9RRuFd85fFks1RzubVduP3cs8DBU7woF1nLKbD1gsTJvkxVec418zIGiJqbCYTUzRTCbSjDCmvkLsnXmK7cf001aLNXxw8")
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_live_51Rpf9ksi5c4esSv9e2xolKYfkGCxNei0h5IYVw1r9CpDny5iD5kXVnQkfAihC3x80rpR08oYEBqqe400lQlgxtfG")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    # Subscription Plans
    SUBSCRIPTION_PLANS = {
        "basic": {
            "name": "Basic Plan",
            "price": 9.99,
            "stripe_price_id": "price_basic_monthly",
            "features": ["Basic AI mapping", "5 tables per month", "Email support"]
        },
        "pro": {
            "name": "Pro Plan",
            "price": 19.99,
            "stripe_price_id": "price_pro_monthly",
            "features": ["Advanced AI mapping", "Unlimited tables", "Priority support", "Custom mappings"]
        },
        "enterprise": {
            "name": "Enterprise Plan",
            "price": 49.99,
            "stripe_price_id": "price_enterprise_monthly",
            "features": ["Enterprise AI mapping", "Unlimited everything", "24/7 support", "Custom integrations"]
        }
    }
    
    # Trial Configuration
    TRIAL_DAYS = 7
