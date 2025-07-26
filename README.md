# ZenVA – AI-Powered Voice Personal Assistant

**Your intelligent voice-activated productivity assistant for automating tasks, organizing your day, and staying focused — built with AssemblyAI real-time transcription and lightning-fast AI responses.**

## DEV x AssemblyAI Challenge Submission

**Track:** Business Automation Voice Agent  
**Title:** ZenVA – AI-Powered Voice Personal Assistant  
**GitHub Repo:** [GitHub](https://github.com/Jr-005/zen-focus-ai-coach)  

### Description:
ZenVA is an AI-powered personal assistant that automates productivity and daily planning through real-time voice interaction. By leveraging AssemblyAI's ultra-fast Universal-Streaming API, ZenVA captures spoken input, processes it through an intelligent LLM agent (GROQ + RAG), and automates tasks, reminders, focus sessions, and summaries. It helps users stay on top of their goals with voice-driven automation.

## Features

- 🎤 **Real-Time Voice Commands** – Powered by AssemblyAI Universal-Streaming for instant transcription
- 🧠 **RAG-Powered Memory System** – AI remembers your conversations and references past notes
- 📅 **Smart Scheduling Assistant** – Automatically create reminders and to-dos from voice
- 🤖 **LLM-Powered Task Planning** – Converts your speech into structured plans using context
- ✅ **Context-Aware Task Manager** – Organizes and prioritizes tasks intelligently
- 🧘 **Focus & Break Guidance** – Voice coaching to manage deep work sessions
- 📝 **Voice Notes with Semantic Search** – AI-indexed notes with vector similarity search
- 🔍 **Intelligent Context Retrieval** – Finds relevant past conversations automatically

## Use Case Examples

- Say: "Remind me to call John at 3PM tomorrow." → It adds a reminder.
- Say: "What's on my to-do list for today?" → It reads back your agenda.
- Say: "Summarize my last focus session." → You get a voice-based report.
- Say: "Take a note: Meeting with Sarah went well. Discussed Q3 goals." → Creates and stores a summarized note.

## Powered by AssemblyAI

ZenVA uses AssemblyAI's Universal-Streaming API to transcribe voice in real-time with <300ms latency, allowing fast and natural interaction with the AI assistant. The transcription data is then used to:

- Trigger task creation or reminders
- Perform NLP parsing for intent detection
- Pass to GROQ + RAG for intelligent response

## Tech Stack

### Frontend
- ⚛️ React 18 with TypeScript for type-safe development
- 🚀 Vite for lightning-fast builds and development
- 🎨 shadcn-ui + Tailwind CSS for beautiful, customizable UI
- 🎙️ Web Audio API for voice input handling

### Backend & Infrastructure
- ⚡ Supabase for:
  - Real-time data synchronization
  - Edge Functions deployment
  - User authentication
  - Database storage
- 🧠 AI Integration:
  - GROQ for ultra-fast LLM responses
  - RAG (Retrieval Augmented Generation) for context-aware responses
  - AssemblyAI Universal-Streaming API for real-time transcription
  - OpenAI for task analysis and natural language processing

## Environment Setup

Before running the project, you'll need to set up the following environment variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Services
VITE_ASSEMBLYAI_API_KEY=your_assemblyai_api_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_OPENAI_API_KEY=your_openai_api_key

# Optional: Analytics & Monitoring
VITE_POSTHOG_KEY=your_posthog_key
VITE_SENTRY_DSN=your_sentry_dsn
```

Create a `.env` file in the root directory and add these variables. Never commit this file to version control.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Development Workflow

1. **Branch Management**
   - Create feature branches from `main`
   - Use conventional commits (e.g., `feat:`, `fix:`, `docs:`)
   - Submit PRs for review before merging

2. **Testing**
   - Run `npm test` to execute test suite
   - Ensure all AI integration tests pass
   - Test voice features in different browsers

3. **Code Quality**
   - Run `npm run lint` to check code style
   - Run `npm run type-check` for TypeScript validation
   - Use provided VS Code settings for consistent formatting

## Deployment

### Manual Deployment

1. Build the project:
   ```sh
   npm run build
   ```

2. Deploy to your preferred platform:
   - Vercel: `vercel deploy`
   - Netlify: `netlify deploy`
   - Or any static hosting service

3. Set up environment variables on your hosting platform

### Custom Domain Setup

To set up a custom domain, follow the documentation of your chosen hosting platform (Vercel, Netlify, etc.) for adding and configuring custom domains.
