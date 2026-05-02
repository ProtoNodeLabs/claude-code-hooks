#!/usr/bin/env node
// ClaudeBrain Validate Write Hook
// Fires after Write/Edit tool use on any ClaudeBrain file — checks for YAML frontmatter
// hygiene and warns Claude before it moves on to the next task.
//
// Config: set the CLAUDEBRAIN env var to your vault path, or it defaults to ~/ClaudeBrain.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const VAULT = process.env.CLAUDEBRAIN ?? join(homedir(), "ClaudeBrain");

type HookInput = { tool_input?: { file_path?: string }; hook_event_name?: string };

let raw = "";
process.stdin.setEncoding("utf-8");
for await (const chunk of process.stdin) raw += chunk;

let input: HookInput = {};
try { input = JSON.parse(raw); } catch { process.exit(0); }

const filePath = input.tool_input?.file_path;
if (!filePath || !filePath.startsWith(VAULT)) process.exit(0);
if (!filePath.endsWith(".md")) process.exit(0);

// Skip top-level brain files — these are freeform, no frontmatter required
const skip = ["north-star.md", "key-decisions.md", "patterns.md", "gotchas.md"];
const base = filePath.split(/[/\\]/).pop()?.toLowerCase() ?? "";
if (skip.includes(base)) process.exit(0);

let content = "";
try { content = readFileSync(filePath, "utf-8"); } catch { process.exit(0); }

const warnings: string[] = [];
if (!content.startsWith("---")) {
  warnings.push("Missing YAML frontmatter — add `---` block with `created` and `tags`");
} else {
  if (!/^created:/m.test(content)) warnings.push("Frontmatter missing `created: YYYY-MM-DD`");
  if (!/^tags:/m.test(content)) warnings.push("Frontmatter missing `tags: [...]`");
}

if (warnings.length === 0) process.exit(0);

const additionalContext =
  `Vault hygiene warnings for \`${base}\`:\n${warnings.map(w => `  - ${w}`).join("\n")}\nFix before moving on.`;

process.stdout.write(JSON.stringify({ hookEventName: "PostToolUse", additionalContext }) + "\n");
