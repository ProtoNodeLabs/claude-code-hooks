#!/usr/bin/env node
// ClaudeBrain Classify Message Hook
// Fires on every user message — detects save-worthy content and nudges Claude to route it
// to the right ClaudeBrain folder rather than leaving it in the conversation.
//
// Signals detected: explicit save requests, decisions, key insights, project updates,
// architecture discussions, blockers, and any custom client/domain patterns you add.
//
// Config: set the CLAUDEBRAIN env var to your vault path, or it defaults to ~/ClaudeBrain.

import { homedir } from "node:os";
import { join } from "node:path";

type HookInput = { prompt?: string; hook_event_name?: string };

const VAULT = process.env.CLAUDEBRAIN ?? join(homedir(), "ClaudeBrain");

let raw = "";
process.stdin.setEncoding("utf-8");
for await (const chunk of process.stdin) raw += chunk;

let input: HookInput = {};
try { input = JSON.parse(raw); } catch { process.exit(0); }

const prompt = input.prompt;
if (typeof prompt !== "string" || !prompt.trim()) process.exit(0);

const lower = prompt.toLowerCase();

type Signal = { label: string; pattern: RegExp; route?: string };

const signals: Signal[] = [
  // General captures
  { label: "SAVE_REQUEST",    pattern: /\b(save this|note this|remember this|log this|capture this)\b/ },
  { label: "DECISION",        pattern: /\b(decided|we('re| are) going with|chose|agreed to|going with|settled on)\b/ },
  { label: "KEY_INSIGHT",     pattern: /\b(key insight|important(ly)?|worth noting|turns out|lesson learned|realized)\b/ },
  { label: "PROJECT_UPDATE",  pattern: /\b(shipped|launched|deployed|merged|milestone|done with|finished|completed)\b/ },
  { label: "ARCHITECTURE",    pattern: /\b(architecture|system design|trade.?off|adr|we('re| are) using|tech decision)\b/ },
  { label: "BLOCKER",         pattern: /\b(blocked|blocker|stuck on|can't proceed|waiting on)\b/ },

  // Example: add your own client/domain signals here.
  // {
  //   label: "CLIENT_REQUEST",
  //   pattern: /\b(client-name).{0,60}(asked|wants|needs|requested)\b/i,
  //   route: join(VAULT, "clients", "client-name-requests.md")
  // },
];

const matched = signals.filter(s => s.pattern.test(lower));
if (matched.length === 0) process.exit(0);

const hints = matched.map(s => `- ${s.label}`).join("\n");

const routingLines: string[] = [
  `Quick saves go to ${join(VAULT, "inbox", "YYYY-MM-DD-<slug>.md")}.`,
  `Decisions go to ${join(VAULT, "dev", "decisions")}.`,
  `Project updates go to the relevant file in ${join(VAULT, "dev", "projects")}.`,
  `Always include frontmatter: created, tags.`,
];

for (const s of matched) {
  if (s.route) {
    const clientName = s.label.replace("_REQUEST", "").toLowerCase();
    routingLines.push(
      `For ${s.label}: append the request to ${s.route} as a checklist item under "## Pending" — ` +
      `format: \`- [ ] <request description> — ${clientName} requested\`. ` +
      `Create the file with standard frontmatter if it doesn't exist.`
    );
  }
}

const additionalContext =
  `Content classification — these signals were detected in the user's message:\n${hints}\n\n` +
  routingLines.join(" ");

process.stdout.write(JSON.stringify({ hookEventName: "UserPromptSubmit", additionalContext }) + "\n");
