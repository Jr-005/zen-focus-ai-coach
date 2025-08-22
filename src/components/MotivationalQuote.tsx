import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Lightbulb, Heart, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Quote {
  text: string;
  author: string;
  category: 'focus' | 'motivation' | 'growth' | 'mindfulness';
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
}

export const MotivationalQuote = () => {
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const quotes: Quote[] = [
    {
      text: "The secret of getting ahead is getting started.",
      author: "Mark Twain",
      category: 'motivation',
      timeOfDay: 'morning'
    },
    {
      text: "Focus is a matter of deciding what things you're not going to do.",
      author: "John Carmack",
      category: 'focus',
    },
    {
      text: "Progress, not perfection, is the goal.",
      author: "Anonymous",
      category: 'growth',
    },
    {
      text: "The present moment is the only moment available to us.",
      author: "Thich Nhat Hanh",
      category: 'mindfulness',
    },
    {
      text: "Your limitation—it's only your imagination.",
      author: "Anonymous",
      category: 'motivation',
    },
    {
      text: "Deep work is like a superpower in our increasingly competitive economy.",
      author: "Cal Newport",
      category: 'focus',
    },
    {
      text: "The way to get started is to quit talking and begin doing.",
      author: "Walt Disney",
      category: 'motivation',
      timeOfDay: 'morning'
    },
    {
      text: "Success is the sum of small efforts repeated day-in and day-out.",
      author: "Robert Collier",
      category: 'growth',
    },
    {
      text: "Wherever you are, be there totally.",
      author: "Eckhart Tolle",
      category: 'mindfulness',
    },
    {
      text: "The afternoon knows what the morning never suspected.",
      author: "Robert Frost",
      category: 'growth',
      timeOfDay: 'afternoon'
    },
    {
      text: "Reflect upon your present blessings, of which every man has many.",
      author: "Charles Dickens",
      category: 'mindfulness',
      timeOfDay: 'evening'
    },
  ];

  const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const generateContextualQuote = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const timeOfDay = getTimeOfDay();
      
      // Filter quotes by time of day if available, otherwise use any quote
      let filteredQuotes = quotes.filter(q => q.timeOfDay === timeOfDay);
      if (filteredQuotes.length === 0) {
        filteredQuotes = quotes;
      }
      
      // Add some randomness to avoid always getting the same quote
      const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
      setCurrentQuote(randomQuote);
      setIsGenerating(false);
    }, 1000); // Simulate AI generation time
  };

  useEffect(() => {
    // Generate initial quote on component mount
    generateContextualQuote();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'focus': return <Lightbulb className="w-4 h-4 text-focus" />;
      case 'motivation': return <Star className="w-4 h-4 text-primary" />;
      case 'growth': return <RefreshCw className="w-4 h-4 text-success" />;
      case 'mindfulness': return <Heart className="w-4 h-4 text-warning" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'focus': return 'from-focus/20 to-focus/5';
      case 'motivation': return 'from-primary/20 to-primary/5';
      case 'growth': return 'from-success/20 to-success/5';
      case 'mindfulness': return 'from-warning/20 to-warning/5';
      default: return 'from-muted/20 to-muted/5';
    }
  };

  const getGreeting = () => {
    const timeOfDay = getTimeOfDay();
    const hour = new Date().getHours();
    
    if (timeOfDay === 'morning') {
      return hour < 10 ? "Good morning! ☀️" : "Let's make today productive! 🚀";
    } else if (timeOfDay === 'afternoon') {
      return "Keep the momentum going! ⚡";
    } else {
      return "Time to reflect and recharge 🌙";
    }
  };

  if (!currentQuote) {
    return (
      <Card className="p-6 text-center animate-pulse">
        <div className="h-8 bg-muted rounded mb-4" />
        <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
      </Card>
    );
  }

  return (
    <Card className="card-glass relative overflow-hidden animate-fade-in shadow-xl">
      <CardContent className={cn(
        "p-6 lg:p-8 relative bg-gradient-to-br",
        getCategoryColor(currentQuote.category)
      )}>
        {/* Background decoration */}
        <div className="absolute top-4 right-4 w-16 h-16 lg:w-20 lg:h-20 opacity-10 animate-float">
          {getCategoryIcon(currentQuote.category)}
        </div>
        
        <div className="relative space-y-4 lg:space-y-6">
          {/* Greeting */}
          <div className="flex items-center gap-2 text-sm lg:text-base text-muted-foreground font-medium">
            <Sparkles className="w-4 h-4" />
            {getGreeting()}
          </div>

          {/* Quote */}
          <div className="space-y-4">
            <blockquote className="text-lg lg:text-xl xl:text-2xl font-semibold text-foreground leading-relaxed">
              "{currentQuote.text}"
            </blockquote>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <cite className="text-base lg:text-lg text-muted-foreground not-italic font-medium">
                — {currentQuote.author}
              </cite>
              
              <div className="flex items-center gap-2">
                {getCategoryIcon(currentQuote.category)}
                <Badge variant="secondary" className="badge-enhanced capitalize">
                  {currentQuote.category}
                </Badge>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateContextualQuote}
              disabled={isGenerating}
              className="button-enhanced hover:bg-background/50"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
              {isGenerating ? "Generating..." : "New Quote"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};