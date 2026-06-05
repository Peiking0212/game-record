(function () {
  /**
   * Browser-safe Supabase config loader.
   * Production should inject values through:
   *   1) window.__APP_ENV__
   *   2) <meta name="app:*"> tags
   * Never hardcode service role keys in frontend bundles.
   */
  function readMeta(name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? (el.getAttribute("content") || "").trim() : "";
  }

  function readBrowserEnv() {
    var appEnv = window.__APP_ENV__ || {};
    return {
      url: String(
        appEnv.NEXT_PUBLIC_SUPABASE_URL ||
          readMeta("app:supabase-url") ||
          ""
      ).trim(),
      anonKey: String(
        appEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          readMeta("app:supabase-anon-key") ||
          ""
      ).trim(),
    };
  }

  function createBrowserClient() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.warn("[Supabase] SDK not loaded, fallback to local mode.");
      return null;
    }

    var cfg = readBrowserEnv();
    if (!cfg.url || !cfg.anonKey || cfg.anonKey.indexOf("sb_secret_") === 0) {
      console.warn(
        "[Supabase] Missing browser env. Inject NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in production."
      );
      return null;
    }

    return window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  window.GameTimeSupabase = {
    readBrowserEnv: readBrowserEnv,
    createBrowserClient: createBrowserClient,
  };
})();
