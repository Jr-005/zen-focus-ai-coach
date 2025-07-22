import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranscriptionRequest {
  audioData: string // Base64 encoded audio
  language?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get AssemblyAI API key from environment
    const assemblyAiApiKey = Deno.env.get('ASSEMBLYAI_API_KEY')
    if (!assemblyAiApiKey) {
      throw new Error('AssemblyAI API key not configured')
    }

    // Parse request body
    const { audioData, language = 'en' }: TranscriptionRequest = await req.json()

    if (!audioData) {
      throw new Error('Audio data is required')
    }

    // Convert base64 to blob
    const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
    
    // Upload audio to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': assemblyAiApiKey,
        'content-type': 'application/octet-stream',
      },
      body: audioBuffer,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`)
    }

    const uploadData = await uploadResponse.json()
    const audioUrl = uploadData.upload_url

    // Request transcription
    const transcriptionResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': assemblyAiApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: language,
        punctuate: true,
        format_text: true,
      }),
    })

    if (!transcriptionResponse.ok) {
      throw new Error(`Transcription request failed: ${transcriptionResponse.status}`)
    }

    const transcriptionData = await transcriptionResponse.json()
    const transcriptId = transcriptionData.id

    // Poll for completion (with timeout)
    let attempts = 0
    const maxAttempts = 30 // 30 seconds timeout
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      
      const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'authorization': assemblyAiApiKey,
        },
      })

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`)
      }

      const statusData = await statusResponse.json()
      
      if (statusData.status === 'completed') {
        return new Response(
          JSON.stringify({
            success: true,
            transcription: statusData.text,
            confidence: statusData.confidence,
            words: statusData.words?.length || 0,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      } else if (statusData.status === 'error') {
        throw new Error(`Transcription failed: ${statusData.error}`)
      }
      
      attempts++
    }

    throw new Error('Transcription timeout')

  } catch (error) {
    console.error('Error in voice-transcription function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: error.message.includes('authorization') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})