#!/usr/bin/env node
/**
 * Prints deploy payload path for MCP deploy_edge_function (6 files).
 * Usage: node scripts/deploy-price-ingest-mcp.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = join(root, "supabase/functions/run-price-ingest");
const names = [
  "index.ts",
  "adapters/index.ts",
  "adapters/types.ts",
  "adapters/itad.ts",
  "adapters/steam.ts",
  "adapters/cheapshark.ts",
];

const payload = {
  project_id: "oxbyshstrvzshxpaztzg",
  name: "run-price-ingest",
  entrypoint_path: "index.ts",
  verify_jwt: false,
  files: names.map((name) => ({
    name,
    content: readFileSync(join(base, name), "utf8"),
  })),
};

const out = join(root, ".deploy-run-price-ingest.json");
writeFileSync(out, JSON.stringify(payload));
console.log("Wrote", out, "bytes", JSON.stringify(payload).length);
