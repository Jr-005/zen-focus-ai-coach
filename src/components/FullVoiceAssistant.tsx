import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Mic, 
  MicOff, 
  Bot, 
  User, 
  Send,
  Circle,
  Square,
  Volume2,
  VolumeX,
  Brain 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RealtimeVoiceChat } from '@/utils/RealtimeAudio';
import { useRAG } from '@/hooks/useRAG';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isAudio?: boolean;
  functionCall?: any;
}

interface FullVoiceAssistantProps {
  onTaskCreated?: (task: any) => void;
  onSessionStarted?: () => void;
  onNoteCreated?: (note: any) => void;
}

export const FullVoiceAssistant = ({ 
  onTaskCreated, 
  onSessionStarted, 
  onNoteCreated 
}: FullVoiceAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const { user } = useAuth();
  const { saveVoiceNote } = useRAG();
  const voiceChatRef = useRef<RealtimeVoiceChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (voiceChatRef.current) {
        voiceChatRef.current.disconnect();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMessage = (message: any) => {
    console.log('Received message:', message);
    
    if (message.type === 'session.created') {
      conversationIdRef.current = message.session?.id || null;
      addSystemMessage('Voice assistant connected and ready!');
    } 
    else if (message.type === 'input_audio_buffer.speech_started') {
      setCurrentTranscript('Listening...');
    }
    else if (message.type === 'input_audio_buffer.speech_stopped') {
      setCurrentTranscript('');
    }
    else if (message.type === 'conversation.item.input_audio_transcription.completed') {
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: message.transcript,
        timestamp: new Date(),
        isAudio: true
      };
      setMessages(prev => [...prev, userMessage]);
      saveMessage(userMessage);
      
      // Save voice note with RAG when transcription is complete
      if (message.transcript && message.transcript.length > 20) {
        saveVoiceNote(message.transcript, `Voice note from ${new Date().toLocaleString()}`);
      }
    }
    else if (message.type === 'response.audio_transcript.delta') {
      // Handle streaming text response
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.type === 'assistant' && last.id.startsWith('streaming_')) {
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + message.delta }
          ];
        } else {
          const newMessage: Message = {
            id: `streaming_${Date.now()}`,
            type: 'assistant',
            content: message.delta,
            timestamp: new Date(),
            isAudio: true
          };
          return [...prev, newMessage];
        }
      });
    }
    else if (message.type === 'response.audio_transcript.done') {
      // Finalize the streaming message
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.id.startsWith('streaming_')) {
          const finalMessage = { ...last, id: Date.now().toString() };
          saveMessage(finalMessage);
          return [...prev.slice(0, -1), finalMessage];
        }
        return prev;
      });
    }
    else if (message.type === 'response.function_call_arguments.done') {
      // Handle function calls
      handleFunctionCall(message);
    }
    else if (message.type === 'error') {
      toast.error(`Voice assistant error: ${message.error}`);
    }
  };

  const handleFunctionCall = async (message: any) => {
    try {
      const args = JSON.parse(message.arguments);
      
      switch (message.name) {
        case 'create_task':
          await createTask(args);
          break;
        case 'start_focus_session':
          await startFocusSession(args);
          break;
        case 'save_note':
          await saveNote(args);
          break;
        default:
          console.log('Unknown function call:', message.name);
      }
    } catch (error) {
      console.error('Error handling function call:', error);
    }
  };

  const createTask = async (args: any) => {
    if (!user) return;

    try {
      const { data: taskData, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: args.title,
          description: args.description || '',
          priority: args.priority || 'medium',
          due_date: args.due_date ? new Date(args.due_date).toISOString() : null,
        })
        .select()
        .single();

      if (!error && taskData) {
        onTaskCreated?.(taskData);
        addSystemMessage(`✓ Task created: "${args.title}"`);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      addSystemMessage('Failed to create task');
    }
  };

  const startFocusSession = async (args: any) => {
    try {
      onSessionStarted?.();
      addSystemMessage(`🎯 Focus session started (${args.duration || 25} minutes)`);
    } catch (error) {
      console.error('Error starting focus session:', error);
    }
  };

  const saveNote = async (args: any) => {
    if (!user) return;

    try {
      const { data: noteData, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          content: args.content,
          category: args.category || 'general'
        })
        .select()
        .single();

      if (!error && noteData) {
        onNoteCreated?.(noteData);
        addSystemMessage(`📝 Note saved`);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      addSystemMessage('Failed to save note');
    }
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const saveMessage = async (message: Message) => {
    if (!user || !conversationIdRef.current) return;

    try {
      await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          message_type: message.type,
          content: message.content,
          conversation_id: conversationIdRef.current
        });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
    setConnectionStatus(connected ? 'connected' : 'disconnected');
  };

  const handleSpeakingChange = (speaking: boolean) => {
    setIsSpeaking(speaking);
  };

  const connectToVoiceChat = async () => {
    try {
      setConnectionStatus('connecting');
      
      voiceChatRef.current = new RealtimeVoiceChat(
        handleMessage,
        handleSpeakingChange,
        handleConnectionChange
      );
      
      await voiceChatRef.current.connect();
      toast.success('Connected to voice assistant');
    } catch (error) {
      console.error('Error connecting to voice chat:', error);
      toast.error('Failed to connect to voice assistant');
      setConnectionStatus('disconnected');
    }
  };

  const disconnectFromVoiceChat = () => {
    if (voiceChatRef.current) {
      voiceChatRef.current.disconnect();
      voiceChatRef.current = null;
    }
    setIsRecording(false);
    setConnectionStatus('disconnected');
    toast.info('Disconnected from voice assistant');
  };

  const toggleRecording = async () => {
    if (!voiceChatRef.current || !isConnected) {
      toast.error('Not connected to voice assistant');
      return;
    }

    try {
      if (isRecording) {
        voiceChatRef.current.stopRecording();
        setIsRecording(false);
      } else {
        await voiceChatRef.current.startRecording();
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      toast.error('Failed to toggle recording');
    }
  };

  const sendTextMessage = () => {
    if (!textInput.trim() || !voiceChatRef.current || !isConnected) return;

    try {
      voiceChatRef.current.sendTextMessage(textInput);
      
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: textInput,
        timestamp: new Date(),
        isAudio: false
      };
      
      setMessages(prev => [...prev, userMessage]);
      saveMessage(userMessage);
      setTextInput('');
    } catch (error) {
      console.error('Error sending text message:', error);
      toast.error('Failed to send message');
    }
  };

  const getStatusColor = () => {
    if (isSpeaking) return 'bg-blue-500';
    if (isRecording) return 'bg-red-500 animate-pulse';
    if (isConnected) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (isSpeaking) return 'Speaking';
    if (isRecording) return 'Listening';
    if (isConnected) return 'Ready';
    if (connectionStatus === 'connecting') return 'Connecting';
    return 'Disconnected';
  };

  return (
    <Card className="flex flex-col h-[700px] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback>
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Brain className="w-5 h-5" />
              ZenVA Voice Assistant with Memory
            </h3>
            <div className="flex items-center space-x-2">
              <Circle className={cn("w-3 h-3 rounded-full", getStatusColor())} />
              <p className="text-sm text-muted-foreground">{getStatusText()}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
          {isConnected ? (
            <Button onClick={disconnectFromVoiceChat} variant="outline" size="sm">
              <Square className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button onClick={connectToVoiceChat} size="sm" disabled={connectionStatus === 'connecting'}>
              <Circle className="w-4 h-4 mr-2" />
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h4 className="text-lg font-medium mb-2">AI Assistant with Memory Ready</h4>
            <p className="mb-4">I remember our conversations and can reference your previous notes and insights</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm max-w-md mx-auto">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">💬 Natural Conversation</p>
                <p className="text-xs opacity-80">Talk naturally, like you would to a human assistant</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">🎯 Smart Actions</p>
                <p className="text-xs opacity-80">"Create a task to review the proposal by Friday"</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">⏱️ Focus Sessions</p>
                <p className="text-xs opacity-80">"Start a 30-minute focus session"</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">📝 Voice Notes</p>
                <p className="text-xs opacity-80">"Save a note about today's meeting insights"</p>
              </div>
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
            {message.type !== 'user' && (
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  {message.type === 'system' ? '⚡' : <Bot className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div
              className={cn(
                "max-w-[80%] rounded-lg p-3",
                message.type === 'user'
                  ? 'bg-primary text-primary-foreground ml-12'
                  : message.type === 'system'
                  ? 'bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800'
                  : 'bg-muted'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
                {message.isAudio && (
                  <Badge variant="outline" className="text-xs">
                    {message.type === 'user' ? '🎤' : '🔊'} Audio
                  </Badge>
                )}
              </div>
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

        {currentTranscript && (
          <div className="flex justify-end space-x-3">
            <div className="max-w-[80%] rounded-lg p-3 bg-primary/20 ml-12">
              <p className="text-sm italic">{currentTranscript}</p>
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

      {/* Controls */}
      <div className="p-4 border-t space-y-4">
        {/* Voice Controls */}
        <div className="flex items-center justify-center space-x-6">
          <Button
            onClick={toggleRecording}
            disabled={!isConnected}
            className={cn(
              "w-20 h-20 rounded-full",
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-lg"
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {isRecording ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-sm font-medium">
              {isRecording ? 'Tap to stop' : 'Hold or tap to talk'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSpeaking && '🔊 Assistant speaking...'}
            </p>
          </div>
        </div>

        {/* Text Input */}
        <div className="flex space-x-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a message or use voice..."
            disabled={!isConnected}
            onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
            className="flex-1"
          />
          <Button 
            onClick={sendTextMessage} 
            disabled={!textInput.trim() || !isConnected}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};