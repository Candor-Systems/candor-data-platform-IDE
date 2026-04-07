# Campaign Management System

This document describes the comprehensive campaign management system implemented for the STTM.

## Features Overview

### 1. Campaign Management Dashboard (`/campaign-management`)
- **Campaign List View**: View all user campaigns with comprehensive details
- **Status Management**: Track campaigns by status (draft, active, completed, archived, failed)
- **Search & Filtering**: Advanced search and filtering capabilities
- **CRUD Operations**: Create, read, update, and delete campaigns
- **Campaign Duplication**: Clone existing campaigns for reuse
- **Execution Control**: Execute, pause, and monitor campaign progress

### 2. Campaign History (`/campaign-history`)
- **Execution Results**: View detailed execution history and results
- **Performance Metrics**: Track success rates, execution times, and mapping counts
- **Configuration Reuse**: Save and reuse successful configurations
- **Report Generation**: Download execution reports in JSON format
- **Error Tracking**: Monitor failed executions and error messages

### 3. Enhanced Campaign Creation (`/campaigns`)
- **AI-Powered Mapping**: Intelligent column mapping using AI
- **Database Integration**: Support for MySQL, PostgreSQL, and SQL Server
- **Table Selection**: Choose specific tables for mapping
- **Real-time Processing**: Live status updates during execution
- **Mapping Review**: Interactive approval/rejection of AI-generated mappings

## Technical Implementation

### Backend API Endpoints

#### Campaign Management
- `POST /campaigns` - Create new campaign
- `GET /campaigns` - Get user campaigns with pagination
- `GET /campaigns/{id}` - Get specific campaign details
- `PUT /campaigns/{id}` - Update campaign
- `DELETE /campaigns/{id}` - Delete campaign
- `POST /campaigns/{id}/execute-mappings` - Execute campaign mappings

#### Data Storage
- `POST /store-mappings-to-target` - Store mappings to target database
- `POST /generate-mappings` - Generate AI-powered mappings

### Database Schema

#### Campaigns Table
```sql
CREATE TABLE campaigns (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    source_config JSON NOT NULL,
    target_config JSON NOT NULL,
    ai_config JSON NOT NULL,
    selected_source_tables JSON,
    selected_target_tables JSON,
    mappings JSON,
    mapping_count INTEGER DEFAULT 0,
    execution_results JSON,
    execution_status VARCHAR(50) DEFAULT 'pending',
    execution_summary JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

#### Campaign Executions Table
```sql
CREATE TABLE campaign_executions (
    id INTEGER PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    execution_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'running',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    result_summary JSON,
    error_message TEXT
);
```

### Frontend Components

#### CampaignManagement.tsx
- Main campaign management interface
- Campaign list with sorting and filtering
- Status indicators and action buttons
- Modal dialogs for campaign details and deletion

#### CampaignHistory.tsx
- Execution history and performance metrics
- Configuration reuse functionality
- Report generation and download
- Error tracking and resolution

#### Enhanced Campaigns.tsx
- AI-powered mapping workflow
- Database configuration and schema analysis
- Table selection and mapping generation
- Integration with campaign management system

## User Workflow

### 1. Creating a New Campaign
1. Navigate to `/campaigns`
2. Fill in campaign details (name, description)
3. Configure source and target databases
4. Set up AI configuration
5. Select tables for mapping
6. Generate AI-powered mappings
7. Review and approve mappings
8. Execute campaign and store results

### 2. Managing Existing Campaigns
1. Navigate to `/campaign-management`
2. View campaign list with status indicators
3. Use search and filters to find specific campaigns
4. View detailed campaign information
5. Execute, duplicate, or delete campaigns as needed

### 3. Analyzing Campaign History
1. Navigate to `/campaign-history`
2. Review execution results and performance metrics
3. Identify successful configurations for reuse
4. Download execution reports
5. Reuse configurations for new campaigns

### 4. Reusing Campaign Configurations
1. In campaign history, click "Reuse Config"
2. Configuration is saved to localStorage
3. Redirect to campaign creation page
4. Pre-filled with saved configuration
5. Modify as needed and create new campaign

## Key Benefits

### For Users
- **Efficiency**: Reuse successful configurations
- **Visibility**: Track campaign progress and results
- **Control**: Manage multiple campaigns simultaneously
- **Quality**: AI-powered mapping with human oversight
- **History**: Learn from past executions

### For System
- **Scalability**: Support multiple campaigns per user
- **Reliability**: Track execution status and errors
- **Performance**: Optimize based on historical data
- **Maintenance**: Easy campaign management and cleanup

## Future Enhancements

### Planned Features
- **Campaign Templates**: Pre-defined campaign configurations
- **Scheduled Execution**: Automated campaign scheduling
- **Collaboration**: Share campaigns between users
- **Advanced Analytics**: Performance insights and recommendations
- **API Integration**: External system integration capabilities

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live status
- **Batch Operations**: Bulk campaign management
- **Advanced Filtering**: Complex query capabilities
- **Export Options**: Multiple report formats (CSV, PDF)
- **Mobile Support**: Responsive design improvements

## Configuration

### Environment Variables
```bash
# Database Configuration
DATABASE_URL=sqlite:///sttm_system.db

# AI Provider Configuration
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key

# Stripe Configuration (for subscriptions)
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### Dependencies
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "antd": "^5.0.0",
    "lucide-react": "^0.300.0",
    "react-hot-toast": "^2.4.0"
  }
}
```

## Support and Troubleshooting

### Common Issues
1. **Campaign Creation Fails**: Check database connectivity and AI API keys
2. **Mapping Generation Issues**: Verify source and target database schemas
3. **Execution Errors**: Review error logs and database permissions
4. **Performance Issues**: Check AI provider rate limits and database performance

### Debug Information
- Enable debug logging in backend configuration
- Check browser console for frontend errors
- Review database logs for SQL execution issues
- Monitor AI provider API usage and limits

## Conclusion

The campaign management system provides a comprehensive solution for managing data mapping campaigns with AI-powered intelligence. It enables users to create, monitor, and reuse successful configurations while maintaining full control over the mapping process.

For additional support or feature requests, please refer to the main project documentation or contact the development team.
