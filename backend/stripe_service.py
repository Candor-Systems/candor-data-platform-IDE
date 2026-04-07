import stripe
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from models import User, Subscription, Payment
from config import Config
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check if we're in development mode (HTTP localhost)
IS_DEVELOPMENT = (
    os.getenv("NODE_ENV") == "development" or 
    "localhost" in os.getenv("FRONTEND_URL", "") or
    "127.0.0.1" in os.getenv("FRONTEND_URL", "") or
    os.getenv("ENVIRONMENT") == "development"
)

# Configure Stripe
stripe.api_key = Config.STRIPE_SECRET_KEY
logger.info(f"Stripe configured with key: {Config.STRIPE_SECRET_KEY[:20]}...")
logger.info(f"Development mode: {IS_DEVELOPMENT}")
logger.info(f"Stripe version: {stripe.VERSION}")

class StripeService:
    @staticmethod
    def create_payment_intent(plan_type: str, user_email: str) -> dict:
        """Create a payment intent for subscription"""
        logger.info(f"Creating payment intent for plan: {plan_type}, user: {user_email}")
        
        if plan_type not in Config.SUBSCRIPTION_PLANS:
            logger.error(f"Invalid plan type: {plan_type}. Available plans: {list(Config.SUBSCRIPTION_PLANS.keys())}")
            raise ValueError(f"Invalid plan type: {plan_type}")
        
        plan = Config.SUBSCRIPTION_PLANS[plan_type]
        amount = int(plan["price"] * 100)  # Convert to cents
        
        logger.info(f"Plan details: {plan}, Amount in cents: {amount}")
        
        try:
            # Create a payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency="usd",
                metadata={
                    "plan_type": plan_type,
                    "user_email": user_email
                },
                automatic_payment_methods={
                    "enabled": True,
                },
            )
            
            logger.info(f"Payment intent created successfully: {payment_intent.id}")
            
            return {
                "client_secret": payment_intent.client_secret,
                "amount": plan["price"],
                "currency": "usd",
                "payment_intent_id": payment_intent.id,
                "is_mock": False
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            raise Exception(f"Unexpected error: {str(e)}")
    
    @staticmethod
    def create_checkout_session(plan_type: str, user_email: str, user_id: int) -> dict:
        """Create a Stripe Checkout session for subscription"""
        logger.info(f"Creating checkout session for plan: {plan_type}, user: {user_email}")
        
        if plan_type not in Config.SUBSCRIPTION_PLANS:
            logger.error(f"Invalid plan type: {plan_type}. Available plans: {list(Config.SUBSCRIPTION_PLANS.keys())}")
            raise ValueError(f"Invalid plan type: {plan_type}")
        
        plan = Config.SUBSCRIPTION_PLANS[plan_type]
        amount = int(plan["price"] * 100)  # Convert to cents
        
        try:
            # Create a checkout session using the correct Stripe API
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': plan["name"],
                            'description': f"Monthly subscription for {plan['name']}",
                        },
                        'unit_amount': amount,
                        'recurring': {
                            'interval': 'month',
                        },
                    },
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=f"{Config.FRONTEND_URL}/subscription-success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{Config.FRONTEND_URL}/subscription-plans",
                metadata={
                    "plan_type": plan_type,
                    "user_email": user_email,
                    "user_id": user_id
                },
                # Note: trial_period_days is not supported in checkout sessions
                # Trials need to be configured on the price/product level
            )
            
            logger.info(f"Checkout session created successfully: {checkout_session.id}")
            
            return {
                "session_id": checkout_session.id,
                "url": checkout_session.url,
                "amount": plan["price"],
                "currency": "usd",
                "plan_type": plan_type
            }
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error: {str(e)}")
            raise Exception(f"Stripe error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            raise Exception(f"Unexpected error: {str(e)}")
    
    @staticmethod
    def create_subscription_with_trial(customer_id: str, plan_type: str) -> dict:
        """Create a Stripe subscription with trial period after successful checkout"""
        if plan_type not in Config.SUBSCRIPTION_PLANS:
            raise ValueError(f"Invalid plan type: {plan_type}")
        
        plan = Config.SUBSCRIPTION_PLANS[plan_type]
        
        try:
            # Create a price if it doesn't exist (for demo purposes)
            price = stripe.Price.create(
                unit_amount=int(plan["price"] * 100),
                currency="usd",
                recurring={"interval": "month"},
                product_data={
                    "name": plan["name"],
                    "description": f"Monthly subscription for {plan['name']}"
                }
            )
            
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price.id}],
                trial_period_days=Config.TRIAL_DAYS,
                metadata={
                    "plan_type": plan_type
                }
            )
            
            return {
                "subscription_id": subscription.id,
                "price_id": price.id,
                "status": subscription.status
            }
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def create_customer(user: User) -> str:
        """Create a Stripe customer for the user"""
        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.username,
                metadata={
                    "user_id": user.id,
                    "username": user.username
                }
            )
            return customer.id
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def create_subscription(customer_id: str, plan_type: str) -> dict:
        """Create a Stripe subscription"""
        if plan_type not in Config.SUBSCRIPTION_PLANS:
            raise ValueError(f"Invalid plan type: {plan_type}")
        
        plan = Config.SUBSCRIPTION_PLANS[plan_type]
        
        try:
            # Create a price if it doesn't exist (for demo purposes)
            price = stripe.Price.create(
                unit_amount=int(plan["price"] * 100),
                currency="usd",
                recurring={"interval": "month"},
                product_data={
                    "name": plan["name"],
                    "description": f"Monthly subscription for {plan['name']}"
                }
            )
            
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price.id}],
                trial_period_days=Config.TRIAL_DAYS,
                metadata={
                    "plan_type": plan_type
                }
            )
            
            return {
                "subscription_id": subscription.id,
                "price_id": price.id,
                "status": subscription.status
            }
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def process_payment_success(db: Session, payment_intent_id: str, user_id: int, plan_type: str) -> Payment:
        """Process successful payment and create payment record"""
        payment = Payment(
            user_id=user_id,
            stripe_payment_intent_id=payment_intent_id,
            amount=Config.SUBSCRIPTION_PLANS[plan_type]["price"],
            currency="usd",
            status="succeeded",
            plan_type=plan_type
        )
        
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment
    
    @staticmethod
    def update_subscription_status(db: Session, subscription_id: str, status: str):
        """Update subscription status from webhook"""
        subscription = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == subscription_id
        ).first()
        
        if subscription:
            subscription.status = status
            if status == "active":
                subscription.is_trial = False
                subscription.current_period_start = datetime.now(timezone.utc)
                subscription.current_period_end = datetime.now(timezone.utc) + timedelta(days=30)
            
            db.commit()
            db.refresh(subscription)
    
    @staticmethod
    def cancel_subscription(db: Session, user_id: int) -> bool:
        """Cancel user subscription"""
        subscription = db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()
        
        if not subscription or not subscription.stripe_subscription_id:
            return False
        
        try:
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )
            
            subscription.status = "canceled"
            db.commit()
            return True
        except stripe.error.StripeError:
            return False
