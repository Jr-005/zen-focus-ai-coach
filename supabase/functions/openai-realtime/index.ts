import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Parse the incoming WebSocket upgrade request
    const upgrade = req.headers.get("upgrade") || ""
    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Request isn't trying to upgrade to websocket.")
    }

    // Create WebSocket connection to OpenAI
    const openaiWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17", {
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "OpenAI-Beta": "realtime=v1"
      }
    })

    const { socket, response } = Deno.upgradeWebSocket(req)

    // Variables to track conversation state
    let sessionConfigured = false
    let audioQueue: string[] = []
    let isPlaying = false

    // Forward messages from client to OpenAI
    socket.onmessage = (event) => {
      console.log("Client message:", event.data)
      try {
        const message = JSON.parse(event.data)
        
        // Forward to OpenAI
        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(event.data)
        }
      } catch (error) {
        console.error("Error parsing client message:", error)
      }
    }

    // Handle OpenAI responses
    openaiWs.onmessage = (event) => {
      console.log("OpenAI message:", event.data)
      try {
        const message = JSON.parse(event.data)
        
        // Configure session after connection
        if (message.type === 'session.created' && !sessionConfigured) {
          sessionConfigured = true
          
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: `You are ZenVA, a helpful productivity and wellness voice assistant. You help users:
- Create and manage tasks and reminders
- Start focus sessions and timers
- Provide motivation and productivity tips
- Answer questions about productivity and wellness
- Save notes and track goals

Be conversational, encouraging, and concise. When users ask you to create tasks or reminders, acknowledge what you're doing and confirm completion. Offer to help with related actions.`,
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              tools: [
                {
                  type: 'function',
                  name: 'create_task',
                  description: 'Create a new task for the user',
                  parameters: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                      due_date: { type: 'string' }
                    },
                    required: ['title']
                  }
                },
                {
                  type: 'function',
                  name: 'start_focus_session',
                  description: 'Start a focus/pomodoro session',
                  parameters: {
                    type: 'object',
                    properties: {
                      duration: { type: 'number', description: 'Duration in minutes' }
                    }
                  }
                },
                {
                  type: 'function', 
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
              ],
              tool_choice: 'auto',
              temperature: 0.8,
              max_response_output_tokens: 4096
            }
          }
          
          openaiWs.send(JSON.stringify(sessionConfig))
          console.log("Session configured")
        }
        
        // Forward all messages to client
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data)
        }
        
      } catch (error) {
        console.error("Error parsing OpenAI message:", error)
      }
    }

    openaiWs.onopen = () => {
      console.log("Connected to OpenAI Realtime API")
    }

    openaiWs.onerror = (error) => {
      console.error("OpenAI WebSocket error:", error)
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ 
          type: 'error', 
          error: 'OpenAI connection error' 
        }))
      }
    }

    openaiWs.onclose = () => {
      console.log("OpenAI WebSocket closed")
      if (socket.readyState === WebSocket.OPEN) {
        socket.close()
      }
    }

    socket.onopen = () => {
      console.log("Client WebSocket connected")
    }

    socket.onclose = () => {
      console.log("Client WebSocket closed")
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close()
      }
    }

    socket.onerror = (error) => {
      console.error("Client WebSocket error:", error)
    }

    return response

  } catch (error) {
    console.error('Error in realtime function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})