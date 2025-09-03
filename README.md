# DedSecCompute

A distributed computing platform built with Next.js 14, Supabase, and modern web technologies.

## 🚀 Features

### Core Functionality
- **Distributed Computing**: Contribute CPU and memory resources to network tasks
- **Mission System**: Accept and track computing missions with progress tracking
- **Real-time Monitoring**: Live hardware stats and resource utilization
- **User Management**: Secure authentication with 2FA support

### Security & Privacy
- **Session Management**: JWT validation with automatic refresh
- **XSS Protection**: Comprehensive input sanitization
- **Compromise Detection**: Real-time security monitoring and logging
- **Audit Trail**: Complete logging of security events

### Performance & Analytics
- **Historical Charts**: Beautiful visualizations with Recharts
- **Leaderboard System**: Cached rankings with automated updates
- **Query Optimization**: Server-side aggregation for better performance
- **Worker Resilience**: Heartbeat monitoring and auto-restart

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: shadcn/ui, Radix UI
- **Charts**: Recharts
- **Security**: DOMPurify, JWT validation
- **Deployment**: Vercel (with cron jobs)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dedsec-compute
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Set up the database**
   ```bash
   # Run the SQL scripts in order:
   # 1. scripts/001_create_database_schema.sql
   # 2. scripts/002_create_user_trigger.sql
   # 3. scripts/003_setup_row_level_security.sql
   # 4. scripts/004_create_admin_functions.sql
   # 5. scripts/005_create_missions.sql
   # 6. scripts/007_fix_user_creation.sql
   # 7. scripts/008_fix_2fa_secret_length.sql
   # 8. scripts/009_remove_display_name.sql
   # 9. scripts/010_fix_rls_recursion.sql
   # 10. scripts/setup-storage.sql
   # 11. scripts/011_create_compromise_logs.sql
   # 12. scripts/012_create_worker_heartbeats.sql
   # 13. scripts/013_create_task_aggregation_functions.sql
   # 14. scripts/014_create_leaderboard_system.sql
   # 15. scripts/015_setup_cron_jobs.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### External Scheduling Setup

Since Supabase hosted doesn't support `pg_cron`, database maintenance is handled via external scheduling:

**Option 1: GitHub Actions (Recommended)**
- Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to repository secrets
- The workflow runs daily at 1 AM UTC

**Option 2: Vercel Cron Jobs**
- Add `CRON_SECRET` environment variable
- Cron job runs automatically on Vercel

**Option 3: Manual Execution**
```sql
SELECT * FROM scheduled_maintenance();
```

See [docs/EXTERNAL_SCHEDULING.md](docs/EXTERNAL_SCHEDULING.md) for detailed setup instructions.

### Storage Setup

1. Create a `profile-pictures` bucket in Supabase Storage
2. Set up RLS policies for the bucket
3. Configure CORS settings for image uploads

## 📊 Database Schema

### Key Tables
- `users`: User profiles and authentication data
- `missions`: Computing missions and tasks
- `user_missions`: User participation in missions
- `task_executions`: Individual task execution records
- `compromise_logs`: Security event logging
- `worker_heartbeats`: Background worker monitoring
- `leaderboard_cache`: Pre-computed leaderboard rankings

### Key Functions
- `scheduled_maintenance()`: Automated cleanup and leaderboard updates
- `get_cached_leaderboard()`: Fast leaderboard retrieval
- `log_compromise_event()`: Security event logging
- `update_all_leaderboards()`: Leaderboard calculation

## 🔒 Security Features

### Authentication
- Supabase Auth with email/password
- Google OAuth integration
- Two-factor authentication (2FA)
- Session management with JWT validation

### Data Protection
- XSS protection with DOMPurify
- Input sanitization for all user data
- SQL injection prevention with parameterized queries
- CORS configuration for secure API access

### Monitoring
- Compromise detection and logging
- Worker heartbeat monitoring
- Security event audit trail
- Real-time threat detection

## 📈 Performance Features

### Optimization
- Server-side aggregation for heavy queries
- Cached leaderboard calculations
- Optimized database indexes
- Efficient real-time subscriptions

### Monitoring
- Historical performance charts
- Resource utilization tracking
- Worker health monitoring
- Automated error recovery

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
1. Build the application: `npm run build`
2. Deploy the `out` directory to your hosting provider
3. Set up external cron jobs for database maintenance

## 📝 API Documentation

### Key Endpoints
- `POST /api/cron/maintenance`: Trigger database maintenance
- `GET /api/health`: Application health check

### Supabase Functions
- `scheduled_maintenance()`: Database maintenance
- `get_cached_leaderboard()`: Leaderboard data
- `log_compromise_event()`: Security logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Check the [documentation](docs/) for detailed guides
- Open an issue for bug reports or feature requests
- Review the [external scheduling guide](docs/EXTERNAL_SCHEDULING.md) for maintenance setup

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced mission types
- [ ] Machine learning task support
- [ ] Blockchain integration
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
