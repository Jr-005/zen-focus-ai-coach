import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Bot, User, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  action?: {
    type: 'task_created' | 'reminder_set' | 'session_started' | 'note_saved';
    details: any;
  };
}

interface VoiceAgentProps {
  onTaskCreated?: (task: any) => void;
  onReminderSet?: (reminder: any) => void;
  onSessionStarted?: () => void;
}

export const VoiceAgent = ({ onTaskCreated, onReminderSet, onSessionStarted }: VoiceAgentProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');
  
  const { user } = useAuth();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
      toast.success('Listening... Speak now');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
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
        return;
      }

      if (data.success) {
        const transcription = data.transcription;
        setCurrentTranscription(transcription);
        
        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          type: 'user',
          content: transcription,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Process with AI
        await processWithAI(transcription);
      } else {
        toast.error('Transcription failed: ' + data.error);
      }
    } catch (error) {
      console.error('Error during transcription:', error);
      toast.error('Failed to transcribe audio');
    } finally {
      setIsProcessing(false);
      setCurrentTranscription('');
    }
  };

  const processWithAI = async (text: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('groq-chat', {
        body: {
          messages: [
            {
              role: "system",
              content: "You are ZenVA, an AI productivity assistant. Be helpful, concise, and friendly. Help with tasks, reminders, focus sessions, and productivity advice."
            },
            {
              role: "user",
              content: text
            }
          ],
          model: "llama-3.1-70b-versatile",
          temperature: 0.7
        }
      });

      if (error) {
        console.error('AI processing error:', error);
        toast.error('Failed to process request');
        return;
      }

      if (data.success) {
        const assistantMessage: Message = {
          id: Date.now().toString() + 1,
          type: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Text-to-speech if available
        await speakResponse(data.response);
      }
    } catch (error) {
      console.error('Error processing with AI:', error);
      toast.error('Failed to process request');
    }
  };

  const speakResponse = async (text: string) => {
    try {
      setIsSpeaking(true);
      const { data, error } = await supabase.functions.invoke('groq-tts', {
        body: { text, voice: 'alloy' }
      });

      if (error) {
        console.error('TTS error:', error);
        return;
      }

      if (data.success) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioData}`);
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleTextSubmit = () => {
    if (!inputText.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    processWithAI(inputText);
    setInputText('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <Card className="flex flex-col h-[600px] max-w-2xl mx-auto">
      {/* Header */}
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback>
              <Bot className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">ZenVA Assistant</CardTitle>
            <CardDescription className="text-xs">
              {isListening ? 'Listening...' : isProcessing ? 'Processing...' : isSpeaking ? 'Speaking...' : 'Ready to help'}
            </CardDescription>
          </div>
        </div>
        <Badge variant={isListening ? 'destructive' : 'secondary'}>
          {isListening ? 'Live' : 'Standby'}
        </Badge>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Hi! I'm your AI productivity assistant.</p>
            <div className="text-sm space-y-1">
              <p>Try saying: "Create a task to review documents"</p>
              <p>Or: "Start a focus session"</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex space-x-3",
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.type === 'assistant' && (
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
            
            <div
              className={cn(
                "max-w-[80%] rounded-lg p-3",
                message.type === 'user'
                  ? 'bg-primary text-primary-foreground ml-12'
                  : 'bg-muted'
              )}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {formatTime(message.timestamp)}
              </p>
            </div>

            {message.type === 'user' && (
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {currentTranscription && (
          <div className="flex justify-end space-x-3">
            <div className="max-w-[80%] rounded-lg p-3 bg-primary/20 ml-12">
              <p className="text-sm italic">{currentTranscription}</p>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Controls */}
      <div className="p-4 border-t space-y-4">
        {/* Text Input */}
        <div className="flex space-x-2">
          <Textarea
            placeholder="Type your message or use voice..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleTextSubmit())}
            className="flex-1 min-h-[44px] max-h-32 resize-none"
          />
          <Button 
            onClick={handleTextSubmit} 
            disabled={!inputText.trim() || isProcessing}
            size="icon"
            className="h-11 w-11"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Voice Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className={cn(
              "w-16 h-16 rounded-full",
              isListening
                ? "bg-destructive hover:bg-destructive/90 animate-pulse"
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-sm font-medium">
              {isListening ? 'Tap to stop' : 'Click to speak'}
            </p>
            <p className="text-xs text-muted-foreground">
              Voice assistant ready
            </p>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSpeaking(!isSpeaking)}
            className="w-12 h-12 rounded-full"
          >
            {isSpeaking ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};