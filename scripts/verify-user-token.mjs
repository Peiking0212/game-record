#!/usr/bin/env node
import { loadEnv } from "./lib/load-env.mjs";
import {
  jwtMeta,
  resolveTestUserAccessToken,
} from "./lib/test-user-auth.mjs";

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

const result = await resolveTestUserAccessToken({
  supabaseUrl: url,
  anonKey: anon,
  accessToken: env.TEST_USER_ACCESS_TOKEN || "",
  refreshToken: env.TEST_USER_REFRESH_TOKEN || "",
  email: env.TEST_USER_EMAIL || "",
  password: env.TEST_USER_PASSWORD || "",
});

if (!result.access_token) {
  console.error("No valid token:", result.error || "unknown");
  process.exit(1);
}

const meta = jwtMeta(result.access_token);
console.log(`OK | source=${result.source} |`, meta);

const res = await fetch(`${url}/auth/v1/user`, {
  headers: { apikey: anon, Authorization: `Bearer ${result.access_token}` },
});
const body = await res.json().catch(() => ({}));
console.log(
  `auth/v1/user: status=${res.status}`,
  body.email || body.message || body.error_description || "",
);
