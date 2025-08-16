import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, MicOff, Square, Play, Pause, Volume2, VolumeX, 
  FileText, Trash2, Download, RefreshCw 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceDictationProps {
  onTranscription: (text: string) => void;
  className?: string;
  autoTranscribe?: boolean;
}

interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export const VoiceDictation = ({ 
  onTranscription, 
  className, 
  autoTranscribe = false 
}: VoiceDictationProps) => {
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecording();
  const audioRef = useRef<HTMLAudioElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    if (audioBlob && autoTranscribe) {
      handleTranscribe();
    }
  }, [audioBlob, autoTranscribe]);

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob]);

  const handleStartRecording = async () => {
    clearAll();
    await startRecording();
  };

  const handleTranscribe = async () => {
    if (!audioBlob) {
      toast.error('No audio to transcribe');
      return;
    }

    setIsTranscribing(true);
    setTranscriptionProgress(0);

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Use Groq Whisper for transcription
      const { data, error } = await supabase.functions.invoke('whisper-transcription', {
        body: {
          audioData: base64Audio,
          language: 'en',
          model: 'whisper-large-v3'
        }
      });

      if (error || !data.success) {
        throw new Error(data?.error || 'Transcription failed');
      }

      setTranscription(data.transcription);
      setSegments(data.segments || []);
      setTranscriptionProgress(100);
      
      // Auto-send transcription if callback provided
      onTranscription(data.transcription);
      
      toast.success(`Transcribed ${data.wordCount} words with ${Math.round((data.confidence || 0.8) * 100)}% confidence`);
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const playAudio = async () => {
    if (!audioUrl || !audioRef.current) return;

    try {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setIsPlayingAudio(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio');
    }
  };

  const clearAll = () => {
    setTranscription('');
    setSegments([]);
    setTranscriptionProgress(0);
    setRecordingDuration(0);
    clearRecording();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadTranscription = () => {
    if (!transcription) {
      toast.error('No transcription to download');
      return;
    }

    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Transcription downloaded');
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Voice Dictation Studio
        </CardTitle>
        <CardDescription>
          High-quality voice-to-text using Groq Whisper AI
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Recording Controls */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Button
              onClick={isRecording ? stopRecording : handleStartRecording}
              className={cn(
                "w-24 h-24 rounded-full transition-all duration-300 shadow-lg",
                isRecording
                  ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-red-500/30"
                  : "bg-primary hover:bg-primary/90 shadow-primary/30"
              )}
              disabled={isTranscribing}
            >
              {isRecording ? (
                <Square className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </Button>
          </div>

          {/* Recording Status */}
          <div className="space-y-2">
            {isRecording && (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">
                  Recording: {formatDuration(recordingDuration)}
                </span>
              </div>
            )}
            
            {isTranscribing && (
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Processing with Groq Whisper...</span>
                </div>
                <Progress value={transcriptionProgress} className="w-full max-w-xs mx-auto" />
              </div>
            )}
          </div>
        </div>

        {/* Audio Playback Controls */}
        {audioUrl && !isRecording && (
          <Card className="p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playAudio}
                  disabled={isTranscribing}
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(recordingDuration)} recorded
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <audio
              ref={audioRef}
              onEnded={() => setIsPlayingAudio(false)}
              className="hidden"
            />
          </Card>
        )}

        {/* Transcription Results */}
        {transcription && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Transcription Results
              </h4>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {transcription.trim().split(/\s+/).length} words
                </Badge>
                <Button variant="outline" size="sm" onClick={downloadTranscription}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-48 w-full">
              <div className="space-y-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {transcription}
                </p>
                
                {/* Confidence indicators for segments */}
                {segments.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Confidence by segment:</p>
                    <div className="flex flex-wrap gap-1">
                      {segments.map((segment, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className={cn(
                            "text-xs",
                            segment.confidence > 0.8 ? "border-green-500 text-green-700" :
                            segment.confidence > 0.6 ? "border-yellow-500 text-yellow-700" :
                            "border-red-500 text-red-700"
                          )}
                        >
                          {Math.round(segment.confidence * 100)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTranscription(transcription)}
            disabled={!transcription}
          >
            <FileText className="w-4 h-4 mr-1" />
            Use Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={!audioBlob && !transcription}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};