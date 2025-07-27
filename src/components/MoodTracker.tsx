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
  mood: string;
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
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      
      if (data) {
        setCurrentMood({
          mood: data.mood,
          energy: data.energy_level,
          timestamp: new Date(data.created_at),
          emoji: moods.find(m => m.id === data.mood)?.emoji || '😐',
        });
        setEnergy([data.energy_level]);
      }
    } catch (error) {
      console.error('Error fetching mood:', error);
    }
  };

  const moods = [
    { id: 'amazing', label: 'Amazing', emoji: '🚀', color: 'text-success' },
    { id: 'great', label: 'Great', emoji: '😊', color: 'text-primary' },
    { id: 'good', label: 'Good', emoji: '🙂', color: 'text-focus' },
    { id: 'okay', label: 'Okay', emoji: '😐', color: 'text-warning' },
    { id: 'low', label: 'Low', emoji: '😔', color: 'text-muted-foreground' },
    { id: 'stressed', label: 'Stressed', emoji: '😰', color: 'text-destructive' },
  ];

  const updateMood = async (mood: typeof moods[0]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('mood_entries')
        .insert({
          user_id: user.id,
          mood: mood.id as any, // Type matches the mood_type enum
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
        <Button variant="outline" size="sm" className="space-x-2">
          {getMoodIcon()}
          <span className="text-xs">
            {currentMood ? 'Mood' : 'Check In'}
          </span>
          {currentMood && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs px-1", getEnergyColor(currentMood.energy))}
            >
              {currentMood.energy}%
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">How are you feeling?</h3>
            <div className="grid grid-cols-3 gap-2">
              {moods.map((mood) => (
                <Button
                  key={mood.id}
                  variant="outline"
                  onClick={() => updateMood(mood)}
                  className={cn(
                    "flex flex-col items-center space-y-1 h-auto p-3 transition-all",
                    "hover:scale-105 hover:shadow-md"
                  )}
                >
                  <span className="text-lg">{mood.emoji}</span>
                  <span className="text-xs">{mood.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Energy Level</label>
              <div className="flex items-center space-x-1">
                {getEnergyIcon(energy[0])}
                <span className="text-sm font-medium">{energy[0]}%</span>
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Drained</span>
                <span>Energized</span>
              </div>
            </div>
          </div>

          {currentMood && (
            <Card className="p-3 bg-accent/20">
              <div className="text-sm">
                <p className="font-medium mb-1">Last Check-in</p>
                <div className="flex items-center justify-between">
                  <span>{currentMood.emoji} {moods.find(m => m.id === currentMood.mood)?.label}</span>
                  <span className="text-muted-foreground">
                    {currentMood.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  {getEnergyIcon(currentMood.energy)}
                  <span className="text-xs">Energy: {currentMood.energy}%</span>
                </div>
              </div>
            </Card>
          )}

          <div className="text-xs text-muted-foreground">
            💡 Regular mood check-ins help your AI coach provide better personalized advice
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};