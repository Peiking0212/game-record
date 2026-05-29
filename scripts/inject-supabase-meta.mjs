#!/usr/bin/env node
/**
 * Inject publishable Supabase config into static HTML for GitHub Pages / Cloudflare.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from `.env`
 * (see `.env.example`). Never writes SERVICE_ROLE, ITAD_API_KEY, or sb_secret_*.
 *
 * Deploy workflow (optional — meta may already be committed):
 *   1. Copy `.env.example` → `.env` and fill anon key + project URL
 *   2. npm run supabase:inject-meta
 *   3. Commit updated HTML and push
 *
 * Each Supabase page must also load (before js/supabase.js):
 *   <script src="js/lib/supabase-browser.js"></script>
 *
 * Usage:
 *   node scripts/inject-supabase-meta.mjs
 *   node scripts/inject-supabase-meta.mjs auth.html index.html
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

/** HTML pages that load js/supabase.js (keep in sync when adding new pages). */
const DEFAULT_HTML_TARGETS = [
  "auth.html",
  "index.html",
  "wishlist.html",
  "game.html",
  "games.html",
  "gallery.html",
  "achievements.html",
  "stats.html",
  "spending.html",
  "reviews.html",
  "report.html",
  "profile.html",
];

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "";
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "";

if (!url || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}
if (anon.includes("service_role") || anon.startsWith("sb_secret_")) {
  console.error("Refusing to inject a secret key into HTML meta tags.");
  process.exit(1);
}

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : DEFAULT_HTML_TARGETS;

for (const rel of targets) {
  const file = resolve(root, rel);
  if (!existsSync(file)) {
    console.warn("Skip missing:", rel);
    continue;
  }
  let html = readFileSync(file, "utf8");
  html = html.replace(
    /<meta name="app:supabase-url" content="[^"]*">/,
    `<meta name="app:supabase-url" content="${url}">`,
  );
  html = html.replace(
    /<meta name="app:supabase-anon-key" content="[^"]*">/,
    `<meta name="app:supabase-anon-key" content="${anon}">`,
  );
  if (!html.includes('name="app:supabase-url"')) {
    html = html.replace(
      "</head>",
      `    <meta name="app:supabase-url" content="${url}">\n    <meta name="app:supabase-anon-key" content="${anon}">\n</head>`,
    );
  }
  if (
    html.includes('src="js/supabase.js"') &&
    !html.includes('src="js/lib/supabase-browser.js"')
  ) {
    html = html.replace(
      /<script src="js\/supabase\.js"><\/script>/,
      `<script src="js/lib/supabase-browser.js"></script>\n    <script src="js/supabase.js"></script>`,
    );
    console.warn("Added js/lib/supabase-browser.js before supabase.js:", rel);
  }
  writeFileSync(file, html);
  console.log("Updated meta tags:", rel);
}
