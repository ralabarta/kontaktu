# Final local verification evidence

## Outcome

The complete W1–W7 local candidate passed the deterministic automated matrix after final normalization and graph regeneration. Automated evidence below comes from executable checks; the browser, visual-fidelity, focus, disclosure, and privacy readbacks remain explicitly manual evidence. No GitHub-hosted CI run, deployment, or remote metadata change is claimed.

- Tasks 1.1–7.3: complete locally.
- CI configuration: present and mirrored by the local commands below; remote status unobserved.
- Diagrams: five canonical packages pass the official self-check.
- Time-box: exceeded; exact elapsed time was not instrumented, so no compliant duration is claimed.

## Candidate identity

| Field             | Value                                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base commit       | `794c3fcefde1d6560810f2117ae47d513961d0fd`                                                                                                                                               |
| Candidate         | Uncommitted W1–W7 worktree authenticated by W7 runtime revision `sha256:436f8f755154ad8c62c252b17dcc2743cd51cf4b41311efed908b9c2acd2ddd1` and request `cc-20260902-contact-w7-acquire-1` |
| Evidence captured | 2026-09-02 UTC                                                                                                                                                                           |
| Scope             | Complete local automated matrix plus the preserved W5/W6 manual and diagram evidence; final byte digest is reported by the W7 phase envelope                                             |

The runtime revision identifies the bounded attempt, not a commit. Because the worktree is intentionally uncommitted, reviewers must pair it with the base commit, final phase digest, and command results instead of treating a historical commit as current evidence.

## Automated checks actually run

The first complete pass exposed one React lint violation in the W3 detail-loading effect. Existing UI tests stayed green while detail request state was keyed by request ID and the synchronous effect update was removed; the complete matrix then passed. After this ledger was updated, formatting and graph generation ran again and the entire matrix below was repeated against the final bytes.

| Command                                                               | Final result                                                                                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                                   | PASS — all matched files use Prettier formatting.                                                                                                    |
| `pnpm typecheck`                                                      | PASS — `tsc --noEmit`, exit 0.                                                                                                                       |
| `pnpm lint`                                                           | PASS — ESLint reported zero errors and warnings.                                                                                                     |
| `pnpm test:privacy`                                                   | PASS — 5/5 Node tests.                                                                                                                               |
| `pnpm check:privacy`                                                  | PASS — 63 in-memory raw strings compared; no forbidden public fixture match. The command states that its heuristic does not prove all PII is absent. |
| `pnpm test:coverage`                                                  | PASS — 7 files, 70 tests; 91.12% statements, 85.96% branches, 91.73% functions, and 93.68% lines.                                                    |
| `pnpm build`                                                          | PASS — Next.js 16.3.4 production build compiled, typechecked, collected data, and generated static pages.                                            |
| `pnpm test:e2e`                                                       | PASS — 7/7 Chromium journeys, including keyboard and axe coverage.                                                                                   |
| Pinned `diagram-design` `self_check.py` over all canonical HTML files | PASS — 5/5 `OK`.                                                                                                                                     |
| `git diff --check`                                                    | PASS — no whitespace errors.                                                                                                                         |

CI syntax was parsed by Prettier's YAML parser during `pnpm format:check` and inspected against the package scripts: immutable action commit references, read-only token permissions, exact pnpm version, Node 22.14.0, lockfile installation, pnpm caching, bounded timeouts, concurrency cancellation, privacy checks, format, typecheck, lint, coverage, build, and Chromium E2E are present. The workflow requires no secrets and performs no deployment.

## Executable API harness

A fresh local server on port 3200 exercised the documented curl paths and was then stopped.

| Request                                    | Observed result                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `GET /api/contacts?q=Aina&source=voice`    | `200`; one result, `demo-contact-01`; query/source metadata matched.        |
| `GET /api/contacts/demo-contact-07`        | `200`; `meta.found=true`; call unavailable and email technically available. |
| `GET /api/contacts?source=invalid`         | `400`.                                                                      |
| `GET /api/contacts/demo-contact-16-hidden` | `404`.                                                                      |
| `GET /api/contacts/demo-contact-99`        | `404`.                                                                      |
| Hidden-tenant versus unknown response body | Byte-identical.                                                             |

The route integration tests additionally parse successful list/detail payloads with the shared strict Zod schemas and cover malformed-success rejection.

## Representative browser matrix

A headless Chromium matrix used desktop `1280×900` and mobile `375×812` viewports. Each route reached a visible primary heading, and every case had `document.documentElement.scrollWidth <= window.innerWidth`.

| State      | Route                       | Desktop                                                   | Mobile                                      | Axe                                                                             |
| ---------- | --------------------------- | --------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| Rich       | `/contacts/demo-contact-01` | PASS — `Aina Ficticia Compradora`, no horizontal overflow | PASS — same heading, no horizontal overflow | PASS on remediation rerun — zero serious or critical violations at both widths. |
| Sparse     | `/contacts/demo-contact-04` | PASS — `Contacto sin identificar`, no horizontal overflow | PASS — same heading, no horizontal overflow | PASS — zero violations.                                                         |
| Restricted | `/contacts/demo-contact-07` | PASS — `Dora Caso Cumplimiento`, no horizontal overflow   | PASS — same heading, no horizontal overflow | PASS on remediation rerun — zero serious or critical violations at both widths. |
| Not found  | `/contacts/demo-contact-99` | PASS — `Contacto no encontrado`, no horizontal overflow   | PASS — same heading, no horizontal overflow | PASS — zero violations.                                                         |

The remediation axe harness reran rich and restricted states at `1280×900` and `375×812`; all four checks reported zero serious or critical violations.

## Keyboard, focus, and disclosure

On `/contacts/demo-contact-01` at desktop width:

- first `Tab` focused the `Ir al contenido` skip link;
- the focused link had a visible solid `3px` outline;
- `Enter` moved programmatic focus to `#contenido`;
- the transcript disclosure accepted keyboard focus and `Enter`;
- the synthetic transcript became visible after expansion.

The browser API check also confirmed the hidden tenant ID was absent from the list and indistinguishable from an unknown detail ID.

## Visual fidelity review

Available supplied captures were read and compared with fresh W5 captures:

- [`screenshots/contact-desktop.png`](screenshots/contact-desktop.png): current rich detail at `974px`, full-page height `1966px`.
- [`screenshots/compliance-mobile.png`](screenshots/compliance-mobile.png): current restricted detail at `360px`, full-page height `1662px`.

Manual readback confirmed the current captures preserve the supplied Kontaktu visual structure: cream shell, serif editorial headings, green status accents, dark before-call card, bordered content cards, compact list/detail hierarchy, and mobile single-column reflow. The restricted mobile capture keeps call blocking and human handoff distinct and visible before qualification/history.

Pixel identity is **not** claimed. ImageMagick absolute-error comparison reported 489,862 differing desktop pixels and 230,481 differing mobile pixels; the current candidate includes deterministic Madrid date/time output (the restricted interaction now shows `10:00` rather than the earlier `04:00`) and the mobile page is one pixel taller. The screenshots are evidence of the current UI, not golden visual-regression baselines.

## Final graph and publication audit

`graphify update .` rebuilt the local ignored graph after all code, configuration, and documentation mutations. The resulting report contains 391 nodes, 578 edges, 25 communities, 99% extracted edges, 1% inferred edges, 0% ambiguous edges, and no import cycles. Its recorded base `794c3fce` matches the current base commit; the rebuild also indexed the uncommitted candidate files.

A tracked-path audit found none of the original challenge distributions, raw local datasets, agent settings, MCP settings, or generated graph state in Git's tracked set. The CI workflow references no secrets, write permission, deployment, or environment. These structural checks supplement—but do not replace—the privacy scanner and manual public-repository readback.

## Process cleanup

Final socket inspection found no listener on ports 3100 or 3200. Playwright's configured web server and all Chromium workers exited after the test run; no temporary W7 script or generated test artifact was added to the publication set.

The first ad-hoc W5 browser run had exposed that terminating the package-manager parent did not stop Next.js's child process. That child was explicitly stopped before the Playwright rerun. Subsequent API verification used a dedicated process group and cleanup trap.

## Preserved W5 remediation evidence

1. `.supporting-text` now uses the darker existing muted token; rich and restricted axe reruns passed at desktop and mobile widths.
2. Both flagged test values carry explicit synthetic markers; `pnpm check:privacy` passed.
3. The affected contact UI test file passed after the source changes; fresh rich-desktop and restricted-mobile readback retained headings, reflow, and no horizontal overflow.

W6 diagram evidence and W7 final automated evidence now supplement this preserved manual/remediation record.
