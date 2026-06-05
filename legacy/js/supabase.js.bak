// ========================================
// Supabase browser bootstrap (compat layer)
// ========================================
(function () {
  if (!window.GameTimeSupabase || typeof window.GameTimeSupabase.createBrowserClient !== "function") {
    console.warn("[Supabase] Missing js/lib/supabase-browser.js, using local mode.");
    window.SB = null;
    return;
  }

  // Keep existing pages compatible: app code still reads window.SB.
  window.SB = window.GameTimeSupabase.createBrowserClient();
})();
