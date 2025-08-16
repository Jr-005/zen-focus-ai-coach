import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, MicOff, FileText, Sparkles, Download, Play, Pause, 
  Volume2, VolumeX, Save, RefreshCw, Copy, Eye, Edit3,
  BookOpen, PenTool, Newspaper, MessageSquare, FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useAI } from '@/hooks/useAI';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreativeDocument {
  id: string;
  title: string;
  content: string;
  type: 'article' | 'story' | 'note' | 'blog' | 'letter' | 'script';
  status: 'draft' | 'edited' | 'final';
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CreativeMode = () => {
  const { user } = useAuth();
  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecording();
  const { transcribeAudio, textToSpeech, loading: aiLoading } = useAI();

  // Document state
  const [documents, setDocuments] = useState<CreativeDocument[]>([]);
  const [currentDoc, setCurrentDoc] = useState<CreativeDocument | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Dictation state
  const [dictationText, setDictationText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<CreativeDocument['type']>('article');

  // Form state
  const [newDocTitle, setNewDocTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleVoiceDictation = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      clearRecording();
      setDictationText('');
      await startRecording();
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) {
      toast.error('No audio to transcribe');
      return;
    }

    setIsTranscribing(true);
    try {
      const transcription = await transcribeAudio(audioBlob);
      if (transcription) {
        setDictationText(prev => prev + (prev ? ' ' : '') + transcription);
        toast.success('Audio transcribed successfully');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAICleanup = async () => {
    if (!dictationText.trim()) {
      toast.error('No text to process');
      return;
    }

    setIsProcessingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-text-cleanup', {
        body: {
          text: dictationText,
          documentType: selectedDocType,
          instructions: getCleanupInstructions(selectedDocType)
        }
      });

      if (error || !data.success) {
        throw new Error(data?.error || 'AI processing failed');
      }

      setEditingContent(data.cleanedText);
      toast.success('Text cleaned and structured by AI');
    } catch (error) {
      console.error('AI cleanup error:', error);
      toast.error('Failed to process text with AI');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const getCleanupInstructions = (docType: string) => {
    const instructions = {
      article: 'Structure as a professional article with clear headings, proper paragraphs, and logical flow. Fix grammar and improve clarity.',
      story: 'Format as a narrative story with proper dialogue formatting, paragraph breaks, and engaging flow. Enhance descriptive language.',
      note: 'Organize as clear, concise notes with bullet points where appropriate. Fix grammar and improve readability.',
      blog: 'Structure as an engaging blog post with catchy introduction, clear sections, and conversational tone.',
      letter: 'Format as a professional letter with proper salutation, body paragraphs, and closing.',
      script: 'Format as a script with proper scene descriptions, character names, and dialogue formatting.'
    };
    return instructions[docType as keyof typeof instructions] || instructions.article;
  };

  const saveDocument = async () => {
    if (!newDocTitle.trim() || !editingContent.trim() || !user) {
      toast.error('Please provide a title and content');
      return;
    }

    try {
      const wordCount = editingContent.trim().split(/\s+/).length;
      
      const { data, error } = await supabase
        .from('creative_documents')
        .insert({
          user_id: user.id,
          title: newDocTitle,
          content: editingContent,
          document_type: selectedDocType,
          status: 'draft',
          word_count: wordCount,
        })
        .select()
        .single();

      if (error) throw error;

      const newDoc: CreativeDocument = {
        id: data.id,
        title: data.title,
        content: data.content,
        type: data.document_type as CreativeDocument['type'],
        status: data.status as CreativeDocument['status'],
        wordCount: data.word_count,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setDocuments(prev => [newDoc, ...prev]);
      setCurrentDoc(newDoc);
      setNewDocTitle('');
      setDictationText('');
      setEditingContent('');
      
      toast.success('Document saved successfully');
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    }
  };

  const handleReadBack = async () => {
    const textToRead = editingContent || dictationText;
    if (!textToRead.trim()) {
      toast.error('No text to read');
      return;
    }

    try {
      setIsPlaying(true);
      const audioData = await textToSpeech(textToRead);
      
      if (audioData) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], 
          { type: 'audio/mpeg' }
        );
        
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.onended = () => setIsPlaying(false);
          await audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error reading text:', error);
      toast.error('Failed to read text');
      setIsPlaying(false);
    }
  };

  const exportDocument = (format: 'txt' | 'md' | 'html') => {
    const content = editingContent || dictationText;
    if (!content.trim()) {
      toast.error('No content to export');
      return;
    }

    let exportContent = content;
    let mimeType = 'text/plain';
    let extension = 'txt';

    if (format === 'md') {
      exportContent = `# ${newDocTitle || 'Untitled'}\n\n${content}`;
      mimeType = 'text/markdown';
      extension = 'md';
    } else if (format === 'html') {
      exportContent = `<!DOCTYPE html>
<html>
<head>
  <title>${newDocTitle || 'Untitled'}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
  </style>
</head>
<body>
  <h1>${newDocTitle || 'Untitled'}</h1>
  ${content.split('\n').map(p => `<p>${p}</p>`).join('\n')}
</body>
</html>`;
      mimeType = 'text/html';
      extension = 'html';
    }

    const blob = new Blob([exportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${newDocTitle || 'document'}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Document exported as ${format.toUpperCase()}`);
  };

  const copyToClipboard = async () => {
    const content = editingContent || dictationText;
    if (!content.trim()) {
      toast.error('No content to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      toast.success('Content copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy content');
    }
  };

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <Newspaper className="w-4 h-4" />;
      case 'story': return <BookOpen className="w-4 h-4" />;
      case 'note': return <FileText className="w-4 h-4" />;
      case 'blog': return <PenTool className="w-4 h-4" />;
      case 'letter': return <MessageSquare className="w-4 h-4" />;
      case 'script': return <Edit3 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getDocTypeColor = (type: string) => {
    switch (type) {
      case 'article': return 'bg-primary text-primary-foreground';
      case 'story': return 'bg-purple-500 text-white';
      case 'note': return 'bg-gray-500 text-white';
      case 'blog': return 'bg-orange-500 text-white';
      case 'letter': return 'bg-blue-500 text-white';
      case 'script': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const wordCount = (editingContent || dictationText).trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <PenTool className="w-6 h-6 text-primary" />
            Creative Mode
          </h2>
          <p className="text-muted-foreground">
            Voice dictation, AI writing assistance, and document creation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {wordCount} words
          </Badge>
          <Badge variant={isRecording ? 'destructive' : 'secondary'}>
            {isRecording ? '🎤 Recording' : '✍️ Writing'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="dictation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dictation">Voice Dictation</TabsTrigger>
          <TabsTrigger value="editor">AI Editor</TabsTrigger>
          <TabsTrigger value="library">Document Library</TabsTrigger>
        </TabsList>

        {/* Voice Dictation Tab */}
        <TabsContent value="dictation" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <VoiceDictation 
              onTranscription={handleVoiceTranscription}
              autoTranscribe={true}
            />

            {/* Document Setup Panel */}
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Document Setup
                </CardTitle>
                <CardDescription>
                  Configure your document type and settings
                </CardDescription>
              </CardHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Document Title</label>
                  <Input
                    placeholder="Enter document title..."
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Document Type</label>
                  <Select value={selectedDocType} onValueChange={(value: any) => setSelectedDocType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">📰 Article</SelectItem>
                      <SelectItem value="story">📚 Story</SelectItem>
                      <SelectItem value="note">📝 Note</SelectItem>
                      <SelectItem value="blog">✍️ Blog Post</SelectItem>
                      <SelectItem value="letter">💌 Letter</SelectItem>
                      <SelectItem value="script">🎬 Script</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setEditingContent(dictationText)}
                    disabled={!dictationText.trim()}
                    className="w-full"
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    Use Text
                  </Button>
                  
                  <Button
                    onClick={() => setDictationText('')}
                    disabled={!dictationText.trim()}
                    variant="outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* AI Editor Tab */}
        <TabsContent value="editor" className="space-y-6">
          <div className="space-y-6">
            <AIWritingAssistant
              initialText={dictationText}
              documentType={selectedDocType}
              onTextUpdate={setEditingContent}
            />
            
            {/* Main Editor */}
            <div>
              <Card className="p-6">
                <CardHeader className="px-0 pt-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5" />
                      Content Editor
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReadBack}
                        disabled={isPlaying || (!editingContent && !dictationText)}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {showPreview ? (
                  <Card className="p-4 bg-muted/20 min-h-[400px]">
                    <div className="prose prose-sm max-w-none">
                      <h1>{newDocTitle || 'Untitled Document'}</h1>
                      <div className="whitespace-pre-wrap">{editingContent}</div>
                    </div>
                  </Card>
                ) : (
                  <Textarea
                    ref={textareaRef}
                    placeholder="Start typing or use voice dictation to create your content..."
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="min-h-[400px] resize-none text-base leading-relaxed"
                  />
                )}

                {/* Editor Stats */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>{wordCount} words</span>
                    <span>{editingContent.length} characters</span>
                    <span>~{Math.ceil(wordCount / 200)} min read</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button onClick={saveDocument} size="sm">
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Document Library Tab */}
        <TabsContent value="library" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card 
                key={doc.id} 
                className="p-4 hover:shadow-md transition-all duration-300 cursor-pointer"
                onClick={() => setCurrentDoc(doc)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getDocTypeIcon(doc.type)}
                      <Badge className={getDocTypeColor(doc.type)}>
                        {doc.type}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {doc.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base mb-1">{doc.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.content.substring(0, 100)}...
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{doc.wordCount} words</span>
                    <span>{doc.updatedAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            ))}

            {documents.length === 0 && (
              <div className="col-span-full text-center py-12">
                <PenTool className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No documents yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  Start creating with voice dictation or the editor
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreativeMode;