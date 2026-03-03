import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gzlejowuykevphselwti.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bGVqb3d1eWtldnBoc2Vsd3RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDEyNDYsImV4cCI6MjA4NDA3NzI0Nn0.Gzuo_wFtuOAuIRWnvTdhh-s8OxyYeCN06mTqW2ZSdp8';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
