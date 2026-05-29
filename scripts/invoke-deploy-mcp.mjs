#!/usr/bin/env node
/** Prints deploy_edge_function arguments JSON to stdout for MCP (all 6 files). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const payload = JSON.parse(
  readFileSync(join(root, ".deploy-mcp-payload.json"), "utf8"),
);
const args = {
  project_id: payload.project_id,
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: payload.verify_jwt,
  files: payload.files,
};
process.stdout.write(JSON.stringify(args));
