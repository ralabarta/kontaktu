import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test, { afterEach } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../scripts/check-public-fixtures.mjs",
);

const temporaryRoots = new Set();

afterEach(() => {
  for (const root of temporaryRoots)
    rmSync(root, { force: true, recursive: true });
  temporaryRoots.clear();
});

function repository(files, raw) {
  const root = mkdtempSync(resolve(tmpdir(), "kontaktu-privacy-"));
  temporaryRoots.add(root);
  spawnSync("git", ["init", "--quiet"], { cwd: root });

  for (const [path, contents] of Object.entries(files)) {
    const absolutePath = resolve(root, path);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents);
  }
  spawnSync("git", ["add", ...Object.keys(files)], { cwd: root });

  if (raw) writeFileSync(resolve(root, "contactos.json"), JSON.stringify(raw));
  return root;
}

function scan(root) {
  return spawnSync(
    process.execPath,
    [SCRIPT, "--root", root, "--raw", resolve(root, "contactos.json")],
    { encoding: "utf8" },
  );
}

test("passes enforceable synthetic fixtures when the raw dataset is absent", () => {
  const root = repository({
    "tests/fixtures/contact.json": JSON.stringify({
      is_test: true,
      full_name: "Synthetic Fixture Person",
      phone: "+34 100 00 00 00",
      email: "person@example.invalid",
      notes: "Synthetic fixture note",
    }),
  });

  const result = scan(root);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /raw comparison skipped/i);
  assert.match(result.stdout, /does not prove that all PII is absent/i);
});

test("fails on a non-reserved email without relying on raw data", () => {
  const nonReservedEmail = ["person", "real-domain.test"].join("@");
  const root = repository({
    "tests/fixtures/contact.json": JSON.stringify({
      is_test: true,
      full_name: "Synthetic Fixture Person",
      email: nonReservedEmail,
    }),
  });

  const result = scan(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /non-reserved email/i);
});

test("fails real-looking phone and media references without raw data", () => {
  const realLookingPhone = ["+34", "612", "34", "56", "78"].join(" ");
  const nonReservedAudioUrl = [
    "https:/",
    "/records.",
    "real-domain.test/call.mp3",
  ].join("");
  const root = repository({
    "tests/fixtures/contact.json": JSON.stringify({
      is_test: true,
      full_name: "Synthetic Fixture Person",
      phone: realLookingPhone,
      audio_url: nonReservedAudioUrl,
    }),
  });

  const result = scan(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /phone fixture.*synthetic\/reserved range/i);
  assert.match(result.stderr, /non-reserved URL host/i);
  assert.match(result.stderr, /audio fixture/i);
});

test("fails contact-like JSON fixtures that omit is_test true", () => {
  const root = repository({
    "tests/fixtures/contact.json": JSON.stringify({
      full_name: "Synthetic Fixture Person",
      email: "person@example.invalid",
    }),
  });

  const result = scan(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /is_test.*true/i);
});

test("compares local raw sensitive strings without printing their values", () => {
  const secretNote = "Private sentence unique to the local raw dataset";
  const root = repository(
    {
      "tests/fixtures/contact.json": JSON.stringify({
        is_test: true,
        full_name: "Synthetic Fixture Person",
        notes: secretNote,
      }),
    },
    { contacts: [{ notes: secretNote }] },
  );

  const result = scan(root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /raw sensitive-string match.*notes/i);
  assert.doesNotMatch(result.stderr, new RegExp(secretNote));
});
