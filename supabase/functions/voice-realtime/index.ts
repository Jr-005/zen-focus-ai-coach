import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check required API keys
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    const assemblyaiApiKey = Deno.env.get('ASSEMBLYAI_API_KEY')
    
    if (!groqApiKey || !elevenlabsApiKey || !assemblyaiApiKey) {
      throw new Error('Required API keys not configured')
    }

    // Parse the incoming WebSocket upgrade request
    const upgrade = req.headers.get("upgrade") || ""
    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Request isn't trying to upgrade to websocket.")
    }

    const { socket, response } = Deno.upgradeWebSocket(req)

    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Connection state management
    let assemblyaiWs: WebSocket | null = null
    let currentTranscript = ''
    let isProcessing = false
    let sessionActive = false

    // Connect to AssemblyAI real-time transcription
    const connectAssemblyAI = () => {
      const wsUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${assemblyaiApiKey}`
      assemblyaiWs = new WebSocket(wsUrl)

      assemblyaiWs.onopen = () => {
        console.log('Connected to AssemblyAI')
        socket.send(JSON.stringify({ 
          type: 'connection_established',
          service: 'transcription'
        }))
      }

      assemblyaiWs.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.message_type === 'PartialTranscript') {
            currentTranscript = data.text
            socket.send(JSON.stringify({
              type: 'partial_transcript',
              text: data.text,
              confidence: data.confidence
            }))
          }
          
          if (data.message_type === 'FinalTranscript' && data.text.trim()) {
            const finalText = data.text.trim()
            console.log('Final transcript:', finalText)
            
            socket.send(JSON.stringify({
              type: 'final_transcript',
              text: finalText,
              confidence: data.confidence
            }))

            // Process with AI if not already processing
            if (!isProcessing && finalText.length > 0) {
              await processWithAI(finalText)
            }
          }
        } catch (error) {
          console.error('AssemblyAI message error:', error)
        }
      }

      assemblyaiWs.onerror = (error) => {
        console.error('AssemblyAI error:', error)
        socket.send(JSON.stringify({ 
          type: 'error', 
          error: 'Transcription service error' 
        }))
      }
    }

    // Process user input with Groq AI
    const processWithAI = async (text: string) => {
      if (isProcessing) return
      isProcessing = true

      try {
        console.log('Processing with Groq:', text)
        
        socket.send(JSON.stringify({
          type: 'ai_processing',
          text: 'Processing your request...'
        }))

        // Get conversation context from RAG if needed
        let context = ''
        try {
          const ragResponse = await supabase.functions.invoke('rag-query', {
            body: { query: text, topK: 3 }
          })
          if (ragResponse.data?.context) {
            context = ragResponse.data.context.map((note: any) => note.content).join('\n\n')
          }
        } catch (error) {
          console.log('RAG query failed, continuing without context:', error)
        }

        // Build system prompt with context
        const systemPrompt = `You are ZenVA, a helpful productivity and wellness voice assistant. You help users:
- Create and manage tasks and reminders
- Start focus sessions and timers  
- Provide motivation and productivity tips
- Answer questions about productivity and wellness
- Save notes and track goals

Be conversational, encouraging, and concise. When users ask you to create tasks or start sessions, acknowledge what you're doing.

${context ? `Recent conversation context:\n${context}\n\n` : ''}

If the user wants to:
- Create a task: Call create_task function
- Start a focus session: Call start_focus_session function  
- Save a note: Call save_note function

Always respond in a conversational, helpful manner.`

        // Call Groq API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: text }
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'create_task',
                  description: 'Create a new task for the user',
                  parameters: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      priority: { type: 'string', enum: ['low', 'medium', 'high'] }
                    },
                    required: ['title']
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'start_focus_session',
                  description: 'Start a focus/pomodoro session',
                  parameters: {
                    type: 'object',
                    properties: {
                      duration: { type: 'number', description: 'Duration in minutes' }
                    }
                  }
                }
              },
              {
                type: 'function',
                function: {
                  name: 'save_note',
                  description: 'Save a note for the user',
                  parameters: {
                    type: 'object',
                    properties: {
                      content: { type: 'string' },
                      category: { type: 'string' }
                    },
                    required: ['content']
                  }
                }
              }
            ],
            tool_choice: 'auto',
            temperature: 0.8,
            max_tokens: 1000
          }),
        })

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status}`)
        }

        const data = await response.json()
        const message = data.choices[0].message

        // Handle function calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const toolCall of message.tool_calls) {
            await handleFunctionCall(toolCall)
          }
        }

        // Send AI response and convert to speech
        const responseText = message.content || 'I understand. How else can I help you?'
        
        socket.send(JSON.stringify({
          type: 'ai_response',
          text: responseText
        }))

        // Convert to speech with ElevenLabs
        await convertToSpeech(responseText)

        // Save the interaction to voice notes
        try {
          await supabase.functions.invoke('generate-embeddings', {
            body: { 
              content: `User: ${text}\nAssistant: ${responseText}`,
              summary: `Voice interaction about: ${text.slice(0, 100)}...`
            }
          })
        } catch (error) {
          console.log('Failed to save to voice notes:', error)
        }

      } catch (error) {
        console.error('AI processing error:', error)
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process your request'
        }))
      } finally {
        isProcessing = false
      }
    }

    // Handle function calls from AI
    const handleFunctionCall = async (toolCall: any) => {
      const { name, arguments: args } = toolCall.function
      const parsedArgs = JSON.parse(args)

      try {
        switch (name) {
          case 'create_task':
            const { data: taskData, error: taskError } = await supabase
              .from('tasks')
              .insert({
                title: parsedArgs.title,
                description: parsedArgs.description || '',
                priority: parsedArgs.priority || 'medium',
                completed: false
              })
              .select()
              .single()

            if (taskError) throw taskError
            
            socket.send(JSON.stringify({
              type: 'function_call',
              function: 'task_created',
              data: taskData
            }))
            break

          case 'start_focus_session':
            socket.send(JSON.stringify({
              type: 'function_call',
              function: 'session_started',
              data: { duration: parsedArgs.duration || 25 }
            }))
            break

          case 'save_note':
            const { data: noteData, error: noteError } = await supabase
              .from('notes')
              .insert({
                content: parsedArgs.content,
                category: parsedArgs.category || 'general'
              })
              .select()
              .single()

            if (noteError) throw noteError
            
            socket.send(JSON.stringify({
              type: 'function_call',
              function: 'note_saved',
              data: noteData
            }))
            break
        }
      } catch (error) {
        console.error(`Function call error (${name}):`, error)
      }
    }

    // Convert text to speech using ElevenLabs
    const convertToSpeech = async (text: string) => {
      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/Xb7hH8MSUJpSbSDYk0k2`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenlabsApiKey
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        })

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`)
        }

        const audioBuffer = await response.arrayBuffer()
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

        socket.send(JSON.stringify({
          type: 'audio_response',
          audio: base64Audio,
          format: 'mp3'
        }))

      } catch (error) {
        console.error('Text-to-speech error:', error)
      }
    }

    // WebSocket event handlers
    socket.onopen = () => {
      console.log('Client connected to voice realtime')
      sessionActive = true
      connectAssemblyAI()
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        
        switch (message.type) {
          case 'audio_data':
            // Forward audio to AssemblyAI
            if (assemblyaiWs && assemblyaiWs.readyState === WebSocket.OPEN) {
              assemblyaiWs.send(JSON.stringify({
                audio_data: message.audio_data
              }))
            }
            break
            
          case 'start_listening':
            currentTranscript = ''
            isProcessing = false
            break
            
          case 'stop_listening':
            // Processing will be triggered by final transcript
            break
        }
      } catch (error) {
        console.error('Client message error:', error)
      }
    }

    socket.onclose = () => {
      console.log('Client disconnected')
      sessionActive = false
      if (assemblyaiWs) {
        assemblyaiWs.close()
      }
    }

    socket.onerror = (error) => {
      console.error('Client socket error:', error)
    }

    return response

  } catch (error) {
    console.error('Voice realtime function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})