import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit3, Trash2, Flag, Calendar, Target, Mic, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { VoiceInput } from '@/components/VoiceInput';
import { AITaskSuggestions } from '@/components/AITaskSuggestions';
import NaturalLanguageTaskInput from '@/components/NaturalLanguageTaskInput';
import { TaskSuggestion, UserContext, type ParsedTask } from '@/hooks/useAI';

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
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    goalId: '',
  });

  const [showAddForm, setShowAddForm] = useState(false);

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
        goalId: undefined, // goal_id field doesn't exist in tasks table
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
              goalId: undefined,
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
      case 'high': return 'text-destructive border-destructive';
      case 'medium': return 'text-warning border-warning';
      case 'low': return 'text-muted-foreground border-muted';
      default: return 'text-muted-foreground border-muted';
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setNewTask({ ...newTask, title: text });
    setShowAddForm(true);
  };

  const handleAISuggestions = (suggestion: TaskSuggestion) => {
    setNewTask({
      ...newTask,
      title: suggestion.improvedTitle || newTask.title,
      description: suggestion.improvedDescription || newTask.description,
      priority: suggestion.priority,
    });
  };

  const handleNaturalLanguageTask = async (parsedTask: ParsedTask) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: parsedTask.title,
          description: parsedTask.description || null,
          priority: parsedTask.priority,
          due_date: parsedTask.dueDate || null,
        });

      if (error) throw error;
      
      toast.success('Task created from natural language!');
    } catch (error) {
      console.error('Error adding parsed task:', error);
      toast.error('Failed to create task');
    }
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
      {/* Clean Header */}
      <Card className="card-base">
        <CardContent className="p-6">
          <div className="flex-between mb-4">
            <div>
              <h2 className="text-title mb-1">Your Tasks</h2>
              <p className="text-caption">
                {completedTasks} of {totalTasks} tasks completed
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Natural Language Task Input */}
      <NaturalLanguageTaskInput
        onTaskParsed={handleNaturalLanguageTask}
        userGoals={goals.map(g => ({ id: g.id, title: g.title }))}
      />

      {/* Add Task Form */}
      {showAddForm && (
        <Card className="card-base border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Create New Task</CardTitle>
          </CardHeader>
          <CardContent className="space-sm">
            
            <Input
              placeholder="What would you like to accomplish?"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="input-base"
            />
            <Textarea
              placeholder="Add a description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="min-h-[80px]"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            <div className="flex gap-3">
              <Button onClick={addTask} className="flex-1">
                Create Task
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((task, index) => {
          const goal = getGoal(task.goalId);
          return (
            <Card
              key={task.id}
              className={cn(
                "card-interactive",
                task.completed ? "opacity-60" : ""
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        "font-medium",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </h3>
                      <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                        {task.priority}
                      </Badge>
                      {goal && (
                        <Badge variant="outline" className="text-xs">
                          {goal.title}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.description}
                      </p>
                    )}
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTask(task.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tasks.length === 0 && !loading && (
        <Card className="card-base">
          <CardContent className="p-12 text-center">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-muted-foreground mb-4">Create your first task to get started</p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Task
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};