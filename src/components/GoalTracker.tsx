import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Target, Calendar, TrendingUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'personal' | 'career' | 'health' | 'learning' | 'financial';
  targetDate: string;
  progress: number;
  milestones: string[];
  createdAt: Date;
}

export const GoalTracker = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'personal' as const,
    targetDate: '',
    milestones: [''],
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchGoals();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedGoals = data.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        category: goal.category as Goal['category'],
        targetDate: goal.target_date,
        progress: goal.progress,
        milestones: Array.isArray(goal.milestones) ? goal.milestones.map(m => String(m)) : [],
        createdAt: new Date(goal.created_at),
      }));
      
      setGoals(formattedGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('goals_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${user?.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newGoal = {
              id: payload.new.id,
              title: payload.new.title,
              description: payload.new.description,
              category: payload.new.category as Goal['category'],
              targetDate: payload.new.target_date,
              progress: payload.new.progress,
              milestones: payload.new.milestones || [],
              createdAt: new Date(payload.new.created_at),
            };
            setGoals(prev => [newGoal, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setGoals(prev => prev.map(goal => 
              goal.id === payload.new.id 
                ? { ...goal, progress: payload.new.progress }
                : goal
            ));
          } else if (payload.eventType === 'DELETE') {
            setGoals(prev => prev.filter(goal => goal.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const addGoal = async () => {
    if (!newGoal.title.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: newGoal.title,
          description: newGoal.description,
          category: newGoal.category,
          target_date: newGoal.targetDate || null,
          milestones: newGoal.milestones.filter(m => m.trim()),
        });

      if (error) throw error;
      
      setNewGoal({
        title: '',
        description: '',
        category: 'personal',
        targetDate: '',
        milestones: [''],
      });
      setShowAddForm(false);
      toast.success('Goal created successfully');
    } catch (error) {
      console.error('Error adding goal:', error);
      toast.error('Failed to create goal');
    }
  };

  const generateAISuggestions = () => {
    // Simulate AI-generated goal suggestions
    const suggestions = [
      'Break down your goal into 3-4 smaller milestones',
      'Set a specific daily habit to support this goal',
      'Consider what obstacles might prevent success and plan for them',
      'Define how you\'ll measure progress each week',
      'Identify someone who can help you stay accountable',
    ];
    setAiSuggestions(suggestions.slice(0, 3));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal': return 'bg-primary text-primary-foreground';
      case 'career': return 'bg-focus text-focus-foreground';
      case 'health': return 'bg-success text-success-foreground';
      case 'learning': return 'bg-warning text-warning-foreground';
      case 'financial': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personal': return '🌱';
      case 'career': return '🚀';
      case 'health': return '💪';
      case 'learning': return '📚';
      case 'financial': return '💰';
      default: return '🎯';
    }
  };

  const updateMilestone = (index: number, value: string) => {
    const updated = [...newGoal.milestones];
    updated[index] = value;
    setNewGoal({ ...newGoal, milestones: updated });
  };

  const addMilestone = () => {
    setNewGoal({ ...newGoal, milestones: [...newGoal.milestones, ''] });
  };

  const removeMilestone = (index: number) => {
    if (newGoal.milestones.length > 1) {
      const updated = newGoal.milestones.filter((_, i) => i !== index);
      setNewGoal({ ...newGoal, milestones: updated });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Your Goals</h2>
          <p className="text-muted-foreground">
            Track your journey towards what matters most
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="animate-float">
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <Card className="p-6 border-2 border-primary/20 animate-slide-in-up">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Goal</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={generateAISuggestions}
                className="text-xs"
              >
                <Lightbulb className="w-3 h-3 mr-1" />
                AI Tips
              </Button>
            </div>

            {aiSuggestions.length > 0 && (
              <Card className="p-4 bg-accent/20 border-accent">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  AI Suggestions for Success
                </h4>
                <ul className="text-sm space-y-1">
                  {aiSuggestions.map((suggestion, index) => (
                    <li key={index} className="text-muted-foreground">• {suggestion}</li>
                  ))}
                </ul>
              </Card>
            )}

            <Input
              placeholder="What's your goal?"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              className="text-lg"
            />
            
            <Textarea
              placeholder="Describe your goal in detail..."
              value={newGoal.description}
              onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
              className="min-h-[100px]"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={newGoal.category} onValueChange={(value: any) => setNewGoal({ ...newGoal, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">🌱 Personal</SelectItem>
                  <SelectItem value="career">🚀 Career</SelectItem>
                  <SelectItem value="health">💪 Health</SelectItem>
                  <SelectItem value="learning">📚 Learning</SelectItem>
                  <SelectItem value="financial">💰 Financial</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Milestones</label>
              {newGoal.milestones.map((milestone, index) => (
                <div key={index} className="flex space-x-2">
                  <Input
                    placeholder={`Milestone ${index + 1}`}
                    value={milestone}
                    onChange={(e) => updateMilestone(index, e.target.value)}
                  />
                  {newGoal.milestones.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMilestone(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addMilestone}>
                Add Milestone
              </Button>
            </div>

            <div className="flex space-x-2">
              <Button onClick={addGoal} className="flex-1">
                Create Goal
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => (
          <Card key={goal.id} className="p-6 hover:shadow-lg transition-all duration-300 animate-fade-in">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                  <Badge className={getCategoryColor(goal.category)}>
                    {goal.category}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{goal.progress}%</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
              </div>

              {/* Goal Title & Description */}
              <div>
                <h3 className="text-lg font-semibold mb-2">{goal.title}</h3>
                <p className="text-sm text-muted-foreground">{goal.description}</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={goal.progress} className="h-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Due: {new Date(goal.targetDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Milestones */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  Milestones
                </h4>
                <div className="space-y-1">
                  {goal.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mr-2" />
                      <span className="text-muted-foreground">{milestone}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Update Progress
                </Button>
                <Button variant="outline" size="sm">
                  <Lightbulb className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {goals.length === 0 && (
        <Card className="p-8 text-center">
          <div className="space-y-2">
            <Target className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground">No goals yet</h3>
            <p className="text-sm text-muted-foreground">
              Set your first goal and start your journey to success
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};