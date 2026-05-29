#!/usr/bin/env node
/**
 * Injects NEXT_PUBLIC_SUPABASE_* from .env into HTML meta tags (local deploy helper).
 * Does not touch service role keys. Run: node scripts/inject-supabase-meta.mjs [file.html ...]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

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
  : ["wishlist.html", "index.html", "game.html"];

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
  writeFileSync(file, html);
  console.log("Updated meta tags:", rel);
}
