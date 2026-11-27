import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TABLE = path.join(path.dirname(fileURLToPath(import.meta.url)), "host-range.json");

function readTable() {
  try {
    const raw = JSON.parse(fs.readFileSync(TABLE, "utf8"));
    return {
      verified: Array.isArray(raw.verified) ? raw.verified.map(String) : [],
      knownBroken: Array.isArray(raw.knownBroken) ? raw.knownBroken.map(String) : [],
    };
  } catch {
    return { verified: [], knownBroken: [] };
  }
}

/**
 * 宿主版本落在哪一档：verified / knownBroken / unknown。
 * 半显式范围表——认识的版本列表，其余一律 unknown。unknown 只 warn，仍然照打补丁，
 * 因为补丁本身按锚点结算，miss 会进 pending。
 */
export function classifyHostVersion(version) {
  const v = String(version || "").trim();
  if (!v) return { level: "unknown", version: "", warn: "宿主版本没读到，按未知版本处理" };
  const table = readTable();
  if (table.knownBroken.includes(v)) {
    return { level: "knownBroken", version: v, warn: `宿主 ${v} 在已知问题表里，补丁可能对不上` };
  }
  if (table.verified.includes(v)) return { level: "verified", version: v, warn: "" };
  return { level: "unknown", version: v, warn: `宿主 ${v} 未验证，锚点对不上的补丁会进待适配` };
}

export function verifiedVersions() {
  return readTable().verified;
}
