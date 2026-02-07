

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

const supabaseUrl = 'https://pcqugaysduorgiphxedc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcXVnYXlzZHVvcmdpcGh4ZWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjA0ODksImV4cCI6MjA2ODY5NjQ4OX0.TvDutiNvXf1N-FyOEQ3Knb2Xao_JDIdY2-G35NJCvkg';

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL and Key must be provided.");
}

// Add explicit auth options for robustness in different browser environments.
// While these are defaults, explicitly setting them can prevent issues with
// session persistence or refresh logic that might cause network failures.
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    global: {
        // FIX: Provided a robust wrapper around the native `fetch` to prevent a dependency from modifying the read-only `window.fetch`, ensuring global context is not altered.
        fetch: (url, options) => fetch(url, options),
    },
});