# Diagram validation and fidelity ledger

All exports below were regenerated from the canonical HTML in the same run. The figures describe only current source behavior.

## Package ledger

| Figure               | Type · primary semantic pattern                   | Fidelity note                                                                                                                                                    | Accessible description                                                                                                                                | Package                                                                                                     |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Architecture         | Architecture · inward dependency layers           | Collapses route variants, individual policy functions, and schema fields into six review-level components; retains Next.js, feature, and server-only boundaries. | Next.js boundary, contact feature, and server-only data are connected through contracts, rules, the normalized contact, and the synthetic repository. | [`HTML`](architecture.html) · [`SVG`](architecture.svg) · [`PNG`](architecture.png)                         |
| Request flow         | Architecture · fan-out with isolated lifecycles   | Collapses query construction and response fields; retains independent abort/stale guards plus list and detail terminal states.                                   | Route identity fans out through independent list and detail effects, allowing detail to complete without list completion.                             | [`HTML`](request-flow.html) · [`SVG`](request-flow.svg) · [`PNG`](request-flow.png)                         |
| Verification process | Process · stage framework with semantic slots     | Collapses individual test files into four stages; retains the repeated input, gate, and output contract for every stage.                                         | RED, GREEN, REFACTOR, and VERIFY stages preserve explicit inputs, gates, and outputs through current-candidate evidence.                              | [`HTML`](verification-process.html) · [`SVG`](verification-process.svg) · [`PNG`](verification-process.png) |
| Components           | Architecture · container–presentational ownership | Collapses detail subsections into one leaf and omits framework loading/error wrappers; retains the state-owning workspace and presentational split.              | Page routes provide identity, the workspace owns request state, and list/detail views render navigation and evidence.                                 | [`HTML`](components.html) · [`SVG`](components.svg) · [`PNG`](components.png)                               |
| Domain               | Tree · concept hierarchy                          | Collapses field-level DTO shapes; retains the aggregate, five owned concepts, and evidence/interaction leaves.                                                   | A tenant-scoped Contact owns identity, qualification, timeline, policy, and separate handoff concepts.                                                | [`HTML`](domain.html) · [`SVG`](domain.svg) · [`PNG`](domain.png)                                           |

## Validation results

| Gate                                               | Current result                                                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Packaged accessible-SVG and single-file self-check | PASS — 5/5 canonical HTML files                                                                                                                            |
| XML and unique accessible IDs                      | PASS — 5/5 SVG exports parse; each `aria-labelledby` resolves to prefixed title and description IDs                                                        |
| Geometry                                           | PASS — 5/5; no diagonal `<line>`, off-axis paths are orthogonal with rounded bends, shared-edge fan-outs use distinct ports, and nodes keep open corridors |
| Render harness                                     | PASS — Chromium loaded 5/5 local HTML files with no page errors; SVG bounds exceeded 900 × 500 CSS pixels                                                  |
| PNG readback                                       | PASS — 5/5 valid PNG files at 1952 × 1220 pixels                                                                                                           |
| Semantic review                                    | PASS — one primary pattern per figure, no invented components or relationships, node/edge budgets respected                                                |
| Accessibility review                               | PASS — role, title-first, description, unique IDs, readable static frame, and non-color labels present                                                     |
| Offline safety                                     | PASS — no remote `href`/`src`, scripts, external images, or remote fonts                                                                                   |
| Motion                                             | N/A — static figures contain no motion or controller; reduced-motion behavior is therefore complete by default                                             |
| Manual visual inspection                           | PASS — all five PNGs inspected for clipping, overlap, routing, hierarchy, and token fidelity                                                               |

## Reproduction

Use the isolated environment and browser cache recorded in [`tool-lock.md`](tool-lock.md). The packaged check is:

```bash
PLAYWRIGHT_BROWSERS_PATH=/home/home/.cache/diagram-design-browsers \
  /home/home/.cache/diagram-design-venv/bin/python \
  /home/home/.claude/plugins/cache/diagram-design/diagram-design/2.6.12/skills/diagram-design/scripts/self_check.py \
  docs/diagrams/{architecture,request-flow,verification-process,components,domain}.html
```

The derived-export run waits for `document.fonts.ready`, screenshots only the first SVG at device scale 2, and closes Chromium before completion. XML/geometry/render/readback checks use the same isolated Python and browser paths.
