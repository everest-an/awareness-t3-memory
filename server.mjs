#!/usr/bin/env node
/**
 * Web demo: run demo.ts and show the real T3N/Awareness output.
 * The T3N key stays in the server process env; it is never sent to the page.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 37803);

function runDemo() {
  return new Promise((resolve) => {
    const proc = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "demo.ts"], {
      cwd: ROOT,
      env: process.env,
      shell: process.platform === "win32",
    });
    let out = "";
    proc.stdout.on("data", (d) => { out += d.toString(); });
    proc.stderr.on("data", (d) => { out += d.toString(); });
    const timer = setTimeout(() => { try { proc.kill(); } catch { /* ignore */ } }, 120_000);
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output: out.trim() });
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/run") {
    const result = await runDemo();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(result));
  }
  const rel = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "not found" }));
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(fs.readFileSync(file));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Awareness × T3N demo → http://127.0.0.1:${PORT}`);
  console.log(`T3N key: ${process.env.T3N_API_KEY ? "present" : "MISSING"}`);
});
