import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit3, Trash2, Flag, Calendar, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { VoiceInput } from '@/components/VoiceInput';
import { AITaskSuggestions } from '@/components/AITaskSuggestions';
import { TaskSuggestion, UserContext } from '@/hooks/useAI';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  goalId?: string;
  createdAt: Date;
}

interface Goal {
  id: string;
  title: string;
  color: string;
}

export const TodoManager = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDate: '',
    goalId: '',
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchGoals();
      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedTasks = data.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        completed: task.completed,
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.due_date,
        goalId: task.goal_id,
        createdAt: new Date(task.created_at),
      }));
      
      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('id, title, category')
        .eq('user_id', user?.id);

      if (error) throw error;
      
      const formattedGoals = data.map(goal => ({
        id: goal.id,
        title: goal.title,
        color: getCategoryColor(goal.category),
      }));
      
      setGoals(formattedGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user?.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = {
              id: payload.new.id,
              title: payload.new.title,
              description: payload.new.description,
              completed: payload.new.completed,
              priority: payload.new.priority as 'low' | 'medium' | 'high',
              dueDate: payload.new.due_date,
              goalId: payload.new.goal_id,
              createdAt: new Date(payload.new.created_at),
            };
            setTasks(prev => [newTask, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(task => 
              task.id === payload.new.id 
                ? { ...task, completed: payload.new.completed }
                : task
            ));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'health': return 'hsl(var(--success))';
      case 'career': return 'hsl(var(--primary))';
      case 'learning': return 'hsl(var(--focus))';
      case 'personal': return 'hsl(var(--warning))';
      case 'financial': return 'hsl(var(--accent))';
      default: return 'hsl(var(--muted))';
    }
  };

  const addTask = async () => {
    if (!newTask.title.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: newTask.title,
          description: newTask.description || null,
          priority: newTask.priority,
          due_date: newTask.dueDate || null,
          goal_id: newTask.goalId || null,
        });

      if (error) throw error;
      
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', goalId: '' });
      setShowAddForm(false);
      toast.success('Task added successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', id);

      if (error) throw error;
      
      // Optimistic update
      setTasks(tasks.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
      ));
      
      toast.success(task.completed ? 'Task marked as incomplete' : 'Task completed!');
    } catch (error) {
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Optimistic update
      setTasks(tasks.filter(task => task.id !== id));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setNewTask({ ...newTask, title: text });
    setShowVoiceInput(false);
    setShowAddForm(true);
  };

  const handleAISuggestions = (suggestion: TaskSuggestion) => {
    setNewTask({
      ...newTask,
      title: suggestion.improvedTitle || newTask.title,
      description: suggestion.improvedDescription || newTask.description,
      priority: suggestion.priority,
    });
    setShowAISuggestions(false);
  };

  const getUserContext = (): UserContext => {
    const completedTasks = tasks.filter(t => t.completed).length;
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    
    return {
      completedTasks,
      timeOfDay,
      productivity_level: completedTasks > 5 ? 'high' : completedTasks > 2 ? 'medium' : 'low'
    };
  };

  const getGoal = (goalId?: string) => goals.find(g => g.id === goalId);

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;

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
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Your Tasks</h2>
          <p className="text-muted-foreground">
            {completedTasks} of {totalTasks} tasks completed
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Progress</div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowVoiceInput(!showVoiceInput)}
              className="animate-float"
            >
              <Plus className="w-4 h-4 mr-2" />
              Voice
            </Button>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="animate-float">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-500"
          style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
        />
      </div>

      {/* Voice Input */}
      {showVoiceInput && (
        <VoiceInput
          onTranscription={handleVoiceTranscription}
          placeholder="Record your task description"
          className="animate-slide-in-up"
        />
      )}

      {/* Add Task Form */}
      {showAddForm && (
        <Card className="p-4 border-2 border-primary/20 animate-slide-in-up">
          <div className="space-y-4">
            <Input
              placeholder="What would you like to accomplish?"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="text-lg"
            />
            <Textarea
              placeholder="Add a description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="min-h-[80px]"
            />
            
            {/* AI Suggestions */}
            <AITaskSuggestions
              taskTitle={newTask.title}
              taskDescription={newTask.description}
              userGoals={goals.map(g => g.title)}
              userContext={getUserContext()}
              onApplySuggestion={handleAISuggestions}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
              <Select value={newTask.goalId} onValueChange={(value) => setNewTask({ ...newTask, goalId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to Goal" />
                </SelectTrigger>
                <SelectContent>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: goal.color }}
                        />
                        {goal.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button onClick={addTask} className="flex-1">
                Add Task
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const goal = getGoal(task.goalId);
          return (
            <Card
              key={task.id}
              className={cn(
                "p-4 transition-all duration-300 hover:shadow-md",
                task.completed && "opacity-60 bg-muted/30"
              )}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className={cn(
                      "font-medium",
                      task.completed && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(task.priority)}>
                        <Flag className="w-3 h-3 mr-1" />
                        {task.priority}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    {goal && (
                      <div className="flex items-center">
                        <Target className="w-3 h-3 mr-1" />
                        <span style={{ color: goal.color }}>{goal.title}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        
        {tasks.length === 0 && (
          <Card className="p-8 text-center">
            <div className="space-y-2">
              <Plus className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-muted-foreground">No tasks yet</h3>
              <p className="text-sm text-muted-foreground">
                Add your first task to start your productive journey
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};