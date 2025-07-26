import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Target, Brain, Timer, Mic, MicOff, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TodoManager } from '@/components/TodoManager';
import { GoalTracker } from '@/components/GoalTracker';
import { FocusTimer } from '@/components/FocusTimer';
import { AIAssistant } from '@/components/AIAssistant';
import { VoiceAgent } from '@/components/VoiceAgent';
import { FullVoiceAssistant } from '@/components/FullVoiceAssistant';
import { MoodTracker } from '@/components/MoodTracker';
import { MotivationalQuote } from '@/components/MotivationalQuote';
import NotesManager from '@/components/NotesManager';

const Index = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'goals' | 'focus' | 'ai' | 'voice' | 'notes'>('voice');
  const [isListening, setIsListening] = useState(false);
  const { signOut, user } = useAuth();

  const tabs = [
    { id: 'voice', label: 'Voice Agent', icon: Mic },
    { id: 'tasks', label: 'Tasks', icon: Plus },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'focus', label: 'Focus', icon: Timer },
    { id: 'notes', label: 'Notes', icon: Brain },
    { id: 'ai', label: 'AI Chat', icon: Brain },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/30 to-primary/10">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center animate-zen-breathe">
                <Timer className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  FocusZen
                </h1>
                <p className="text-sm text-muted-foreground">Your AI Productivity Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <MoodTracker />
              <Button
                variant={isListening ? "default" : "outline"}
                size="sm"
                onClick={() => setIsListening(!isListening)}
                className={isListening ? "animate-focus-pulse" : ""}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                {isListening ? "Listening..." : "Voice"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Motivational Quote */}
        <div className="mb-6">
          <MotivationalQuote />
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6 p-1 bg-card rounded-lg border border-border/50 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 transition-all duration-300"
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Content Sections */}
        <div className="animate-fade-in">
          {activeTab === 'voice' && (
            <div className="flex justify-center">
              <FullVoiceAssistant
                onTaskCreated={(task) => {
                  // Switch to tasks tab and refresh
                  setActiveTab('tasks');
                }}
                onSessionStarted={() => {
                  setActiveTab('focus');
                }}
                onNoteCreated={(note) => {
                  // Could add notes tab in future
                  console.log('Note created:', note);
                }}
              />
            </div>
          )}

          {activeTab === 'tasks' && (
            <Card className="p-6 shadow-zen border-border/50">
              <TodoManager />
            </Card>
          )}
          
          {activeTab === 'goals' && (
            <Card className="p-6 shadow-zen border-border/50">
              <GoalTracker />
            </Card>
          )}
          
          {activeTab === 'focus' && (
            <Card className="p-6 shadow-zen border-border/50">
              <FocusTimer />
            </Card>
          )}
          
          {activeTab === 'notes' && (
            <Card className="p-6 shadow-zen border-border/50">
              <NotesManager />
            </Card>
          )}
          
          {activeTab === 'ai' && (
            <Card className="p-6 shadow-zen border-border/50">
              <AIAssistant isListening={isListening} setIsListening={setIsListening} />
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
