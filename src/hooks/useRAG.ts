import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface VoiceNote {
  id: string;
  content: string;
  summary?: string;
  similarity?: number;
  created_at: string;
}

interface RAGContext {
  context: VoiceNote[];
  query: string;
  total_matches: number;
}

export const useRAG = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const saveVoiceNote = async (content: string, summary?: string): Promise<string | null> => {
    try {
      setLoading(true);
      console.log('Saving voice note:', content.substring(0, 100));

      // Generate embedding for the content
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
        'generate-embeddings',
        { 
          body: { text: content }
        }
      );

      if (embeddingError) {
        console.error('Embedding generation error:', embeddingError);
        throw new Error('Failed to generate embedding');
      }

      const { embedding } = embeddingData;
      console.log('Generated embedding for note, length:', embedding.length);

      // Save note with embedding to database
      const { data, error } = await supabase
        .from('voice_notes')
        .insert({
          content,
          summary,
          embedding,
          source: 'voice_input'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Database save error:', error);
        throw new Error('Failed to save note');
      }

      console.log('Voice note saved successfully:', data.id);
      
      toast({
        title: "Note Saved",
        description: "Your voice note has been saved and indexed for future reference.",
      });

      return data.id;

    } catch (error) {
      console.error('Error saving voice note:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save voice note',
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const queryRAG = async (query: string, topK: number = 3): Promise<RAGContext> => {
    try {
      setLoading(true);
      console.log('Querying RAG for:', query);

      const { data, error } = await supabase.functions.invoke('rag-query', {
        body: { 
          query,
          topK,
          threshold: 0.3 
        }
      });

      if (error) {
        console.error('RAG query error:', error);
        throw new Error('Failed to query knowledge base');
      }

      console.log('RAG query successful, matches:', data.total_matches);
      return data;

    } catch (error) {
      console.error('Error querying RAG:', error);
      toast({
        title: "Search Error", 
        description: "Failed to search your notes",
        variant: "destructive",
      });
      
      return {
        context: [],
        query,
        total_matches: 0
      };
    } finally {
      setLoading(false);
    }
  };

  const getVoiceNotes = async (limit: number = 10): Promise<VoiceNote[]> => {
    try {
      const { data, error } = await supabase
        .from('voice_notes')
        .select('id, content, summary, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching voice notes:', error);
        throw new Error('Failed to fetch notes');
      }

      return data || [];

    } catch (error) {
      console.error('Error getting voice notes:', error);
      toast({
        title: "Error",
        description: "Failed to load your notes",
        variant: "destructive",
      });
      return [];
    }
  };

  const deleteVoiceNote = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('voice_notes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting voice note:', error);
        throw new Error('Failed to delete note');
      }

      toast({
        title: "Note Deleted",
        description: "Voice note has been removed successfully.",
      });

      return true;

    } catch (error) {
      console.error('Error deleting voice note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    loading,
    saveVoiceNote,
    queryRAG,
    getVoiceNotes,
    deleteVoiceNote,
  };
};