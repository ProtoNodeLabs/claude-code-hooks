#!/usr/bin/env node
// ClaudeBrain Stop Hook
// Fires when Claude stops responding — writes a last-active breadcrumb and prompts Claude
// to write a session log to ClaudeBrain if meaningful work occurred this session.
//
// Config: set the CLAUDEBRAIN env var to your vault path, or it defaults to ~/ClaudeBrain.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const VAULT = process.env.CLAUDEBRAIN ?? join(homedir(), "ClaudeBrain");

type HookInput = { stop_hook_active?: boolean };

let raw = "";
process.stdin.setEncoding("utf-8");
for await (const chunk of process.stdin) raw += chunk;

let input: HookInput = {};
try { input = JSON.parse(raw); } catch {}

// Prevent recursive firing when stop hook itself triggers a response
if (input.stop_hook_active === true) process.exit(0);

const now = new Date();
const date = now.toISOString().split("T")[0];

// Write a lightweight last-active breadcrumb (timestamp only — Claude writes the real log)
try {
  mkdirSync(join(VAULT, "dev", "session-logs"), { recursive: true });
  const breadcrumb = [
    `---`,
    `created: ${date}`,
    `tags: [session, breadcrumb]`,
    `---`,
    ``,
    `# Last Active: ${now.toISOString()}`,
    ``,
    `Session was active. See full session log if written.`,
  ].join("\n");
  writeFileSync(join(VAULT, "dev", "session-logs", `${date}-last-active.md`), breadcrumb, "utf-8");
} catch {}

// Output reminder — Claude sees this and writes the real summary
process.stdout.write(
  `Session wrap-up: if meaningful work happened this session, write a session log to ` +
  `${join(VAULT, "dev", "session-logs", date + "-<project>.md")} with: ` +
  `what changed, decisions made, next steps. Update the relevant project file in dev/projects/ if state changed. ` +
  `Skip if this was a trivial or exploratory session.`
);
