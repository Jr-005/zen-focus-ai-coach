/*
  # Add Habits Tracking Table

  1. New Tables
    - `habits` - User habit definitions and tracking
    - `habit_completions` - Daily habit completion records

  2. Security
    - Enable RLS on new tables
    - Add policies for user data access

  3. Features
    - Habit streak tracking
    - Daily completion records
    - Habit categories and goals
*/

-- Create habit frequency enum
CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- Habits table for habit definitions
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  frequency habit_frequency DEFAULT 'daily',
  target_count INTEGER DEFAULT 1,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habit completions table for tracking daily progress
CREATE TABLE IF NOT EXISTS habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, completion_date)
);

-- Enable RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

-- Policies for habits
CREATE POLICY "Users can manage own habits"
  ON habits
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for habit completions
CREATE POLICY "Users can manage own habit completions"
  ON habit_completions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at on habits
CREATE TRIGGER handle_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON habits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date ON habit_completions(habit_id, completion_date);

-- Function to calculate habit streak
CREATE OR REPLACE FUNCTION calculate_habit_streak(habit_uuid UUID, check_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;