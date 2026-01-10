import { createClient } from '@supabase/supabase-js'

// 1. FORCE LOAD VARIABLES
// We explicitly check for them to prevent silent failures
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ FATAL ERROR: Supabase keys are missing from .env.local')
}

// 2. CREATE CLIENT
// This client is "Public" and safe for the browser
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)