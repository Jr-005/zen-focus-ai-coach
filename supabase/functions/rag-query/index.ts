import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { query, topK = 3, threshold = 0.3 } = await req.json();

    if (!query) {
      throw new Error('Query text is required');
    }

    console.log('RAG Query received:', query);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the current user from the auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    console.log('User authenticated:', user.id);

    // First, generate embedding for the query
    const embeddingResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ text: query }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding');
    }

    const { embedding } = await embeddingResponse.json();
    console.log('Query embedding generated, length:', embedding.length);

    // Search for similar notes using the embedding
    const { data: matches, error: searchError } = await supabase.rpc('match_voice_notes', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: topK,
      filter_user_id: user.id
    });

    if (searchError) {
      console.error('Vector search error:', searchError);
      throw new Error('Failed to search voice notes');
    }

    console.log('Found matches:', matches?.length || 0);

    // Format the results
    const context = matches?.map(match => ({
      id: match.id,
      content: match.content,
      summary: match.summary,
      similarity: match.similarity,
      created_at: match.created_at
    })) || [];

    return new Response(
      JSON.stringify({ 
        context,
        query,
        total_matches: context.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('RAG query error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        context: [],
        total_matches: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});