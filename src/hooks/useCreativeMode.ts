import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CreativeDocument {
  id: string;
  title: string;
  content: string;
  type: 'article' | 'story' | 'note' | 'blog' | 'letter' | 'script';
  status: 'draft' | 'edited' | 'final';
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIWritingOptions {
  tone?: 'professional' | 'casual' | 'creative' | 'academic';
  style?: 'concise' | 'detailed' | 'narrative' | 'technical';
  action?: 'improve' | 'restructure' | 'summarize' | 'expand';
}

export const useCreativeMode = () => {
  const [loading, setLoading] = useState(false);

  const processTextWithAI = async (
    text: string,
    documentType: string,
    options: AIWritingOptions = {}
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-text-cleanup', {
        body: {
          text,
          documentType,
          options,
          instructions: getProcessingInstructions(documentType, options)
        }
      });

      if (error || !data.success) {
        throw new Error(data?.error || 'AI processing failed');
      }

      return data.processedText;
    } catch (error) {
      console.error('AI text processing error:', error);
      toast.error('Failed to process text with AI');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getProcessingInstructions = (docType: string, options: AIWritingOptions) => {
    const baseInstructions = {
      article: 'Structure as a professional article with clear headings, proper paragraphs, and logical flow.',
      story: 'Format as a narrative story with proper dialogue formatting, paragraph breaks, and engaging flow.',
      note: 'Organize as clear, concise notes with bullet points where appropriate.',
      blog: 'Structure as an engaging blog post with catchy introduction, clear sections, and conversational tone.',
      letter: 'Format as a professional letter with proper salutation, body paragraphs, and closing.',
      script: 'Format as a script with proper scene descriptions, character names, and dialogue formatting.'
    };

    let instruction = baseInstructions[docType as keyof typeof baseInstructions] || baseInstructions.article;

    // Add tone modifications
    if (options.tone) {
      const toneInstructions = {
        professional: ' Use formal, professional language.',
        casual: ' Use conversational, friendly language.',
        creative: ' Use vivid, imaginative language with creative expressions.',
        academic: ' Use scholarly, precise language with proper citations format.'
      };
      instruction += toneInstructions[options.tone];
    }

    // Add style modifications
    if (options.style) {
      const styleInstructions = {
        concise: ' Keep it brief and to the point.',
        detailed: ' Provide comprehensive details and explanations.',
        narrative: ' Use storytelling techniques and descriptive language.',
        technical: ' Use precise, technical language with specific terminology.'
      };
      instruction += styleInstructions[options.style];
    }

    // Add action-specific instructions
    if (options.action) {
      const actionInstructions = {
        improve: ' Fix grammar, improve clarity, and enhance readability.',
        restructure: ' Reorganize content for better flow and logical structure.',
        summarize: ' Create a concise summary while preserving key points.',
        expand: ' Add more detail, examples, and elaboration to the content.'
      };
      instruction += actionInstructions[options.action];
    }

    return instruction;
  };

  const saveDocument = async (
    title: string,
    content: string,
    type: CreativeDocument['type'],
    status: CreativeDocument['status'] = 'draft'
  ): Promise<CreativeDocument | null> => {
    setLoading(true);
    try {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      const { data, error } = await supabase
        .from('creative_documents')
        .insert({
          title,
          content,
          document_type: type,
          status,
          word_count: wordCount,
        })
        .select()
        .single();

      if (error) throw error;

      const document: CreativeDocument = {
        id: data.id,
        title: data.title,
        content: data.content,
        type: data.document_type as CreativeDocument['type'],
        status: data.status as CreativeDocument['status'],
        wordCount: data.word_count,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      toast.success('Document saved successfully');
      return document;
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateDocument = async (
    id: string,
    updates: Partial<Pick<CreativeDocument, 'title' | 'content' | 'status'>>
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const updateData: any = { ...updates };
      
      if (updates.content) {
        updateData.word_count = updates.content.trim().split(/\s+/).filter(word => word.length > 0).length;
      }

      const { error } = await supabase
        .from('creative_documents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Document updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('creative_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Document deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getDocuments = async (): Promise<CreativeDocument[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('creative_documents')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const documents = data?.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        type: doc.document_type as CreativeDocument['type'],
        status: doc.status as CreativeDocument['status'],
        wordCount: doc.word_count,
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at),
      })) || [];

      return documents;
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    processTextWithAI,
    saveDocument,
    updateDocument,
    deleteDocument,
    getDocuments,
  };
};