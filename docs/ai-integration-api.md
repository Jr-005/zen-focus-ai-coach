# AI Integration API Documentation

## Overview
This document describes the AI integration endpoints and their usage in the FocusZen productivity application.

## Edge Functions

### 1. OpenAI Task Suggestions (`/functions/v1/openai-suggestions`)

**Purpose**: Generate intelligent task suggestions using OpenAI GPT models.

**Method**: POST

**Headers**:
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Request Body**:
```typescript
{
  taskTitle: string;           // Required: The task title
  taskDescription?: string;    // Optional: Task description
  userGoals?: string[];       // Optional: User's current goals
  userContext?: {             // Optional: User context for better suggestions
    completedTasks: number;
    currentMood?: string;
    timeOfDay: string;
    productivity_level?: string;
  }
}
```

**Response**:
```typescript
{
  success: boolean;
  suggestions?: {
    improvedTitle?: string;      // Enhanced task title
    improvedDescription?: string; // Enhanced description
    subtasks: string[];         // Suggested subtasks
    estimatedDuration: number;  // Duration in minutes
    priority: 'low' | 'medium' | 'high';
    tips: string[];            // Productivity tips
  };
  error?: string;
}
```

**Example Usage**:
```typescript
const { data } = await supabase.functions.invoke('openai-suggestions', {
  body: {
    taskTitle: "Prepare presentation",
    taskDescription: "Create slides for quarterly review",
    userGoals: ["Improve public speaking", "Complete Q4 goals"],
    userContext: {
      completedTasks: 3,
      currentMood: "focused",
      timeOfDay: "morning",
      productivity_level: "high"
    }
  }
});
```

### 2. Voice Transcription (`/functions/v1/voice-transcription`)

**Purpose**: Convert audio recordings to text using AssemblyAI.

**Method**: POST

**Headers**:
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Request Body**:
```typescript
{
  audioData: string;    // Required: Base64 encoded audio data
  language?: string;    // Optional: Language code (default: 'en')
}
```

**Response**:
```typescript
{
  success: boolean;
  transcription?: string;  // Transcribed text
  confidence?: number;     // Confidence score (0-1)
  words?: number;         // Word count
  error?: string;
}
```

**Example Usage**:
```typescript
// Convert audio blob to base64
const arrayBuffer = await audioBlob.arrayBuffer();
const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

const { data } = await supabase.functions.invoke('voice-transcription', {
  body: {
    audioData: base64Audio,
    language: 'en'
  }
});
```

### 3. Text-to-Speech (`/functions/v1/text-to-speech`)

**Purpose**: Convert text to speech using ElevenLabs API.

**Method**: POST

**Headers**:
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Request Body**:
```typescript
{
  text: string;      // Required: Text to convert (max 1000 chars)
  voice?: string;    // Optional: Voice name (default: 'Rachel')
  model?: string;    // Optional: Model ID (default: 'eleven_monolingual_v1')
}
```

**Response**:
```typescript
{
  success: boolean;
  audioData?: string;     // Base64 encoded audio data
  contentType?: string;   // Audio MIME type
  textLength?: number;    // Original text length
  error?: string;
}
```

**Example Usage**:
```typescript
const { data } = await supabase.functions.invoke('text-to-speech', {
  body: {
    text: "Your task reminder: Complete the presentation by 3 PM",
    voice: 'Rachel'
  }
});

// Play the audio
if (data.success) {
  const audioBlob = new Blob(
    [Uint8Array.from(atob(data.audioData), c => c.charCodeAt(0))], 
    { type: 'audio/mpeg' }
  );
  const audio = new Audio(URL.createObjectURL(audioBlob));
  await audio.play();
}
```

## React Hooks

### useAI Hook

**Purpose**: Provides easy access to AI services from React components.

**Methods**:
- `getTaskSuggestions(taskTitle, taskDescription?, userGoals?, userContext?)`: Get AI task suggestions
- `transcribeAudio(audioBlob)`: Transcribe audio to text
- `textToSpeech(text)`: Convert text to speech

**Properties**:
- `loading`: Boolean indicating if any AI operation is in progress

### useVoiceRecording Hook

**Purpose**: Handles audio recording functionality.

**Methods**:
- `startRecording()`: Start audio recording
- `stopRecording()`: Stop audio recording
- `clearRecording()`: Clear recorded audio

**Properties**:
- `isRecording`: Boolean indicating recording state
- `audioBlob`: Recorded audio as Blob object

## Components

### VoiceInput Component

**Purpose**: Provides a complete voice input interface with recording, playback, and transcription.

**Props**:
```typescript
{
  onTranscription: (text: string) => void;  // Callback for transcribed text
  className?: string;                       // Optional CSS classes
  placeholder?: string;                     // Placeholder text
}
```

### AITaskSuggestions Component

**Purpose**: Displays AI-generated task suggestions with apply functionality.

**Props**:
```typescript
{
  taskTitle: string;                        // Task title for suggestions
  taskDescription?: string;                 // Optional task description
  userGoals?: string[];                    // User's goals for context
  userContext?: UserContext;               // User context data
  onApplySuggestion: (suggestion: TaskSuggestion) => void;  // Apply callback
  className?: string;                      // Optional CSS classes
}
```

## Environment Variables

The following environment variables must be set in Supabase Edge Functions:

```bash
OPENAI_API_KEY=your_openai_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

## Error Handling

All AI functions include comprehensive error handling:

1. **Authentication Errors**: Return 401 status for missing/invalid JWT tokens
2. **API Key Errors**: Return 500 status for missing API keys
3. **Rate Limiting**: Implement exponential backoff for API rate limits
4. **Fallback Responses**: Provide default suggestions when AI services fail
5. **Timeout Handling**: 30-second timeout for transcription operations

## Rate Limiting

- OpenAI: Respects API rate limits with exponential backoff
- AssemblyAI: 30-second timeout for transcription completion
- ElevenLabs: 1000 character limit per request

## Security Considerations

1. All API keys are stored as Supabase secrets
2. JWT token verification for all requests
3. Input validation and sanitization
4. Audio data size limits (10MB max)
5. Text length limits (1000 characters for TTS)

## Testing

See `tests/ai-integration.test.ts` for comprehensive test cases covering:
- Successful API calls
- Error scenarios
- Edge cases
- Performance benchmarks