#!/usr/bin/env node
import { loadEnv } from "./lib/load-env.mjs";
import {
  jwtMeta,
  resolveTestUserAccessToken,
} from "./lib/test-user-auth.mjs";

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "";
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
const USER_TOKEN = env.TEST_USER_ACCESS_TOKEN || "";
const REFRESH_TOKEN = env.TEST_USER_REFRESH_TOKEN || "";
const TEST_EMAIL = env.TEST_USER_EMAIL || "";
const TEST_PASSWORD = env.TEST_USER_PASSWORD || "";
const ANON_TOKEN = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "";
const isSecretServiceKey = SERVICE_KEY.startsWith("sb_secret_");

let activeUserToken = USER_TOKEN;

async function resolveUserAccessToken() {
  const result = await resolveTestUserAccessToken({
    supabaseUrl: SUPABASE_URL,
    anonKey: ANON_TOKEN,
    accessToken: USER_TOKEN,
    refreshToken: REFRESH_TOKEN,
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (result.access_token) {
    const m = jwtMeta(result.access_token);
    console.log(`User JWT via ${result.source}: ${m.alg}, valid until ${m.expLocal}`);
    return result.access_token;
  }

  console.error(
    [
      "Could not obtain a valid user access_token.",
      result.error === "access_token_expired"
        ? "TEST_USER_ACCESS_TOKEN expired."
        : result.error || "unknown",
      "Set TEST_USER_EMAIL + TEST_USER_PASSWORD in .env, or TEST_USER_REFRESH_TOKEN, then retry.",
      "Do not paste passwords in chat — use .env only.",
    ].join("\n"),
  );
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

if (isSecretServiceKey && !ANON_TOKEN) {
  console.error(
    "sb_secret_ keys require NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) as apikey — set it in .env or .env.local.",
  );
  process.exit(1);
}

if (
  isSecretServiceKey &&
  !USER_TOKEN &&
  !REFRESH_TOKEN &&
  !(TEST_EMAIL && TEST_PASSWORD)
) {
  console.error(
    "Set TEST_USER_ACCESS_TOKEN, TEST_USER_REFRESH_TOKEN, or TEST_USER_EMAIL+TEST_USER_PASSWORD.",
  );
  process.exit(1);
}

const endpoint = (name) => `${SUPABASE_URL}/functions/v1/${name}`;

async function invoke(name, { body, auth = "service" } = {}) {
  const bearer =
    auth === "user"
      ? activeUserToken
      : isSecretServiceKey
        ? activeUserToken || ANON_TOKEN
        : SERVICE_KEY;
  const headers = {
    Authorization: `Bearer ${bearer}`,
    "Content-Type": "application/json",
  };
  if (isSecretServiceKey) {
    // Gateway: apikey = anon/publishable JWT; Authorization = user session JWT.
    headers.apikey = ANON_TOKEN;
  }
  const res = await fetch(endpoint(name), {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function pass(label, detail = "") {
  console.log(`PASS | ${label}${detail ? ` | ${detail}` : ""}`);
}

function fail(label, detail = "") {
  console.log(`FAIL | ${label}${detail ? ` | ${detail}` : ""}`);
}

function skip(label, detail = "") {
  console.log(`SKIP | ${label}${detail ? ` | ${detail}` : ""}`);
}

async function main() {
  console.log("=== Backend Acceptance (non-AI + AI) ===");
  if (isSecretServiceKey) {
    activeUserToken = await resolveUserAccessToken();
    console.log(
      `Auth mode: sb_secret apikey + user JWT (anon=${!!ANON_TOKEN})`,
    );
  }

  // Non-AI: lookup-game validation (missing payload) — needs service role
  if (SERVICE_KEY) {
    const r = await invoke("lookup-game", { body: {}, auth: "service" });
    if (r.status >= 400) pass("lookup-game invalid payload blocked", `status=${r.status}`);
    else fail("lookup-game invalid payload blocked", `status=${r.status}`);
  } else {
    skip("lookup-game service test", "missing SUPABASE_SERVICE_ROLE_KEY");
  }

  // Non-AI: upsert-alert validation
  if (SERVICE_KEY) {
    const r = await invoke("upsert-alert", {
      body: { gameId: -1, targetPrice: -5 },
      auth: "service",
    });
    if (r.status >= 400) pass("upsert-alert invalid payload blocked", `status=${r.status}`);
    else fail("upsert-alert invalid payload blocked", `status=${r.status}`);
  } else skip("upsert-alert service test", "missing service role");

  // Non-AI: sync-user-games missing steam id
  if (SERVICE_KEY) {
    const r = await invoke("sync-user-games", { body: {}, auth: "service" });
    if (r.status >= 400) pass("sync-user-games missing steam id blocked", `status=${r.status}`);
    else fail("sync-user-games missing steam id blocked", `status=${r.status}`);
  } else skip("sync-user-games service test", "missing service role");

  // AI endpoint: complex normal scenario (works with service role; anon may 401 on invoke)
  {
    const body = {
      wishlist: [
        { id: "w1", name: "原神", platform: "PC", price: 198 },
        { id: "w2", name: "赛博朋克2077", platform: "Steam", price: 298 },
        { id: "w3", name: "艾尔登法环", platform: "PlayStation", price: 399 },
      ],
      games: [
        { id: 1, name: "王者荣耀", type: "MOBA", status: "playing" },
        { id: 2, name: "明日方舟", type: "策略", status: "playing" },
      ],
      dealWatchRules: {
        minDiscountPercent: 45,
        preferredPlatforms: ["Steam", "PC"],
      },
    };
    const r = await invoke("fetch-personalized-feed", { body, auth: "service" });
    const news = Array.isArray(r.json?.news) ? r.json.news : [];
    const deals = Array.isArray(r.json?.deals) ? r.json.deals : [];
    if (r.status === 200 && news.length > 0 && deals.length > 0) {
      pass(
        "fetch-personalized-feed complex scenario",
        `status=${r.status}, news=${news.length}, deals=${deals.length}`,
      );
    } else {
      fail(
        "fetch-personalized-feed complex scenario",
        `status=${r.status}, news=${news.length}, deals=${deals.length}`,
      );
    }
  }

  // AI endpoint: boundary bad payload
  if (SERVICE_KEY) {
    const r = await invoke("fetch-personalized-feed", {
      body: { wishlist: "bad", games: null, dealWatchRules: { minDiscountPercent: 999 } },
      auth: "service",
    });
    if (r.status === 200) {
      pass("fetch-personalized-feed boundary payload resilient", `status=${r.status}`);
    } else {
      fail("fetch-personalized-feed boundary payload resilient", `status=${r.status}`);
    }
  } else skip("fetch-personalized-feed service test", "missing service role");

  // Optional user-token gated checks
  if (!activeUserToken) {
    skip(
      "user-auth function flow checks",
      "Set TEST_USER_ACCESS_TOKEN to validate authorized user paths",
    );
  } else {
    const r = await invoke("lookup-game", {
      auth: "user",
      body: { query: "Hades", import: false, allowManual: true },
    });
    if (r.status === 200 || r.status === 404) {
      pass("lookup-game user-token flow", `status=${r.status}`);
    } else {
      fail("lookup-game user-token flow", `status=${r.status}`);
    }
  }

  console.log("=== Acceptance done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
