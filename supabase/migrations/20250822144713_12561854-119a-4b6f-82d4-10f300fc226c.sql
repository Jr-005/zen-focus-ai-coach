-- Performance optimization: Add missing indexes for better query performance
-- These indexes will significantly improve query performance and reduce the warnings

-- 1. Add indexes on frequently queried user_id columns (most important)
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON public.tasks(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON public.tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_completed ON public.goals(completed);
CREATE INDEX IF NOT EXISTS idx_goals_user_completed ON public.goals(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON public.goals(created_at);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON public.goals(target_date) WHERE target_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON public.habits(is_active);
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON public.habits(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON public.habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON public.habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON public.habit_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date ON public.habit_completions(user_id, completion_date);

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON public.mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON public.mood_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON public.mood_entries(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_completed ON public.focus_sessions(completed);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_created_at ON public.focus_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_completed ON public.focus_sessions(user_id, completed);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON public.notes(updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_category ON public.notes(category);

CREATE INDEX IF NOT EXISTS idx_voice_notes_user_id ON public.voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_created_at ON public.voice_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON public.ai_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_message_type ON public.ai_conversations(message_type);

CREATE INDEX IF NOT EXISTS idx_creative_documents_user_id ON public.creative_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_documents_status ON public.creative_documents(status);
CREATE INDEX IF NOT EXISTS idx_creative_documents_created_at ON public.creative_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_creative_documents_updated_at ON public.creative_documents(updated_at);

CREATE INDEX IF NOT EXISTS idx_productivity_metrics_user_id ON public.productivity_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_productivity_metrics_period ON public.productivity_metrics(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_productivity_metrics_user_period ON public.productivity_metrics(user_id, period_type, period_start);

CREATE INDEX IF NOT EXISTS idx_user_insights_user_id ON public.user_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_user_insights_read ON public.user_insights(is_read);
CREATE INDEX IF NOT EXISTS idx_user_insights_created_at ON public.user_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_user_insights_valid_until ON public.user_insights(valid_until) WHERE valid_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled ON public.notification_preferences(enabled);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 2. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_priority_status ON public.tasks(priority, completed);
CREATE INDEX IF NOT EXISTS idx_goals_category_completed ON public.goals(category, completed);
CREATE INDEX IF NOT EXISTS idx_habits_frequency_active ON public.habits(frequency, is_active);

-- 3. Add indexes for text search if needed
CREATE INDEX IF NOT EXISTS idx_tasks_title_gin ON public.tasks USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_notes_content_gin ON public.notes USING gin(to_tsvector('english', content));

-- 4. Optimize profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- 5. Add started_at index for focus_sessions if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'focus_sessions' AND column_name = 'started_at') THEN
        CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON public.focus_sessions(started_at);
    END IF;
END $$;

-- 6. Update table statistics for better query planning
ANALYZE public.tasks;
ANALYZE public.goals;
ANALYZE public.habits;
ANALYZE public.habit_completions;
ANALYZE public.mood_entries;
ANALYZE public.focus_sessions;
ANALYZE public.notes;
ANALYZE public.voice_notes;
ANALYZE public.ai_conversations;
ANALYZE public.creative_documents;
ANALYZE public.productivity_metrics;
ANALYZE public.user_insights;
ANALYZE public.notification_preferences;
ANALYZE public.user_roles;
ANALYZE public.profiles;