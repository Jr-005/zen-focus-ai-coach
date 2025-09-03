import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, Brain, Timer, Target, Heart, MessageSquare, Lightbulb, CheckSquare, 
  Settings, User, Sparkles, TrendingUp, Clock, Activity, Wand2, Menu,
  Bell, Search, Plus, Zap, Star, BarChart3
} from 'lucide-react';
import { TodoManager } from '@/components/TodoManager';
import { FocusTimer } from '@/components/FocusTimer';
import { GoalTracker } from '@/components/GoalTracker';
import { MoodTracker } from '@/components/MoodTracker';
import { MotivationalQuote } from '@/components/MotivationalQuote';
import { VoiceAgent } from '@/components/VoiceAgent';

import NotesManager from '@/components/NotesManager';
import { AITaskSuggestions } from '@/components/AITaskSuggestions';
import { CreativeMode } from '@/components/CreativeMode';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const stats = [
    { label: 'Focus Time', value: '2h 30m', icon: Clock, color: 'text-focus', trend: '+15%' },
    { label: 'Tasks Done', value: '12', icon: CheckSquare, color: 'text-success', trend: '+3' },
    { label: 'Goals Progress', value: '68%', icon: Target, color: 'text-primary', trend: '+12%' },
    { label: 'Streak', value: '7 days', icon: Zap, color: 'text-warning', trend: 'New!' },
  ];

  const quickActions = [
    { 
      icon: Mic, 
      label: 'Voice Command', 
      description: 'Talk to your AI assistant',
      action: () => setActiveTab('assistant'),
      gradient: 'from-primary to-primary-glow'
    },
    { 
      icon: Plus, 
      label: 'Quick Task', 
      description: 'Add a new task',
      action: () => setActiveTab('tasks'),
      gradient: 'from-success to-success/80'
    },
    { 
      icon: Timer, 
      label: 'Focus Session', 
      description: 'Start a Pomodoro timer',
      action: () => setActiveTab('focus'),
      gradient: 'from-focus to-focus-glow'
    },
    { 
      icon: Heart, 
      label: 'Mood Check', 
      description: 'Log your current mood',
      action: () => {},
      gradient: 'from-warning to-warning/80'
    },
  ];

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI Voice Assistant",
      description: "Natural conversation with memory and context awareness",
      badge: "AI Powered",
      color: "primary"
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Smart Memory",
      description: "Your AI remembers conversations and learns from your notes",
      badge: "RAG System",
      color: "focus"
    },
    {
      icon: <CheckSquare className="h-6 w-6" />,
      title: "Task Management",
      description: "AI-suggested tasks with natural language input",
      badge: "Intelligent",
      color: "success"
    },
    {
      icon: <Timer className="h-6 w-6" />,
      title: "Focus Timer",
      description: "Pomodoro technique with productivity tracking",
      badge: "Productivity",
      color: "warning"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Enhanced App Header */}
      <header className="sticky top-0 z-50 w-full glass-strong border-b border-border/30">
        <div className="container-app py-4">
          <div className="flex-between">
            {/* Logo & Brand */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-medium animate-zen-breathe">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="space-tight">
                <h1 className="text-title text-gradient-primary">ZenVA</h1>
                <p className="text-micro">AI Productivity Suite</p>
              </div>
            </div>

            {/* Quick Stats Dashboard */}
            <div className="hidden lg:flex items-center gap-8">
              {stats.slice(0, 2).map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="flex items-center gap-3 group">
                    <div className={cn("p-2 rounded-xl bg-muted/50 group-hover:bg-muted transition-colors", stat.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-3">
              <MoodTracker />
              <Button variant="ghost" size="icon" className="hover-lift focus-ring">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="hover-lift focus-ring">
                <Search className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="hover-lift focus-ring"
                onClick={signOut}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Avatar className="h-10 w-10 avatar-enhanced">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="container-app py-8 space-loose">
        {/* Enhanced Hero Section */}
        <div className="text-center mb-16 space-content">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-fade-in">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Your Intelligent Productivity Companion</span>
          </div>
          <h2 className="text-display text-gradient-primary mb-6 animate-slide-in-up">
            Boost Your Focus,<br />Achieve Your Goals
          </h2>
          <p className="text-subtitle text-muted-foreground max-w-3xl mx-auto animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
            Experience the future of productivity with AI-powered voice assistance, intelligent task management, and personalized insights that adapt to your workflow.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="card-interactive animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-6">
                  <div className="flex-between mb-4">
                    <div className={cn("p-3 rounded-xl bg-muted/50", stat.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="badge-enhanced text-success">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className="space-tight">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-caption">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="card-glass mb-12 animate-slide-in-up">
          <CardHeader className="text-center pb-6">
            <CardTitle className="flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Jump into your most common productivity tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    className={cn(
                      "h-auto p-6 flex flex-col items-center gap-3 group",
                      "hover:border-primary/30 hover:bg-gradient-to-br hover:shadow-medium",
                      "transition-all duration-300 click-scale"
                    )}
                    onClick={action.action}
                  >
                    <div className={cn(
                      "p-4 rounded-2xl bg-gradient-to-br shadow-subtle group-hover:shadow-medium transition-all duration-300",
                      action.gradient
                    )}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-center space-tight">
                      <p className="font-semibold text-sm">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-8 h-16 bg-glass-card border border-border/30 rounded-2xl p-2 shadow-medium">
            <TabsTrigger 
              value="dashboard" 
              className="tab-trigger-enhanced flex-col gap-1 h-12"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="assistant" 
              className="tab-trigger-enhanced flex-col gap-1 h-12"
            >
              <Mic className="h-4 w-4" />
              <span className="text-xs font-medium">Assistant</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="tab-trigger-enhanced flex-col gap-1 h-12"
            >
              <CheckSquare className="h-4 w-4" />
              <span className="text-xs font-medium">Tasks</span>
            </TabsTrigger>
            <TabsTrigger 
              value="focus" 
              className="tab-trigger-enhanced flex-col gap-1 h-12"
            >
              <Timer className="h-4 w-4" />
              <span className="text-xs font-medium">Focus</span>
            </TabsTrigger>
            <TabsTrigger 
              value="wellness" 
              className="tab-trigger-enhanced flex-col gap-1 h-12"
            >
              <Heart className="h-4 w-4" />
              <span className="text-xs font-medium">Wellness</span>
            </TabsTrigger>
            <TabsTrigger 
              value="creative" 
              className="tab-trigger-enhanced flex-col gap-1 h-12"
            >
              <Wand2 className="h-4 w-4" />
              <span className="text-xs font-medium">Creative</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-relaxed animate-fade-in">
            <div className="grid-dashboard">
              {/* Welcome Card */}
              <Card className="lg:col-span-8 card-glass">
                <CardHeader>
                  <div className="flex-between">
                    <div>
                      <CardTitle className="text-headline mb-2">
                        Welcome back, {user?.email?.split('@')[0] || 'User'}! 👋
                      </CardTitle>
                      <CardDescription className="text-subtitle">
                        Here's your productivity overview for today
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="status-dot status-online"></div>
                      <span className="text-sm text-success font-medium">All systems active</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-content">
                  <MotivationalQuote />
                  
                  {/* Progress Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-tight">
                      <div className="flex-between mb-2">
                        <span className="text-sm font-medium">Daily Progress</span>
                        <span className="text-sm text-muted-foreground">68%</span>
                      </div>
                      <div className="progress-enhanced">
                        <div className="progress-bar" style={{ width: '68%' }}></div>
                      </div>
                    </div>
                    <div className="space-tight">
                      <div className="flex-between mb-2">
                        <span className="text-sm font-medium">Weekly Goals</span>
                        <span className="text-sm text-muted-foreground">4/6</span>
                      </div>
                      <div className="progress-enhanced">
                        <div className="progress-bar" style={{ width: '67%' }}></div>
                      </div>
                    </div>
                    <div className="space-tight">
                      <div className="flex-between mb-2">
                        <span className="text-sm font-medium">Focus Score</span>
                        <span className="text-sm text-muted-foreground">85%</span>
                      </div>
                      <div className="progress-enhanced">
                        <div className="progress-bar" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Sidebar */}
              <Card className="lg:col-span-4 card-glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Today's Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-content">
                  {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div key={index} className="flex-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg bg-background shadow-subtle", stat.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="badge-enhanced text-success">
                          {stat.trend}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Feature Highlights */}
              <div className="lg:col-span-12">
                <div className="grid-responsive">
                  {features.map((feature, index) => (
                    <Card key={index} className="card-interactive group animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                      <CardHeader className="space-component">
                        <div className="flex-between">
                          <div className={cn(
                            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-medium transition-all duration-300",
                            "group-hover:shadow-glow group-hover:scale-110",
                            feature.color === 'primary' && "bg-gradient-primary",
                            feature.color === 'focus' && "bg-gradient-to-br from-focus to-focus-glow",
                            feature.color === 'success' && "bg-gradient-to-br from-success to-success/80",
                            feature.color === 'warning' && "bg-gradient-to-br from-warning to-warning/80"
                          )}>
                            {React.cloneElement(feature.icon, { className: "h-6 w-6 text-white" })}
                          </div>
                          <Badge variant="secondary" className="badge-enhanced">
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assistant" className="space-relaxed animate-fade-in">
            <div className="grid-dashboard">
              <div className="lg:col-span-8">
                <VoiceAgent />
              </div>
              <div className="lg:col-span-4">
                <NotesManager />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-relaxed animate-fade-in">
            <div className="grid-dashboard">
              <div className="lg:col-span-8">
                <TodoManager />
              </div>
              <div className="lg:col-span-4">
                <AITaskSuggestions 
                  taskTitle="Daily Planning"
                  onApplySuggestion={(suggestion) => {
                    console.log('Applied suggestion:', suggestion);
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="focus" className="space-relaxed animate-fade-in">
            <div className="grid-dashboard">
              <div className="lg:col-span-8">
                <FocusTimer />
              </div>
              <div className="lg:col-span-4">
                <GoalTracker />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wellness" className="space-relaxed animate-fade-in">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <Card className="card-glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-warning" />
                    Wellness Dashboard
                  </CardTitle>
                  <CardDescription>
                    Track your mood, energy, and overall well-being
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-content">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-xl bg-success/10 border border-success/20">
                        <p className="text-2xl font-bold text-success">😊</p>
                        <p className="text-sm font-medium">Current Mood</p>
                        <p className="text-xs text-muted-foreground">Good</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-2xl font-bold text-primary">85%</p>
                        <p className="text-sm font-medium">Energy Level</p>
                        <p className="text-xs text-muted-foreground">High</p>
                      </div>
                    </div>
                    <MoodTracker />
                  </div>
                </CardContent>
              </Card>
              <MotivationalQuote />
            </div>
          </TabsContent>

          <TabsContent value="creative" className="space-relaxed animate-fade-in">
            <CreativeMode />
          </TabsContent>
        </Tabs>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 right-8 z-40">
          <Button
            size="lg"
            className="h-16 w-16 rounded-full bg-gradient-primary shadow-xl hover:shadow-glow animate-float btn-primary"
            onClick={() => setActiveTab('assistant')}
          >
            <Mic className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;