/*
  # Creative Documents Table

  1. New Tables
    - `creative_documents` - Store user's creative writing documents
    
  2. Security
    - Enable RLS on creative_documents table
    - Add policies for user data access
    
  3. Features
    - Document type categorization
    - Status tracking (draft, edited, final)
    - Word count tracking
    - Full-text search capabilities
*/

-- Create creative documents table
CREATE TABLE IF NOT EXISTS public.creative_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('article', 'story', 'note', 'blog', 'letter', 'script')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'edited', 'final')),
  word_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.creative_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own creative documents"
  ON public.creative_documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own creative documents"
  ON public.creative_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creative documents"
  ON public.creative_documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creative documents"
  ON public.creative_documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_creative_documents_updated_at
  BEFORE UPDATE ON public.creative_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_creative_documents_user_id ON public.creative_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_creative_documents_type ON public.creative_documents(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_creative_documents_status ON public.creative_documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_creative_documents_updated_at ON public.creative_documents(updated_at DESC);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_creative_documents_search 
ON public.creative_documents 
USING gin(to_tsvector('english', title || ' ' || content));

-- Function to automatically update word count
CREATE OR REPLACE FUNCTION public.update_word_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.word_count = array_length(string_to_array(trim(NEW.content), ' '), 1);
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for automatic word count updates
CREATE TRIGGER update_creative_documents_word_count
  BEFORE INSERT OR UPDATE OF content ON public.creative_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_word_count();

-- Function for full-text search
CREATE OR REPLACE FUNCTION public.search_creative_documents(
  search_query TEXT,
  user_filter UUID DEFAULT NULL,
  doc_type_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  document_type TEXT,
  status TEXT,
  word_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    cd.id,
    cd.title,
    cd.content,
    cd.document_type,
    cd.status,
    cd.word_count,
    cd.created_at,
    cd.updated_at,
    ts_rank(to_tsvector('english', cd.title || ' ' || cd.content), plainto_tsquery('english', search_query)) as rank
  FROM public.creative_documents cd
  WHERE 
    (user_filter IS NULL OR cd.user_id = user_filter)
    AND (doc_type_filter IS NULL OR cd.document_type = doc_type_filter)
    AND to_tsvector('english', cd.title || ' ' || cd.content) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT limit_count;
$$;