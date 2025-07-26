import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Search, Brain, FileText } from 'lucide-react';
import { useRAG } from '@/hooks/useRAG';
import { formatDistanceToNow } from 'date-fns';

interface VoiceNote {
  id: string;
  content: string;
  summary?: string;
  similarity?: number;
  created_at: string;
}

const NotesManager: React.FC = () => {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VoiceNote[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { loading, getVoiceNotes, deleteVoiceNote, queryRAG } = useRAG();

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const fetchedNotes = await getVoiceNotes(20);
    setNotes(fetchedNotes);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const result = await queryRAG(searchQuery, 5);
      setSearchResults(result.context);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteVoiceNote(id);
    if (success) {
      setNotes(notes.filter(note => note.id !== id));
      setSearchResults(searchResults.filter(note => note.id !== id));
    }
  };

  const displayNotes = searchQuery.trim() ? searchResults : notes;

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Voice Notes & Memory
        </CardTitle>
        <CardDescription>
          Your AI assistant remembers these notes and can reference them in conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Section */}
        <div className="flex gap-2">
          <Input
            placeholder="Search your notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            size="sm"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {searchQuery.trim() && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            {isSearching ? 'Searching...' : `Found ${searchResults.length} relevant notes`}
          </div>
        )}

        {/* Notes List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {loading && notes.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Loading your notes...
              </div>
            ) : displayNotes.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {searchQuery.trim() ? (
                  <div>
                    <p className="font-medium">No matching notes found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">No voice notes yet</p>
                    <p className="text-sm">Start a voice conversation to create your first note</p>
                  </div>
                )}
              </div>
            ) : (
              displayNotes.map((note) => (
                <Card key={note.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        {note.summary && (
                          <p className="font-medium text-sm text-primary">
                            {note.summary}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(note.id)}
                        className="text-destructive hover:text-destructive ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                      {note.similarity !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(note.similarity * 100)}% match
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {notes.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {notes.length} total notes • AI-powered semantic search enabled
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotesManager;