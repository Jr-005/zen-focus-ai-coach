import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit3, Trash2, Flag, Calendar, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Complete morning meditation',
      description: 'Start the day with 10 minutes of mindfulness',
      completed: false,
      priority: 'high',
      dueDate: new Date().toISOString().split('T')[0],
      goalId: 'wellness',
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Review project proposal',
      completed: false,
      priority: 'medium',
      goalId: 'career',
      createdAt: new Date(),
    },
  ]);

  const [goals] = useState<Goal[]>([
    { id: 'wellness', title: 'Wellness & Health', color: 'hsl(var(--success))' },
    { id: 'career', title: 'Career Growth', color: 'hsl(var(--primary))' },
    { id: 'learning', title: 'Learning', color: 'hsl(var(--focus))' },
  ]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDate: '',
    goalId: '',
  });

  const [showAddForm, setShowAddForm] = useState(false);

  const addTask = () => {
    if (!newTask.title.trim()) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      completed: false,
      priority: newTask.priority,
      dueDate: newTask.dueDate || undefined,
      goalId: newTask.goalId || undefined,
      createdAt: new Date(),
    };

    setTasks([task, ...tasks]);
    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', goalId: '' });
    setShowAddForm(false);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getGoal = (goalId?: string) => goals.find(g => g.id === goalId);

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;

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
          <Button onClick={() => setShowAddForm(!showAddForm)} className="animate-float">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-500"
          style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
        />
      </div>

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