import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Coffee, Brain, Settings, CheckSquare, Target, TrendingUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FocusSession {
  id: string;
  type: 'focus' | 'short-break' | 'long-break';
  duration: number;
  completed: boolean;
  startTime: Date;
}

export const FocusTimer = () => {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'short-break' | 'long-break'>('focus');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [currentSession, setCurrentSession] = useState(1);
  const [totalSessions, setTotalSessions] = useState(4);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sessionDurations = {
    focus: 25 * 60,      // 25 minutes
    'short-break': 5 * 60,  // 5 minutes  
    'long-break': 15 * 60,  // 15 minutes
  };

  const motivationalMessages = {
    focus: [
      "Deep work creates deep results ✨",
      "Your focus is your superpower 🚀", 
      "Every moment of focus is an investment 💎",
      "Clarity comes through concentrated effort 🎯",
    ],
    'short-break': [
      "Great work! Recharge your energy ☕",
      "Take a deep breath and relax 🌸",
      "Movement helps the mind reset 🚶‍♀️",
      "Hydrate and prepare for the next round 💧",
    ],
    'long-break': [
      "Excellent progress! You've earned this break 🎉",
      "Step outside and reset your perspective 🌿", 
      "Reflect on what you've accomplished 🏆",
      "Rest is part of the productivity process 😌",
    ],
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && isActive) {
      handleSessionComplete();
    }
  }, [timeLeft, isActive]);

  const handleSessionComplete = async () => {
    setIsActive(false);
    
    // Save completed session to database
    if (currentSessionId && user) {
      try {
        await supabase
          .from('focus_sessions')
          .update({ 
            completed: true, 
            completed_at: new Date().toISOString() 
          })
          .eq('id', currentSessionId);
        
        toast.success(`${sessionType === 'focus' ? 'Focus' : 'Break'} session completed!`);
      } catch (error) {
        console.error('Error updating session:', error);
      }
    }
    
    if (sessionType === 'focus') {
      setSessionsCompleted(prev => prev + 1);
      
      // After 4 focus sessions, take a long break
      if ((sessionsCompleted + 1) % 4 === 0) {
        setSessionType('long-break');
        setTimeLeft(sessionDurations['long-break']);
      } else {
        setSessionType('short-break');
        setTimeLeft(sessionDurations['short-break']);
      }
      setCurrentSession(prev => prev + 1);
    } else {
      // After any break, return to focus
      setSessionType('focus');
      setTimeLeft(sessionDurations.focus);
    }

    setCurrentSessionId(null);

    // Play completion sound (browser notification)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${sessionType === 'focus' ? 'Focus' : 'Break'} session complete!`, {
        body: 'Time to switch modes',
        icon: '/timer-icon.png'
      });
    }
  };

  const toggleTimer = async () => {
    if (!isActive && user) {
      // Starting a new session - create database record
      try {
        const { data, error } = await supabase
          .from('focus_sessions')
          .insert({
            user_id: user.id,
            session_type: sessionType,
            duration_minutes: Math.floor(sessionDurations[sessionType] / 60),
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentSessionId(data.id);
        toast.success(`${sessionType} session started`);
      } catch (error) {
        console.error('Error creating session:', error);
        toast.error('Failed to start session');
        return;
      }
    }
    
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(sessionDurations[sessionType]);
    setCurrentSessionId(null);
  };

  const changeSessionType = (type: 'focus' | 'short-break' | 'long-break') => {
    setIsActive(false);
    setSessionType(type);
    setTimeLeft(sessionDurations[type]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalTime = sessionDurations[sessionType];
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  const getSessionIcon = () => {
    switch (sessionType) {
      case 'focus': return <Brain className="w-5 h-5" />;
      case 'short-break': return <Coffee className="w-5 h-5" />;
      case 'long-break': return <Coffee className="w-5 h-5" />;
    }
  };

  const getRandomMessage = () => {
    const messages = motivationalMessages[sessionType];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="card-glass text-center">
        <CardContent className="p-6">
          <h2 className="text-headline text-gradient-focus mb-3">Focus Mode</h2>
          <p className="text-subtitle text-muted-foreground">
            Pomodoro Technique • Session {currentSession} of {totalSessions}
          </p>
        </CardContent>
      </Card>

      {/* Session Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="card-interactive text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary mb-1">{sessionsCompleted}</div>
            <div className="text-sm text-muted-foreground">Sessions Done</div>
          </CardContent>
        </Card>
        <Card className="card-interactive text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-focus/20 to-focus-glow/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-focus" />
            </div>
            <div className="text-3xl font-bold text-focus mb-1">{currentSession}</div>
            <div className="text-sm text-muted-foreground">Current Session</div>
          </CardContent>
        </Card>
        <Card className="card-interactive text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div className="text-3xl font-bold text-success mb-1">{Math.round(getProgress())}%</div>
            <div className="text-sm text-muted-foreground">Progress</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Timer */}
      <Card className={cn(
        "card-glass relative overflow-hidden transition-all duration-500 shadow-xl",
        sessionType === 'focus' && isActive && "shadow-focus animate-focus-pulse",
        sessionType !== 'focus' && isActive && "shadow-glow"
      )}>
        <CardContent className="p-12 text-center relative z-10">
          {/* Session Type Selector */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className={cn(
              "p-3 rounded-2xl shadow-medium transition-all duration-300",
              sessionType === 'focus' ? "bg-gradient-to-br from-focus to-focus-glow" : "bg-gradient-to-br from-success to-success/80"
            )}>
              {getSessionIcon()}
            </div>
            <span className="text-xl font-semibold capitalize">
              {sessionType.replace('-', ' ')} Session
            </span>
          </div>

          {/* Timer Display */}
          <div className="space-y-8">
            <div className={cn(
              "text-8xl md:text-9xl font-bold transition-all duration-500 tracking-tight",
              sessionType === 'focus' ? "text-gradient-focus" : "text-gradient-primary"
            )}>
              {formatTime(timeLeft)}
            </div>
            
            {/* Progress Ring */}
            <div className="relative w-40 h-40 mx-auto">
              <div className="progress-enhanced h-4">
                <div 
                  className={cn(
                    "progress-bar transition-all duration-1000",
                    sessionType === 'focus' ? "bg-gradient-to-r from-focus to-focus-glow" : "bg-gradient-to-r from-success to-success/80"
                  )}
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="space-tight mb-8">
            <p className="text-lg text-muted-foreground italic font-medium">
              {getRandomMessage()}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="outline"
              size="lg"
              onClick={resetTimer}
              className="w-14 h-14 rounded-full p-0 button-enhanced"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
            
            <Button
              onClick={toggleTimer}
              size="lg"
              className={cn(
                "w-20 h-20 rounded-full p-0 text-xl font-bold transition-all duration-300 shadow-xl",
                isActive && "animate-glow shadow-glow scale-110",
                sessionType === 'focus' ? "bg-gradient-to-br from-focus to-focus-glow" : "bg-gradient-primary"
              )}
            >
              {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={requestNotificationPermission}
              className="w-14 h-14 rounded-full p-0 button-enhanced"
            >
              <Settings className="w-6 h-6" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Type Quick Switch */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(sessionDurations) as Array<keyof typeof sessionDurations>).map((type) => (
          <Button
            key={type}
            variant={sessionType === type ? "default" : "outline"}
            onClick={() => changeSessionType(type)}
            className={cn(
              "capitalize text-sm py-3 button-enhanced",
              sessionType === type && "bg-gradient-primary shadow-medium"
            )}
            disabled={isActive}
          >
            {type === 'short-break' ? 'Short Break' : 
             type === 'long-break' ? 'Long Break' : type}
          </Button>
        ))}
      </div>

      {/* Tips */}
      <Card className="card-glass bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-warning" />
            Focus Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <span>Remove distractions and close unnecessary tabs</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <span>Take deep breaths during breaks</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <span>Stay hydrated and maintain good posture</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
              <span>Use breaks to move your body and rest your eyes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};