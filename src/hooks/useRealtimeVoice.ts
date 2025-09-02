import { useState, useRef, useCallback, useEffect } from 'react';
import { useAI } from './useAI';
import { useVoiceRecording } from './useVoiceRecording';
import { toast } from 'sonner';

interface UseRealtimeVoiceReturn {
  isConnected: boolean;
  isListening: boolean;
  currentTranscript: string;
  finalTranscript: string;
  confidence: number;
  startListening: () => Promise<void>;
  stopListening: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useRealtimeVoice = (
  onFinalTranscript?: (text: string, confidence: number) => void
): UseRealtimeVoiceReturn => {
  const [isConnected, setIsConnected] = useState(true); // Always connected since we use Groq
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confidence, setConfidence] = useState(0.9); // Default confidence for Groq

  const { transcribeAudio } = useAI();
  const { isRecording, startRecording, stopRecording, audioBlob } = useVoiceRecording();

  const connect = useCallback(async () => {
    try {
      setIsConnected(true);
      toast.success('Voice transcription ready (Groq)');
    } catch (error) {
      console.error('Error initializing Groq transcription:', error);
      toast.error('Failed to initialize voice transcription');
    }
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    stopRecording();
  }, [stopRecording]);

  const startListening = useCallback(async () => {
    if (!isConnected) {
      toast.error('Voice transcription not available');
      return;
    }

    try {
      setCurrentTranscript('Recording...');
      await startRecording();
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  }, [isConnected, startRecording]);

  const stopListening = useCallback(async () => {
    try {
      stopRecording();
      
      if (audioBlob) {
        setCurrentTranscript('Transcribing...');
        const transcription = await transcribeAudio(audioBlob);
        
        if (transcription) {
          setFinalTranscript(transcription);
          setCurrentTranscript('');
          onFinalTranscript?.(transcription, confidence);
          toast.success('Transcription complete');
        } else {
          setCurrentTranscript('');
          toast.error('Transcription failed');
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Failed to process audio');
      setCurrentTranscript('');
    }
  }, [stopRecording, audioBlob, transcribeAudio, confidence, onFinalTranscript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening: isRecording,
    currentTranscript,
    finalTranscript,
    confidence,
    startListening,
    stopListening,
    connect,
    disconnect
  };
};