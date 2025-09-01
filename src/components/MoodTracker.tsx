import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Heart, Smile, Frown, Meh, Sun, Cloud, CloudRain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MoodEntry {
  mood: number;
  energy: number;
  timestamp: Date;
  emoji: string;
}

export const MoodTracker = () => {
  const { user } = useAuth();
  const [currentMood, setCurrentMood] = useState<MoodEntry | null>(null);
  const [energy, setEnergy] = useState([70]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLatestMood();
    }
  }, [user]);

  const fetchLatestMood = async () => {
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setCurrentMood({
          mood: data.mood,
          energy: data.energy_level,
          timestamp: new Date(data.created_at),
          emoji: moods[data.mood - 1]?.emoji || '😐',
        });
        setEnergy([data.energy_level]);
      } else {
        // No mood entries found - this is fine for new users
        setCurrentMood(null);
      }
    } catch (error) {
      console.error('Error fetching mood:', error);
    }
  };

  const moods = [
    { id: 1, label: 'Stressed', emoji: '😰', color: 'text-destructive' },
    { id: 2, label: 'Low', emoji: '😔', color: 'text-muted-foreground' },
    { id: 3, label: 'Okay', emoji: '😐', color: 'text-warning' },
    { id: 4, label: 'Good', emoji: '🙂', color: 'text-focus' },
    { id: 5, label: 'Great', emoji: '😊', color: 'text-primary' },
    { id: 6, label: 'Amazing', emoji: '🚀', color: 'text-success' },
  ];

  const updateMood = async (mood: typeof moods[0]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('mood_entries')
        .insert({
          user_id: user.id,
          mood: mood.id,
          energy_level: energy[0],
        });

      if (error) throw error;
      
      const moodEntry: MoodEntry = {
        mood: mood.id,
        energy: energy[0],
        timestamp: new Date(),
        emoji: mood.emoji,
      };
      
      setCurrentMood(moodEntry);
      setIsOpen(false);
      toast.success('Mood logged successfully');
    } catch (error) {
      console.error('Error saving mood:', error);
      toast.error('Failed to log mood');
    }
  };

  const getMoodIcon = () => {
    if (!currentMood) return <Heart className="w-4 h-4" />;
    return <span className="text-sm">{currentMood.emoji}</span>;
  };

  const getEnergyIcon = (energyLevel: number) => {
    if (energyLevel >= 80) return <Sun className="w-3 h-3 text-yellow-500" />;
    if (energyLevel >= 60) return <Cloud className="w-3 h-3 text-blue-400" />;
    if (energyLevel >= 40) return <CloudRain className="w-3 h-3 text-gray-500" />;
    return <Zap className="w-3 h-3 text-red-500" />;
  };

  const getEnergyColor = (energyLevel: number) => {
    if (energyLevel >= 80) return 'bg-success';
    if (energyLevel >= 60) return 'bg-primary';
    if (energyLevel >= 40) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="space-x-1 lg:space-x-2 shadow-sm hover:shadow-md transition-all duration-300">
          {getMoodIcon()}
          <span className="text-xs lg:text-sm hidden sm:inline">
            {currentMood ? 'Mood' : 'Check In'}
          </span>
          {currentMood && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs px-1 lg:px-2", getEnergyColor(currentMood.energy))}
            >
              {currentMood.energy}%
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-72 lg:w-80 p-4 lg:p-5 shadow-xl border-border/50 bg-card/95 backdrop-blur-sm" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-3 text-sm lg:text-base">How are you feeling?</h3>
            <div className="grid grid-cols-3 gap-2 lg:gap-3">
              {moods.map((mood) => (
                <Button
                  key={mood.id}
                  variant="outline"
                  onClick={() => updateMood(mood)}
                  className={cn(
                    "flex flex-col items-center space-y-1 h-auto p-2 lg:p-3 transition-all duration-300",
                    "hover:scale-105 hover:shadow-md border-border/50"
                  )}
                >
                  <span className="text-lg lg:text-xl">{mood.emoji}</span>
                  <span className="text-xs lg:text-sm">{mood.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm lg:text-base font-medium">Energy Level</label>
              <div className="flex items-center space-x-1">
                {getEnergyIcon(energy[0])}
                <span className="text-sm lg:text-base font-medium">{energy[0]}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Slider
                value={energy}
                onValueChange={setEnergy}
                max={100}
                min={0}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs lg:text-sm text-muted-foreground">
                <span>Drained</span>
                <span>Energized</span>
              </div>
            </div>
          </div>

          {currentMood && (
            <Card className="p-3 lg:p-4 bg-accent/20 border-accent/30">
              <div className="text-sm">
                <p className="font-medium mb-2 text-sm lg:text-base">Last Check-in</p>
                <div className="flex items-center justify-between">
                  <span>{currentMood.emoji} {moods.find(m => m.id === currentMood.mood)?.label}</span>
                  <span className="text-muted-foreground text-xs lg:text-sm">
                    {currentMood.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  {getEnergyIcon(currentMood.energy)}
                  <span className="text-xs lg:text-sm">Energy: {currentMood.energy}%</span>
                </div>
              </div>
            </Card>
          )}

          <div className="text-xs lg:text-sm text-muted-foreground">
            💡 Regular mood check-ins help your AI coach provide better personalized advice
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};