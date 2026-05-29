#!/usr/bin/env node
/**
 * Reads .deploy-mcp-args.json and prints deploy args JSON to stdout (for MCP deploy_edge_function).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = JSON.parse(
  readFileSync(join(root, ".deploy-mcp-args.json"), "utf8"),
);
process.stdout.write(JSON.stringify(args));
