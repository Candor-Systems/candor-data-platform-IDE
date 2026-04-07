# AI-Powered Source-to-Target Mapping (STTM) System

A comprehensive web-based application for intelligent database column mapping using AI-powered analysis and automated schema discovery.

## Features

### Core Functionality
- **Automated Column Mapping**: Smart matching algorithm for source-to-target column mapping
- **AI-Powered Descriptions**: Automatic column description generation using Google Gemini API or Groq
- **Interactive Review Interface**: Web-based interface for reviewing and approving mappings
- **Glossary Management**: Centralized business glossary for data definitions
- **Human-in-the-Loop**: Manual annotation and feedback system
- **Performance Metrics**: Analytics dashboard for mapping quality metrics

### Advanced Capabilities
- **Multi-Database Support**: MySQL, SQL Server, Oracle, PostgreSQL, Vertica, SQLite, MongoDB
- **AI Model Switching**: Choose between Google Gemini and Groq models
- **Confidence Scoring**: Mapping quality scores with accept/reject workflow
- **Real-time Processing**: Live mapping execution with progress tracking
- **Centralized Configuration**: Environment-based configuration management
- **Export Capabilities**: Generate mapping reports and documentation

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for state management
- **Recharts** for data visualization
- **Framer Motion** for animations

### Backend
- **FastAPI** (Python 3.9+)
- **SQLAlchemy** for database ORM
- **Pydantic** for data validation
- **Google Generative AI** and **Groq** for AI services
- **Async/await** for performance

### Database Support
- MySQL (with PyMySQL)
- PostgreSQL (with psycopg2)
- SQL Server (with pyodbc)
- Oracle (with cx_Oracle)
- Vertica (with vertica-python)
- SQLite (built-in)

## Installation

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+
- Database drivers for your target databases

### Frontend Setup
```bash
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Environment Configuration
1. Copy `backend/.env.example` to `backend/.env`
2. Configure your AI API keys:
   - Get Gemini API key from Google AI Studio
   - Get Groq API key from Groq Console
3. Set up database connection parameters

## Usage

### 1. Configuration
- Navigate to the Configuration page
- Add your AI API keys and select preferred models
- Configure source and target database connections
- Test connections to ensure connectivity

### 2. Schema Analysis
- Go to the Mapping page
- Select source and target databases
- Click "Start AI Mapping" to begin analysis
- The system will analyze schemas and generate mappings

### 3. Review and Approval
- Review AI-generated column mappings
- Check confidence scores and AI descriptions
- Approve or reject individual mappings
- Handle low-confidence mappings (< 50%) with manual review

### 4. Mapping Execution
- Click "Proceed to Mapping" to execute approved mappings
- Monitor real-time progress and performance metrics
- View detailed results and error reports

### 5. Results Analysis
- Access the Results page for comprehensive mapping analysis
- View success rates, performance metrics, and error details
- Export mapping reports and documentation

## API Documentation

The backend provides a comprehensive REST API:

- `POST /test-connection` - Test database connectivity
- `POST /get-schema` - Extract database schema information
- `POST /generate-mappings` - Generate AI-powered column mappings
- `POST /execute-mapping` - Execute data mapping operations
- `GET /metrics` - Retrieve system performance metrics

Full API documentation available at `http://38.107.236.14:8000/docs` when running the backend.

## Architecture

### Frontend Architecture
- **Component-based**: Modular React components with clear separation
- **Context API**: Global state management for configuration
- **Service Layer**: Centralized API communication
- **Responsive Design**: Mobile-first approach with Tailwind CSS

### Backend Architecture
- **Microservices**: Modular FastAPI application
- **Database Abstraction**: SQLAlchemy for multi-database support
- **AI Integration**: Pluggable AI service providers
- **Async Processing**: Non-blocking operations for performance

## Configuration

### AI Models
- **Google Gemini**: `gemini-pro`, `gemini-pro-vision`
- **Groq**: `meta-llama/llama-4-scout-17b-16e-instruct`, `llama2-70b-4096`

### Database Types
- **Relational**: MySQL, PostgreSQL, SQL Server, Oracle
- **Analytics**: Vertica
- **Embedded**: SQLite
- **NoSQL**: MongoDB (planned)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: Report bugs and feature requests
- Documentation: Comprehensive guides and API reference
- Community: Join our discussion forums

---

Built with ❤️ for the data engineering community