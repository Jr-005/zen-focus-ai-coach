import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TextCleanupRequest {
  text: string
  outputType: 'article' | 'story' | 'note' | 'blog' | 'email' | 'summary'
  style?: 'formal' | 'casual' | 'academic' | 'creative'
  instructions?: string
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

    // Get Groq API key from environment
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      throw new Error('Groq API key not configured')
    }

    // Parse request body
    const { text, outputType, style = 'casual', instructions = '' }: TextCleanupRequest = await req.json()

    if (!text || text.trim().length === 0) {
      throw new Error('No text provided')
    }

    // Create system prompt based on output type and style
    const getSystemPrompt = (type: string, styleType: string) => {
      const basePrompt = `You are an expert writing assistant. Your task is to clean up, structure, and improve transcribed text.`
      
      const typePrompts = {
        article: 'Transform this into a well-structured article with proper headings, introduction, body, and conclusion.',
        story: 'Turn this into an engaging narrative story with proper flow, character development, and storytelling elements.',
        note: 'Organize this into clear, concise notes with bullet points and proper structure.',
        blog: 'Convert this into an engaging blog post with a catchy introduction, clear sections, and a compelling conclusion.',
        email: 'Format this as a professional email with proper greeting, body, and closing.',
        summary: 'Create a concise summary that captures the key points and main ideas.'
      }

      const stylePrompts = {
        formal: 'Use formal language, proper grammar, and professional tone.',
        casual: 'Use conversational tone while maintaining clarity and readability.',
        academic: 'Use academic writing style with proper citations format and scholarly tone.',
        creative: 'Use creative language, metaphors, and engaging storytelling techniques.'
      }

      return `${basePrompt} ${typePrompts[type]} ${stylePrompts[styleType]} ${instructions ? `Additional instructions: ${instructions}` : ''}`
    }

    const systemPrompt = getSystemPrompt(outputType, style)

    // Call Groq API for text cleanup
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please clean up and improve this transcribed text:\n\n${text}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 0.9
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Groq API error:', errorText)
      throw new Error(`Groq API error: ${groqResponse.status}`)
    }

    const result = await groqResponse.json()
    const cleanedText = result.choices[0]?.message?.content

    if (!cleanedText) {
      throw new Error('No cleaned text received from API')
    }

    // Calculate word count
    const wordCount = cleanedText.trim().split(/\s+/).length

    return new Response(
      JSON.stringify({
        success: true,
        cleanedText,
        originalText: text,
        outputType,
        style,
        wordCount,
        model: 'llama-3.3-70b-versatile'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Error in ai-text-cleanup function:', error)
    
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