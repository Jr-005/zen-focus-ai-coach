import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Return the project reference from environment or hardcoded
    const projectRef = Deno.env.get('SUPABASE_PROJECT_REF') || 'oodxparkhdvlljdftswg';
    
    return new Response(
      JSON.stringify({ 
        project_ref: projectRef,
        supabase_url: `https://${projectRef}.supabase.co`,
        functions_url: `https://${projectRef}.functions.supabase.co`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error getting project info:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});