import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TaskSuggestionRequest {
  taskTitle: string
  taskDescription?: string
  userGoals?: string[]
  userContext?: {
    completedTasks: number
    currentMood?: string
    timeOfDay: string
    productivity_level?: string
  }
}

interface TaskSuggestion {
  improvedTitle?: string
  improvedDescription?: string
  subtasks: string[]
  estimatedDuration: number
  priority: 'low' | 'medium' | 'high'
  tips: string[]
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

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Parse request body
    const { taskTitle, taskDescription, userGoals, userContext }: TaskSuggestionRequest = await req.json()

    if (!taskTitle) {
      throw new Error('Task title is required')
    }

    // Build context-aware prompt
    const systemPrompt = `You are an AI productivity assistant. Analyze the user's task and provide intelligent suggestions to improve productivity and task completion success.

Consider:
- User's current goals: ${userGoals?.join(', ') || 'None specified'}
- Time of day: ${userContext?.timeOfDay || 'Unknown'}
- Current mood: ${userContext?.currentMood || 'Unknown'}
- Completed tasks today: ${userContext?.completedTasks || 0}
- Productivity level: ${userContext?.productivity_level || 'Unknown'}

Provide suggestions in JSON format with the following structure:
{
  "improvedTitle": "Enhanced task title (optional)",
  "improvedDescription": "Enhanced description (optional)", 
  "subtasks": ["subtask1", "subtask2", ...],
  "estimatedDuration": minutes_as_number,
  "priority": "low|medium|high",
  "tips": ["productivity tip 1", "tip 2", ...]
}`

    const userPrompt = `Task: "${taskTitle}"
${taskDescription ? `Description: "${taskDescription}"` : ''}

Please analyze this task and provide intelligent suggestions to help me complete it more effectively.`

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    // Parse AI response
    let suggestions: TaskSuggestion
    try {
      suggestions = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      // Fallback suggestions
      suggestions = {
        subtasks: [taskTitle],
        estimatedDuration: 30,
        priority: 'medium',
        tips: ['Break down the task into smaller steps', 'Set a specific time to work on this']
      }
    }

    return new Response(
      JSON.stringify({ success: true, suggestions }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Error in openai-suggestions function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        // Provide fallback suggestions on error
        suggestions: {
          subtasks: ['Complete the task step by step'],
          estimatedDuration: 30,
          priority: 'medium',
          tips: ['Focus on one thing at a time', 'Take breaks when needed']
        }
      }),
      {
        status: error.message.includes('authorization') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})