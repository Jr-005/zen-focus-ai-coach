-- Database Health Check Script
-- Run this in Supabase SQL Editor to verify schema

-- Check if all tables exist
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check if all enums exist
SELECT 
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('app_role', 'task_priority', 'goal_category', 'session_type', 'mood_type', 'habit_frequency', 'metric_period')
GROUP BY t.typname
ORDER BY t.typname;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('handle_updated_at', 'handle_new_user', 'has_role', 'calculate_habit_streak', 'calculate_productivity_score', 'generate_daily_metrics')
ORDER BY routine_name;

-- Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Sample data check
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'goals', COUNT(*) FROM goals
UNION ALL
SELECT 'focus_sessions', COUNT(*) FROM focus_sessions
UNION ALL
SELECT 'mood_entries', COUNT(*) FROM mood_entries
UNION ALL
SELECT 'ai_conversations', COUNT(*) FROM ai_conversations
UNION ALL
SELECT 'habits', COUNT(*) FROM habits
UNION ALL
SELECT 'habit_completions', COUNT(*) FROM habit_completions
UNION ALL
SELECT 'productivity_metrics', COUNT(*) FROM productivity_metrics
UNION ALL
SELECT 'user_insights', COUNT(*) FROM user_insights
UNION ALL
SELECT 'notification_preferences', COUNT(*) FROM notification_preferences;