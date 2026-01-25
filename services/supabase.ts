
import { createClient } from '@supabase/supabase-js';

// Clean potential quotes that might come from .env parsing errors
const supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/["']/g, "").trim() : "";
const supabaseKey = process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.replace(/["']/g, "").trim() : "";

// Only create the client if credentials are provided
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;
