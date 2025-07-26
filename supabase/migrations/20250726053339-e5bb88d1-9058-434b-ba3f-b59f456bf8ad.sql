-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for storing voice notes with embeddings
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  embedding vector(384), -- 384 dimensions for sentence-transformers/all-MiniLM-L6-v2
  source TEXT DEFAULT 'voice_input',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on voice_notes
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for voice_notes
CREATE POLICY "Users can view their own voice notes" 
ON public.voice_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice notes" 
ON public.voice_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice notes" 
ON public.voice_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice notes" 
ON public.voice_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to find similar notes using vector similarity
CREATE OR REPLACE FUNCTION public.match_voice_notes(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  summary text,
  similarity float,
  created_at timestamp with time zone
)
LANGUAGE sql STABLE
AS $$
  SELECT
    voice_notes.id,
    voice_notes.content,
    voice_notes.summary,
    1 - (voice_notes.embedding <=> query_embedding) as similarity,
    voice_notes.created_at
  FROM public.voice_notes
  WHERE 
    (filter_user_id IS NULL OR voice_notes.user_id = filter_user_id)
    AND 1 - (voice_notes.embedding <=> query_embedding) > match_threshold
  ORDER BY voice_notes.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create updated_at trigger for voice_notes
CREATE TRIGGER update_voice_notes_updated_at
BEFORE UPDATE ON public.voice_notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster vector similarity search
CREATE INDEX IF NOT EXISTS voice_notes_embedding_idx 
ON public.voice_notes 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);