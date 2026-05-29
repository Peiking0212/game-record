/**
 * Server-side Supabase entrypoint placeholder.
 *
 * This project is currently browser-first. If you later add a Node/SSR runtime,
 * read env values from process.env and create a server client here.
 *
 * Security:
 * - Never expose SUPABASE_SERVICE_ROLE_KEY to browser code.
 * - Keep this file imported only by server runtime modules.
 */

function getServerEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    appEnv: process.env.APP_ENV || "development",
  };
}

module.exports = {
  getServerEnv,
};
