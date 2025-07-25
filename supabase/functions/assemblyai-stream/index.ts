import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamingResponse {
  message_type: 'SessionBegins' | 'PartialTranscript' | 'FinalTranscript' | 'SessionTerminated';
  session_id?: string;
  text?: string;
  confidence?: number;
  audio_start?: number;
  audio_end?: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let assemblyAISocket: WebSocket | null = null;
  const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');

  if (!ASSEMBLYAI_API_KEY) {
    socket.close(1000, 'AssemblyAI API key not configured');
    return response;
  }

  socket.onopen = () => {
    console.log('Client WebSocket connected');
    
    // Connect to AssemblyAI Real-time API
    const assemblyAIUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${ASSEMBLYAI_API_KEY}`;
    assemblyAISocket = new WebSocket(assemblyAIUrl);

    assemblyAISocket.onopen = () => {
      console.log('Connected to AssemblyAI');
      socket.send(JSON.stringify({
        type: 'connection_established',
        message: 'Connected to AssemblyAI Real-time API'
      }));
    };

    assemblyAISocket.onmessage = (event) => {
      try {
        const data: StreamingResponse = JSON.parse(event.data);
        console.log('AssemblyAI message:', data);

        // Forward relevant messages to client
        if (data.message_type === 'PartialTranscript' || data.message_type === 'FinalTranscript') {
          socket.send(JSON.stringify({
            type: data.message_type,
            text: data.text,
            confidence: data.confidence,
            is_final: data.message_type === 'FinalTranscript',
            words: data.words,
            audio_start: data.audio_start,
            audio_end: data.audio_end
          }));
        } else if (data.message_type === 'SessionBegins') {
          socket.send(JSON.stringify({
            type: 'session_started',
            session_id: data.session_id
          }));
        }
      } catch (error) {
        console.error('Error parsing AssemblyAI message:', error);
      }
    };

    assemblyAISocket.onerror = (error) => {
      console.error('AssemblyAI WebSocket error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'AssemblyAI connection error'
      }));
    };

    assemblyAISocket.onclose = (event) => {
      console.log('AssemblyAI WebSocket closed:', event.code, event.reason);
      socket.send(JSON.stringify({
        type: 'connection_closed',
        code: event.code,
        reason: event.reason
      }));
    };
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'audio_data' && assemblyAISocket?.readyState === WebSocket.OPEN) {
        // Forward base64 audio data to AssemblyAI
        assemblyAISocket.send(JSON.stringify({
          audio_data: data.audio_data
        }));
      } else if (data.type === 'terminate' && assemblyAISocket?.readyState === WebSocket.OPEN) {
        // Send termination message to AssemblyAI
        assemblyAISocket.send(JSON.stringify({
          terminate_session: true
        }));
      }
    } catch (error) {
      console.error('Error processing client message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  };

  socket.onerror = (error) => {
    console.error('Client WebSocket error:', error);
    assemblyAISocket?.close();
  };

  socket.onclose = () => {
    console.log('Client WebSocket closed');
    assemblyAISocket?.close();
  };

  return response;
});