import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Brain, Timer, Target, Heart, MessageSquare, Lightbulb, CheckSquare } from 'lucide-react';
import { TodoManager } from '@/components/TodoManager';
import { FocusTimer } from '@/components/FocusTimer';
import { GoalTracker } from '@/components/GoalTracker';
import { MoodTracker } from '@/components/MoodTracker';
import { MotivationalQuote } from '@/components/MotivationalQuote';
import { FullVoiceAssistant } from '@/components/FullVoiceAssistant';
import NotesManager from '@/components/NotesManager';
import { AITaskSuggestions } from '@/components/AITaskSuggestions';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <Mic className="h-6 w-6" />,
      title: "Voice AI Assistant",
      description: "Natural conversation with memory and context awareness",
      badge: "AI Powered"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Smart Memory",
      description: "Your AI remembers conversations and learns from your notes",
      badge: "RAG System"
    },
    {
      icon: <CheckSquare className="h-6 w-6" />,
      title: "Task Management",
      description: "AI-suggested tasks with natural language input",
      badge: "Intelligent"
    },
    {
      icon: <Timer className="h-6 w-6" />,
      title: "Focus Timer",
      description: "Pomodoro technique with productivity tracking",
      badge: "Productivity"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
            AI-Powered Productivity Suite
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your intelligent companion for tasks, focus, and personal growth with advanced AI memory
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {feature.badge}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="assistant" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="focus" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Focus</span>
            </TabsTrigger>
            <TabsTrigger value="wellness" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Wellness</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assistant" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FullVoiceAssistant />
              <NotesManager />
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TodoManager />
              <AITaskSuggestions 
                taskTitle="Daily Planning"
                onApplySuggestion={(suggestion) => {
                  // Handle suggestion application
                  console.log('Applied suggestion:', suggestion);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="focus" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FocusTimer />
              <GoalTracker />
            </div>
          </TabsContent>

          <TabsContent value="wellness" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MoodTracker />
              <MotivationalQuote />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;