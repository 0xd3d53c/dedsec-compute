# 🚀 DedSecCompute - Quick Setup Guide

This guide will help you set up DedSecCompute with the **simplified 3-script database setup**.

## 📋 Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Git

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd dedsec-compute
npm install
```

### 2. Environment Setup

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Setup (NEW PROJECT)

**Run these 3 scripts in your Supabase SQL Editor in order:**

#### Script 1: Main Database Schema
```sql
-- Copy and paste: scripts/000_complete_database_setup.sql
-- This creates all tables, functions, triggers, and RLS policies
```

#### Script 2: RPC Functions  
```sql
-- Copy and paste: scripts/001_rpc_functions.sql
-- This creates all the API functions the app needs
```

#### Script 3: Storage Setup
```sql
-- Copy and paste: scripts/002_setup_storage.sql  
-- This creates the profile picture storage bucket
```

### 4. Start Development

```bash
npm run dev
```

Visit `http://localhost:3000` and create your first account!

---

## 🔧 For Existing Databases

If you already have a DedSecCompute database with data:

```sql
-- Run this migration script instead:
-- scripts/999_migration_for_existing_databases.sql
-- Then run scripts 001 and 002 above
```

---

## ✅ Verification

After setup, you should see:

- **Tables**: 20+ tables created
- **Functions**: 10+ RPC functions  
- **Storage**: `profile-pictures` bucket
- **No errors** in Supabase logs

---

## 🐛 Troubleshooting

### Common Issues

**"Function not found" errors:**
- Make sure you ran script `001_rpc_functions.sql`

**Profile picture upload fails:**
- Make sure you ran script `002_setup_storage.sql`

**Database query errors:**
- Make sure you ran script `000_complete_database_setup.sql` first

### Getting Help

1. Check browser console for specific errors
2. Check Supabase logs in your dashboard
3. Verify all 3 scripts ran successfully

---

## 📁 Script Summary

| Script | Purpose | Required |
|--------|---------|----------|
| `000_complete_database_setup.sql` | Main schema, tables, RLS | ✅ Always |
| `001_rpc_functions.sql` | API functions | ✅ Always |  
| `002_setup_storage.sql` | File storage | ✅ Always |
| `999_migration_for_existing_databases.sql` | Migration only | ⚠️ Only if you have existing data |

✅ **Scripts directory cleaned up!** Old redundant scripts have been removed. Only the essential consolidated scripts remain.

