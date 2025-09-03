import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface FocusTimerProps {
  onTimerComplete?: () => void;
}

export default function FocusTimer({ onTimerComplete }: FocusTimerProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [initialTime] = useState(25 * 60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            onTimerComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onTimerComplete]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(initialTime);
  };

  return (
    <Card className="p-6 text-center">
      <h3 className="text-lg font-semibold mb-4">Focus Timer</h3>
      <div className="text-4xl font-mono mb-6 text-primary">
        {formatTime(timeLeft)}
      </div>
      <div className="flex gap-3 justify-center">
        <Button
          onClick={toggleTimer}
          variant={isRunning ? "secondary" : "default"}
          size="sm"
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button onClick={resetTimer} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}