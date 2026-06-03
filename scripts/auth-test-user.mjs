#!/usr/bin/env node
/**
 * Sign in test user from .env (never pass password on CLI).
 * Usage: set TEST_USER_EMAIL + TEST_USER_PASSWORD in .env, then:
 *   npm run test:auth:login
 */
import { loadEnv } from "./lib/load-env.mjs";
import {
  jwtMeta,
  resolveTestUserAccessToken,
} from "./lib/test-user-auth.mjs";

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "";
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "";
const email = env.TEST_USER_EMAIL || "";
const password = env.TEST_USER_PASSWORD || "";

if (!url || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and anon key in .env / .env.local");
  process.exit(1);
}

if (!email || !password) {
  console.error(
    "Add to .env (do not paste in chat):\n  TEST_USER_EMAIL=...\n  TEST_USER_PASSWORD=...",
  );
  process.exit(1);
}

const result = await resolveTestUserAccessToken({
  supabaseUrl: url,
  anonKey: anon,
  accessToken: env.TEST_USER_ACCESS_TOKEN || "",
  refreshToken: env.TEST_USER_REFRESH_TOKEN || "",
  email,
  password,
});

if (result.error) {
  console.error(`Login failed: ${result.error}${result.status ? ` (${result.status})` : ""}`);
  process.exit(1);
}

const meta = jwtMeta(result.access_token);
console.log(`OK | source=${result.source} | alg=${meta.alg} | valid until ${meta.expLocal} | sub=${meta.sub}`);
console.log(
  "Optional: copy refresh_token from a fresh /auth login into TEST_USER_REFRESH_TOKEN to skip password next time.",
);
console.log("Run: npm run test:backend:acceptance");
