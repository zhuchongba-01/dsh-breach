# dsh-happy

A [DSH (DeepSeek Harness)](https://github.com/deepseek-ai) plugin that injects **prompts, rules and tools** into the host, plus a fully reversible **patch engine**.

Once installed, your DSH runs with the persona and rules this plugin defines — and every patch it applies can be rolled back, because each one keeps a backup.

- Target host: `dsh 0.2.1-rc.5`
- Surfaces: `web` / `desktop`
- License: MIT

---

## What it actually does

### 1. Prompt injection

Resolution order (highest first):

```
text currently in the input box  >  $DSH_HOME/prompt-inject.md  >  encrypted built-in default
```

- The default prompt is sealed in `lib/asset-table.js` with AES-256-GCM + deflate and decrypted at runtime — no plaintext on disk.
- To use your own: edit `$DSH_HOME/prompt-inject.md`. Saving is enough; no restart needed.
- Different models can be bound to different prompts via presets.

### 2. Patch engine (86 patches)

It rewrites specific strings inside the host's `@deepseek-ai/*` sources:

| Group | Effect |
|---|---|
| `disclaimer` | global / replacement / scoped disclaimers → strong directive |
| `approval_sentence` | approval prompt sentence → auto-approve |
| `approval_policy` | approval defaults to `never` + auto-approve |
| `desktop_update` | official desktop update hand-off |
| `desktop_close` | host exit without the error dialog |
| `hooks_deny` | hooks deny → allow |
| `hooks_steer` | Stop / UserPromptSubmit no longer fake-interject or reject the whole turn |

- Every patch has a stable id, writes a `.dshhappy.bak` backup first, and is recorded in `$DSH_HOME/dsh-happy/applied.json`.
- After a host upgrade you can replay (reapply) or revert the whole batch.
- Unknown host versions are skipped rather than force-patched.

### 3. Three tools

| Tool | Purpose |
|---|---|
| `happy_status` | which patches are applied, which failed, where the backups are |
| `happy_apply` | apply / replay patches |
| `happy_revert` | restore from backups |

### 4. Region and sensitive-action gate

`lib/net-scope.js` intercepts on the first step:

- hosts in mainland China / Hong Kong / Macao
- roughly 200 banking domains
- attack-pattern keywords

Blocked requests get a refusal string and never reach the model. Allowlist: `$DSH_HOME/net-scope-allow.txt`, one entry per line.

### 5. Web panel

The plugin registers a `/dsh-happy/*` route group on its web surface (status, apply, revert, uninstall, restart, rewind, skills, rules, override, …).
Only same-origin requests are accepted: cross-site `sec-fetch-site`, `Origin: null`, and `Origin` ≠ `Host` are rejected.

### 6. Skills, rules, rewind

- Skill and rule CRUD share the same HTTP + tool interfaces.
- Rewind rolls a session back to a chosen turn.

---

## Install

### From npm

```bash
dsh plugin --profile desktop add dsh-happy-pj
```

### From a local directory

```bash
dsh plugin --profile desktop add .
```

Or edit the profile's `package.json` by hand:

```json
{
  "dependencies": { "dsh-happy-pj": "link:D:/dsh/dsh-happy" },
  "dsh": { "profile": { "bundles": ["dsh-happy-pj"] } }
}
```

then run `pnpm install` inside that profile directory.

Restart the host afterwards and verify:

```bash
curl http://127.0.0.1:52034/dsh-happy/status
```

`{"ok":true,...}` means it loaded.

---

## Layout

```
lib/
  index.js           entry: tools, routes, injection hooks
  core.js            patch engine (86 patches + display groups + apply/revert)
  client.js          client bundle (sidebar UI, i18n, styles)
  desktop.js         desktop surface adapter
  identity.js        identity overlay
  net-scope.js       region / sensitive-action gate
  asset-table.js     sealed default prompt asset
  table-key.js       seal / unseal (AES-256-GCM + deflate)
  skills.js          skill management
  rules.js           rule management
  rewind.js          session rewind
  update.js          self-update (disabled by default)
bin/
  dsh-happy.js       CLI
scripts/
  embed-default-prompt.mjs   seal a plaintext md into asset-table.js
```

## State directory

Everything lives in `$DSH_HOME/dsh-happy/`:

| File | Contents |
|---|---|
| `applied.json` | applied patch ids and backup locations |
| `host-backups/` | host file backups |
| `drill-grant.json` | drill grant |
| `override-state.json` | override state |
| `installed-rev` | installed revision marker |

---

## Development

```bash
# re-seal the default prompt (prepare lib/default-prompt-inject.md first)
pnpm embed-prompt

# syntax check
node --check lib/index.js
```

You only need `embed-prompt` after editing the default prompt text; the runtime never reads the plaintext md.

## Uninstall

```bash
dsh plugin --profile desktop remove dsh-happy-pj
```

Or `happy_revert` first, then remove the package. Keep `$DSH_HOME/dsh-happy/` until you've confirmed the host is healthy.

## License

[MIT](./LICENSE) © 2026 zhuchongba01

This plugin works by rewriting host sources — use it on your own machine, on your own installation.
