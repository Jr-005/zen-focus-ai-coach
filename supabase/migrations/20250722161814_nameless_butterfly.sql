/*
  # Add Analytics and Insights Tables

  1. New Tables
    - `productivity_metrics` - Daily/weekly/monthly productivity summaries
    - `user_insights` - AI-generated personalized insights
    - `notification_preferences` - User notification settings

  2. Security
    - Enable RLS on new tables
    - Add policies for user data access

  3. Features
    - Productivity tracking and analytics
    - Personalized insights storage
    - Notification management
*/

-- Create metric period enum
CREATE TYPE metric_period AS ENUM ('daily', 'weekly', 'monthly');

-- Productivity metrics table
CREATE TABLE IF NOT EXISTS productivity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_type metric_period NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  focus_minutes INTEGER DEFAULT 0,
  focus_sessions INTEGER DEFAULT 0,
  goals_completed INTEGER DEFAULT 0,
  habits_completed INTEGER DEFAULT 0,
  average_mood DECIMAL(3,2),
  average_energy DECIMAL(3,2),
  productivity_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period_type, period_start)
);

-- User insights table for AI-generated insights
CREATE TABLE IF NOT EXISTS user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'productivity', 'habits', 'goals', 'mood'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
  is_read BOOLEAN DEFAULT false,
  valid_until DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'task_reminder', 'goal_deadline', 'habit_reminder', etc.
  enabled BOOLEAN DEFAULT true,
  delivery_method TEXT DEFAULT 'browser', -- 'browser', 'email', 'push'
  timing_offset INTEGER DEFAULT 0, -- minutes before/after event
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- Enable RLS
ALTER TABLE productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for productivity metrics
CREATE POLICY "Users can manage own productivity metrics"
  ON productivity_metrics
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for user insights
CREATE POLICY "Users can manage own insights"
  ON user_insights
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for notification preferences
CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER handle_productivity_metrics_updated_at
  BEFORE UPDATE ON productivity_metrics
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_productivity_metrics_user_period ON productivity_metrics(user_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_user_insights_user_type ON user_insights(user_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_user_insights_unread ON user_insights(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- Function to calculate productivity score
CREATE OR REPLACE FUNCTION calculate_productivity_score(
  tasks_completed INTEGER,
  tasks_created INTEGER,
  focus_minutes INTEGER,
  goals_completed INTEGER,
  habits_completed INTEGER,
  average_mood DECIMAL DEFAULT NULL
)
RETURNS DECIMAL AS $$
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
$$ LANGUAGE plpgsql;

-- Function to generate daily metrics
CREATE OR REPLACE FUNCTION generate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
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
      AND DATE(started_at) = target_date
      AND completed = true
    ) focus_stats
    CROSS JOIN (
      SELECT
        COUNT(*) FILTER (WHERE is_completed = true AND DATE(updated_at) = target_date) as completed
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
          WHEN 'amazing' THEN 6
          WHEN 'great' THEN 5
          WHEN 'good' THEN 4
          WHEN 'okay' THEN 3
          WHEN 'low' THEN 2
          WHEN 'stressed' THEN 1
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
$$ LANGUAGE plpgsql;