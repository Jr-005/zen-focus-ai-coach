import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedTask {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  goalId?: string;
  subtasks?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
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
    const { input, userGoals = [] } = await req.json();

    if (!input || typeof input !== 'string') {
      throw new Error('Input text is required');
    }

    // Create system prompt for task parsing
    const systemPrompt = `You are an AI assistant that parses natural language into structured task data. 

Extract the following information from user input:
- title: The main task title (required)
- description: Additional details about the task (optional)
- priority: low, medium, or high (default: medium)
- dueDate: Date in YYYY-MM-DD format if mentioned (optional)
- goalId: If the task relates to an existing goal (optional)
- subtasks: Array of smaller steps if mentioned (optional)

Available user goals: ${userGoals.map((g: any) => `${g.id}: ${g.title}`).join(', ')}

Respond with ONLY a valid JSON object with the parsed data. No additional text.

Examples:
Input: "Create a task to finish the report by Friday"
Output: {"title": "Finish the report", "dueDate": "2024-01-26", "priority": "medium"}

Input: "Add high priority task: call the client about the meeting tomorrow with details about agenda"
Output: {"title": "Call the client about the meeting", "description": "Discuss agenda details", "priority": "high", "dueDate": "2024-01-24"}`;

    const userPrompt = `Parse this task request: "${input}"`;

    // Call Groq API
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
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error('Groq API error:', errorData);
      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from Groq');
    }

    // Parse AI response
    let parsedTask: ParsedTask;
    try {
      parsedTask = JSON.parse(aiResponse.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      
      // Fallback: extract basic information
      parsedTask = {
        title: input.replace(/^(create|add|make)\s+(a\s+)?(task\s+)?(to\s+)?/i, '').trim() || input,
        priority: 'medium' as const,
      };
    }

    // Validate required fields
    if (!parsedTask.title || parsedTask.title.trim().length === 0) {
      parsedTask.title = input.slice(0, 100); // Fallback to input
    }

    // Ensure priority is valid
    if (!['low', 'medium', 'high'].includes(parsedTask.priority)) {
      parsedTask.priority = 'medium';
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        task: parsedTask 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in parse-task-nlp function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        task: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});