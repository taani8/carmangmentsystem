// Supabase client initialization
// TODO: Replace placeholders with your actual Supabase URL and anon key
// You can set them temporarily here, or inject via environment in production builds
(function() {
  if (!window.supabase) {
    console.error('Supabase library not loaded. Include @supabase/supabase-js before this script.');
    return;
  }

  var SUPABASE_URL = window.SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();

