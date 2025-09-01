import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRAG } from './useRAG';

export interface TaskSuggestion {
  improvedTitle?: string;
  improvedDescription?: string;
  subtasks: string[];
  estimatedDuration: number;
  priority: 'low' | 'medium' | 'high';
  tips: string[];
}

export interface UserContext {
  completedTasks: number;
  currentMood?: string;
  timeOfDay: string;
  productivity_level?: string;
}

export interface ParsedTask {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  goalId?: string;
  subtasks?: string[];
}

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const { queryRAG } = useRAG();

  const parseTaskFromNaturalLanguage = async (
    input: string,
    userGoals?: Array<{ id: string; title: string }>
  ): Promise<ParsedTask | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-task-nlp', {
        body: {
          input,
          userGoals
        }
      });

      if (error) {
        console.error('Task parsing error:', error);
        toast.error('Failed to parse task');
        return null;
      }

      if (!data.success) {
        console.error('Task parsing failed:', data.error);
        toast.error('Failed to understand task request');
        return null;
      }

      return data.task;
    } catch (error) {
      console.error('Error parsing task:', error);
      toast.error('Failed to process task request');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getTaskSuggestions = async (
    taskTitle: string,
    taskDescription?: string,
    userGoals?: string[],
    userContext?: UserContext
  ): Promise<TaskSuggestion | null> => {
    setLoading(true);
    try {
      // Get relevant context from RAG before making suggestions
      const ragContext = await queryRAG(`${taskTitle} ${taskDescription || ''}`, 3);
      
      const { data, error } = await supabase.functions.invoke('groq-chat', {
        body: {
          messages: [
            {
              role: "system",
              content: `You are an AI task optimization assistant. Analyze the task and provide helpful suggestions to improve productivity.
              
              Context: ${ragContext.context}
              User Goals: ${userGoals?.join(', ') || 'None'}
              Time of Day: ${userContext?.timeOfDay || 'unknown'}
              Productivity Level: ${userContext?.productivity_level || 'unknown'}
              
              Respond with a JSON object containing:
              - improvedTitle (optional): A better version of the task title
              - improvedDescription (optional): A more detailed description
              - subtasks: Array of 2-4 specific subtasks
              - estimatedDuration: Time in minutes
              - priority: 'low', 'medium', or 'high'
              - tips: Array of 2-3 productivity tips`
            },
            {
              role: "user",
              content: `Task: ${taskTitle}\nDescription: ${taskDescription || 'No description provided'}`
            }
          ],
          model: "llama3-groq-70b-8192-tool-use-preview",
          temperature: 0.3
        }
      });

      if (error) {
        console.error('AI suggestions error:', error);
        toast.error('Failed to get AI suggestions');
        return null;
      }

      if (!data.success) {
        console.error('AI suggestions failed:', data.error);
        return null;
      }

      // Parse JSON response from Groq
      try {
        const suggestions = JSON.parse(data.response);
        return suggestions;
      } catch (parseError) {
        console.error('Failed to parse AI suggestions:', parseError);
        return null;
      }
    } catch (error) {
      console.error('Error getting task suggestions:', error);
      toast.error('Failed to connect to AI service');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    setLoading(true);
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const { data, error } = await supabase.functions.invoke('groq-whisper', {
        body: {
          audioData: base64Audio,
          language: 'en'
        }
      });

      if (error) {
        console.error('Transcription error:', error);
        toast.error('Failed to transcribe audio');
        return null;
      }

      if (!data.success) {
        console.error('Transcription failed:', data.error);
        toast.error('Transcription failed');
        return null;
      }

      return data.transcription;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast.error('Failed to process audio');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const textToSpeech = async (text: string): Promise<string | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('groq-tts', {
        body: {
          text,
          voice: 'Rachel'
        }
      });

      if (error) {
        console.error('Text-to-speech error:', error);
        toast.error('Failed to generate speech');
        return null;
      }

      if (!data.success) {
        console.error('Text-to-speech failed:', data.error);
        toast.error('Speech generation failed');
        return null;
      }

      return data.audioData;
    } catch (error) {
      console.error('Error generating speech:', error);
      toast.error('Failed to generate speech');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    parseTaskFromNaturalLanguage,
    getTaskSuggestions,
    transcribeAudio,
    textToSpeech
  };
};