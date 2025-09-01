import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Play, Square } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const VoiceTestComponent = () => {
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecording();

  const testTranscription = async () => {
    if (!audioBlob) {
      toast.error('No audio to transcribe');
      return;
    }

    setIsTranscribing(true);
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      console.log('Testing Groq Whisper transcription...');
      const { data, error } = await supabase.functions.invoke('groq-whisper', {
        body: {
          audioData: base64Audio,
          language: 'en'
        }
      });

      console.log('Groq Whisper response:', { data, error });

      if (error) {
        console.error('Transcription error:', error);
        toast.error('Failed to transcribe audio');
        return;
      }

      if (!data.success) {
        console.error('Transcription failed:', data.error);
        toast.error('Transcription failed: ' + data.error);
        return;
      }

      setTranscription(data.transcription);
      toast.success('Audio transcribed successfully');
    } catch (error) {
      console.error('Error during transcription:', error);
      toast.error('Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const testChat = async () => {
    try {
      console.log('Testing Groq Chat...');
      const { data, error } = await supabase.functions.invoke('groq-chat', {
        body: {
          messages: [
            {
              role: "user",
              content: "Say hello and tell me if you're working properly. Keep it short."
            }
          ],
          model: "llama3-groq-70b-8192-tool-use-preview",
          temperature: 0.7
        }
      });

      console.log('Groq Chat response:', { data, error });

      if (error) {
        console.error('Chat error:', error);
        toast.error('Chat test failed');
        return;
      }

      if (data.success) {
        toast.success('Chat test successful: ' + data.response);
      } else {
        toast.error('Chat test failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error during chat test:', error);
      toast.error('Chat test failed');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Voice & AI Test Component</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            disabled={isTranscribing}
          >
            {isRecording ? <Square className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>
          
          {audioBlob && (
            <>
              <Button
                onClick={() => {
                  const audio = new Audio(URL.createObjectURL(audioBlob));
                  audio.play();
                }}
                variant="outline"
              >
                <Play className="w-4 h-4 mr-2" />
                Play Audio
              </Button>
              
              <Button
                onClick={testTranscription}
                disabled={isTranscribing}
                variant="secondary"
              >
                {isTranscribing ? 'Transcribing...' : 'Test Transcription'}
              </Button>
            </>
          )}
          
          <Button onClick={testChat} variant="outline">
            Test Chat
          </Button>
          
          <Button onClick={clearRecording} variant="ghost">
            Clear
          </Button>
        </div>

        {transcription && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Transcription:</h4>
            <p>{transcription}</p>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>Use this component to test:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Voice recording functionality</li>
            <li>Groq Whisper transcription</li>
            <li>Groq Chat AI responses</li>
            <li>Audio playback</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};