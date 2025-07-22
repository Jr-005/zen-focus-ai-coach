import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Coffee, Brain, Settings } from 'lucide-react';
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
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Focus Mode</h2>
        <p className="text-muted-foreground">
          Pomodoro Technique • Session {currentSession} of {totalSessions}
        </p>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{sessionsCompleted}</div>
          <div className="text-xs text-muted-foreground">Sessions Done</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-focus">{currentSession}</div>
          <div className="text-xs text-muted-foreground">Current Session</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-success">{Math.round(getProgress())}%</div>
          <div className="text-xs text-muted-foreground">Progress</div>
        </Card>
      </div>

      {/* Main Timer */}
      <Card className={cn(
        "p-8 text-center relative overflow-hidden transition-all duration-500",
        sessionType === 'focus' && isActive && "bg-gradient-to-br from-primary/10 to-focus/10",
        sessionType !== 'focus' && isActive && "bg-gradient-to-br from-success/10 to-warning/10"
      )}>
        {/* Background Animation */}
        <div className={cn(
          "absolute inset-0 opacity-20 transition-all duration-1000",
          isActive && sessionType === 'focus' && "animate-focus-pulse",
          isActive && sessionType !== 'focus' && "animate-zen-breathe"
        )} />
        
        <div className="relative z-10 space-y-6">
          {/* Session Type Selector */}
          <div className="flex items-center justify-center space-x-2">
            {getSessionIcon()}
            <span className="text-lg font-medium capitalize">
              {sessionType.replace('-', ' ')} Session
            </span>
          </div>

          {/* Timer Display */}
          <div className="space-y-4">
            <div className={cn(
              "text-6xl md:text-8xl font-bold transition-colors duration-300",
              sessionType === 'focus' ? "text-primary" : "text-success"
            )}>
              {formatTime(timeLeft)}
            </div>
            
            {/* Progress Ring */}
            <div className="relative w-32 h-32 mx-auto">
              <Progress 
                value={getProgress()} 
                className="w-full h-2" 
              />
            </div>
          </div>

          {/* Motivational Message */}
          <div className="space-y-2">
            <p className="text-lg text-muted-foreground italic">
              {getRandomMessage()}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              size="lg"
              onClick={resetTimer}
              className="w-12 h-12 rounded-full p-0"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
            
            <Button
              onClick={toggleTimer}
              size="lg"
              className={cn(
                "w-16 h-16 rounded-full p-0 text-lg font-semibold transition-all duration-300",
                isActive && "animate-pulse shadow-lg"
              )}
            >
              {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={requestNotificationPermission}
              className="w-12 h-12 rounded-full p-0"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Session Type Quick Switch */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(sessionDurations) as Array<keyof typeof sessionDurations>).map((type) => (
          <Button
            key={type}
            variant={sessionType === type ? "default" : "outline"}
            onClick={() => changeSessionType(type)}
            className="capitalize text-sm"
            disabled={isActive}
          >
            {type === 'short-break' ? 'Short Break' : 
             type === 'long-break' ? 'Long Break' : type}
          </Button>
        ))}
      </div>

      {/* Tips */}
      <Card className="p-4 bg-accent/20">
        <h3 className="font-medium mb-2 flex items-center">
          <Brain className="w-4 h-4 mr-2" />
          Focus Tips
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Remove distractions and close unnecessary tabs</li>
          <li>• Take deep breaths during breaks</li>
          <li>• Stay hydrated and maintain good posture</li>
          <li>• Use breaks to move your body and rest your eyes</li>
        </ul>
      </Card>
    </div>
  );
};