import { supabase } from "@/integrations/supabase/client";

interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Checks if a token is expired or will expire soon
 */
export function isTokenExpired(expiresAt: number, bufferSeconds = 60): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= (expiresAt - bufferSeconds);
}

/**
 * Gets a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  try {
    console.log('Getting valid access token...');
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    if (!session) {
      console.error('No session found - user needs to log in');
      return null;
    }
    
    console.log('Current session expires at:', new Date(session.expires_at * 1000));
    console.log('Token expired?', isTokenExpired(session.expires_at || 0));
    
    // Check if token is expired or will expire soon
    if (isTokenExpired(session.expires_at || 0)) {
      console.log('Token expired or expiring soon, attempting refresh...');
      
      // Attempt to refresh the token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        // If refresh fails, the user needs to log in again
        throw new Error('Session expired. Please log in again.');
      }
      
      if (!refreshData.session) {
        console.error('No session after refresh');
        throw new Error('Session expired. Please log in again.');
      }
      
      console.log('Token refreshed successfully');
      return refreshData.session.access_token;
    }
    
    return session.access_token;
  } catch (error) {
    console.error('Error in getValidAccessToken:', error);
    throw error;
  }
}

/**
 * Makes an authenticated request to a Supabase function with automatic token refresh
 */
export async function invokeWithValidToken(
  functionName: string, 
  options: { body?: any; headers?: Record<string, string> } = {}
) {
  try {
    const accessToken = await getValidAccessToken();
    
    if (!accessToken) {
      throw new Error('No valid access token available');
    }
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error(`Error invoking ${functionName}:`, error);
    return { data: null, error };
  }
}