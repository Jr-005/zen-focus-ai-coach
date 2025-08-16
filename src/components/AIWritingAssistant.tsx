import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, RefreshCw, Copy, Download, Eye, Edit3, 
  TrendingUp, Minimize, Maximize, FileText, Lightbulb 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreativeMode, AIWritingOptions } from '@/hooks/useCreativeMode';
import { toast } from 'sonner';

interface AIWritingAssistantProps {
  initialText?: string;
  documentType?: string;
  onTextUpdate: (text: string) => void;
  className?: string;
}

export const AIWritingAssistant = ({ 
  initialText = '', 
  documentType = 'article',
  onTextUpdate,
  className 
}: AIWritingAssistantProps) => {
  const [inputText, setInputText] = useState(initialText);
  const [processedText, setProcessedText] = useState('');
  const [selectedTone, setSelectedTone] = useState<AIWritingOptions['tone']>('professional');
  const [selectedStyle, setSelectedStyle] = useState<AIWritingOptions['style']>('detailed');
  const [selectedAction, setSelectedAction] = useState<AIWritingOptions['action']>('improve');
  const [showComparison, setShowComparison] = useState(false);
  
  const { processTextWithAI, loading } = useCreativeMode();

  const handleProcessText = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to process');
      return;
    }

    const options: AIWritingOptions = {
      tone: selectedTone,
      style: selectedStyle,
      action: selectedAction
    };

    const result = await processTextWithAI(inputText, documentType, options);
    if (result) {
      setProcessedText(result);
      setShowComparison(true);
      toast.success('Text processed successfully');
    }
  };

  const handleUseProcessedText = () => {
    onTextUpdate(processedText);
    toast.success('Processed text applied');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Text copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getReadingTime = (text: string) => {
    const words = getWordCount(text);
    return Math.ceil(words / 200); // Average reading speed
  };

  const getImprovementMetrics = () => {
    if (!inputText || !processedText) return null;

    const originalWords = getWordCount(inputText);
    const processedWords = getWordCount(processedText);
    const changePercent = ((processedWords - originalWords) / originalWords * 100).toFixed(1);

    return {
      originalWords,
      processedWords,
      changePercent: parseFloat(changePercent),
      readingTime: getReadingTime(processedText)
    };
  };

  const metrics = getImprovementMetrics();

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Writing Assistant
        </CardTitle>
        <CardDescription>
          Enhance your writing with AI-powered editing and restructuring
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* AI Processing Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Tone</label>
            <Select value={selectedTone} onValueChange={(value: any) => setSelectedTone(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Style</label>
            <Select value={selectedStyle} onValueChange={(value: any) => setSelectedStyle(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="narrative">Narrative</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Action</label>
            <Select value={selectedAction} onValueChange={(value: any) => setSelectedAction(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="improve">Improve</SelectItem>
                <SelectItem value="restructure">Restructure</SelectItem>
                <SelectItem value="summarize">Summarize</SelectItem>
                <SelectItem value="expand">Expand</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Text Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Input Text</label>
            <Badge variant="outline" className="text-xs">
              {getWordCount(inputText)} words
            </Badge>
          </div>
          <Textarea
            placeholder="Paste or type your text here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[200px] resize-none"
          />
        </div>

        {/* Process Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleProcessText}
            disabled={loading || !inputText.trim()}
            className="px-8"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Processing...' : 'Process with AI'}
          </Button>
        </div>

        {/* Results */}
        {processedText && (
          <div className="space-y-4">
            {/* Metrics */}
            {metrics && (
              <Card className="p-4 bg-primary/5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">{metrics.originalWords}</div>
                    <div className="text-xs text-muted-foreground">Original Words</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-success">{metrics.processedWords}</div>
                    <div className="text-xs text-muted-foreground">Processed Words</div>
                  </div>
                  <div>
                    <div className={cn(
                      "text-lg font-bold",
                      metrics.changePercent > 0 ? "text-success" : 
                      metrics.changePercent < 0 ? "text-warning" : "text-muted-foreground"
                    )}>
                      {metrics.changePercent > 0 ? '+' : ''}{metrics.changePercent}%
                    </div>
                    <div className="text-xs text-muted-foreground">Change</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-focus">{metrics.readingTime}m</div>
                    <div className="text-xs text-muted-foreground">Read Time</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Text Comparison */}
            <Tabs value={showComparison ? "comparison" : "result"} onValueChange={(value) => setShowComparison(value === "comparison")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="result">Processed Text</TabsTrigger>
                <TabsTrigger value="comparison">Side by Side</TabsTrigger>
              </TabsList>
              
              <TabsContent value="result" className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">AI-Processed Text</h4>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(processedText)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={handleUseProcessedText}>
                        <FileText className="w-4 h-4 mr-1" />
                        Use This
                      </Button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {processedText}
                    </div>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="comparison" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      Original
                    </h4>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {inputText}
                    </div>
                  </Card>
                  
                  <Card className="p-4 border-primary/20">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI-Enhanced
                    </h4>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {processedText}
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Lightbulb className="w-3 h-3 mr-1" />
            Suggest Ideas
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            Enhance Flow
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Add Structure
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Edit3 className="w-3 h-3 mr-1" />
            Fix Grammar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};