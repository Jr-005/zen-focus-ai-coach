import { supabase } from "@/integrations/supabase/client";
import { getValidAccessToken } from "./tokenUtils";

/**
 * Enhanced Supabase client that automatically handles token refresh for all operations
 */
class EnhancedSupabaseClient {
  async from(table: string) {
    // Ensure we have a valid token before making database calls
    try {
      await getValidAccessToken();
    } catch (error) {
      console.error('Failed to get valid token:', error);
      // Continue with the request - let Supabase handle auth errors
    }
    
    return supabase.from(table);
  }

  async functions() {
    try {
      await getValidAccessToken();
    } catch (error) {
      console.error('Failed to get valid token:', error);
    }
    
    return supabase.functions;
  }

  get auth() {
    return supabase.auth;
  }

  get storage() {
    return supabase.storage;
  }

  get realtime() {
    return supabase.realtime;
  }
}

export const enhancedSupabase = new EnhancedSupabaseClient();