import { createClient } from '@supabase/supabase-js';

// For server components
export const createServerSupabaseClient = () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                              process.env.SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey });
      return null;
    }
    
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      }
    });
  } catch (error) {
    console.error('Error creating server Supabase client:', error);
    return null;
  }
};

// For client components - uses public variables
export const createBrowserSupabaseClient = () => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials in browser client:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey });
      return null;
    }
    
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      }
    });
  } catch (error) {
    console.error('Error creating browser Supabase client:', error);
    return null;
  }
}; 