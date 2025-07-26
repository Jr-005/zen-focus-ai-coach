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
    const { text } = await req.json();

    if (!text) {
      throw new Error('Text content is required');
    }

    console.log('Generating embedding for text:', text.substring(0, 100));

    // Use Hugging Face's free inference API for embeddings
    const response = await fetch(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          options: {
            wait_for_model: true
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Hugging Face API error:', error);
      throw new Error(`Embedding generation failed: ${error}`);
    }

    const embedding = await response.json();
    
    // Hugging Face returns nested arrays, we need the first one
    const flatEmbedding = Array.isArray(embedding[0]) ? embedding[0] : embedding;
    
    console.log('Generated embedding with length:', flatEmbedding.length);

    return new Response(
      JSON.stringify({ 
        embedding: flatEmbedding,
        length: flatEmbedding.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating embedding:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate text embedding' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});