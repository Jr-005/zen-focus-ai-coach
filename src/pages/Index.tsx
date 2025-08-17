import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mic, Brain, Timer, Target, Heart, MessageSquare, Lightbulb, CheckSquare, 
  Settings, User, Sparkles, TrendingUp, Clock, Activity, Wand2
} from 'lucide-react';
import { TodoManager } from '@/components/TodoManager';
import { FocusTimer } from '@/components/FocusTimer';
import { GoalTracker } from '@/components/GoalTracker';
import { MoodTracker } from '@/components/MoodTracker';
import { MotivationalQuote } from '@/components/MotivationalQuote';
import { FullVoiceAssistant } from '@/components/FullVoiceAssistant';
import NotesManager from '@/components/NotesManager';
import { AITaskSuggestions } from '@/components/AITaskSuggestions';
import { CreativeMode } from '@/components/CreativeMode';
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
    <div className="min-h-screen bg-gradient-subtle">
      {/* App Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-title">ZenFlow</h1>
                <p className="text-micro">AI Productivity Suite</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 text-caption">
                <Clock className="h-4 w-4 text-primary" />
                <span>2h 30m focused today</span>
              </div>
              <div className="flex items-center gap-2 text-caption">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span>5 tasks completed</span>
              </div>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="focus-ring">
                <Settings className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-relaxed">
        {/* Hero Section */}
        <div className="text-center mb-12 space-content">
          <h2 className="text-headline bg-gradient-primary bg-clip-text text-transparent mb-4">
            Your Intelligent Productivity Companion
          </h2>
          <p className="text-subtitle text-muted-foreground max-w-2xl mx-auto">
            Boost your focus, manage tasks intelligently, and track your personal growth with AI-powered insights
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="group relative overflow-hidden interactive shadow-subtle hover:shadow-medium border-border/50 bg-gradient-card">
              <CardHeader className="space-component">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-subtle group-hover:shadow-glow transition-all duration-300">
                    {React.cloneElement(feature.icon, { className: "h-5 w-5 text-primary-foreground" })}
                  </div>
                  <Badge variant="secondary" className="text-micro font-medium px-2 py-1">
                    {feature.badge}
                  </Badge>
                </div>
                <div className="space-tight">
                  <h3 className="text-subtitle group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-caption leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="assistant" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-8 h-14 bg-muted/30 backdrop-blur-sm border border-border/50 rounded-xl p-1">
            <TabsTrigger 
              value="assistant" 
              className="flex items-center gap-3 h-12 rounded-lg font-medium data-[state=active]:bg-background data-[state=active]:shadow-subtle transition-all duration-200"
            >
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="flex items-center gap-3 h-12 rounded-lg font-medium data-[state=active]:bg-background data-[state=active]:shadow-subtle transition-all duration-200"
            >
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger 
              value="focus" 
              className="flex items-center gap-3 h-12 rounded-lg font-medium data-[state=active]:bg-background data-[state=active]:shadow-subtle transition-all duration-200"
            >
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Focus</span>
            </TabsTrigger>
            <TabsTrigger 
              value="wellness" 
              className="flex items-center gap-3 h-12 rounded-lg font-medium data-[state=active]:bg-background data-[state=active]:shadow-subtle transition-all duration-200"
            >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Wellness</span>
            </TabsTrigger>
            <TabsTrigger 
              value="creative" 
              className="flex items-center gap-3 h-12 rounded-lg font-medium data-[state=active]:bg-background data-[state=active]:shadow-subtle transition-all duration-200"
            >
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">Creative</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assistant" className="space-relaxed">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                <FullVoiceAssistant />
              </div>
              <div className="xl:col-span-1">
                <NotesManager />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-relaxed">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                <TodoManager />
              </div>
              <div className="xl:col-span-1">
                <AITaskSuggestions 
                  taskTitle="Daily Planning"
                  onApplySuggestion={(suggestion) => {
                    console.log('Applied suggestion:', suggestion);
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="focus" className="space-relaxed">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                <FocusTimer />
              </div>
              <div className="xl:col-span-1">
                <GoalTracker />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wellness" className="space-relaxed">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <MoodTracker />
              <MotivationalQuote />
            </div>
          </TabsContent>

          <TabsContent value="creative" className="space-relaxed">
            <CreativeMode />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;