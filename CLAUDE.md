# Vivian Kim Studio — editing guide for Claude Code

This is Vivian Kim's portfolio. There is no CMS: all content lives in `content/` as Markdown
files plus image folders, and you (Claude) edit it on request. The site is a static build
deployed on Vercel; pushing to `main` publishes it.

When someone asks to change the site, edit `content/`, check the result, then commit and push
(see **Publishing**). Don't touch `app/`, `lib/` or `scripts/` unless the request is about
design or behaviour.

## Content layout

```
content/
  site.md               homepage copy, navigation, clients, footer, and ALL project ordering
  hero.mp4              homepage showreel (keep under ~10 MB)
  hero-poster.jpg       still shown before the showreel loads
  memories.md           Memories page title and optional alt text
  memories/             Memories photos, shown in filename order (001.jpg first)
  projects/<slug>/
    index.md            one project: title, subtitle, cover, description and media list
    01.jpg, 02.jpg …    that project's images
```

The project URL is `/project/<slug>`, where the slug is the folder name: lowercase letters,
numbers and hyphens only.

### site.md

Frontmatter: `email`, `instagram`, `location` (footer), `hero_video`, `hero_poster` (files in `content/`).
Sections, each beginning with `## Name`:

- **Hero** — the homepage paragraph. Line breaks are kept on wide screens.
- **Navigation** — `- [Label](/link)`. The first item is the studio name at top left; the last item sits at top right.
- **Clients** — one per line, `- Name`. Displayed in this order, separated by " / ".
- **Featured** — project slugs shown on the homepage, in order. Each must also appear under Stills or Motion.
- **Stills** / **Motion** — project slugs in display order. **The list a project is in sets its
  category. A project folder that isn't listed anywhere is hidden** (use this for drafts).

### projects/<slug>/index.md

```markdown
---
title: ISLAND TIME
subtitle: BY VIVIAN KIM
cover: 01.jpg
---

Optional description or credits. Any plain text line is treated as description.

![](01.jpg)
![Optional alt text](02.jpg)
![](clip.mp4)
https://vimeo.com/123456789
```

- Media lines render in order. `![alt](file)` is an image (or a video when the file is `.mp4`/`.webm`).
- A YouTube or Vimeo link on a line of its own becomes an embedded player. Watch links, youtu.be links and player URLs all work.
  Put the film's size after the link (`https://vimeo.com/123 1920x1080`) so the player fills the column at the right
  shape. Without a size it's shown as 16:9, which letterboxes vertical or 4:3 films. `add-project` fills this in automatically.
- `cover` is the thumbnail used on the listing pages. If it's omitted, the first image is used. It can be a file that isn't in the media list (for example `cover.jpg`).
- Stills projects show images stacked full width. Motion projects use a 2-column grid with embeds spanning full width.

### Memories

Drop photos into `content/memories/`. Order is by filename, sorted naturally, so to put a new
photo first, name it so it sorts before `001` (e.g. `000.jpg`) or renumber. To renumber, rename
the files; don't edit Markdown. Alt text is optional: add `- 001.jpg: description` lines to `memories.md`.

## Images: always compress

Run `npm run media` after adding or replacing images. It:
- resizes any photo over 2400px on the long edge, re-encodes large JPEGs at quality 82, and turns
  PNG/TIFF photos into `.jpg` (it updates `![](…)` and `cover:` references to the new name).
  Transparent images become `.webp`. GIFs are left alone.
- mirrors `content/` into `public/media/` (git-ignored) with 640/1280px WebP variants for responsive loading.

`npm run dev` and `npm run build` run it automatically, and the dev server re-runs it whenever a file in
`content/` changes. Commit the compressed files in `content/`, never raw camera files.
Keep the repository lean: images in `content/` should almost always be under 1.5 MB.

iPhone HEIC files aren't supported. Convert them first on macOS:
`sips -s format jpeg photo.heic --out photo.jpg`.

When a user gives you images (a folder path, Downloads, attachments saved to disk), copy them into
the right folder with clean sequential names (`01.jpg`, `02.jpg`, …), then run `npm run media`.

## Common requests

Project skills in `.claude/skills/` cover the usual jobs; use them:
- **`add-memories`**: upload photos to Memories (`node scripts/add-memories.mjs [--bottom] <files or folder>`).
  It renumbers, converts HEIC, and compresses.
- **`add-project`**: create a Stills/Motion project from a folder of images
  (`node scripts/add-project.mjs --slug … --title … --category stills|motion [--featured] [--video URL] <images>`),
  or update, reorder, feature or hide existing ones.
- **`publish-site`**: verify, commit and push so Vercel deploys.

Small copy changes (hero text, clients, footer, titles) are direct Markdown edits.

## Checking your work

```bash
npm run check     # content + compression check, type check, tests
npm run dev       # http://127.0.0.1:3000 with live reload
npm run build && npm run preview   # the exact static site Vercel will serve
```

If the content is wrong, `npm run build` fails with a specific message (a missing file, an unknown slug in site.md, and so on).
Fix the message rather than working around it. Look at the changed pages in a browser before publishing.

## Publishing

Vercel is connected to the GitHub repo `viviankimx/viviankimstudio`:
- push to `main` publishes to production (takes a few minutes)
- push any other branch to get a preview URL first

Before pushing: run `npm run check` and confirm with the user what's about to go live, summarising
the changes. Commit with a plain message describing the content change (e.g. "Add 12 photos to Memories").
Never force-push `main`.

## Project facts

- Static export (vinext, a Next.js-compatible framework on Vite): `next.config.ts` has `output: 'export'`, and the build goes to `dist/client`.
- Vercel settings live in `vercel.json`. No environment variables or server are needed.
- Requires Node 22.13+. Setup: `npm ci`.
- The old Appwrite CMS is archived on the git tag/branch `archive/cms-appwrite`. Don't revive it.
- The original, uncompressed imported media is not in git (a backup was kept outside the repo).
