# StoneBrain — P0 Repository Baseline

2026-11-25｜Source: bradcocox/brad-log, main (Git tree, non-truncated). This is a repository inventory, not a runtime/UI audit.

## Inventory

- 212 tracked blob paths on main at inspection time.
- 18 Markdown post source files under `src/content/posts/`. Published count and draft status still require metadata/build checks.
- One separate About Markdown source at `src/content/pages/about.md`.
- Two GitHub Actions workflows: `.github/workflows/content-check.yml`, `.github/workflows/deploy.yml`.

| Existing content cluster | Post sources | Initial repurposing idea |
|---|---:|---|
| Coding agent / router guides and comparison (Claude Code Router, Cline, Codex Router, Kilo Code, OpenCode) | 6 | Individual quick-start cards; comparison carousel |
| T3 Code series | 4 | Overview, quick-start, architecture, comparison |
| Modern Web Guidance series | 4 | Concept and workflow cards |
| Data Engineering (Airflow, DuckDB, Polars) | 3 | Tool-specific explainers and diagrams |
| GitHub Pages / AstroPaper | 1 | Step-by-step publishing guide |

Grouping is based on filenames only. Validate article content, claims, screenshots and version freshness before publishing derived content.

## Brand change touchpoints (identified paths, not yet edited)

- Site configuration: `src/config.ts`, `astro-paper.config.ts`, `astro.config.ts`.
- Brand components: `src/components/BrandLogo.astro`, `Header.astro`, `Footer.astro`, `Socials.astro` (under the same components directory).
- Existing brand assets: `src/assets/brand/social-card.svg`, `public/brad-log-og.png`, `public/favicon.svg`.
- Homepage / about / 404 / privacy: `src/pages/index.astro`, `about.astro`, `404.astro`, `privacy.astro`.
- Shared layout and article layout: `src/layouts/Layout.astro`, `src/layouts/PostLayout.astro`.
- Theme and editorial styling: `src/styles/theme.css`, `global.css`, `editorial.css`, `typography.css` (under the same styles directory).
- Existing post, category, tag, archive, search, RSS and robots route implementations should be preserved.

## Next actions

- [x] List tracked source files and group existing Markdown posts.
- [x] Identify likely brand touchpoints and workflow filenames.
- [ ] Inspect config and post frontmatter, capture live route/metadata and publication baseline.
- [ ] Review open PRs and verify actual build/deployment and desktop/mobile screenshots.
- [ ] Finalize mascot vector assets and animation before modifying UI.
- [ ] Prepare small brand PR with no repository/domain transfer.

No production website change, article rewrite, or account migration performed during this inventory.
