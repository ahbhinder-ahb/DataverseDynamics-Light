/**
 * Validates that all required environment variables are present.
 * This should be called before the app renders to prevent runtime errors.
 * 
 * @throws {Error} If required variables are missing
 */
export function validateEnv() {
  const requiredVars = [
    { key: 'VITE_SUPABASE_URL', label: 'Supabase URL' },
    { key: 'VITE_SUPABASE_ANON_KEY', label: 'Supabase Anon Key' }
  ];

  const missing = requiredVars.filter(v => !import.meta.env[v.key]);

  if (missing.length > 0) {
    const missingKeys = missing.map(v => v.key).join(', ');
    // We throw a generic error here to be caught by the app entry point
    // The UI will display a friendly message without exposing values
    throw new Error(`Missing required configuration: ${missingKeys}`);
  }
  
  return true;
}