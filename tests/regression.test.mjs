import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import * as core from "../lib/core.js";
import * as reapply from "../lib/reapply.js";
import {
  assemblyHasExactInject,
  rewritePromptAssembly,
  textCarriesInject,
} from "../lib/identity.js";
import { apply as applyPlugin, startupHealReasons } from "../lib/index.js";
import { extractLatestChangelogSection } from "../lib/update.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("package.json has single files key and plaintext prompts are untracked", () => {
  const raw = fs.readFileSync(path.join(ROOT, "package.json"), "utf8");
  const matches = raw.match(/"files"\s*:/g) || [];
  assert.equal(matches.length, 1, "package.json should only declare \"files\" once");

  const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  const leaked = tracked.filter((f) => /^lib\/default-prompt-inject\./.test(f));
  assert.deepEqual(leaked, [], `plaintext prompt files must not be tracked in git: ${leaked.join(", ")}`);
});

test("install.ps1 and uninstall.ps1 carry UTF-8 BOM with LF line endings", () => {
  for (const name of ["install.ps1", "uninstall.ps1"]) {
    const buf = fs.readFileSync(path.join(ROOT, name));
    assert.equal(buf[0], 0xef, `${name} missing UTF-8 BOM byte 0`);
    assert.equal(buf[1], 0xbb, `${name} missing UTF-8 BOM byte 1`);
    assert.equal(buf[2], 0xbf, `${name} missing UTF-8 BOM byte 2`);
    assert.equal(buf.includes(0x0d), false, `${name} should use LF line endings`);
  }
});

test("required anchor miss enters pending (adapt_pending), optional skips, strictFiles fails", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-breach-test-core-"));
  const prevHome = process.env.DSH_HOME;
  process.env.DSH_HOME = path.join(tmp, ".dsh");
  core.resetPathMemo();
  try {
    const aiBase = path.join(tmp, "node_modules", "@deepseek-ai");
    const sysPromptDir = path.join(aiBase, "dsh-system-prompt", "lib");
    fs.mkdirSync(sysPromptDir, { recursive: true });
    const sysPromptFile = path.join(sysPromptDir, "index.js");
    // Unrecognizable content so anchors miss
    fs.writeFileSync(sysPromptFile, "export const changedUpstream = true;\n", "utf8");

    const customPatches = [
      {
        id: 901,
        name: "REQ_ANCHOR_MISS",
        file: "system-prompt",
        patterns: ["const oldOfficialAnchor = 1;"],
        replace: "const newAnchor = 2; // [dsh-breach]",
        marker: "[dsh-breach]",
      },
      {
        id: 902,
        name: "OPT_ANCHOR_MISS",
        file: "system-prompt",
        optional: true,
        patterns: ["const optionalAnchor = 1;"],
        replace: "const optionalAnchor = 2;",
      },
      {
        id: 903,
        name: "STRICT_ANCHOR_MISS",
        file: "system-prompt",
        strictFiles: true,
        patterns: ["const strictAnchor = 1;"],
        replace: "const strictAnchor = 2;",
      },
    ];

    const report = await core.applyPatches(aiBase, customPatches);
    const byId = new Map(report.map((r) => [r.patch_id, r]));
    assert.equal(byId.get(901)?.status, "pattern_not_found");
    assert.equal(byId.get(902)?.status, "skipped");
    assert.equal(byId.get(903)?.status, "pattern_not_found");

    const summary = core.summarizeApplyReport(report, customPatches);
    assert.equal(summary.pending.length, 1);
    assert.equal(summary.pending[0].patch_id, 901);
    assert.equal(summary.pending[0].expect, "const oldOfficialAnchor = 1;");
    assert.equal(summary.failed.length, 1);
    assert.equal(summary.failed[0].patch_id, 903);
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = prevHome;
    core.resetPathMemo();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("single prompt injection deduplicates across trailing newline and CRLF variants", () => {
  const inject = "你是小码酱，直接给结果。\n第二行规则。\n";
  const crlfTrimmedPrior = "你是小码酱，直接给结果。\r\n第二行规则。";

  assert.equal(textCarriesInject(crlfTrimmedPrior, inject), true);
  assert.equal(assemblyHasExactInject([{ name: "persona-prefix", text: crlfTrimmedPrior }], inject), true);

  const assembled = {
    sections: [
      { name: "deployment:persona-prefix", text: "" },
      { name: "persona-prefix", text: crlfTrimmedPrior },
      { name: "dsh-breach", text: inject },
    ],
    contexts: [],
    tools: [],
  };
  const out = rewritePromptAssembly(assembled, {
    fallbackInject: inject,
    capabilityProtocol: false,
    dropMnemon: true,
  });
  const carrying = out.sections.filter((s) => textCarriesInject(s.text, inject));
  assert.equal(carrying.length, 1, `expected exactly 1 section with inject, got ${carrying.length}`);
  assert.equal(carrying[0].name, "persona-prefix");
});

test("startupHealReasons stays idle before first apply and triggers after stamp exists", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-breach-test-heal-"));
  const prevHome = process.env.DSH_HOME;
  process.env.DSH_HOME = tmp;
  core.resetPathMemo();
  try {
    // 1. Fresh install (no applied.json): must NOT heal even when sealed
    assert.deepEqual(startupHealReasons({ surface: "desktop", sealed: true }), []);

    // 2. User applied once, host reverted to sealed without healedSealed flag
    reapply.markPatchesApplied("apply:1.3.5", {
      live: false,
      markers: 10,
      hostVersion: "0.2.2-rc.5",
      healedSealed: false,
    });
    const reasons1 = startupHealReasons({ surface: "desktop", sealed: true });
    assert.ok(reasons1.includes("still-sealed"));
    assert.ok(reasons1.includes("markers-lost"));

    // 3. Same state after auto-heal (markers=0, healedSealed=true): no repeat trigger
    reapply.markPatchesApplied("apply:1.3.5", {
      live: false,
      markers: 0,
      hostVersion: "0.2.2-rc.5",
      healedSealed: true,
    });
    assert.deepEqual(startupHealReasons({ surface: "desktop", sealed: true }), []);
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = prevHome;
    core.resetPathMemo();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("web routes /dsh-breach/status works in ESM and blocks cross-origin / form-navigate POST", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-breach-test-http-"));
  const prevHome = process.env.DSH_HOME;
  process.env.DSH_HOME = tmp;
  const routes = new Map();
  const disposers = [];
  const mockHost = {
    get(name) {
      if (name === "webServer" || name === "connection") return {};
      return undefined;
    },
    effect(fn) {
      const cleanup = fn();
      if (typeof cleanup === "function") disposers.push(cleanup);
    },
    webServer: {
      register(spec) {
        routes.set(spec.path, spec.handler);
        return () => routes.delete(spec.path);
      },
    },
  };
  const mockCtx = {
    effect(fn) {
      const cleanup = fn();
      if (typeof cleanup === "function") disposers.push(cleanup);
    },
    on() {
      return () => {};
    },
    inject(deps, cb) {
      if (deps.includes("connection") || deps.includes("webServer")) cb(mockHost);
    },
    get() {
      return undefined;
    },
    systemPrompt: {
      variable() {},
      section() { return () => {}; },
    },
  };

  function callRoute(routePath, { method = "GET", headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const handler = routes.get(routePath);
      assert.ok(handler, `route ${routePath} should be registered`);
      let statusCode = 200;
      let rawBody = "";
      const req = {
        method,
        url: routePath,
        headers,
        async *[Symbol.asyncIterator]() {},
      };
      const res = {
        writeHead(code) { statusCode = code; },
        end(chunk = "") {
          rawBody += String(chunk || "");
          resolve({ statusCode, body: rawBody ? JSON.parse(rawBody) : null });
        },
      };
      Promise.resolve(handler(req, res)).catch(reject);
    });
  }

  try {
    applyPlugin(mockCtx, { autoApplyOnStart: false });
    const okRes = await callRoute("/dsh-breach/status", {
      method: "GET",
      headers: { host: "127.0.0.1:43120" },
    });
    assert.equal(okRes.statusCode, 200);
    assert.equal(okRes.body.ok, true);
    assert.equal(typeof okRes.body.system_field_extracted, "boolean");

    const csrfForm = await callRoute("/dsh-breach/restart", {
      method: "POST",
      headers: {
        host: "127.0.0.1:43120",
        "sec-fetch-mode": "navigate",
      },
    });
    assert.equal(csrfForm.statusCode, 403);
    assert.equal(csrfForm.body.ok, false);
  } finally {
    for (const d of disposers.reverse()) {
      try { d(); } catch {}
    }
    if (prevHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = prevHome;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("client.js loads cleanly in ModuleLoader with Scheme B tokens and no legacy modals", async () => {
  const src = fs.readFileSync(path.join(ROOT, "client.js"), "utf8");
  assert.equal(src.includes("dshp-pool"), false, "legacy animated blue blobs must be removed");
  assert.equal(src.includes("dshp-auth-modal"), false, "legacy auth/update modal class must be removed");
  assert.equal(src.includes("dshp-restart-card"), false, "legacy beige/pink restart modal class must be removed");
  assert.equal(src.includes("window.confirm("), false, "native browser confirm must be replaced by SchemeBDialog");
  assert.equal(src.includes("dshp-b-dialog"), true, "Scheme B unified dialog class should exist");
  assert.equal(src.includes("dshp-b-code"), true, "Scheme B inline code capsule class should exist");
  assert.equal(src.includes("#1B2230"), true, "Scheme B dark graphite header token should exist");
  assert.equal(src.includes("#F1F4F9"), true, "Scheme B slate tray token should exist");

  let captured = null;
  const prevWin = globalThis.window;
  globalThis.window = {
    __ModuleLoader__: {
      load(entry) {
        captured = entry;
      },
    },
    location: { origin: "http://127.0.0.1:43120", port: "43120", hostname: "127.0.0.1", href: "http://127.0.0.1:43120/" },
    localStorage: { getItem: () => null, setItem: () => {} },
    addEventListener() {},
    removeEventListener() {},
    setInterval: () => 1,
    clearInterval() {},
    setTimeout: () => 1,
    clearTimeout() {},
  };
  try {
    const fn = new Function(src);
    fn();
    assert.ok(captured && typeof captured.factory === "function", "ModuleLoader.load should capture factory");
    const mockReact = {
      createElement: (type, props, ...children) => ({ type, props, children }),
      useState: (init) => [typeof init === "function" ? init() : init, () => {}],
      useEffect: () => {},
      useCallback: (cb) => cb,
      useRef: (v) => ({ current: v }),
      Fragment: Symbol("Fragment"),
      Component: class { constructor(p) { this.props = p; } },
    };
    const mod = captured.factory((id) => (id === "react" ? mockReact : {}));
    assert.equal(mod.name, "dsh-breach");
    assert.deepEqual(mod.inject, ["slots", "locale"]);
    assert.equal(typeof mod.apply, "function");

    let locales = null;
    mod.apply({
      effect: (cb) => cb(),
      locale: {
        register(_ns, dict) { locales = dict; },
        bind() { return (k) => k; },
      },
      slots: {
        inject(_slot, cb) { cb(); },
        register() {},
      },
    });
    assert.ok(locales?.zh && locales?.en, "zh and en dictionaries should be registered");
    for (const key of [
      "tab.patches",
      "tab.prompt",
      "tab.settings",
      "ov.groupDetail",
      "set.sysTitle",
      "restore.title",
      "restore.confirm",
    ]) {
      assert.ok(locales.zh[key], `missing zh key ${key}`);
      assert.ok(locales.en[key], `missing en key ${key}`);
    }
  } finally {
    if (prevWin === undefined) delete globalThis.window;
    else globalThis.window = prevWin;
  }
});

test("extractLatestChangelogSection selects target or latest version section cleanly", () => {
  const sample = [
    "# 更新日志",
    "",
    "## 1.3.7 — 前端控制面板重制为方案 B",
    "### 界面与交互",
    "- 采用 `#1B2230` 深石墨撞色顶栏。",
    "",
    "## 1.3.6 — 修复安装脚本报错",
    "### 修复",
    "- 修复 `install.ps1` 缺少 UTF-8 BOM。",
    "",
  ].join("\n");

  const latest = extractLatestChangelogSection(sample);
  assert.ok(latest.startsWith("## 1.3.7"), "default should pick top-most release section");
  assert.equal(latest.includes("1.3.6"), false, "should not include older release sections");

  const targeted = extractLatestChangelogSection(sample, "v1.3.6");
  assert.ok(targeted.startsWith("## 1.3.6"), "targetVersion should match specific release heading");
  assert.equal(targeted.includes("1.3.7"), false);
});

test("atomicWriteSync and atomicWriteFile preserve POSIX file mode", { skip: process.platform === "win32" }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-breach-mode-test-"));
  try {
    const execFile = path.join(tmp, "dsh-shim");
    fs.writeFileSync(execFile, "#!/bin/sh\necho old\n", { encoding: "utf8", mode: 0o755 });
    fs.chmodSync(execFile, 0o755);

    core.atomicWriteSync(execFile, "#!/bin/sh\necho sync\n", "utf8");
    assert.equal(fs.statSync(execFile).mode & 0o777, 0o755, "atomicWriteSync should preserve 0o755");

    await core.atomicWriteFile(execFile, "#!/bin/sh\necho async\n", "utf8");
    assert.equal(fs.statSync(execFile).mode & 0o777, 0o755, "atomicWriteFile should preserve 0o755");

    const secretFile = path.join(tmp, "secret.json");
    fs.writeFileSync(secretFile, "{}\n", { encoding: "utf8", mode: 0o600 });
    fs.chmodSync(secretFile, 0o600);

    core.atomicWriteSync(secretFile, "{\"ok\":true}\n", "utf8");
    assert.equal(fs.statSync(secretFile).mode & 0o777, 0o600, "atomicWriteSync should preserve 0o600");

    await core.atomicWriteFile(secretFile, "{\"ok\":2}\n", "utf8");
    assert.equal(fs.statSync(secretFile).mode & 0o777, 0o600, "atomicWriteFile should preserve 0o600");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("repairOfficialCliAfterUnpack keeps and heals POSIX executable bit on dsh shim", { skip: process.platform === "win32" }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-breach-cli-repair-"));
  try {
    const appBundle = path.join(tmp, "DeepSeek Harness.app", "Contents");
    const exe = path.join(appBundle, "MacOS", "DeepSeek Harness");
    const resources = path.join(appBundle, "Resources");
    const shimDir = path.join(resources, "runtime", "cli", "bin");
    const shimPath = path.join(shimDir, "dsh");
    fs.mkdirSync(path.dirname(exe), { recursive: true });
    fs.mkdirSync(path.join(resources, "app"), { recursive: true });
    fs.mkdirSync(shimDir, { recursive: true });
    fs.writeFileSync(exe, "", "utf8");

    const stockShim = [
      "#!/bin/sh",
      "set -e",
      "resources=$(CDPATH= cd -- \"$(dirname -- \"$0\")/../../..\" && pwd -P)",
      "ELECTRON_RUN_AS_NODE=1 exec \"$resources/../MacOS/DeepSeek Harness\" --expose-internals \"$resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js\" \"$@\"",
      "",
    ].join("\n");
    fs.writeFileSync(shimPath, stockShim, { encoding: "utf8", mode: 0o755 });
    fs.chmodSync(shimPath, 0o755);

    const first = core.repairOfficialCliAfterUnpack(exe);
    assert.equal(first.ok, true);
    const firstShim = first.shims.find((s) => s.path === shimPath);
    assert.equal(firstShim?.status, "patched");
    assert.equal(fs.statSync(shimPath).mode & 0o777, 0o755, "patched shim should keep 0o755");
    assert.equal(fs.statSync(`${shimPath}.dsh-breach.bak`).mode & 0o777, 0o755);

    // Simulate legacy bug: shim already patched, but mode downgraded to 0o644
    fs.chmodSync(shimPath, 0o644);
    assert.equal(fs.statSync(shimPath).mode & 0o777, 0o644);

    const second = core.repairOfficialCliAfterUnpack(exe);
    assert.equal(second.ok, true);
    const secondShim = second.shims.find((s) => s.path === shimPath);
    assert.equal(secondShim?.status, "already");
    assert.equal(secondShim?.chmodRepaired, true);
    assert.equal(fs.statSync(shimPath).mode & 0o777, 0o755, "already-patched shim should self-heal to 0o755");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
