# Admin Panel Guide

## Overview

The DedSec Compute Admin Panel is a comprehensive, enterprise-grade administration interface designed to manage all aspects of the distributed computing network. Built with security, scalability, and ease of use in mind, it provides administrators with complete control over the platform.

## Features

### 🔐 **Enterprise Security**
- **Multi-factor authentication** support
- **Role-based access control** (RBAC)
- **Comprehensive audit logging** for all administrative actions
- **IP-based access monitoring** and rate limiting
- **Session management** with automatic timeout
- **Compromise detection** and threat monitoring

### 👥 **User Management**
- **Real-time user monitoring** with active session tracking
- **User account management** (activate/deactivate, role assignment)
- **Performance analytics** per user (compute hours, mission completion)
- **Device session management** and hardware specifications
- **Invitation system** management and tracking

### 🎯 **Mission Management**
- **Create, edit, and delete** network missions
- **Difficulty levels** (Easy, Medium, Hard, Legendary)
- **Participant management** with capacity controls
- **Real-time progress tracking** and completion statistics
- **Mission scheduling** with start/end dates
- **Tag-based organization** and filtering

### 📊 **Analytics & Monitoring**
- **Network performance metrics** in real-time
- **System health monitoring** (CPU, memory, disk usage)
- **Task execution analytics** with success/failure rates
- **User contribution statistics** and trends
- **Customizable time ranges** (1h, 24h, 7d, 30d)
- **Export capabilities** for data analysis

### ⚙️ **System Configuration**
- **Maintenance mode** controls
- **Rate limiting** configuration
- **Security level settings** (Low, Medium, High, Paranoid)
- **Auto-scaling** parameters
- **Backup and retention** policies
- **Performance tuning** options

### 🛡️ **Security & Audit**
- **Administrative action logs** with full audit trail
- **Security event monitoring** and alerting
- **Compromise detection** with confidence scoring
- **Access pattern analysis** and anomaly detection
- **Export capabilities** for compliance reporting

## Access Control

### Admin Levels
- **Super Administrator**: Full system access
- **Administrator**: Standard administrative privileges
- **Moderator**: Limited user and content management
- **Viewer**: Read-only access to monitoring data

### Permission Matrix
| Feature | Super Admin | Admin | Moderator | Viewer |
|---------|-------------|-------|-----------|---------|
| User Management | ✅ Full | ✅ Full | ⚠️ Limited | ❌ None |
| Mission Management | ✅ Full | ✅ Full | ✅ Full | ❌ None |
| System Configuration | ✅ Full | ✅ Full | ❌ None | ❌ None |
| Security Settings | ✅ Full | ⚠️ Limited | ❌ None | ❌ None |
| Analytics | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Audit Logs | ✅ Full | ✅ Full | ⚠️ Limited | ❌ None |

## Getting Started

### 1. Initial Setup
```bash
# Ensure you have admin privileges in the database
UPDATE users SET is_admin = true, admin_level = 'super_admin' 
WHERE email = 'your-admin-email@domain.com';
```

### 2. First Login
1. Navigate to `/admin`
2. Enter your admin credentials
3. Complete any required security setup
4. Access the main dashboard

### 3. Navigation
The admin panel uses a responsive sidebar navigation:
- **Dashboard**: Overview and quick actions
- **Users**: User management and monitoring
- **Missions**: Mission creation and management
- **Analytics**: Performance monitoring and metrics
- **System**: Configuration and health monitoring
- **Security**: Audit logs and security settings

## User Management

### Viewing Users
- **List View**: All users with search and filtering
- **Detail View**: Individual user profiles and sessions
- **Statistics**: User contribution metrics and performance

### User Actions
- **Activate/Deactivate**: Control user access to the platform
- **Role Assignment**: Grant or revoke administrative privileges
- **Session Management**: Monitor active computing sessions
- **Performance Review**: Analyze user contribution patterns

### Best Practices
- Regularly review user activity and performance
- Monitor for suspicious behavior patterns
- Maintain appropriate access levels
- Document all administrative actions

## Mission Management

### Creating Missions
1. Navigate to **Missions** → **New Mission**
2. Fill in required fields:
   - **Code**: Unique mission identifier
   - **Title**: Human-readable mission name
   - **Description**: Detailed mission objectives
   - **Difficulty**: Complexity level
   - **Requirements**: Technical specifications
   - **Timeline**: Start/end dates
   - **Capacity**: Maximum participants

### Mission Types
- **Research Missions**: Scientific computing tasks
- **Data Processing**: Large-scale data analysis
- **Simulation**: Complex computational modeling
- **Training**: Machine learning model training

### Monitoring Progress
- **Real-time Updates**: Live participant and completion tracking
- **Performance Metrics**: Success rates and efficiency
- **Resource Utilization**: CPU and memory consumption
- **Completion Analytics**: Time-to-completion and quality metrics

## Analytics & Monitoring

### Key Metrics
- **Network Efficiency**: Overall system performance
- **User Engagement**: Active participants and contribution levels
- **Task Performance**: Success rates and execution times
- **Resource Utilization**: CPU, memory, and storage usage

### Time Ranges
- **1 Hour**: Real-time monitoring
- **24 Hours**: Daily performance analysis
- **7 Days**: Weekly trends and patterns
- **30 Days**: Monthly performance review

### Export Options
- **CSV Export**: Data analysis in spreadsheet applications
- **JSON API**: Integration with external monitoring tools
- **Real-time Feeds**: WebSocket connections for live data

## System Configuration

### Performance Tuning
- **Rate Limiting**: Control API request frequency
- **Concurrent Users**: Maximum simultaneous connections
- **Resource Allocation**: CPU and memory limits
- **Auto-scaling**: Automatic resource adjustment

### Security Settings
- **Authentication**: Multi-factor and session policies
- **Access Control**: IP restrictions and geolocation
- **Monitoring**: Intrusion detection and alerting
- **Compliance**: Audit logging and reporting

### Maintenance
- **Scheduled Maintenance**: Planned downtime windows
- **Backup Policies**: Data retention and recovery
- **Update Management**: System and security patches
- **Health Monitoring**: Proactive issue detection

## Security & Compliance

### Audit Logging
All administrative actions are automatically logged with:
- **Timestamp**: Exact time of action
- **Administrator**: User performing the action
- **Action Type**: Specific operation performed
- **Target**: Affected resource or user
- **Details**: Complete action context
- **IP Address**: Source of the action
- **User Agent**: Browser/client information

### Security Events
- **Login Attempts**: Successful and failed authentication
- **Privilege Changes**: Role and permission modifications
- **System Changes**: Configuration modifications
- **Access Patterns**: Unusual behavior detection

### Compliance Features
- **Data Retention**: Configurable log retention periods
- **Export Capabilities**: Compliance reporting tools
- **Access Reviews**: Regular privilege audits
- **Incident Response**: Security event handling procedures

## Troubleshooting

### Common Issues

#### Authentication Problems
```bash
# Check admin privileges
SELECT id, email, is_admin, admin_level FROM users WHERE email = 'admin@domain.com';

# Verify admin logs table exists
SELECT * FROM admin_logs LIMIT 1;
```

#### Performance Issues
- Monitor system resource usage
- Check database connection limits
- Review rate limiting settings
- Analyze user activity patterns

#### Security Concerns
- Review recent audit logs
- Check for unusual access patterns
- Verify user privilege levels
- Monitor compromise detection alerts

### Support Resources
- **Documentation**: This guide and technical docs
- **Logs**: System and application logs
- **Monitoring**: Real-time system health
- **Community**: Admin user forums and support

## Best Practices

### Security
- **Regular Access Reviews**: Monthly privilege audits
- **Multi-factor Authentication**: Require for all admin accounts
- **Session Management**: Implement appropriate timeouts
- **Log Monitoring**: Regular review of security events

### Performance
- **Resource Monitoring**: Track system utilization
- **Capacity Planning**: Plan for growth and scaling
- **Backup Testing**: Regular recovery procedure testing
- **Update Management**: Keep systems current and secure

### User Management
- **Clear Policies**: Document user management procedures
- **Regular Reviews**: Periodic user activity analysis
- **Training**: Admin user education and best practices
- **Documentation**: Maintain comprehensive action logs

## API Integration

### REST Endpoints
The admin panel provides RESTful APIs for:
- User management operations
- Mission creation and monitoring
- Analytics data retrieval
- System configuration management

### WebSocket Feeds
Real-time data feeds for:
- Live system metrics
- User activity updates
- Security event notifications
- Performance alerts

### Authentication
- **API Keys**: Secure access to admin functions
- **OAuth 2.0**: Standard authentication protocol
- **Rate Limiting**: Prevent API abuse
- **Audit Logging**: Track all API usage

## Conclusion

The DedSec Compute Admin Panel provides enterprise-grade administration capabilities with a focus on security, performance, and ease of use. By following the guidelines in this document, administrators can effectively manage the platform while maintaining security and compliance standards.

For additional support or feature requests, please refer to the project documentation or contact the development team.
