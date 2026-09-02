import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const COMMON_RAW_VALUES = new Set([
  "ai",
  "crm",
  "customer",
  "email",
  "manual",
  "requested",
  "unknown",
  "voice",
  "whatsapp",
]);
const CONTACT_KEYS = new Set([
  "email",
  "full_name",
  "interactions",
  "notes",
  "phone",
]);
const SENSITIVE_KEY =
  /^(?:content|email|full_name|name|notes?|phone|transcript(?:_excerpt)?|transcription)$/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_PATTERN = /https?:\/\/[^\s"'`)]+/gi;
const FIELD_STRING = (field) =>
  new RegExp(`["']?(?:${field})["']?\\s*[:=]\\s*["']([^"'\\n]+)["']`, "gi");

function parseArguments(argv) {
  const options = { root: DEFAULT_ROOT };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") options.root = resolve(argv[++index]);
    else if (argv[index] === "--raw") options.raw = resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  options.raw ??= resolve(options.root, "contactos.json");
  return options;
}

function trackedFiles(root) {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "buffer",
  });
  if (result.status !== 0) throw new Error("Unable to enumerate tracked files");

  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((path) => existsSync(resolve(root, path)))
    .filter((path) => TEXT_EXTENSIONS.has(extname(path)))
    .map((path) => {
      const bytes = readFileSync(resolve(root, path));
      return { path, bytes, text: bytes.toString("utf8") };
    });
}

function isFixturePath(path) {
  return (
    path.startsWith("tests/") ||
    path.includes("/__fixtures__/") ||
    path.includes("/fixtures/") ||
    basename(path).includes(".fixture.")
  );
}

function reservedHost(host) {
  const normalized = host.toLowerCase().replace(/\.$/, "");
  return (
    normalized.endsWith(".invalid") ||
    ["example.com", "example.net", "example.org"].some(
      (domain) => normalized === domain || normalized.endsWith(`.${domain}`),
    )
  );
}

function syntheticPhone(value) {
  const compact = value.replace(/[^\d+]/g, "");
  if (compact.startsWith("+999")) return true;
  const national = compact.startsWith("+34") ? compact.slice(3) : compact;
  return /^\d{9}$/.test(national) && /^[01]/.test(national);
}

function lineAt(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function validateJsonTestMarker(file, findings) {
  if (extname(file.path) !== ".json") return;
  let parsed;
  try {
    parsed = JSON.parse(file.text);
  } catch {
    findings.push({ path: file.path, line: 1, issue: "invalid JSON fixture" });
    return;
  }

  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    const keys = Object.keys(value);
    if (keys.some((key) => CONTACT_KEYS.has(key)) && value.is_test !== true) {
      findings.push({
        path: file.path,
        line: 1,
        issue: "contact-like JSON fixture requires is_test: true",
      });
    }
    Object.values(value).forEach(visit);
  }
  visit(parsed);
}

function validatePublicFixtures(files) {
  const findings = [];
  for (const file of files.filter(({ path }) => isFixturePath(path))) {
    for (const match of file.text.matchAll(EMAIL)) {
      const host = match[0].split("@").at(-1);
      if (!reservedHost(host)) {
        findings.push({
          path: file.path,
          line: lineAt(file.text, match.index),
          issue: "non-reserved email domain",
        });
      }
    }

    for (const match of file.text.matchAll(URL_PATTERN)) {
      if (!reservedHost(new URL(match[0]).hostname)) {
        findings.push({
          path: file.path,
          line: lineAt(file.text, match.index),
          issue: "non-reserved URL host",
        });
      }
    }

    for (const match of file.text.matchAll(
      FIELD_STRING("(?:phone|telephone|telefono|teléfono)"),
    )) {
      if (!syntheticPhone(match[1])) {
        findings.push({
          path: file.path,
          line: lineAt(file.text, match.index),
          issue: "phone fixture is not in an accepted synthetic/reserved range",
        });
      }
    }

    for (const match of file.text.matchAll(
      FIELD_STRING("(?:audio|audio_url|recording_url)"),
    )) {
      findings.push({
        path: file.path,
        line: lineAt(file.text, match.index),
        issue: "audio fixture must not reference recorded media",
      });
    }

    for (const match of file.text.matchAll(
      FIELD_STRING("(?:full_name|name)"),
    )) {
      if (!/(?:synthetic|fixture|test)/i.test(match[1])) {
        findings.push({
          path: file.path,
          line: lineAt(file.text, match.index),
          issue: "name fixture lacks an explicit synthetic marker",
        });
      }
    }

    validateJsonTestMarker(file, findings);
  }
  return findings;
}

function collectRawSensitiveStrings(raw) {
  const entries = [];
  function visit(value) {
    if (Array.isArray(value)) return value.forEach((item) => visit(item));
    if (!value || typeof value !== "object") return;
    for (const [childKey, childValue] of Object.entries(value)) {
      if (typeof childValue === "string" && SENSITIVE_KEY.test(childKey)) {
        const normalized = childValue.trim().toLowerCase();
        if (
          childValue.trim().length >= 5 &&
          !COMMON_RAW_VALUES.has(normalized)
        ) {
          entries.push({
            field: childKey,
            bytes: Buffer.from(childValue.trim()),
          });
        }
      } else {
        visit(childValue);
      }
    }
  }
  visit(raw);
  return entries;
}

function findRawMatches(entries, files) {
  const matches = [];
  for (const file of files) {
    for (const entry of entries) {
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

function run() {
  const { root, raw } = parseArguments(process.argv.slice(2));
  const files = trackedFiles(root);
  const findings = validatePublicFixtures(files);
  let rawSummary = "raw comparison skipped (local dataset absent)";

  try {
    const entries = collectRawSensitiveStrings(
      JSON.parse(readFileSync(raw, "utf8")),
    );
    if (entries.length === 0) {
      throw new Error(
        "Local raw dataset contains no eligible sensitive strings",
      );
    }
    for (const match of findRawMatches(entries, files)) {
      findings.push({
        ...match,
        issue: `raw sensitive-string match (${match.field})`,
      });
    }
    rawSummary = `raw comparison checked ${entries.length} in-memory strings`;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`${finding.issue} at ${finding.path}:${finding.line}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Privacy fixture check passed; ${rawSummary}.`);
  console.log(
    "Scope: reserved fixture emails/URLs, synthetic phone/name markers, JSON is_test markers, and optional exact raw-string leaks; this heuristic does not prove that all PII is absent.",
  );
}

run();
