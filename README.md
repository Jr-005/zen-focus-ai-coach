# Zen Productivity Assistant

**An AI-powered productivity suite with voice interaction, task management, focus tracking, and intelligent conversation capabilities.**

---

## 🚀 Overview

Zen Productivity Assistant is a comprehensive web application that combines AI-powered voice interaction with traditional productivity tools. It features real-time voice commands, intelligent task management, focus session tracking, and an AI assistant that learns from your conversations and notes.

## ✨ Core Features

### 🎤 **AI Voice Assistant**
- **Full Voice Assistant**: Complete voice interaction with real-time audio processing
- **Natural Language Processing**: Convert speech to actionable tasks and notes
- **Voice Input Components**: Modular voice recording and transcription
- **Text-to-Speech**: AI responses played back as audio

### 🤖 **AI Chat Assistant**
- **Contextual Conversations**: AI assistant with memory and conversation history
- **Categorized Responses**: Planning, motivation, coaching, and analysis modes
- **Quick Actions**: Predefined productivity shortcuts
- **Conversation Persistence**: All chats saved and retrievable

### ✅ **Smart Task Management**
- **Natural Language Task Creation**: Create tasks from voice or text input
- **AI Task Suggestions**: Intelligent recommendations based on context
- **Priority Management**: Organize tasks by importance and due dates
- **Task Analytics**: Track completion rates and productivity patterns

### 🧘 **Focus & Productivity Tools**
- **Pomodoro Timer**: Focus sessions with customizable work/break intervals
- **Session Tracking**: Monitor focus time and productivity metrics
- **Motivational Coaching**: AI-powered encouragement and tips
- **Progress Analytics**: Visual insights into focus patterns

### 📝 **Intelligent Notes System**
- **Voice Notes**: Record and transcribe audio notes automatically
- **RAG (Retrieval Augmented Generation)**: Semantic search through your notes
- **Smart Summarization**: AI-generated summaries of long content
- **Context-Aware Retrieval**: Find relevant information from past conversations

### 🎯 **Goal & Mood Tracking**
- **Goal Progress Monitoring**: Set and track long-term objectives
- **Mood Analytics**: Daily mood tracking with insights
- **Motivational Quotes**: Dynamic inspiration based on your progress

## 🏗️ Architecture & Tech Stack

### **Frontend**
- **React 18** with TypeScript for type-safe development
- **Vite** for lightning-fast builds and hot reload
- **Tailwind CSS** with custom design system for consistent styling
- **shadcn/ui** components for beautiful, accessible UI
- **React Router** for client-side navigation
- **React Hook Form** with Zod validation

### **Backend & Database**
- **Supabase** as the backend-as-a-service platform:
  - PostgreSQL database with Row Level Security (RLS)
  - Real-time subscriptions
  - User authentication and authorization
  - Edge Functions for serverless compute
  - File storage capabilities

### **AI & ML Integration**
- **OpenAI API** for natural language processing and chat completion
- **GROQ** for ultra-fast LLM responses
- **AssemblyAI** for real-time speech transcription
- **RAG System** for intelligent information retrieval
- **Vector Embeddings** for semantic search

### **Audio Processing**
- **Web Audio API** for voice recording
- **Real-time Audio Processing** for voice commands
- **WebRTC** for low-latency audio streaming

## 📊 Database Schema

The application uses the following main tables:

### **Users & Authentication**
- Leverages Supabase Auth for user management
- Row Level Security policies protect all user data

### **Core Data Tables**
```sql
-- Tasks with priority and completion tracking
tasks (id, user_id, title, description, priority, completed, due_date, created_at, updated_at)

-- Focus session tracking
focus_sessions (id, user_id, session_type, duration_minutes, completed, completed_at, created_at)

-- AI conversation history
ai_conversations (id, user_id, message_type, content, category, created_at)

-- Voice notes with semantic search
voice_notes (id, user_id, content, summary, created_at)
```

## 🛠️ Setup & Installation

### **Prerequisites**
- Node.js 18+ and npm
- Supabase account and project
- API keys for AI services (OpenAI, GROQ, AssemblyAI)

### **1. Clone the Repository**
```bash
git clone <your-repo-url>
cd zen-productivity-assistant
npm install
```

### **2. Environment Configuration**
Create a `.env.local` file:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Service API Keys
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

### **3. Database Setup**
The database schema is automatically created through Supabase migrations. Make sure to:
1. Create a new Supabase project
2. Enable Row Level Security
3. Set up authentication providers as needed

### **4. Development Server**
```bash
npm run dev
```

Access the application at `http://localhost:5173`

## 🔐 Authentication & Security

### **Authentication Flow**
- Email/password authentication via Supabase Auth
- Protected routes require authentication
- Session management with automatic token refresh

### **Security Features**
- Row Level Security (RLS) policies on all tables
- User data isolation and protection
- Secure API key management
- CORS configuration for edge functions

## 🚀 Deployment

### **Build for Production**
```bash
npm run build
```

### **Deploy to Vercel**
```bash
vercel deploy
```

### **Deploy to Netlify**
```bash
netlify deploy --prod
```

### **Environment Variables**
Set up the same environment variables in your hosting platform's dashboard.

## 🧪 Testing

### **Run Tests**
```bash
npm test
```

### **AI Integration Tests**
```bash
npm run test:ai
```

### **Type Checking**
```bash
npm run type-check
```

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components (shadcn)
│   ├── AIAssistant.tsx  # AI chat interface
│   ├── VoiceAgent.tsx   # Voice interaction handler
│   ├── TodoManager.tsx  # Task management
│   ├── FocusTimer.tsx   # Pomodoro timer
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx      # Authentication logic
│   ├── useAI.ts         # AI integration
│   ├── useRAG.ts        # RAG system
│   └── ...
├── pages/               # Application pages
├── lib/                 # Utility functions
├── integrations/        # External service integrations
│   └── supabase/        # Supabase client and types
└── utils/               # Helper utilities

supabase/
├── functions/           # Edge functions
└── migrations/          # Database schema
```

## 🔌 API & Edge Functions

### **Available Edge Functions**
- `voice-transcription` - Convert speech to text
- `text-to-speech` - Generate audio from text
- `groq-suggestions` - AI-powered task suggestions
- `parse-task-nlp` - Natural language task parsing
- `rag-query` - Semantic search through notes
- `generate-embeddings` - Create vector embeddings
- `openai-realtime` - Real-time AI chat

### **Usage Example**
```typescript
const { data, error } = await supabase.functions.invoke('groq-suggestions', {
  body: { context: 'I need to organize my day' }
});
```

## 🤝 Contributing

### **Development Workflow**
1. Create a feature branch from `main`
2. Make your changes following the established patterns
3. Run tests and type checking
4. Submit a pull request with a clear description

### **Code Style**
- Use TypeScript for all new code
- Follow the established component patterns
- Use semantic commit messages
- Ensure accessibility best practices

### **Testing Guidelines**
- Write unit tests for utility functions
- Test AI integrations with mock data
- Ensure voice features work across browsers

## 📚 Usage Examples

### **Voice Commands**
```
"Add a task to call Sarah tomorrow at 2 PM"
"Start a 25-minute focus session"
"What did I accomplish yesterday?"
"Take a note about the marketing meeting"
"Show me my high-priority tasks"
```

### **API Integration**
```typescript
// Create a task programmatically
const { data } = await supabase
  .from('tasks')
  .insert({
    title: 'Review quarterly report',
    priority: 'high',
    due_date: new Date().toISOString()
  });
```

## 🔧 Troubleshooting

### **Common Issues**
- **Voice not working**: Check microphone permissions
- **AI responses slow**: Verify API keys and rate limits  
- **Database errors**: Ensure RLS policies are properly configured
- **Build failures**: Check TypeScript errors and dependencies

### **Debug Mode**
Enable debug logging by setting `VITE_DEBUG=true` in your environment.

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Lovable](https://lovable.dev) - AI-powered development platform
- Powered by [Supabase](https://supabase.com) for backend infrastructure
- UI components from [shadcn/ui](https://ui.shadcn.com)
- AI capabilities from OpenAI, GROQ, and AssemblyAI

---

**Ready to boost your productivity with AI?** 🚀

For questions, support, or contributions, please open an issue or contact the development team.