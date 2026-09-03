# Proposed repository metadata

This is a local proposal only. No GitHub settings, topics, social preview, status checks, releases, or other remote state were changed.

## Description

> Trustworthy contact intelligence for messy real-estate CRM data, with explainable provenance, safe compliance, and a ten-second before-call view.

The description leads with the reviewer outcome, avoids unsupported production claims, and fits GitHub's repository-description field.

## Topics

```text
nextjs
typescript
react
crm
contact-management
data-normalization
accessibility
playwright
```

These focused topics describe the product, stack, data problem, and quality evidence without turning package names or the AI-assisted workflow into marketing. Do not add `production`, `deployed`, `openapi`, or `ai-agent`: the repository does not support those claims.

## Social preview

Use a purpose-built 1280×640 image after the final UI and diagrams are complete. Recommended composition:

- product name and one-line outcome on the left;
- a legible crop of the rich desktop detail on the right;
- the cream, navy, green, and serif/sans visual language already used by the app;
- no readable phone numbers, email addresses, transcripts, or other record-level values, even synthetic ones;
- sufficient contrast and safe margins for GitHub cropping;
- small disclosure: `Synthetic data · Portfolio case study`.

Do not reuse a full application screenshot as the final preview: detail text becomes illegible and creates unnecessary data-shaped exposure. The preview asset remains pending; no binary social-preview asset is created in W5.

## Status and evidence plan

| Surface          | Proposed treatment                                  | Evidence required before remote use                                                                                                                                 |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository state | Describe as a portfolio case study.                 | README keeps the exceeded challenge time-box and AI-assistance disclosure prominent.                                                                                |
| Data             | State `Synthetic demo only`.                        | `pnpm test:privacy` and `pnpm check:privacy` pass against the publication candidate.                                                                                |
| Application      | Link to [`verification.md`](verification.md).       | The ledger names the current uncommitted candidate and reports every final local gate without historical substitution.                                              |
| API              | Link to [`api.md`](api.md).                         | Local Route Handler tests and build pass; no hosted endpoint is claimed.                                                                                            |
| CI               | Use the workflow result, without a badge initially. | `.github/workflows/ci.yml` completes on the repository's default branch using the frozen lockfile and no secrets. Add a badge only after observing that remote run. |
| Diagrams         | Link from the README, without a status badge.       | Five canonical HTML packages and exports retain a documented 5/5 self-check.                                                                                        |
| Social preview   | Upload the reviewed purpose-built asset.            | A maintainer confirms dimensions, crop safety, contrast, and absence of readable record-level values.                                                               |
| Deployment       | Leave unset.                                        | No deployment URL or deployment badge is appropriate for this repository.                                                                                           |

Local automated evidence proves reproducible repository checks; it does not prove a GitHub-hosted workflow run. Manual evidence covers visual fidelity, representative states, focus, disclosure clarity, privacy readback, and social-preview suitability. Keep those evidence classes separate.

## Suggested About-panel links

- Website: leave empty unless a deployment is intentionally created later.
- README: enabled.
- Releases/packages: leave unclaimed.
- Issues/discussions: follow the eventual repository owner's collaboration policy; W5 makes no recommendation that implies active maintenance.

## Remote execution checklist

This checklist is intentionally deferred and must be performed by a maintainer only after local final verification and the first GitHub-hosted CI run:

- [ ] Reconfirm description and topics against the final repository.
- [ ] Produce and privacy-review the social preview.
- [ ] Confirm final CI status before adding any badge.
- [ ] Apply metadata through GitHub settings with explicit authorization.
- [ ] Re-read the public repository to ensure no private context or unsupported claims were exposed.
