---
name: add-project
description: Create or update a project (Stills or Motion) on Vivian Kim's portfolio, upload its images and video links, and set where it appears (Featured, Stills, Motion). Use for "add a new project", "upload this shoot", "add these images to the Nike project", or reordering/hiding projects.
---

# Add or update a project

Format reference: `CLAUDE.md` (content layout) and `content/site.md`.

## New project

1. Collect from the user: **title** (usually the client or brand, e.g. `VOGUE`), **subtitle** (talent or campaign),
   **category** (`stills` = photography, `motion` = film), whether to **feature** it on the homepage, the
   **image folder or files**, and any **YouTube/Vimeo links**. Ask only for what's missing.
2. Choose a slug: lowercase, hyphenated, unique (check `content/projects/`). E.g. `nike-air-max-2026`.
3. Run from the repo root:
   ```bash
   node scripts/add-project.mjs --slug nike-air-max-2026 --title "NIKE" --subtitle "Air Max 2026" \
     --category stills --featured ~/Desktop/airmax
   # motion example, film embedded above the stills:
   node scripts/add-project.mjs --slug vogue-rose --title "Vogue" --subtitle "Ask Away with Rosé" \
     --category motion --video https://www.youtube.com/watch?v=XXXX ~/Desktop/rose-stills
   ```
   This copies images in as `01.jpg, 02.jpg…` (the first is the cover), compresses them, writes `index.md`, and adds
   the slug to the **top** of the Stills or Motion list (and Featured with `--featured`). Use `--bottom` to append instead.
4. Optional: add a description or credits as plain text lines in `index.md` above the media, or set `cover:` to
   another file (e.g. a 16:9 still for Motion, since Motion listings crop covers to 16:9).

## Update an existing project

- **Add images:** copy them into `content/projects/<slug>/` with the next numbers (`08.jpg`, `09.jpg`…), add
  `![](08.jpg)` lines to `index.md` where they should appear, then run `npm run media`.
- **Reorder images:** reorder the `![](…)` lines in `index.md`.
- **Change cover / title / subtitle:** edit the frontmatter.
- **Feature, reorder, hide:** edit the `## Featured`, `## Stills`, `## Motion` lists in `content/site.md`. A project
  in neither Stills nor Motion is hidden. Only delete a folder if the user explicitly asks to delete.

## Finish

Run `npm run check`, look at the project page and listing in `npm run dev`
(http://127.0.0.1:3000/project/<slug>), then use `publish-site` if the user wants it live.
