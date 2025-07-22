import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lightbulb, Clock, Flag, CheckCircle, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAI, TaskSuggestion, UserContext } from '@/hooks/useAI';
import { toast } from 'sonner';

interface AITaskSuggestionsProps {
  taskTitle: string;
  taskDescription?: string;
  userGoals?: string[];
  userContext?: UserContext;
  onApplySuggestion: (suggestion: TaskSuggestion) => void;
  className?: string;
}

export const AITaskSuggestions = ({
  taskTitle,
  taskDescription,
  userGoals,
  userContext,
  onApplySuggestion,
  className
}: AITaskSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<TaskSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { getTaskSuggestions, loading } = useAI();

  const handleGetSuggestions = async () => {
    if (!taskTitle.trim()) {
      toast.error('Please enter a task title first');
      return;
    }

    const result = await getTaskSuggestions(taskTitle, taskDescription, userGoals, userContext);
    if (result) {
      setSuggestions(result);
      setShowSuggestions(true);
      toast.success('AI suggestions generated!');
    }
  };

  const handleApplySuggestion = () => {
    if (suggestions) {
      onApplySuggestion(suggestions);
      setShowSuggestions(false);
      toast.success('Suggestions applied to your task!');
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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Trigger Button */}
      <Button
        onClick={handleGetSuggestions}
        disabled={loading || !taskTitle.trim()}
        variant="outline"
        className="w-full"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {loading ? 'Getting AI Suggestions...' : 'Get AI Suggestions'}
      </Button>

      {/* Suggestions Display */}
      {showSuggestions && suggestions && (
        <Card className="p-6 space-y-4 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">AI Suggestions</h3>
            </div>
            <Button onClick={handleApplySuggestion} size="sm">
              <CheckCircle className="w-4 h-4 mr-1" />
              Apply All
            </Button>
          </div>

          {/* Improved Title */}
          {suggestions.improvedTitle && suggestions.improvedTitle !== taskTitle && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Improved Title:</h4>
              <p className="text-sm bg-background/50 p-3 rounded-lg border">
                {suggestions.improvedTitle}
              </p>
            </div>
          )}

          {/* Improved Description */}
          {suggestions.improvedDescription && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Enhanced Description:</h4>
              <p className="text-sm bg-background/50 p-3 rounded-lg border">
                {suggestions.improvedDescription}
              </p>
            </div>
          )}

          {/* Task Metadata */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {formatDuration(suggestions.estimatedDuration)}
              </span>
            </div>
            <Badge className={getPriorityColor(suggestions.priority)}>
              <Flag className="w-3 h-3 mr-1" />
              {suggestions.priority} priority
            </Badge>
          </div>

          <Separator />

          {/* Subtasks */}
          {suggestions.subtasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                Suggested Subtasks ({suggestions.subtasks.length}):
              </h4>
              <ul className="space-y-2">
                {suggestions.subtasks.map((subtask, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{subtask}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          {suggestions.tips.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                Productivity Tips:
              </h4>
              <ul className="space-y-2">
                {suggestions.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm">
                    <Lightbulb className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button onClick={handleApplySuggestion} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-1" />
              Apply Suggestions
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGetSuggestions}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};