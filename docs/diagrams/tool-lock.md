# Diagram tool lock

This directory is generated against one immutable local skill installation. The application dependency graph is unchanged.

| Tool                  | Locked value                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Diagram Design plugin | `diagram-design@2.6.12`                                                                                |
| Marketplace revision  | `75f2d5e1d6962e7d041500a41f8aee0f0265a6e3`                                                             |
| Skill entry point     | `/home/home/.claude/plugins/cache/diagram-design/diagram-design/2.6.12/skills/diagram-design/SKILL.md` |
| Python environment    | isolated `diagram-design-venv`                                                                         |
| Python Playwright     | `1.62.0`                                                                                               |
| Chromium              | `151` / Playwright build `1234`                                                                        |

## Output contract

- Canonical source: self-contained, static HTML with one inline accessible SVG.
- Derived exports: standalone accessible SVG and a 2× PNG captured from the canonical HTML SVG element.
- Preset: `doc-inline` (`960 × 600` viewBox), balanced detail, engineer audience.
- Brand profile: project tokens from `src/app/globals.css`; paper `#eeefe8`, surface `#fffef9`, ink `#17231d`, muted `#5a665f`, accent `#b9f45d`, accent-deep `#285a32`.
- Typography: local system stacks only (`Charter`/serif, `Avenir Next`/sans, system monospace). No remote font or asset request is permitted.
- Motion: none. Every figure communicates its complete meaning in the static frame.
