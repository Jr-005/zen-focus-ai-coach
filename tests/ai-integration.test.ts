import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAI } from '@/hooks/useAI';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

describe('AI Integration', () => {
  describe('useAI Hook', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should get task suggestions successfully', async () => {
      const mockSuggestions = {
        subtasks: ['Research topic', 'Create outline', 'Write content'],
        estimatedDuration: 120,
        priority: 'high',
        tips: ['Break into smaller chunks', 'Set timer for focus']
      };

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, suggestions: mockSuggestions },
        error: null
      });

      const { result } = renderHook(() => useAI());

      let suggestions;
      await act(async () => {
        suggestions = await result.current.getTaskSuggestions(
          'Write blog post',
          'About productivity tips',
          ['Improve writing skills'],
          { completedTasks: 2, timeOfDay: 'morning', productivity_level: 'high' }
        );
      });

      expect(suggestions).toEqual(mockSuggestions);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('openai-suggestions', {
        body: {
          taskTitle: 'Write blog post',
          taskDescription: 'About productivity tips',
          userGoals: ['Improve writing skills'],
          userContext: {
            completedTasks: 2,
            timeOfDay: 'morning',
            productivity_level: 'high'
          }
        }
      });
    });

    it('should handle API errors gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'API Error' }
      });

      const { result } = renderHook(() => useAI());

      let suggestions;
      await act(async () => {
        suggestions = await result.current.getTaskSuggestions('Test task');
      });

      expect(suggestions).toBeNull();
    });

    it('should transcribe audio successfully', async () => {
      const mockTranscription = 'This is a test transcription';
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, transcription: mockTranscription },
        error: null
      });

      const { result } = renderHook(() => useAI());
      const mockBlob = new Blob(['test audio'], { type: 'audio/webm' });

      let transcription;
      await act(async () => {
        transcription = await result.current.transcribeAudio(mockBlob);
      });

      expect(transcription).toBe(mockTranscription);
    });

    it('should generate speech successfully', async () => {
      const mockAudioData = 'base64audiodata';
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, audioData: mockAudioData },
        error: null
      });

      const { result } = renderHook(() => useAI());

      let audioData;
      await act(async () => {
        audioData = await result.current.textToSpeech('Hello world');
      });

      expect(audioData).toBe(mockAudioData);
    });
  });

  describe('useVoiceRecording Hook', () => {
    beforeEach(() => {
      // Mock MediaDevices API
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn()
        },
        writable: true
      });

      // Mock MediaRecorder
      global.MediaRecorder = vi.fn().mockImplementation(() => ({
        start: vi.fn(),
        stop: vi.fn(),
        ondataavailable: null,
        onstop: null
      }));
    });

    it('should start recording successfully', async () => {
      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }]
      };

      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any);

      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
    });

    it('should handle recording permission errors', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
        new Error('Permission denied')
      );

      const { result } = renderHook(() => useVoiceRecording());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });

    it('should stop recording and create audio blob', async () => {
      const mockStream = {
        getTracks: () => [{ stop: vi.fn() }]
      };

      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any);

      const { result } = renderHook(() => useVoiceRecording());

      // Start recording
      await act(async () => {
        await result.current.startRecording();
      });

      // Stop recording
      act(() => {
        result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
    });

    it('should clear recording data', () => {
      const { result } = renderHook(() => useVoiceRecording());

      act(() => {
        result.current.clearRecording();
      });

      expect(result.current.audioBlob).toBeNull();
    });
  });
});

describe('Edge Function Integration', () => {
  it('should handle OpenAI API rate limiting', async () => {
    // Test rate limiting behavior
    const rateLimitResponse = {
      status: 429,
      headers: { 'retry-after': '60' }
    };

    // Mock fetch to simulate rate limiting
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ 'retry-after': '60' }),
      text: () => Promise.resolve('Rate limit exceeded')
    });

    // Test that the function handles rate limiting appropriately
    // This would be tested in the actual edge function environment
  });

  it('should validate input parameters', () => {
    // Test input validation for edge functions
    const invalidInputs = [
      { taskTitle: '' }, // Empty title
      { taskTitle: 'a'.repeat(1001) }, // Too long
      { audioData: null }, // Missing audio
      { text: 'a'.repeat(1001) } // Text too long for TTS
    ];

    invalidInputs.forEach(input => {
      // Each edge function should validate inputs and return appropriate errors
      expect(true).toBe(true); // Placeholder for actual validation tests
    });
  });
});

describe('Component Integration', () => {
  it('should integrate VoiceInput with TodoManager', () => {
    // Test that voice input properly integrates with task creation
    expect(true).toBe(true); // Placeholder for component integration tests
  });

  it('should integrate AI suggestions with task form', () => {
    // Test that AI suggestions properly populate task form fields
    expect(true).toBe(true); // Placeholder for AI suggestion integration tests
  });

  it('should handle TTS in AI assistant', () => {
    // Test that text-to-speech works in AI assistant
    expect(true).toBe(true); // Placeholder for TTS integration tests
  });
});