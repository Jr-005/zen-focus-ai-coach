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
    <Card className="flex flex-col h-[700px] w-full shadow-large border-border/50 bg-gradient-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-component border-b border-border/50 bg-gradient-primary/5">
        <div className="flex items-center space-x-4 mb-3 sm:mb-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-subtle">
            <Mic className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="space-tight">
            <h3 className="text-title">AI Voice Assistant</h3>
            <p className="text-caption">Natural conversations with memory</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10 lg:w-12 lg:h-12 shadow-medium">
            <AvatarFallback>
              <Bot className="w-5 h-5 lg:w-6 lg:h-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg lg:text-xl flex items-center gap-2">
              <Brain className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
              ZenVA Voice Assistant with Memory
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <Circle className={cn("w-3 h-3 rounded-full", getStatusColor())} />
              <p className="text-sm lg:text-base text-muted-foreground font-medium">{getStatusText()}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-3">
          <Badge variant={isConnected ? 'default' : 'secondary'} className="shadow-sm">
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
          {isConnected ? (
            <Button onClick={disconnectFromVoiceChat} variant="outline" size="sm" className="shadow-sm">
              <Square className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Disconnect</span>
            </Button>
          ) : (
            <Button onClick={connectToVoiceChat} size="sm" disabled={connectionStatus === 'connecting'} className="shadow-sm">
              <Circle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 bg-gradient-to-b from-background/50 to-background/20">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8 lg:py-12">
            <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
              <Brain className="w-8 h-8 lg:w-10 lg:h-10 text-primary" />
            </div>
            <h4 className="text-lg lg:text-xl font-medium mb-2">ZenVA Ready to Help</h4>
            <p className="mb-6 text-sm lg:text-base max-w-md mx-auto">I remember our conversations and can reference your previous notes and insights</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm max-w-lg mx-auto">
              <div className="p-3 lg:p-4 bg-gradient-to-br from-primary/5 to-primary-glow/5 rounded-xl border border-primary/10 shadow-sm">
                <p className="font-medium">💬 Natural Conversation</p>
                <p className="text-xs lg:text-sm opacity-80 mt-1">Talk naturally, like you would to a human assistant</p>
              </div>
              <div className="p-3 lg:p-4 bg-gradient-to-br from-success/5 to-success/10 rounded-xl border border-success/10 shadow-sm">
                <p className="font-medium">🎯 Smart Actions</p>
                <p className="text-xs lg:text-sm opacity-80 mt-1">"Create a task to review the proposal by Friday"</p>
              </div>
              <div className="p-3 lg:p-4 bg-gradient-to-br from-focus/5 to-focus/10 rounded-xl border border-focus/10 shadow-sm">
                <p className="font-medium">⏱️ Focus Sessions</p>
                <p className="text-xs lg:text-sm opacity-80 mt-1">"Start a 30-minute focus session"</p>
              </div>
              <div className="p-3 lg:p-4 bg-gradient-to-br from-warning/5 to-warning/10 rounded-xl border border-warning/10 shadow-sm">
                <p className="font-medium">📝 Voice Notes</p>
                <p className="text-xs lg:text-sm opacity-80 mt-1">"Save a note about today's meeting insights"</p>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex space-x-2 lg:space-x-3 animate-fade-in",
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.type !== 'user' && (
              <Avatar className="w-8 h-8 lg:w-10 lg:h-10 shadow-sm flex-shrink-0">
                <AvatarFallback>
                  {message.type === 'system' ? '⚡' : <Bot className="w-4 h-4 lg:w-5 lg:h-5" />}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div
              className={cn(
                "max-w-[85%] sm:max-w-[80%] rounded-xl p-3 lg:p-4 shadow-sm",
                message.type === 'user'
                  ? 'bg-gradient-to-br from-primary to-primary-glow text-primary-foreground ml-8 lg:ml-12'
                  : message.type === 'system'
                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border border-blue-200 dark:border-blue-700'
                  : 'bg-gradient-to-br from-muted/50 to-muted/80 backdrop-blur-sm'
              )}
            >
              <p className="text-sm lg:text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <div className="flex items-center justify-between mt-2 lg:mt-3">
                <p className="text-xs lg:text-sm opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
                {message.isAudio && (
                  <Badge variant="outline" className="text-xs shadow-sm">
                    {message.type === 'user' ? '🎤' : '🔊'} Audio
                  </Badge>
                )}
              </div>
            </div>

            {message.type === 'user' && (
              <Avatar className="w-8 h-8 lg:w-10 lg:h-10 shadow-sm flex-shrink-0">
                <AvatarFallback>
                  <User className="w-4 h-4 lg:w-5 lg:h-5" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {currentTranscript && (
          <div className="flex justify-end space-x-3">
            <div className="max-w-[85%] sm:max-w-[80%] rounded-xl p-3 lg:p-4 bg-primary/20 ml-8 lg:ml-12 animate-pulse">
              <p className="text-sm lg:text-base italic">{currentTranscript}</p>
            </div>
            <Avatar className="w-8 h-8 lg:w-10 lg:h-10 shadow-sm">
              <AvatarFallback>
                <User className="w-4 h-4 lg:w-5 lg:h-5" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="p-4 lg:p-6 border-t border-border/50 space-y-4 bg-gradient-to-r from-card/50 to-card/80 backdrop-blur-sm">
        {/* Voice Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Button
            onClick={toggleRecording}
            disabled={!isConnected}
            className={cn(
              "w-16 h-16 lg:w-20 lg:h-20 rounded-full shadow-lg transition-all duration-300",
              isRecording
                ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 animate-pulse shadow-red-500/30"
                : "bg-gradient-to-br from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 shadow-primary/30"
            )}
          >
            {isRecording ? (
              <MicOff className="w-6 h-6 lg:w-8 lg:h-8" />
            ) : (
              <Mic className="w-6 h-6 lg:w-8 lg:h-8" />
            )}
          </Button>
          
          <div className="text-center sm:text-left">
            <p className="text-sm lg:text-base font-medium">
              {isRecording ? 'Tap to stop' : 'Hold or tap to talk'}
            </p>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">
              {isSpeaking && '🔊 Assistant speaking...'}
            </p>
          </div>
        </div>

        {/* Text Input */}
        <div className="flex space-x-2 lg:space-x-3">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a message or use voice..."
            disabled={!isConnected}
            onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
            className="flex-1 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
          />
          <Button 
            onClick={sendTextMessage} 
            disabled={!textInput.trim() || !isConnected}
            size="icon"
            className="rounded-xl shadow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};