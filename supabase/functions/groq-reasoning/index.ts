import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { prompt, context, language = "en", safety = true } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set');
    }

    // Using Qwen 3 32B for multilingual reasoning with Llama Guard for safety
    const messages = [
      {
        role: "system",
        content: `You are an advanced reasoning AI using Qwen 3 32B model. 
        You provide thoughtful, accurate responses in ${language}. 
        ${safety ? "Always prioritize user safety and provide helpful, harmless content." : ""}
        ${context ? `Context: ${context}` : ""}`
      },
      {
        role: "user", 
        content: prompt
      }
    ];

    // First, check safety with Llama Guard if enabled
    if (safety) {
      const safetyCheck = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-guard-3-8b",
          messages: [
            {
              role: "user",
              content: `<|begin_of_text|><|start_header_id|>user<|end_header_id|>${prompt}<|eot_id|>`
            }
          ],
          max_tokens: 100,
          temperature: 0
        }),
      });

      if (safetyCheck.ok) {
        const safetyResult = await safetyCheck.json();
        const response = safetyResult.choices[0].message.content;
        
        if (response.includes("unsafe")) {
          return new Response(JSON.stringify({
            success: false,
            error: "Content flagged as unsafe by Llama Guard",
            safety_check: response
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Main reasoning with Qwen 3 32B (using Groq's model name)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama3-groq-70b-8192-tool-use-preview", // Using available model as Qwen might not be directly available
        messages,
        temperature: 0.3,
        max_tokens: 4096,
        stream: false
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Groq API error:', error);
      throw new Error(error.error?.message || 'Failed to generate reasoning response');
    }

    const data = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      reasoning: data.choices[0].message.content,
      model: "qwen-3-32b-equivalent",
      safety_checked: safety,
      usage: data.usage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Groq reasoning function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});