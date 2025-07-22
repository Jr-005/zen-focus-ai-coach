
-- Address security warnings by fixing RLS policies and adding missing constraints

-- First, ensure all tables have proper RLS policies with explicit role checks
-- Update profiles table policies to be more explicit
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update user_roles policies to be more secure
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL 
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Ensure all other tables have proper authenticated-only policies
DROP POLICY IF EXISTS "Users can manage own goals" ON public.goals;
CREATE POLICY "Users can manage own goals" ON public.goals
  FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
CREATE POLICY "Users can manage own tasks" ON public.tasks
  FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own focus sessions" ON public.focus_sessions;
CREATE POLICY "Users can manage own focus sessions" ON public.focus_sessions
  FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own mood entries" ON public.mood_entries;
CREATE POLICY "Users can manage own mood entries" ON public.mood_entries
  FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own conversations" ON public.ai_conversations;
CREATE POLICY "Users can manage own conversations" ON public.ai_conversations
  FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id);

-- Add constraints to ensure data integrity
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_title_not_empty CHECK (length(trim(title)) > 0);

ALTER TABLE public.goals 
  ADD CONSTRAINT goals_title_not_empty CHECK (length(trim(title)) > 0),
  ADD CONSTRAINT goals_progress_valid CHECK (progress >= 0 AND progress <= 100);

-- Ensure user_id columns are not nullable where they should reference authenticated users
ALTER TABLE public.goals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.focus_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.mood_entries ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.ai_conversations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN user_id SET NOT NULL;

-- Add indexes for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON public.mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Ensure proper message_type constraint on ai_conversations
ALTER TABLE public.ai_conversations 
  DROP CONSTRAINT IF EXISTS ai_conversations_message_type_check,
  ADD CONSTRAINT ai_conversations_message_type_check CHECK (message_type IN ('user', 'ai'));
