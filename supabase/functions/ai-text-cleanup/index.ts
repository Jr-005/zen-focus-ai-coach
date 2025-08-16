import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TextCleanupRequest {
  text: string;
  documentType: string;
  options?: {
    tone?: 'professional' | 'casual' | 'creative' | 'academic';
    style?: 'concise' | 'detailed' | 'narrative' | 'technical';
    action?: 'improve' | 'restructure' | 'summarize' | 'expand';
  };
  instructions?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get Groq API key from environment
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    // Parse request body
    const { text, documentType, options = {}, instructions }: TextCleanupRequest = await req.json();

    if (!text || typeof text !== 'string') {
      throw new Error('Text content is required');
    }

    if (text.length > 10000) {
      throw new Error('Text too long (max 10,000 characters)');
    }

    // Build comprehensive system prompt
    const systemPrompt = `You are an expert writing assistant and editor. Your task is to clean up, structure, and improve text content based on the specified document type and user preferences.

Document Type: ${documentType}
${instructions ? `Instructions: ${instructions}` : ''}
${options.tone ? `Tone: ${options.tone}` : ''}
${options.style ? `Style: ${options.style}` : ''}
${options.action ? `Primary Action: ${options.action}` : ''}

Guidelines:
1. Maintain the original meaning and intent
2. Fix grammar, spelling, and punctuation errors
3. Improve sentence structure and flow
4. Organize content logically with appropriate formatting
5. Preserve the author's voice while enhancing clarity
6. Add appropriate headings, bullet points, or structure as needed
7. Ensure the content matches the specified document type

Return ONLY the cleaned and improved text without any explanations or metadata.`;

    const userPrompt = `Please clean up and improve this ${documentType}:

${text}`;

    // Call Groq API for text processing
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error('Groq API error:', errorData);
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const processedText = groqData.choices[0]?.message?.content;

    if (!processedText) {
      throw new Error('No response from Groq');
    }

    // Calculate improvement metrics
    const originalWordCount = text.trim().split(/\s+/).length;
    const processedWordCount = processedText.trim().split(/\s+/).length;
    const improvementRatio = processedWordCount / originalWordCount;

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedText: processedText.trim(),
        cleanedText: processedText.trim(), // Alias for backward compatibility
        metrics: {
          originalWordCount,
          processedWordCount,
          improvementRatio,
          documentType,
          options
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-text-cleanup function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: error.message.includes('authorization') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});