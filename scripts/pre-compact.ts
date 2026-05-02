#!/usr/bin/env node
// ClaudeBrain Pre-Compact Hook
// Fires before context compaction — writes a breadcrumb to ClaudeBrain so session context
// survives compression. Claude also receives a reminder to capture open decisions and next
// steps before the context window is summarized.
//
// Config: set the CLAUDEBRAIN env var to your vault path, or it defaults to ~/ClaudeBrain.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const VAULT = process.env.CLAUDEBRAIN ?? join(homedir(), "ClaudeBrain");

type HookInput = { transcript_path?: string; hook_event_name?: string };

let raw = "";
process.stdin.setEncoding("utf-8");
for await (const chunk of process.stdin) raw += chunk;

let input: HookInput = {};
try { input = JSON.parse(raw); } catch {}

const now = new Date();
const date = now.toISOString().split("T")[0];
const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
const logsDir = join(VAULT, "dev", "session-logs");

try {
  mkdirSync(logsDir, { recursive: true });
  const breadcrumb = [
    `---`,
    `created: ${date}`,
    `tags: [session, compaction]`,
    `---`,
    ``,
    `# Compaction Breadcrumb — ${date} ${time}`,
    ``,
    `Context compaction occurred at this point. Session was active.`,
    input.transcript_path ? `\nTranscript: ${input.transcript_path}` : "",
  ].join("\n");
  writeFileSync(join(logsDir, `${date}-${time}-compact.md`), breadcrumb, "utf-8");
} catch {
  // Never crash — compaction must proceed
}

const additionalContext =
  `Context compaction triggered at ${date} ${time}. A breadcrumb has been written to ClaudeBrain. ` +
  `Before summarizing, note any open decisions, active project state, and next steps so context survives the compaction.`;

process.stdout.write(JSON.stringify({ hookEventName: "PreCompact", additionalContext }) + "\n");
