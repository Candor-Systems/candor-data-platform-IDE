# STTM - Complete Authentication & Payment System

A comprehensive AI-powered database mapping system with user authentication, subscription management, and Stripe payment integration.

## Features

### 🔐 Authentication System
- **User Registration & Login**: Secure user accounts with password hashing
- **No JWT**: Direct database authentication for simplicity
- **Session Management**: Persistent user sessions
- **Protected Routes**: Automatic redirect for unauthenticated users

### 💳 Subscription Management
- **7-Day Free Trial**: All new users get 7 days of full access
- **Multiple Plans**: Basic ($9.99), Pro ($19.99), Enterprise ($49.99)
- **Automatic Expiry**: Features disabled when subscription expires
- **Upgrade Prompts**: Clear upgrade buttons for expired users

### 💰 Stripe Payment Integration
- **Secure Payments**: Stripe Checkout integration
- **Multiple Plans**: Easy plan switching and upgrades
- **Payment Tracking**: Complete payment history
- **Webhook Support**: Automatic subscription status updates

### 🚀 AI Features (Subscription Protected)
- **Database Schema Analysis**: AI-powered table mapping
- **Enhanced Column Mapping**: Intelligent field matching with JDE support
- **Direct Mapping**: Automatic exact name and pattern matching
- **JDE Table Knowledge**: Built-in understanding of JD Edwards systems
- **JDE Configuration Integration**: JSON-based column descriptions and synonyms
- **Data Migration**: Automated data transfer with business context
- **Multi-Database Support**: MySQL, PostgreSQL, Oracle, etc.

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: Database ORM
- **MySQL**: Primary database
- **Stripe**: Payment processing
- **bcrypt**: Password hashing
- **Pydantic**: Data validation

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Ant Design**: Professional UI components
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Create database
mysql -u root -p
CREATE DATABASE sttm_db;

# Run the application
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### 3. Database Setup

The system will automatically create the following tables:
- `users`: User accounts and profiles
- `subscriptions`: Subscription status and trial information
- `payments`: Payment history and tracking

### 4. Stripe Configuration

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe dashboard
3. Update the environment variables with your keys
4. Configure webhook endpoints for subscription updates

## Environment Variables

### Backend (.env)
```bash
BACKEND_URL=http://localhost:8000
SECRET_KEY=your-secret-key-here
FRONTEND_URL=http://localhost:3000
DATABASE_URL=mysql://root:password@localhost/sttm_db
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

### Frontend (.env)
```bash
VITE_BACKEND_URL=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info

### Subscriptions
- `GET /plans` - Get available plans
- `POST /payments/create-payment-intent` - Create payment intent
- `POST /payments/confirm-payment` - Confirm payment
- `POST /subscriptions/cancel` - Cancel subscription

### AI Features (Protected)
- `POST /analyze-schema` - Analyze database schema
- `POST /generate-mappings` - Generate enhanced column mappings with JDE support
- `POST /generate-enhanced-mappings` - Generate detailed mappings with JDE analysis
- `GET /jde-table-info/{table_name}` - Get JDE table information and analysis
- `GET /jde-column-analysis/{column_name}` - Analyze JDE column patterns
- `GET /jde-config-info` - Get JDE configuration information
- `POST /execute-mappings` - Execute data migration

## Subscription Plans

### Basic Plan - $9.99/month
- Basic AI mapping capabilities
- 5 tables per month
- Email support
- 7-day free trial

### Pro Plan - $19.99/month
- Advanced AI mapping
- Unlimited tables
- Priority support
- Custom mappings
- 7-day free trial

### Enterprise Plan - $49.99/month
- Enterprise AI mapping
- Unlimited everything
- 24/7 support
- Custom integrations
- 7-day free trial

## User Flow

1. **Registration**: User creates account → 7-day trial starts
2. **Trial Period**: Full access to all features
3. **Trial Expiry**: Features disabled, upgrade prompts shown
4. **Subscription**: User selects plan and pays via Stripe
5. **Active Use**: Full access restored based on plan
6. **Renewal**: Automatic monthly billing
7. **Cancellation**: User can cancel anytime

## Security Features

- **Password Hashing**: bcrypt with salt
- **Protected Routes**: Authentication required for sensitive endpoints
- **Subscription Validation**: Server-side plan verification
- **Secure Payments**: Stripe handles all payment data
- **CORS Protection**: Configured for production use

## Production Deployment

### Backend
1. Use production database (MySQL/PostgreSQL)
2. Set secure SECRET_KEY
3. Configure CORS for your domain
4. Set up Stripe webhooks
5. Use production Stripe keys

### Frontend
1. Build production bundle: `npm run build`
2. Serve static files from web server
3. Update environment variables
4. Configure domain in Stripe dashboard

## Troubleshooting

### Common Issues

1. **Database Connection**: Check MySQL credentials and database existence
2. **Stripe Integration**: Verify API keys and webhook configuration
3. **CORS Errors**: Ensure frontend URL is in backend CORS settings
4. **Payment Failures**: Check Stripe dashboard for error details

### Support

For technical support or questions:
- Check the logs in both frontend and backend
- Verify environment variable configuration
- Test Stripe integration in test mode first
- Ensure database tables are created properly

## License

This project is proprietary software. All rights reserved.

## Contributing

This is a private project. Please contact the development team for any contributions or suggestions.
