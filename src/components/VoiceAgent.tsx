import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAI } from '@/hooks/useAI';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  
  const { user } = useAuth();
  const { parseTaskFromNaturalLanguage, textToSpeech, transcribeAudio, loading: aiLoading } = useAI();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadConversationHistory();
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error loading conversation history:', error);
        return;
      }

      const formattedMessages = data.map(msg => ({
        id: msg.id,
        type: msg.message_type as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        intent: undefined, // intent field doesn't exist in ai_conversations table
        action: undefined // action_data field doesn't exist in ai_conversations table
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const saveMessage = async (message: Omit<Message, 'id' | 'timestamp'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          message_type: message.type,
          content: message.content,
          category: message.intent || 'general'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving message:', error);
        return;
      }

      return data.id;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsListening(true);
      setCurrentTranscription('Listening...');
      toast.success('Voice recording started');

    } catch (error) {
      console.error('Error starting voice input:', error);
      toast.error('Failed to start voice recording');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setCurrentTranscription('Processing...');
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Transcribe audio using Groq Whisper
      const transcription = await transcribeAudio(audioBlob);
      
      if (!transcription) {
        toast.error('Failed to transcribe audio');
        return;
      }

      setCurrentTranscription('');
      
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: transcription,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      await saveMessage(userMessage);

      // Process intent and generate response
      await processUserIntent(transcription);

    } catch (error) {
      console.error('Error processing voice input:', error);
      toast.error('Failed to process voice input');
    } finally {
      setIsProcessing(false);
    }
  };


  const processUserIntent = async (text: string) => {
    try {
      const intent = detectIntent(text);
      let response = '';
      let action = null;

      switch (intent.type) {
        case 'create_task':
          const parsedTask = await parseTaskFromNaturalLanguage(text);
          if (parsedTask) {
            // Save task to database
            const { data: taskData, error } = await supabase
              .from('tasks')
              .insert({
                user_id: user?.id,
                title: parsedTask.title,
                description: parsedTask.description,
                priority: parsedTask.priority,
                due_date: parsedTask.dueDate ? new Date(parsedTask.dueDate).toISOString() : null
              })
              .select()
              .single();

            if (!error && taskData) {
              response = `Perfect! I've created the task "${parsedTask.title}" for you.`;
              action = {
                type: 'task_created' as const,
                details: taskData
              };
              onTaskCreated?.(taskData);
            } else {
              response = 'I understood your request but had trouble saving the task. Please try again.';
            }
          } else {
            response = 'I had trouble understanding your task request. Could you try rephrasing it?';
          }
          break;

        case 'start_session':
          response = 'Starting your focus session now. Stay focused and productive!';
          action = {
            type: 'session_started' as const,
            details: { duration: intent.duration || 25 }
          };
          onSessionStarted?.();
          break;

        case 'motivation':
          response = getMotivationalResponse();
          break;

        case 'question':
          response = await getProductivityAdvice(text);
          break;

        default:
          response = 'I heard you! How can I help you with your productivity today?';
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: Date.now().toString() + '_ai',
        type: 'assistant',
        content: response,
        timestamp: new Date(),
        intent: intent.type,
        action
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(assistantMessage);

      // Convert response to speech
      await speakResponse(response);

    } catch (error) {
      console.error('Error processing intent:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const detectIntent = (text: string) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('remind me') || lowerText.includes('reminder')) {
      return { type: 'create_reminder' };
    }
    
    if (lowerText.includes('create') || lowerText.includes('add') || lowerText.includes('task')) {
      return { type: 'create_task' };
    }
    
    if (lowerText.includes('focus session') || lowerText.includes('start session') || lowerText.includes('pomodoro')) {
      return { type: 'start_session', duration: 25 };
    }
    
    if (lowerText.includes('motivated') || lowerText.includes('inspiration') || lowerText.includes('overwhelmed')) {
      return { type: 'motivation' };
    }
    
    if (lowerText.includes('how') || lowerText.includes('what') || lowerText.includes('why') || lowerText.includes('?')) {
      return { type: 'question' };
    }
    
    return { type: 'general' };
  };

  const getMotivationalResponse = () => {
    const responses = [
      "You're doing great! Every small step counts toward your bigger goals.",
      "Remember, progress isn't about perfection - it's about consistency.",
      "Take a deep breath. You have the strength to handle whatever comes your way.",
      "Your future self will thank you for the work you're putting in today.",
      "It's okay to feel overwhelmed sometimes. Break things down into smaller, manageable steps."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const getProductivityAdvice = async (question: string) => {
    // Simple RAG-like responses based on productivity principles
    const advice = {
      'focus': 'Try the Pomodoro Technique: work for 25 minutes, then take a 5-minute break.',
      'overwhelmed': 'When feeling overwhelmed, try brain dumping - write everything down, then prioritize.',
      'motivation': 'Set small, achievable goals and celebrate each completion to maintain momentum.',
      'procrastination': 'Start with just 2 minutes on a task. Often, starting is the hardest part.',
      'time management': 'Time blocking can help - assign specific time slots to different types of work.'
    };
    
    for (const [key, response] of Object.entries(advice)) {
      if (question.toLowerCase().includes(key)) {
        return response;
      }
    }
    
    return "That's a great question! Focus on breaking down complex tasks into smaller, actionable steps.";
  };

  const speakResponse = async (text: string) => {
    try {
      setIsSpeaking(true);
      const audioData = await textToSpeech(text);
      
      if (audioData) {
        const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      }
    } catch (error) {
      console.error('Error speaking response:', error);
      setIsSpeaking(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback>
              <Bot className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">ZenVA Assistant</h3>
            <p className="text-xs text-muted-foreground">
              {isListening ? 'Listening...' : isProcessing ? 'Processing...' : isSpeaking ? 'Speaking...' : 'Ready'}
            </p>
          </div>
        </div>
        <Badge variant={isListening ? 'destructive' : 'secondary'}>
          {isListening ? 'Live' : 'Standby'}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Hi! I'm your voice assistant. Try saying:</p>
            <div className="mt-2 space-y-1 text-sm">
              <p>"Create a task to review project proposal"</p>
              <p>"Start a focus session"</p>
              <p>"I need some motivation"</p>
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
              {message.action && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {message.action.type.replace('_', ' ')}
                </Badge>
              )}
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
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
      </div>

      {/* Voice Controls */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing || aiLoading}
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
              {isListening ? 'Tap to stop' : 'Hold to speak'}
            </p>
            <p className="text-xs text-muted-foreground">
              Real-time voice assistant
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