import { spawn } from "node:child_process";

const host = process.env.E2E_HOST || "127.0.0.1";
const port = process.env.E2E_PORT || "3000";
const url = `http://${host}:${port}/auth`;

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    cwd: process.cwd(),
    stdio: options.stdio ?? "inherit",
    env: { ...process.env, ...options.env },
    windowsHide: true,
  });
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function killTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    await waitForExit(killer);
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

const server = spawnProcess(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", host, "-p", port],
  { stdio: "ignore" },
);

let exitCode = 1;
try {
  await waitForServer();
  const args = ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)];
  const runner = spawnProcess(process.execPath, args, {
    env: { PLAYWRIGHT_SKIP_WEB_SERVER: "1", E2E_BASE_URL: `http://${host}:${port}` },
  });
  const result = await waitForExit(runner);
  exitCode = result.code ?? (result.signal ? 1 : 0);
} finally {
  await killTree(server.pid);
}

process.exit(exitCode);
