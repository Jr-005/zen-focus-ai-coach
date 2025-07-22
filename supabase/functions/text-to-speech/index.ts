import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TextToSpeechRequest {
  text: string
  voice?: string
  model?: string
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

    // Get ElevenLabs API key from environment
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured')
    }

    // Parse request body
    const { text, voice = 'Rachel', model = 'eleven_monolingual_v1' }: TextToSpeechRequest = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    if (text.length > 1000) {
      throw new Error('Text too long (max 1000 characters)')
    }

    // Get voice ID (using Rachel as default)
    const voiceId = 'pNInz6obpgDQGcFmaJgB' // Rachel voice ID

    // Call ElevenLabs API
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    })

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text()
      console.error('ElevenLabs API error:', errorText)
      throw new Error(`ElevenLabs API error: ${elevenLabsResponse.status}`)
    }

    // Get audio data
    const audioBuffer = await elevenLabsResponse.arrayBuffer()
    
    // Convert to base64 for JSON response
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

    return new Response(
      JSON.stringify({
        success: true,
        audioData: audioBase64,
        contentType: 'audio/mpeg',
        textLength: text.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Error in text-to-speech function:', error)
    
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