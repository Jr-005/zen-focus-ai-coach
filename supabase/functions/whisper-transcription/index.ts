import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhisperRequest {
  audioData: string; // Base64 encoded audio
  language?: string;
  model?: 'whisper-1' | 'whisper-large-v3';
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

    // Get Groq API key for Whisper
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    // Parse request body
    const { audioData, language = 'en', model = 'whisper-large-v3' }: WhisperRequest = await req.json();

    if (!audioData) {
      throw new Error('Audio data is required');
    }

    // Convert base64 to blob
    const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    
    // Create form data for Groq Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', model);
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0.1');

    // Call Groq Whisper API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: formData,
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error('Groq Whisper API error:', errorData);
      throw new Error(`Groq Whisper API error: ${groqResponse.status}`);
    }

    const transcriptionData = await groqResponse.json();
    
    if (!transcriptionData.text) {
      throw new Error('No transcription returned');
    }

    // Extract additional metadata if available
    const segments = transcriptionData.segments || [];
    const words = transcriptionData.words || [];
    const duration = transcriptionData.duration || 0;

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcriptionData.text,
        language: transcriptionData.language || language,
        duration,
        confidence: segments.length > 0 ? 
          segments.reduce((acc: number, seg: any) => acc + (seg.avg_logprob || 0), 0) / segments.length : 
          null,
        segments: segments.map((seg: any) => ({
          text: seg.text,
          start: seg.start,
          end: seg.end,
          confidence: seg.avg_logprob
        })),
        wordCount: transcriptionData.text.trim().split(/\s+/).length,
        model: model
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in whisper-transcription function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        transcription: null
      }),
      {
        status: error.message.includes('authorization') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});