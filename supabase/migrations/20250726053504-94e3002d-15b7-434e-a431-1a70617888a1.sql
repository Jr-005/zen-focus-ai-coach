-- Drop and recreate the function with proper vector operator usage
DROP FUNCTION IF EXISTS public.match_voice_notes;

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
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    voice_notes.id,
    voice_notes.content,
    voice_notes.summary,
    1 - (voice_notes.embedding <=> query_embedding) as similarity,
    voice_notes.created_at
  FROM public.voice_notes
  WHERE 
    (filter_user_id IS NULL OR voice_notes.user_id = filter_user_id)
    AND voice_notes.embedding IS NOT NULL
    AND (1 - (voice_notes.embedding <=> query_embedding)) > match_threshold
  ORDER BY voice_notes.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;