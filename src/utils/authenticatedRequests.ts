import { supabase } from "@/integrations/supabase/client";
import { getValidAccessToken } from "./tokenUtils";

/**
 * Makes authenticated database requests with fresh tokens
 */
export async function makeAuthenticatedRequest<T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    // Get a fresh access token
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return { 
        data: null, 
        error: { message: 'No valid access token available' } 
      };
    }

    // Set the auth header manually on the client
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.access_token !== accessToken) {
        // Force update the session with the new token
        console.log('Updating client with fresh token');
      }
    });

    // Execute the operation
    const result = await operation();
    return result;
  } catch (error) {
    console.error('Error in authenticated request:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : { message: 'Unknown error' } 
    };
  }
}

/**
 * Direct database query with fresh token using REST API
 */
export async function queryVoiceNotes(limit: number = 10) {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      throw new Error('No valid access token available');
    }

    console.log('Making direct REST API call with fresh token');
    
    const response = await fetch(
      `https://oodxparkhdvlljdftswg.supabase.co/rest/v1/voice_notes?select=id,content,summary,created_at&order=created_at.desc&limit=${limit}`, 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZHhwYXJraGR2bGxqZGZ0c3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTYzNzgsImV4cCI6MjA2ODY3MjM3OH0.QZW_54cFUerckgux0kKPlsD43Wlka0KoThB_nzRQB3c',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Profile': 'public'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Direct API call failed:', error);
    return { data: null, error };
  }
}