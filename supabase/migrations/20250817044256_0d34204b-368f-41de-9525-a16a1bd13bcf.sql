-- Create creative_documents table for Creative Mode
CREATE TABLE public.creative_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  document_type TEXT NOT NULL DEFAULT 'draft',
  status TEXT NOT NULL DEFAULT 'draft',
  word_count INTEGER NOT NULL DEFAULT 0,
  original_transcription TEXT,
  cleaned_content TEXT,
  export_format TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.creative_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own creative documents" 
ON public.creative_documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own creative documents" 
ON public.creative_documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creative documents" 
ON public.creative_documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creative documents" 
ON public.creative_documents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_creative_documents_updated_at
BEFORE UPDATE ON public.creative_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();