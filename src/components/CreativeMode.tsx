import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Mic, 
  Wand2, 
  Download, 
  Save, 
  FileText,
  BookOpen,
  StickyNote,
  Mail,
  Newspaper,
  Hash,
  Volume2,
  VolumeX,
  Loader2
} from 'lucide-react';
import { VoiceInput } from './VoiceInput';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useAI } from '@/hooks/useAI';

interface CreativeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export const CreativeMode = () => {
  const { user } = useAuth();
  const { textToSpeech } = useAI();
  
  const [currentDocument, setCurrentDocument] = useState<CreativeDocument | null>(null);
  const [documents, setDocuments] = useState<CreativeDocument[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [cleanedText, setCleanedText] = useState('');
  const [outputType, setOutputType] = useState<'article' | 'story' | 'note' | 'blog' | 'email' | 'summary'>('note');
  const [style, setStyle] = useState<'formal' | 'casual' | 'academic' | 'creative'>('casual');
  const [customInstructions, setCustomInstructions] = useState('');

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const handleVoiceTranscription = async (transcribedText: string) => {
    setRawText(transcribedText);
    setTitle(title || generateTitleFromText(transcribedText));
    toast.success('Voice transcription complete!');
  };

  const generateTitleFromText = (text: string) => {
    const words = text.split(' ').slice(0, 5);
    return words.join(' ') + (text.split(' ').length > 5 ? '...' : '');
  };

  const handleAICleanup = async () => {
    if (!rawText.trim()) {
      toast.error('Please add some text to clean up');
      return;
    }

    setIsCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-text-cleanup', {
        body: {
          text: rawText,
          outputType,
          style,
          instructions: customInstructions
        }
      });

      if (error) throw error;

      if (data.success) {
        setCleanedText(data.cleanedText);
        toast.success('Text cleaned and structured!');
      } else {
        throw new Error(data.error || 'Text cleanup failed');
      }
    } catch (error) {
      console.error('AI cleanup error:', error);
      toast.error('Failed to clean up text');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!title.trim() || (!rawText.trim() && !cleanedText.trim())) {
      toast.error('Please add a title and some content');
      return;
    }

    try {
      const documentData = {
        title: title.trim(),
        content: cleanedText || rawText,
        category: outputType,
        user_id: user?.id
      };

      let result;
      if (currentDocument?.id) {
        // Update existing document
        result = await supabase
          .from('notes')
          .update(documentData)
          .eq('id', currentDocument.id)
          .select()
          .single();
      } else {
        // Create new document
        result = await supabase
          .from('notes')
          .insert([documentData])
          .select()
          .single();
      }

      if (result.error) throw result.error;

      toast.success(currentDocument?.id ? 'Document updated!' : 'Document saved!');
      await loadDocuments();
      
      // Clear form
      setTitle('');
      setRawText('');
      setCleanedText('');
      setCurrentDocument(null);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save document');
    }
  };

  const handleReadAloud = async () => {
    const textToRead = cleanedText || rawText;
    if (!textToRead.trim()) {
      toast.error('No text to read');
      return;
    }

    if (isPlaying && currentAudio) {
      // Stop current audio
      currentAudio.pause();
      setIsPlaying(false);
      setCurrentAudio(null);
      return;
    }

    try {
      setIsPlaying(true);
      const audioData = await textToSpeech(textToRead);
      
      if (audioData) {
        const audio = new Audio(`data:audio/mpeg;base64,${audioData}`);
        setCurrentAudio(audio);
        
        audio.onended = () => {
          setIsPlaying(false);
          setCurrentAudio(null);
        };
        
        audio.onerror = () => {
          setIsPlaying(false);
          setCurrentAudio(null);
          toast.error('Failed to play audio');
        };
        
        await audio.play();
      } else {
        setIsPlaying(false);
        toast.error('Failed to generate audio');
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsPlaying(false);
      toast.error('Failed to generate speech');
    }
  };

  const handleExport = (format: 'txt' | 'md' | 'html') => {
    const content = cleanedText || rawText;
    if (!content.trim()) {
      toast.error('No content to export');
      return;
    }

    let formattedContent = content;
    let mimeType = 'text/plain';
    let fileExtension = 'txt';

    switch (format) {
      case 'md':
        formattedContent = `# ${title}\n\n${content}`;
        mimeType = 'text/markdown';
        fileExtension = 'md';
        break;
      case 'html':
        formattedContent = `<!DOCTYPE html><html><head><title>${title}</title></head><body><h1>${title}</h1><div>${content.replace(/\n/g, '<br>')}</div></body></html>`;
        mimeType = 'text/html';
        fileExtension = 'html';
        break;
    }

    const blob = new Blob([formattedContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'document'}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const getOutputTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <Newspaper className="h-4 w-4" />;
      case 'story': return <BookOpen className="h-4 w-4" />;
      case 'note': return <StickyNote className="h-4 w-4" />;
      case 'blog': return <Hash className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="card-base">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Creative Mode - Voice Dictation & AI Writing
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input & Processing */}
        <div className="space-y-6">
          {/* Voice Input */}
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Voice Dictation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VoiceInput 
                onTranscription={handleVoiceTranscription}
                placeholder="Click to start voice dictation"
              />
            </CardContent>
          </Card>

          {/* Manual Text Input */}
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-base">Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Document title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              
              <Textarea
                placeholder="Type or paste your raw text here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={6}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Output Type</label>
                  <Select value={outputType} onValueChange={(value) => setOutputType(value as typeof outputType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="blog">Blog Post</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="summary">Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Writing Style</label>
                  <Select value={style} onValueChange={(value) => setStyle(value as typeof style)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Textarea
                placeholder="Additional instructions for AI (optional)..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={2}
              />

              <Button 
                onClick={handleAICleanup}
                disabled={!rawText.trim() || isCleaning}
                className="w-full"
              >
                {isCleaning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Clean & Structure with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Output & Actions */}
        <div className="space-y-6">
          {/* Cleaned Output */}
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getOutputTypeIcon(outputType)}
                  Cleaned Content
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {cleanedText ? cleanedText.split(' ').length : 0} words
                  </Badge>
                  <Badge variant="outline">
                    {outputType}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={cleanedText}
                onChange={(e) => setCleanedText(e.target.value)}
                placeholder="AI-cleaned content will appear here..."
                rows={10}
                className="text-sm"
              />

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveDocument} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save Document
                </Button>
                
                <Button 
                  onClick={handleReadAloud} 
                  variant="outline" 
                  size="sm"
                  disabled={!cleanedText && !rawText}
                >
                  {isPlaying ? (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Read Aloud
                    </>
                  )}
                </Button>

                <div className="flex gap-1">
                  <Button 
                    onClick={() => handleExport('txt')} 
                    variant="outline" 
                    size="sm"
                    disabled={!cleanedText && !rawText}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    TXT
                  </Button>
                  <Button 
                    onClick={() => handleExport('md')} 
                    variant="outline" 
                    size="sm"
                    disabled={!cleanedText && !rawText}
                  >
                    MD
                  </Button>
                  <Button 
                    onClick={() => handleExport('html')} 
                    variant="outline" 
                    size="sm"
                    disabled={!cleanedText && !rawText}
                  >
                    HTML
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-base">Recent Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No documents yet</p>
                ) : (
                  documents.slice(0, 5).map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setCurrentDocument(doc);
                        setTitle(doc.title || 'Untitled');
                        setRawText(doc.content);
                        setCleanedText('');
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {getOutputTypeIcon(doc.category || 'note')}
                        <div>
                          <p className="text-sm font-medium">{doc.title || 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.content.split(' ').length} words • {new Date(doc.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {doc.category || 'note'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};