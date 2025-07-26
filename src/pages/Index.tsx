import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Target, Brain, Timer, Mic, MicOff, LogOut, Menu, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const Index = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'goals' | 'focus' | 'ai' | 'voice' | 'notes'>('voice');
  const [isListening, setIsListening] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center animate-zen-breathe shadow-lg">
                <Brain className="w-4 h-4 lg:w-5 lg:h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  ZenVA
                </h1>
                <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block">Your AI Voice Assistant</p>
              </div>
            </div>
            
            {/* Desktop Header Actions */}
            <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
              <MoodTracker />
              <Button
                variant={isListening ? "default" : "outline"}
                size="sm"
                onClick={() => setIsListening(!isListening)}
                className={cn(
                  "transition-all duration-300",
                  isListening && "animate-focus-pulse shadow-lg"
                )}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                <span className="hidden lg:inline ml-2">
                  {isListening ? "Listening..." : "Voice"}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline ml-2">Sign Out</span>
              </Button>
            </div>

            {/* Mobile Header Actions */}
            <div className="flex md:hidden items-center space-x-2">
              <MoodTracker />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-border/50 pt-4 animate-slide-in-up">
              <div className="flex flex-col space-y-3">
                <Button
                  variant={isListening ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsListening(!isListening)}
                  className={cn(
                    "w-full justify-start transition-all duration-300",
                    isListening && "animate-focus-pulse"
                  )}
                >
                  {isListening ? <Mic className="w-4 h-4 mr-2" /> : <MicOff className="w-4 h-4 mr-2" />}
                  {isListening ? "Stop Listening" : "Start Voice Mode"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 lg:py-6 max-w-7xl">
        {/* Motivational Quote */}
        <div className="mb-4 lg:mb-6">
          <MotivationalQuote />
        </div>

        {/* Navigation Tabs */}
        <div className="mb-4 lg:mb-6">
          {/* Desktop Tabs */}
          <div className="hidden md:flex space-x-2 p-1 bg-card rounded-xl border border-border/50 shadow-sm backdrop-blur-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 transition-all duration-300 rounded-lg",
                    activeTab === tab.id && "shadow-md"
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Mobile Tabs - Horizontal Scroll */}
          <div className="md:hidden">
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "outline"}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-shrink-0 min-w-[100px] transition-all duration-300",
                      activeTab === tab.id && "shadow-md"
                    )}
                    size="sm"
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    <span className="text-xs">{tab.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="animate-fade-in">
          {activeTab === 'voice' && (
            <div className="flex justify-center">
              <div className="w-full max-w-4xl">
                <FullVoiceAssistant
                  onTaskCreated={(task) => {
                    setActiveTab('tasks');
                  }}
                  onSessionStarted={() => {
                    setActiveTab('focus');
                  }}
                  onNoteCreated={(note) => {
                    console.log('Note created:', note);
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <Card className="p-4 lg:p-6 shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
              <TodoManager />
            </Card>
          )}
          
          {activeTab === 'goals' && (
            <Card className="p-4 lg:p-6 shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
              <GoalTracker />
            </Card>
          )}
          
          {activeTab === 'focus' && (
            <Card className="p-4 lg:p-6 shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
              <FocusTimer />
            </Card>
          )}
          
          {activeTab === 'notes' && (
            <Card className="p-4 lg:p-6 shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
              <NotesManager />
            </Card>
          )}
          
          {activeTab === 'ai' && (
            <Card className="p-4 lg:p-6 shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
              <AIAssistant isListening={isListening} setIsListening={setIsListening} />
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
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
