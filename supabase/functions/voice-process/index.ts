import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioData, text } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let transcribedText = text;

    // If audio data is provided, transcribe it first
    if (audioData) {
      transcribedText = await transcribeAudio(audioData);
    }

    if (!transcribedText) {
      return new Response(
        JSON.stringify({ error: 'No text provided and transcription failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process with AI and get response
    const aiResponse = await processWithAI(transcribedText, supabase);

    return new Response(
      JSON.stringify({ 
        transcript: transcribedText,
        response: aiResponse.text,
        action: aiResponse.action 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Voice processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function transcribeAudio(audioData: string): Promise<string | null> {
  try {
    const assemblyAIKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyAIKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    // Convert base64 to Uint8Array
    const binaryString = atob(audioData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload audio to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': assemblyAIKey,
      },
      body: bytes,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload audio to AssemblyAI');
    }

    const { upload_url } = await uploadResponse.json();

    // Create transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': assemblyAIKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        punctuate: true,
        format_text: true,
      }),
    });

    if (!transcriptResponse.ok) {
      throw new Error('Failed to create transcription');
    }

    const transcript = await transcriptResponse.json();
    const transcriptId = transcript.id;

    // Poll for completion
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'authorization': assemblyAIKey,
        },
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check transcription status');
      }

      const status = await statusResponse.json();
      
      if (status.status === 'completed') {
        return status.text;
      } else if (status.status === 'error') {
        throw new Error(`Transcription failed: ${status.error}`);
      }
      
      attempts++;
    }

    throw new Error('Transcription timeout');
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
}

async function processWithAI(text: string, supabase: any): Promise<{ text: string; action?: any }> {
  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    // Get RAG context
    const { data: ragData } = await supabase.functions.invoke('rag-query', {
      body: { query: text, match_threshold: 0.3, match_count: 3 }
    });

    const context = ragData?.results?.map((r: any) => r.content).join('\n') || '';

    // Define available tools
    const tools = [
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Create a new task or todo item",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Task title" },
              description: { type: "string", description: "Task description" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              dueDate: { type: "string", description: "Due date in ISO format" }
            },
            required: ["title"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "start_focus_session",
          description: "Start a focus/pomodoro session",
          parameters: {
            type: "object",
            properties: {
              duration: { type: "number", description: "Session duration in minutes" },
              type: { type: "string", enum: ["work", "break", "long_break"] }
            },
            required: ["duration"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "save_note",
          description: "Save a note or voice memo",
          parameters: {
            type: "object",
            properties: {
              content: { type: "string", description: "Note content" },
              tags: { type: "array", items: { type: "string" }, description: "Note tags" }
            },
            required: ["content"]
          }
        }
      }
    ];

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant for a productivity app. You can help users manage tasks, start focus sessions, and save notes. 

Context from user's data:
${context}

Be conversational and helpful. When users ask you to create tasks, start timers, or save notes, use the appropriate function calls.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const aiResult = await response.json();
    const message = aiResult.choices[0].message;

    let actionResult = null;

    // Handle function calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      actionResult = await handleFunctionCall(toolCall, supabase);
    }

    // Save interaction to embeddings
    await supabase.functions.invoke('generate-embeddings', {
      body: { 
        content: `User: ${text}\nAssistant: ${message.content}`,
        type: 'voice_interaction'
      }
    });

    return {
      text: message.content || 'I processed your request.',
      action: actionResult
    };

  } catch (error) {
    console.error('AI processing error:', error);
    return { text: 'Sorry, I encountered an error processing your request.' };
  }
}

async function handleFunctionCall(toolCall: any, supabase: any): Promise<any> {
  const { name, arguments: args } = toolCall.function;
  const parsedArgs = JSON.parse(args);

  try {
    const authHeader = Deno.env.get('AUTHORIZATION');
    const userResponse = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));
    const userId = userResponse.data?.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    switch (name) {
      case 'create_task':
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .insert({
            user_id: userId,
            title: parsedArgs.title,
            description: parsedArgs.description,
            priority: parsedArgs.priority || 'medium',
            due_date: parsedArgs.dueDate,
            completed: false
          })
          .select()
          .single();

        if (taskError) throw taskError;
        return { type: 'task_created', task: taskData };

      case 'start_focus_session':
        const { data: sessionData, error: sessionError } = await supabase
          .from('focus_sessions')
          .insert({
            user_id: userId,
            duration_minutes: parsedArgs.duration,
            session_type: parsedArgs.type || 'work',
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (sessionError) throw sessionError;
        return { type: 'focus_session_started', session: sessionData };

      case 'save_note':
        const { data: noteData, error: noteError } = await supabase
          .from('notes')
          .insert({
            user_id: userId,
            content: parsedArgs.content,
            tags: parsedArgs.tags || [],
            note_type: 'voice'
          })
          .select()
          .single();

        if (noteError) throw noteError;
        return { type: 'note_saved', note: noteData };

      default:
        throw new Error(`Unknown function: ${name}`);
    }
  } catch (error) {
    console.error(`Function call error (${name}):`, error);
    return { type: 'error', message: error.message };
  }
}