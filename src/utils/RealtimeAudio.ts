import { supabase } from "@/integrations/supabase/client";

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  constructor(private onAudioData?: (audioBlob: Blob) => void) {}

  async start(): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        if (this.onAudioData) {
          this.onAudioData(audioBlob);
        }
        this.audioChunks = [];
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}

// Convert audio blob to base64 for API transmission
export async function encodeAudioForAPI(audioBlob: Blob): Promise<string> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Convert to base64
  let binary = '';
  const chunkSize = 32768;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  
  return btoa(binary);
}

// Audio playback utilities
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  async init() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Resume audio context if it's suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async playAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }

    try {
      // Convert base64 to array buffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await this.audioContext!.decodeAudioData(bytes.buffer);
      
      // Stop any currently playing audio
      if (this.currentSource) {
        this.currentSource.stop();
      }

      // Create and play new audio source
      this.currentSource = this.audioContext!.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext!.destination);
      this.currentSource.start(0);

      return new Promise((resolve) => {
        this.currentSource!.onended = () => {
          resolve();
        };
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
  }
}

// Voice Activity Detection - simple implementation
export class VoiceActivityDetector {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private isActive = false;
  private silenceThreshold = 30; // Adjust based on environment
  private silenceCount = 0;
  private maxSilenceFrames = 20; // ~1 second at 50fps

  constructor(private audioStream: MediaStream, private onVoiceStart: () => void, private onVoiceEnd: () => void) {}

  init() {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(this.audioStream);
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    source.connect(this.analyser);
    
    this.startDetection();
  }

  private startDetection() {
    const checkVoiceActivity = () => {
      if (!this.analyser || !this.dataArray) return;

      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate average volume
      const average = this.dataArray.reduce((acc, value) => acc + value, 0) / this.dataArray.length;
      
      if (average > this.silenceThreshold) {
        // Voice detected
        if (!this.isActive) {
          this.isActive = true;
          this.onVoiceStart();
        }
        this.silenceCount = 0;
      } else {
        // Silence detected
        if (this.isActive) {
          this.silenceCount++;
          if (this.silenceCount >= this.maxSilenceFrames) {
            this.isActive = false;
            this.onVoiceEnd();
          }
        }
      }
      
      requestAnimationFrame(checkVoiceActivity);
    };
    
    checkVoiceActivity();
  }

  getIsActive(): boolean {
    return this.isActive;
  }
}

// Main class for HTTP-based voice chat
export class RealtimeVoiceChat {
  private recorder: AudioRecorder | null = null;
  private player: AudioPlayer | null = null;
  private vad: VoiceActivityDetector | null = null;
  private connected = false;
  private recording = false;
  private processing = false;

  constructor(
    private onMessage: (message: any) => void,
    private onSpeakingChange: (speaking: boolean) => void,
    private onConnectionChange: (connected: boolean) => void
  ) {}

  async connect(): Promise<void> {
    try {
      this.player = new AudioPlayer();
      await this.player.init();
      
      this.connected = true;
      this.onConnectionChange(true);
      
      console.log('Voice chat connected (HTTP mode)');
    } catch (error) {
      console.error('Error connecting voice chat:', error);
      this.onConnectionChange(false);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    if (this.recording || this.processing) return;

    try {
      this.recorder = new AudioRecorder(async (audioBlob) => {
        await this.processAudio(audioBlob);
      });

      // Get audio stream for VAD
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      // Set up voice activity detection
      this.vad = new VoiceActivityDetector(
        audioStream,
        () => {
          console.log('Voice activity started');
          this.recorder?.start();
        },
        () => {
          console.log('Voice activity ended');
          this.recorder?.stop();
        }
      );

      this.vad.init();
      this.recording = true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  stopRecording(): void {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    this.recording = false;
  }

  async sendTextMessage(text: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to voice chat');
    }

    try {
      await this.processText(text);
    } catch (error) {
      console.error('Error sending text message:', error);
      this.onMessage({ type: 'error', content: 'Failed to send message' });
    }
  }

  private async processAudio(audioBlob: Blob): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    
    try {
      const encodedAudio = await encodeAudioForAPI(audioBlob);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication session found');
      }
      
      // Send audio to voice-process function
      const { data, error } = await supabase.functions.invoke('voice-process', {
        body: { audioData: encodedAudio },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Handle response
      this.onMessage({
        type: 'transcript',
        content: data.transcript
      });

      this.onMessage({
        type: 'response',
        content: data.response
      });

      // Synthesize speech response
      await this.synthesizeAndPlayResponse(data.response);

    } catch (error) {
      console.error('Error processing audio:', error);
      this.onMessage({ type: 'error', content: 'Failed to process audio' });
    } finally {
      this.processing = false;
    }
  }

  private async processText(text: string): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication session found');
      }
      
      // Send text to voice-process function
      const { data, error } = await supabase.functions.invoke('voice-process', {
        body: { text },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      this.onMessage({
        type: 'response',
        content: data.response
      });

      // Synthesize speech response
      await this.synthesizeAndPlayResponse(data.response);

    } catch (error) {
      console.error('Error processing text:', error);
      this.onMessage({ type: 'error', content: 'Failed to process text' });
    } finally {
      this.processing = false;
    }
  }

  private async synthesizeAndPlayResponse(text: string): Promise<void> {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication session found');
      }
      
      // Get speech synthesis
      const { data, error } = await supabase.functions.invoke('voice-synthesize', {
        body: { text },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Play the audio
      this.onSpeakingChange(true);
      await this.player!.playAudio(data.audio);
      this.onSpeakingChange(false);

    } catch (error) {
      console.error('Error synthesizing speech:', error);
      this.onSpeakingChange(false);
    }
  }

  disconnect(): void {
    this.stopRecording();
    
    if (this.player) {
      this.player.stop();
    }
    
    this.connected = false;
    this.onConnectionChange(false);
    
    console.log('Voice chat disconnected');
  }

  isConnectedToChat(): boolean {
    return this.connected;
  }

  isCurrentlyRecording(): boolean {
    return this.recording;
  }
}