import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oodxparkhdvlljdftswg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZHhwYXJraGR2bGxqZGZ0c3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTYzNzgsImV4cCI6MjA2ODY3MjM3OH0.QZW_54cFUerckgux0kKPlsD43Wlka0KoThB_nzRQB3c'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web/2.52.0',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})