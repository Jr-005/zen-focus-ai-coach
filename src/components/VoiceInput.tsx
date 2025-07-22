import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Square, Play, Trash2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useAI } from '@/hooks/useAI';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  className?: string;
  placeholder?: string;
}

export const VoiceInput = ({ onTranscription, className, placeholder = "Click to record voice input" }: VoiceInputProps) => {
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecording();
  const { transcribeAudio, loading: aiLoading } = useAI();

  const handleStartRecording = async () => {
    clearRecording();
    setTranscription('');
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleTranscribe = async () => {
    if (!audioBlob) {
      toast.error('No audio to transcribe');
      return;
    }

    setIsTranscribing(true);
    try {
      const result = await transcribeAudio(audioBlob);
      if (result) {
        setTranscription(result);
        toast.success('Audio transcribed successfully');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSendTranscription = () => {
    if (transcription.trim()) {
      onTranscription(transcription.trim());
      setTranscription('');
      clearRecording();
      toast.success('Voice input sent');
    }
  };

  const handleClear = () => {
    setTranscription('');
    clearRecording();
  };

  const playAudio = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error('Failed to play audio');
      });
    }
  };

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">{placeholder}</p>
        
        {/* Recording Controls */}
        <div className="flex justify-center space-x-2 mb-4">
          {!isRecording ? (
            <Button
              onClick={handleStartRecording}
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90"
              disabled={aiLoading || isTranscribing}
            >
              <Mic className="w-6 h-6" />
            </Button>
          ) : (
            <Button
              onClick={handleStopRecording}
              className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/90 animate-pulse"
            >
              <Square className="w-6 h-6" />
            </Button>
          )}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Recording...</span>
          </div>
        )}

        {/* Audio Controls */}
        {audioBlob && !isRecording && (
          <div className="flex justify-center space-x-2 mb-4">
            <Button variant="outline" size="sm" onClick={playAudio}>
              <Play className="w-4 h-4 mr-1" />
              Play
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTranscribe}
              disabled={isTranscribing || aiLoading}
            >
              {isTranscribing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Transcribe
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        )}

        {/* Transcription Result */}
        {transcription && (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg text-left">
              <p className="text-sm font-medium mb-1">Transcription:</p>
              <p className="text-sm">{transcription}</p>
            </div>
            <div className="flex justify-center space-x-2">
              <Button onClick={handleSendTranscription} size="sm">
                <Send className="w-4 h-4 mr-1" />
                Use This Text
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Loading States */}
        {(aiLoading || isTranscribing) && (
          <div className="text-sm text-muted-foreground">
            {isTranscribing ? 'Transcribing audio...' : 'Processing...'}
          </div>
        )}
      </div>
    </Card>
  );
};