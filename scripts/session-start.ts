#!/usr/bin/env node
// ClaudeBrain Session Start Hook
// Fires at session startup — pulls latest vault then injects context so Claude is immediately oriented.
// Reads brain/, last session log, active projects, and inbox to give Claude a full picture before the first message.
//
// Config: set CLAUDEBRAIN_PATH to your ClaudeBrain repo location, or set the CLAUDEBRAIN env var at runtime.

import { readFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";

const VAULT = process.env.CLAUDEBRAIN ?? join(homedir(), "ClaudeBrain");

// Pull latest ClaudeBrain before reading — keeps cross-machine sync current
try {
  execSync("git pull --ff-only", { cwd: VAULT, stdio: "pipe" });
} catch {
  // Never block session start if pull fails (offline, conflict, etc.)
}

function safeRead(path: string): string | null {
  try { return readFileSync(path, "utf-8").trim(); } catch { return null; }
}

function safeList(dir: string, ext = ".md"): string[] {
  try { return readdirSync(dir).filter((f: string) => f.endsWith(ext)).sort(); }
  catch { return []; }
}

const parts: string[] = ["## ClaudeBrain — Session Context\n"];

// North Star goals
const northStar = safeRead(join(VAULT, "brain", "north-star.md"));
if (northStar) parts.push(`### Goals & Focus\n${northStar}\n`);

// Most recent session log
const logs = safeList(join(VAULT, "dev", "session-logs")).reverse();
if (logs.length > 0) {
  const last = safeRead(join(VAULT, "dev", "session-logs", logs[0]));
  if (last) parts.push(`### Last Session (${logs[0].replace(".md", "")})\n${last}\n`);
}

// Active projects list
const projects = safeList(join(VAULT, "dev", "projects"));
if (projects.length > 0) {
  const names = projects.map((f: string) => `- ${f.replace(".md", "")}`).join("\n");
  parts.push(`### Active Projects\n${names}\n`);
}

// Inbox items needing attention
const inbox = safeList(join(VAULT, "inbox"));
if (inbox.length > 0) {
  const items = inbox.map((f: string) => `- ${f}`).join("\n");
  parts.push(`### Inbox (${inbox.length} item${inbox.length !== 1 ? "s" : ""} pending)\n${items}\n`);
}

const additionalContext = parts.join("\n");
process.stdout.write(JSON.stringify({ hookEventName: "SessionStart", additionalContext }) + "\n");
