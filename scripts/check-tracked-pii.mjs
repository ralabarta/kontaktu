import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_PATH = resolve(ROOT, "contactos.json");
const PII_FIELDS = ["full_name", "phone", "email"];

function collectRawPii(raw) {
  const contacts = Array.isArray(raw?.contacts) ? raw.contacts : [];
  const values = [];

  for (const contact of contacts) {
    for (const field of PII_FIELDS) {
      const value = contact?.[field];
      if (typeof value === "string" && value.trim()) {
        values.push({ field, bytes: Buffer.from(value) });
      }
    }
  }

  return values;
}

function findMatches(pii, files) {
  const matches = [];

  for (const file of files) {
    for (const entry of pii) {
      let offset = file.bytes.indexOf(entry.bytes);
      while (offset !== -1) {
        matches.push({
          field: entry.field,
          path: file.path,
          line: file.bytes.subarray(0, offset).toString("utf8").split("\n")
            .length,
        });
        offset = file.bytes.indexOf(entry.bytes, offset + entry.bytes.length);
      }
    }
  }

  return matches;
}

function assertScannerWorks() {
  const probe = [
    { field: "full_name", bytes: Buffer.from("Synthetic Scanner Person") },
    { field: "phone", bytes: Buffer.from("+999 000 000") },
    { field: "email", bytes: Buffer.from("scanner@example.invalid") },
  ];
  const matches = findMatches(probe, [
    {
      path: "synthetic-probe.txt",
      bytes: Buffer.from(
        "Synthetic Scanner Person\n+999 000 000\nscanner@example.invalid\n",
      ),
    },
  ]);

  if (matches.length !== probe.length) {
    throw new Error("PII scanner self-test failed");
  }
}

function trackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: ROOT,
    encoding: "buffer",
  });
  if (result.status !== 0) {
    throw new Error("Unable to enumerate tracked files");
  }

  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((path) => ({ path, bytes: readFileSync(resolve(ROOT, path)) }));
}

assertScannerWorks();

let raw;
try {
  raw = JSON.parse(readFileSync(RAW_PATH, "utf8"));
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log(
      "PII scan: raw dataset absent; synthetic scanner self-test passed.",
    );
    process.exit(0);
  }
  throw new Error("Unable to parse the local raw contact dataset", {
    cause: error,
  });
}

const pii = collectRawPii(raw);
if (pii.length === 0) {
  throw new Error("Local raw dataset contains no scannable contact PII");
}

const matches = findMatches(pii, trackedFiles());
if (matches.length > 0) {
  for (const match of matches) {
    console.error(
      `Raw PII match (${match.field}) at ${match.path}:${match.line}`,
    );
  }
  process.exit(1);
}

console.log(
  `PII scan: ${PII_FIELDS.join(", ")} values checked against tracked files; no matches.`,
);
