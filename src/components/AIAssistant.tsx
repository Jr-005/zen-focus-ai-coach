import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Mic, MicOff, Brain, Lightbulb, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  category?: 'planning' | 'motivation' | 'coaching' | 'analysis';
}

interface AIAssistantProps {
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
}

export const AIAssistant = ({ isListening, setIsListening }: AIAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI productivity coach. I'm here to help you plan your goals, stay motivated, and maximize your focus. What would you like to work on today?",
      timestamp: new Date(),
      category: 'coaching'
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const aiResponses = {
    planning: [
      "Let's break that goal down into smaller, manageable steps. What's the first action you can take today?",
      "I can help you create a timeline for this. When would you ideally like to complete this goal?",
      "Great goal! Let's make it SMART - Specific, Measurable, Achievable, Relevant, and Time-bound.",
    ],
    motivation: [
      "You're making excellent progress! Remember, every small step counts toward your bigger vision.",
      "It's normal to feel overwhelmed sometimes. Let's focus on just the next single action you can take.",
      "Your consistency is building momentum. Keep going - you're closer than you think!",
    ],
    coaching: [
      "What obstacles do you anticipate, and how can we prepare for them?",
      "How are you feeling about your progress so far? Let's celebrate the wins!",
      "What would make the biggest difference in your productivity right now?",
    ],
    analysis: [
      "Based on your patterns, I notice you're most productive in the morning. Let's schedule important tasks then.",
      "You've completed 80% of your tasks this week - that's fantastic momentum!",
      "I see you often get distracted around 2 PM. Would a short break or focus session help?",
    ]
  };

  const quickActions = [
    { icon: Target, label: "Plan my day", message: "Help me plan an effective day based on my goals and energy levels" },
    { icon: Lightbulb, label: "Get motivated", message: "I'm feeling unmotivated. Can you help me get back on track?" },
    { icon: Brain, label: "Analyze patterns", message: "Analyze my productivity patterns and suggest improvements" },
    { icon: Zap, label: "Quick focus tip", message: "Give me a quick tip to improve my focus right now" },
  ];

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const simulateAIResponse = (userMessage: string): { content: string; category: keyof typeof aiResponses } => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('goal') || lowerMessage.includes('plan') || lowerMessage.includes('schedule')) {
      const responses = aiResponses.planning;
      return {
        content: responses[Math.floor(Math.random() * responses.length)],
        category: 'planning'
      };
    } else if (lowerMessage.includes('motivat') || lowerMessage.includes('stuck') || lowerMessage.includes('discourag')) {
      const responses = aiResponses.motivation;
      return {
        content: responses[Math.floor(Math.random() * responses.length)],
        category: 'motivation'
      };
    } else if (lowerMessage.includes('pattern') || lowerMessage.includes('analyz') || lowerMessage.includes('improve')) {
      const responses = aiResponses.analysis;
      return {
        content: responses[Math.floor(Math.random() * responses.length)],
        category: 'analysis'
      };
    } else {
      const responses = aiResponses.coaching;
      return {
        content: responses[Math.floor(Math.random() * responses.length)],
        category: 'coaching'
      };
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const { content: aiContent, category } = simulateAIResponse(content);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiContent,
        timestamp: new Date(),
        category,
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000); // 1-3 seconds delay
  };

  const handleQuickAction = (message: string) => {
    sendMessage(message);
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'planning': return <Target className="w-3 h-3" />;
      case 'motivation': return <Zap className="w-3 h-3" />;
      case 'coaching': return <Brain className="w-3 h-3" />;
      case 'analysis': return <Lightbulb className="w-3 h-3" />;
      default: return <Brain className="w-3 h-3" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'planning': return 'bg-primary text-primary-foreground';
      case 'motivation': return 'bg-success text-success-foreground';
      case 'coaching': return 'bg-focus text-focus-foreground';
      case 'analysis': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4 h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">AI Coach</h2>
          <p className="text-muted-foreground">Your personal productivity assistant</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {isListening ? "🎤 Listening" : "💬 Text Mode"}
          </Badge>
          <Button
            variant={isListening ? "default" : "outline"}
            size="sm"
            onClick={() => setIsListening(!isListening)}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.message)}
              className="flex flex-col h-auto p-3 space-y-1"
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs">{action.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Messages */}
      <Card className="flex-1 p-4">
        <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start space-x-3",
                  message.type === 'user' && "flex-row-reverse space-x-reverse"
                )}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={cn(
                    "text-xs",
                    message.type === 'ai' ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {message.type === 'ai' ? <Brain className="w-4 h-4" /> : 'You'}
                  </AvatarFallback>
                </Avatar>
                
                <div className={cn(
                  "flex-1 space-y-1",
                  message.type === 'user' && "text-right"
                )}>
                  <div className="flex items-center space-x-2">
                    {message.type === 'ai' && message.category && (
                      <Badge className={cn("text-xs", getCategoryColor(message.category))}>
                        {getCategoryIcon(message.category)}
                        <span className="ml-1 capitalize">{message.category}</span>
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <Card className={cn(
                    "p-3 max-w-[80%]",
                    message.type === 'user' 
                      ? "bg-primary text-primary-foreground ml-auto" 
                      : "bg-muted"
                  )}>
                    <p className="text-sm">{message.content}</p>
                  </Card>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start space-x-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    <Brain className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <Card className="p-3 bg-muted animate-pulse">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Input */}
      <div className="flex space-x-2">
        <Input
          ref={inputRef}
          placeholder={isListening ? "Speak your message..." : "Type your message..."}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputMessage)}
          disabled={isListening}
          className="flex-1"
        />
        <Button 
          onClick={() => sendMessage(inputMessage)}
          disabled={!inputMessage.trim() || isTyping}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};