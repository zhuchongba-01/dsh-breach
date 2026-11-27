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
