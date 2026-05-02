# claude-code-hooks

Production Claude Code hooks from the ProtoNodeLabs workflow. Drop these into `~/.claude/scripts/` to give Claude persistent memory across sessions using [ClaudeBrain](https://github.com/ProtoNodeLabs/pnl-claude-workflow).

Part of the [pnl-claude-workflow](https://github.com/ProtoNodeLabs/pnl-claude-workflow) system.

---

## What's in here

| Script | Hook event | What it does |
|---|---|---|
| `session-start.ts` | `SessionStart` | Pulls latest ClaudeBrain, injects goals, last session log, active projects, and inbox into context before the first message |
| `classify-message.ts` | `UserPromptSubmit` | Detects save-worthy signals (decisions, insights, blockers, project updates) and nudges Claude to route them to ClaudeBrain |
| `pre-compact.ts` | `PreCompact` | Writes a breadcrumb to ClaudeBrain before context compression so session state survives |
| `stop-hook.ts` | `Stop` | Prompts Claude to write a session log to ClaudeBrain when meaningful work occurred |
| `validate-write.ts` | `PostToolUse` | Checks YAML frontmatter hygiene on any ClaudeBrain file Claude writes |

---

## Requirements

- **Node.js 22+** (for `--experimental-strip-types` to run TypeScript directly — no build step needed)
- **ClaudeBrain repo** cloned to `~/ClaudeBrain` (see [pnl-claude-workflow](https://github.com/ProtoNodeLabs/pnl-claude-workflow) for the folder structure)
- **Claude Code** CLI

---

## Setup

**1. Copy scripts to your Claude scripts folder:**

```bash
mkdir -p ~/.claude/scripts
cp scripts/*.ts ~/.claude/scripts/
```

**2. Set your ClaudeBrain path** (if not at `~/ClaudeBrain`):

```bash
export CLAUDEBRAIN=/path/to/your/claudebrain
```

Or hard-code it: each script reads `process.env.CLAUDEBRAIN` and falls back to `~/ClaudeBrain`.

**3. Add hooks to `~/.claude/settings.json`:**

Copy the contents of `settings.example.json` into the `"hooks"` key of your existing settings file. Update the script paths to match where you placed them.

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "node --experimental-strip-types ~/.claude/scripts/session-start.ts", "timeout": 30 }] }],
    ...
  }
}
```

**4. Test it:**

Open Claude Code. You should see a `## ClaudeBrain — Session Context` block injected into the first message if your vault has content.

---

## Customizing `classify-message.ts`

The classify hook ships with generic signals (decisions, blockers, project updates, etc.). To add client- or domain-specific routing, uncomment and edit the example at the bottom of the signals array:

```typescript
{
  label: "CLIENT_REQUEST",
  pattern: /\b(client-name).{0,60}(asked|wants|needs|requested)\b/i,
  route: join(VAULT, "clients", "client-name-requests.md")
}
```

Matched requests get appended as checklist items to the specified file under `## Pending`.

---

## How it fits together

```
Session opens
  └── session-start.ts fires → ClaudeBrain context injected

User sends a message
  └── classify-message.ts fires → save-worthy signals flagged → Claude routes to vault

Claude writes a ClaudeBrain file
  └── validate-write.ts fires → frontmatter hygiene checked

Context fills up
  └── pre-compact.ts fires → breadcrumb written → Claude captures open state

Claude stops responding
  └── stop-hook.ts fires → Claude prompted to write session log
```

---

## Node version note

These scripts use top-level `await` and `--experimental-strip-types` (Node 22+). If you're on an older Node version, compile them first:

```bash
npx tsc --target ES2022 --module NodeNext --outDir ~/.claude/scripts/compiled/ scripts/*.ts
```

Then reference the compiled `.js` files in your settings.

---

Built by [ProtoNodeLabs](https://proto-nodelabs.com). MIT licensed.
