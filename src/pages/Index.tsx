import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mic, Brain, Timer, Target, Heart, CheckSquare, 
  Settings, Bell, Search, Plus, Zap, Star, BarChart3,
  Activity, Wand2, TrendingUp, Clock
} from 'lucide-react';
import { TodoManager } from '@/components/TodoManager';
import FocusTimer from '@/components/FocusTimer';
import { GoalTracker } from '@/components/GoalTracker';
import { MoodTracker } from '@/components/MoodTracker';
import { MotivationalQuote } from '@/components/MotivationalQuote';
import { VoiceAgent } from '@/components/VoiceAgent';
import NotesManager from '@/components/NotesManager';
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
      color: 'bg-primary'
    },
    { 
      icon: Plus, 
      label: 'Quick Task', 
      description: 'Add a new task',
      action: () => setActiveTab('tasks'),
      color: 'bg-success'
    },
    { 
      icon: Timer, 
      label: 'Focus Session', 
      description: 'Start a Pomodoro timer',
      action: () => setActiveTab('focus'),
      color: 'bg-focus'
    },
    { 
      icon: Heart, 
      label: 'Mood Check', 
      description: 'Log your current mood',
      action: () => setActiveTab('wellness'),
      color: 'bg-warning'
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="app-container">
          <div className="flex-between py-4">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gradient-primary">ZenVA</h1>
                <p className="text-xs text-muted-foreground">AI Productivity Suite</p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <MoodTracker />
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={signOut}>
                <Settings className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <main className="app-container py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex-between mb-6">
            <div>
              <h2 className="text-headline mb-2">
                Welcome back, {user?.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-muted-foreground">
                Here's your productivity overview for today
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-sm text-success font-medium">All systems active</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="card-interactive">
                  <CardContent className="p-4">
                    <div className="flex-between mb-3">
                      <div className={cn("p-2 rounded-lg bg-muted", stat.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {stat.trend}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xl font-bold mb-1">{stat.value}</p>
                      <p className="text-caption">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <Card className="card-base">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Jump into your most common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 flex flex-col items-center gap-2 hover:border-primary/30"
                      onClick={action.action}
                    >
                      <div className={cn("p-3 rounded-xl text-white", action.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-sm">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-8 h-12 bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="assistant" className="flex items-center gap-2 text-sm">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2 text-sm">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="focus" className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Focus</span>
            </TabsTrigger>
            <TabsTrigger value="wellness" className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Wellness</span>
            </TabsTrigger>
            <TabsTrigger value="creative" className="flex items-center gap-2 text-sm">
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">Creative</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-md">
                <MotivationalQuote />
                
                {/* Today's Progress */}
                <Card className="card-base">
                  <CardHeader>
                    <CardTitle className="text-lg">Today's Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-sm">
                    <div className="space-y-4">
                      <div>
                        <div className="flex-between mb-2">
                          <span className="text-sm font-medium">Daily Tasks</span>
                          <span className="text-sm text-muted-foreground">8/12</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: '67%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex-between mb-2">
                          <span className="text-sm font-medium">Focus Time</span>
                          <span className="text-sm text-muted-foreground">2.5h/4h</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: '63%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex-between mb-2">
                          <span className="text-sm font-medium">Weekly Goals</span>
                          <span className="text-sm text-muted-foreground">4/6</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: '67%' }}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-md">
                {/* Activity Summary */}
                <Card className="card-base">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-sm">
                    {stats.map((stat, index) => {
                      const Icon = stat.icon;
                      return (
                        <div key={index} className="flex-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-1.5 rounded-md bg-background", stat.color)}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{stat.value}</p>
                              <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {stat.trend}
                          </Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Quick Insights */}
                <Card className="card-base">
                  <CardHeader>
                    <CardTitle className="text-lg">Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-sm">
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                        <p className="text-sm font-medium text-success">Great momentum!</p>
                        <p className="text-xs text-muted-foreground">You're 20% ahead of last week</p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-sm font-medium text-primary">Peak focus time</p>
                        <p className="text-xs text-muted-foreground">9-11 AM works best for you</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assistant" className="animate-fade-in">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <VoiceAgent />
              </div>
              <div>
                <NotesManager />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="animate-fade-in">
            <TodoManager />
          </TabsContent>

          <TabsContent value="focus" className="animate-fade-in">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <FocusTimer />
              </div>
              <div>
                <GoalTracker />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wellness" className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-base">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-warning" />
                    Wellness Dashboard
                  </CardTitle>
                  <CardDescription>
                    Track your mood, energy, and overall well-being
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-md">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 rounded-xl bg-success/10 border border-success/20">
                      <p className="text-2xl mb-2">😊</p>
                      <p className="text-sm font-medium">Current Mood</p>
                      <p className="text-xs text-muted-foreground">Good</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <p className="text-2xl font-bold text-primary mb-2">85%</p>
                      <p className="text-sm font-medium">Energy Level</p>
                      <p className="text-xs text-muted-foreground">High</p>
                    </div>
                  </div>
                  <MoodTracker />
                </CardContent>
              </Card>
              <MotivationalQuote />
            </div>
          </TabsContent>

          <TabsContent value="creative" className="animate-fade-in">
            <CreativeMode />
          </TabsContent>
        </Tabs>

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => setActiveTab('assistant')}
          >
            <Mic className="h-6 w-6" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Index;