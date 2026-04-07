# STTM Backend Server

## Setup Instructions

1. **Activate Virtual Environment**
   ```bash
   # On Windows
   .venv\Scripts\activate
   
   # On Linux/Mac
   source .venv/bin/activate
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Server**
   ```bash
   # Option 1: Using the startup script
   python start_server.py
   
   # Option 2: Using uvicorn directly
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Access the API**
   - API will be available at: http://localhost:8000
   - API documentation: http://localhost:8000/docs
   - ReDoc documentation: http://localhost:8000/redoc

## Troubleshooting

If you get a 500 error on `/get-schema`:

1. Make sure the backend server is running
2. Check that all dependencies are installed
3. Verify database connection settings in config.py
4. Check the server logs for detailed error messages

## Environment Variables

The following environment variables can be set in a `.env` file:

- `FRONTEND_URL`: Frontend URL (default: http://localhost:5173)
- `BACKEND_URL`: Backend URL (default: http://localhost:8000)
- `SECRET_KEY`: Secret key for JWT tokens
- `DATABASE_URL`: Database connection string
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `STRIPE_SECRET_KEY`: Stripe secret key
