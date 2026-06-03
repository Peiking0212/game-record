import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../../..");

function loadEnvFile(filename: string): Record<string, string> {
  const path = resolve(root, filename);
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return out;
}

export function loadE2eEnv(): Record<string, string> {
  return {
    ...loadEnvFile(".env"),
    ...loadEnvFile(".env.local"),
    ...process.env,
  } as Record<string, string>;
}

export function getTestCredentials(): { email: string; password: string } {
  const env = loadE2eEnv();
  return {
    email: env.TEST_USER_EMAIL || "",
    password: env.TEST_USER_PASSWORD || "",
  };
}
