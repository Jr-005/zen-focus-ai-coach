import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Calendar, Flag, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAI, type ParsedTask } from '@/hooks/useAI';
import { toast } from 'sonner';

interface NaturalLanguageTaskInputProps {
  onTaskParsed: (task: ParsedTask) => void;
  userGoals?: Array<{ id: string; title: string }>;
  placeholder?: string;
  className?: string;
}

const NaturalLanguageTaskInput: React.FC<NaturalLanguageTaskInputProps> = ({
  onTaskParsed,
  userGoals = [],
  placeholder = "e.g., 'Create a task to finish the report by Friday'",
  className = ""
}) => {
  const [input, setInput] = useState('');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const { parseTaskFromNaturalLanguage, loading } = useAI();

  const handleParseTask = async () => {
    if (!input.trim()) {
      toast.error('Please enter a task description');
      return;
    }

    const result = await parseTaskFromNaturalLanguage(input, userGoals);
    if (result) {
      setParsedTask(result);
    }
  };

  const handleUseTask = () => {
    if (parsedTask) {
      onTaskParsed(parsedTask);
      setInput('');
      setParsedTask(null);
      toast.success('Task created successfully!');
    }
  };

  const handleClear = () => {
    setInput('');
    setParsedTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-primary text-primary-foreground';
      case 'low': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={className}>
      <Card className="card-base border-dashed border-2 border-primary/20 hover:border-primary/30 transition-colors">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Sparkles size={18} />
              <span className="font-medium text-sm">Natural Language Task Creation</span>
            </div>
            
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                onKeyPress={(e) => e.key === 'Enter' && !loading && handleParseTask()}
                className="flex-1"
              />
              <Button 
                onClick={handleParseTask}
                disabled={loading || !input.trim()}
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>

            {parsedTask && (
              <Card className="bg-muted/30 border-border/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">Parsed Task</h4>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleUseTask}
                          size="sm"
                        >
                          Use Task
                        </Button>
                        <Button 
                          onClick={handleClear}
                          variant="outline"
                          size="sm"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Title:</span>
                        <p className="text-foreground">{parsedTask.title}</p>
                      </div>

                      {parsedTask.description && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Description:</span>
                          <p className="text-foreground text-sm">{parsedTask.description}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Badge 
                          variant="secondary" 
                          className={`${getPriorityColor(parsedTask.priority)} flex items-center gap-1`}
                        >
                          <Flag size={12} />
                          {parsedTask.priority} priority
                        </Badge>

                        {parsedTask.dueDate && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar size={12} />
                            Due {formatDate(parsedTask.dueDate)}
                          </Badge>
                        )}

                        {parsedTask.goalId && userGoals.find(g => g.id === parsedTask.goalId) && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Target size={12} />
                            {userGoals.find(g => g.id === parsedTask.goalId)?.title}
                          </Badge>
                        )}
                      </div>

                      {parsedTask.subtasks && parsedTask.subtasks.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Subtasks:</span>
                          <ul className="list-disc list-inside text-sm text-foreground ml-2">
                            {parsedTask.subtasks.map((subtask, index) => (
                              <li key={index}>{subtask}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NaturalLanguageTaskInput;