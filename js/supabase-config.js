// Supabase client initialization
// TODO: Replace placeholders with your actual Supabase URL and anon key
// You can set them temporarily here, or inject via environment in production builds
(function() {
  if (!window.supabase) {
    console.error('Supabase library not loaded. Include @supabase/supabase-js before this script.');
    return;
  }

  var SUPABASE_URL = window.SUPABASE_URL || 'https://rcykddkikfnadlyotxjr.supabase.co';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeWtkZGtpa2ZuYWRseW90eGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTI2MzcsImV4cCI6MjA3NDMyODYzN30.UDuZ8Cjxw9CNiEhTy44XxFluOa4K7f-0_cZDkFKOLDY';

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();

