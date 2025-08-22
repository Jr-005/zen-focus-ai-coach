-- Fix critical security issues

-- 1. Fix function search paths for security
DROP FUNCTION IF EXISTS public.calculate_habit_streak(uuid, date);
CREATE OR REPLACE FUNCTION public.calculate_habit_streak(habit_uuid uuid, check_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  streak_count INTEGER := 0;
  current_check_date DATE := check_date;
  habit_freq habit_frequency;
BEGIN
  -- Get habit frequency
  SELECT frequency INTO habit_freq FROM habits WHERE id = habit_uuid;
  
  -- Calculate streak based on frequency
  LOOP
    -- Check if habit was completed on current_check_date
    IF EXISTS (
      SELECT 1 FROM habit_completions 
      WHERE habit_id = habit_uuid 
      AND completion_date = current_check_date
    ) THEN
      streak_count := streak_count + 1;
      
      -- Move to previous period based on frequency
      CASE habit_freq
        WHEN 'daily' THEN
          current_check_date := current_check_date - INTERVAL '1 day';
        WHEN 'weekly' THEN
          current_check_date := current_check_date - INTERVAL '1 week';
        WHEN 'monthly' THEN
          current_check_date := current_check_date - INTERVAL '1 month';
      END CASE;
    ELSE
      -- Streak broken
      EXIT;
    END IF;
  END LOOP;
  
  RETURN streak_count;
END;
$function$;

-- Fix productivity score function
DROP FUNCTION IF EXISTS public.calculate_productivity_score(integer, integer, integer, integer, integer, numeric);
CREATE OR REPLACE FUNCTION public.calculate_productivity_score(tasks_completed integer, tasks_created integer, focus_minutes integer, goals_completed integer, habits_completed integer, average_mood numeric DEFAULT NULL::numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  score DECIMAL := 0;
  completion_rate DECIMAL;
BEGIN
  -- Task completion rate (40% of score)
  IF tasks_created > 0 THEN
    completion_rate := LEAST(tasks_completed::DECIMAL / tasks_created, 1.0);
    score := score + (completion_rate * 40);
  END IF;
  
  -- Focus time (30% of score, normalized to 8 hours max)
  score := score + (LEAST(focus_minutes::DECIMAL / 480, 1.0) * 30);
  
  -- Goals completed (20% of score, up to 5 goals)
  score := score + (LEAST(goals_completed::DECIMAL / 5, 1.0) * 20);
  
  -- Habits completed (10% of score, up to 10 habits)
  score := score + (LEAST(habits_completed::DECIMAL / 10, 1.0) * 10);
  
  -- Mood bonus (up to 10% bonus)
  IF average_mood IS NOT NULL THEN
    -- Mood scale: 1-6, bonus for mood > 3
    IF average_mood > 3 THEN
      score := score + ((average_mood - 3) / 3 * 10);
    END IF;
  END IF;
  
  RETURN LEAST(score, 100);
END;
$function$;

-- Fix generate daily metrics function
DROP FUNCTION IF EXISTS public.generate_daily_metrics(date);
CREATE OR REPLACE FUNCTION public.generate_daily_metrics(target_date date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    INSERT INTO productivity_metrics (
      user_id,
      period_type,
      period_start,
      period_end,
      tasks_completed,
      tasks_created,
      focus_minutes,
      focus_sessions,
      goals_completed,
      habits_completed,
      average_mood,
      average_energy,
      productivity_score
    )
    SELECT
      user_record.id,
      'daily',
      target_date,
      target_date,
      COALESCE(task_stats.completed, 0),
      COALESCE(task_stats.created, 0),
      COALESCE(focus_stats.minutes, 0),
      COALESCE(focus_stats.sessions, 0),
      COALESCE(goal_stats.completed, 0),
      COALESCE(habit_stats.completed, 0),
      mood_stats.avg_mood,
      mood_stats.avg_energy,
      calculate_productivity_score(
        COALESCE(task_stats.completed, 0),
        COALESCE(task_stats.created, 0),
        COALESCE(focus_stats.minutes, 0),
        COALESCE(goal_stats.completed, 0),
        COALESCE(habit_stats.completed, 0),
        mood_stats.avg_mood
      )
    FROM (
      SELECT
        COUNT(*) FILTER (WHERE completed = true) as completed,
        COUNT(*) FILTER (WHERE DATE(created_at) = target_date) as created
      FROM tasks
      WHERE user_id = user_record.id
      AND (DATE(updated_at) = target_date OR DATE(created_at) = target_date)
    ) task_stats
    CROSS JOIN (
      SELECT
        COALESCE(SUM(duration_minutes), 0) as minutes,
        COUNT(*) as sessions
      FROM focus_sessions
      WHERE user_id = user_record.id
      AND DATE(created_at) = target_date
      AND completed = true
    ) focus_stats
    CROSS JOIN (
      SELECT
        COUNT(*) FILTER (WHERE completed = true AND DATE(updated_at) = target_date) as completed
      FROM goals
      WHERE user_id = user_record.id
    ) goal_stats
    CROSS JOIN (
      SELECT
        COUNT(*) as completed
      FROM habit_completions
      WHERE user_id = user_record.id
      AND completion_date = target_date
    ) habit_stats
    CROSS JOIN (
      SELECT
        AVG(CASE mood
          WHEN 1 THEN 1
          WHEN 2 THEN 2
          WHEN 3 THEN 3
          WHEN 4 THEN 4
          WHEN 5 THEN 5
          WHEN 6 THEN 6
        END) as avg_mood,
        AVG(energy_level) as avg_energy
      FROM mood_entries
      WHERE user_id = user_record.id
      AND DATE(created_at) = target_date
    ) mood_stats
    ON CONFLICT (user_id, period_type, period_start) DO UPDATE SET
      tasks_completed = EXCLUDED.tasks_completed,
      tasks_created = EXCLUDED.tasks_created,
      focus_minutes = EXCLUDED.focus_minutes,
      focus_sessions = EXCLUDED.focus_sessions,
      goals_completed = EXCLUDED.goals_completed,
      habits_completed = EXCLUDED.habits_completed,
      average_mood = EXCLUDED.average_mood,
      average_energy = EXCLUDED.average_energy,
      productivity_score = EXCLUDED.productivity_score,
      updated_at = now();
  END LOOP;
END;
$function$;

-- 2. Fix profiles table RLS policies to be more restrictive
-- First drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create more restrictive policies that only allow users to see their own data
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Add a function to safely get user role without exposing profile data
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN ur.role IS NOT NULL THEN ur.role::text
      ELSE 'user'
    END
  FROM user_roles ur 
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

-- 4. Ensure all user-specific tables have proper RLS
-- Make sure all tables that should be user-specific are properly locked down
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;