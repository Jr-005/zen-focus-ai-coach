import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface VoiceStreamData {
  type: 'PartialTranscript' | 'FinalTranscript' | 'session_started' | 'connection_established' | 'error';
  text?: string;
  confidence?: number;
  is_final?: boolean;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

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
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const connect = useCallback(async () => {
    try {
      // Connect to our Supabase edge function that proxies to AssemblyAI
      const wsUrl = `wss://oodxparkhdvlljdftswg.functions.supabase.co/assemblyai-stream`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to real-time transcription service');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: VoiceStreamData = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connection_established':
              toast.success('Real-time transcription ready');
              break;
              
            case 'PartialTranscript':
              if (data.text) {
                setCurrentTranscript(data.text);
                setConfidence(data.confidence || 0);
              }
              break;
              
            case 'FinalTranscript':
              if (data.text) {
                setFinalTranscript(data.text);
                setCurrentTranscript('');
                setConfidence(data.confidence || 0);
                onFinalTranscript?.(data.text, data.confidence || 0);
              }
              break;
              
            case 'error':
              console.error('Transcription error:', data);
              toast.error('Transcription error occurred');
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        setIsListening(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting to real-time service:', error);
      toast.error('Failed to connect to transcription service');
    }
  }, [onFinalTranscript]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'terminate' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    
    stopListening();
    setIsConnected(false);
  }, []);

  const startListening = useCallback(async () => {
    if (!isConnected || !wsRef.current) {
      toast.error('Not connected to transcription service');
      return;
    }

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // AssemblyAI expects 16kHz
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      // Create audio context for processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (!isListening || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array for AssemblyAI
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64
        const uint8Data = new Uint8Array(int16Data.buffer);
        let binary = '';
        const chunkSize = 0x8000;
        
        for (let i = 0; i < uint8Data.length; i += chunkSize) {
          const chunk = uint8Data.subarray(i, Math.min(i + chunkSize, uint8Data.length));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        const base64Audio = btoa(binary);

        // Send audio data to AssemblyAI via WebSocket
        wsRef.current.send(JSON.stringify({
          type: 'audio_data',
          audio_data: base64Audio
        }));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsListening(true);
      setCurrentTranscript('');
      setFinalTranscript('');
      
      toast.success('Listening started');

    } catch (error) {
      console.error('Error starting microphone:', error);
      toast.error('Failed to access microphone');
    }
  }, [isConnected, isListening]);

  const stopListening = useCallback(() => {
    setIsListening(false);

    // Stop audio processing
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setCurrentTranscript('');
    
    toast.success('Listening stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    currentTranscript,
    finalTranscript,
    confidence,
    startListening,
    stopListening,
    connect,
    disconnect
  };
};