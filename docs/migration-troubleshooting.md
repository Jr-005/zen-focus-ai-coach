# Database Migration Troubleshooting Guide

## Overview
This guide helps resolve common database migration issues in the FocusZen productivity application.

## Migration Files Structure

The project uses the following migration files:
- `20240101000000_initial_schema.sql` - Core tables and functions
- `20240102000000_add_habits_table.sql` - Habit tracking functionality
- `20240103000000_add_analytics_tables.sql` - Analytics and insights

## Common Issues and Solutions

### 1. Migration Status Check
```bash
# Check current migration status
supabase migration status

# Expected output should show all migrations as "Applied"
```

### 2. Failed Migration Recovery
```bash
# If migrations failed, check logs
supabase logs

# Reset and reapply migrations (CAUTION: This will drop data)
supabase db reset

# Or apply specific migration
supabase migration up --target 20240103000000
```

### 3. Schema Verification
Run the health check script in Supabase SQL Editor:
```sql
-- Copy contents from scripts/check-database.sql
```

### 4. Common Error Fixes

#### Error: "relation already exists"
```sql
-- Add IF NOT EXISTS to CREATE statements
CREATE TABLE IF NOT EXISTS table_name (...);
```

#### Error: "type already exists"
```sql
-- Check if type exists before creating
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
```

#### Error: "function already exists"
```sql
-- Use CREATE OR REPLACE
CREATE OR REPLACE FUNCTION function_name() ...
```

### 5. RLS Policy Issues
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Enable RLS if missing
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 6. Missing Indexes
```sql
-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
-- ... other indexes
```

## Manual Migration Steps

If automated migration fails, follow these manual steps:

### Step 1: Create Enums
```sql
CREATE TYPE app_role AS ENUM ('admin', 'user');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE goal_category AS ENUM ('personal', 'career', 'health', 'learning', 'financial');
CREATE TYPE session_type AS ENUM ('focus', 'short-break', 'long-break');
CREATE TYPE mood_type AS ENUM ('amazing', 'great', 'good', 'okay', 'low', 'stressed');
CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE metric_period AS ENUM ('daily', 'weekly', 'monthly');
```

### Step 2: Create Helper Functions
```sql
-- Copy functions from migration files
```

### Step 3: Create Tables
```sql
-- Copy table definitions from migration files
```

### Step 4: Enable RLS and Create Policies
```sql
-- Copy RLS and policy statements from migration files
```

### Step 5: Create Triggers and Indexes
```sql
-- Copy trigger and index statements from migration files
```

## Verification Checklist

- [ ] All tables exist and have correct columns
- [ ] All enums are created with correct values
- [ ] RLS is enabled on all tables
- [ ] Policies are created and working
- [ ] Functions are created and callable
- [ ] Triggers are active
- [ ] Indexes are created for performance
- [ ] Sample data can be inserted and queried

## Recovery Commands

### Complete Reset (DANGER: Loses all data)
```bash
supabase db reset
```

### Selective Recovery
```bash
# Drop specific table and recreate
DROP TABLE IF EXISTS table_name CASCADE;
# Then run specific migration
```

### Backup Before Changes
```bash
# Export current schema
supabase db dump --schema-only > backup_schema.sql

# Export data
supabase db dump --data-only > backup_data.sql
```

## Support

If issues persist:
1. Check Supabase dashboard logs
2. Verify API keys and permissions
3. Test with minimal schema first
4. Contact support with specific error messages

## Testing Migration Success

After fixing migrations, test with:
```bash
# Run the application
npm run dev

# Test database operations
# - Create a user account
# - Add tasks, goals, habits
# - Verify data persistence
# - Check AI integrations work
```