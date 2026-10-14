---
name: manage-projects
description: Add, update, hide or remove Stills (photography) and Motion (film) projects on Vivian Kim's portfolio, including uploading images and Vimeo links and setting project order. Use for "add a new shoot", "upload this campaign", "add images to the Nike project", "take down X", "move Y to the top of Stills".
---

# Stills and Motion projects

Read the **Guardrails** in `CLAUDE.md` first. Talk to the user in plain language: no file names, commands or
jargon unless they ask.

## 1. Collect the details (required, don't skip)

Before touching anything, make sure you have all of these. Ask for whatever is missing in **one short, friendly
message**, and offer an example so it's easy to answer.

| Detail | Stills | Motion | Notes |
|---|---|---|---|
| **Title**: the client or brand | required | required | Shown large, e.g. `Vogue`, `NIKE`, `ISLAND TIME` |
| **Client / subtitle**: talent, campaign or publication | required | required | e.g. `GRWM \| Jennie Kim`. If the user confirms there isn't one, use an empty subtitle |
| **Images** | at least 1 | optional stills | A folder or files on their computer. The first image is the cover |
| **Vimeo (or YouTube) link** | — | **required** | Ask for the share link; never invent one |
| **Upload date** | optional | optional | Default to **today** if they don't give one. Don't ask, just use today |
| **Featured on the homepage?** | ask | ask | Default no |
| **Where in the list?** | | | Default top (newest first). Only ask if they hint otherwise |

If the user attached images in the chat rather than pointing to files, ask them to drag the files or the folder
into the chat or tell you where they're saved (e.g. "Downloads/airmax"). Confirm the number of images you found.

## 2. Create a new project

Pick a slug: lowercase, hyphenated, unique (check `content/projects/`), e.g. `nike-air-max-2026`. Then run:

```bash
node scripts/add-project.mjs --slug nike-air-max-2026 --title "NIKE" --subtitle "Air Max 2026" \
  --category stills [--featured] [--date 2026-10-12] ~/Downloads/airmax

node scripts/add-project.mjs --slug vogue-rose --title "Vogue" --subtitle "Ask Away with Rosé" \
  --category motion --video https://vimeo.com/123456789 [--featured] ~/Downloads/rose-stills
```

The script refuses if a required detail is missing. It compresses every image (see Compression in `CLAUDE.md`),
looks up the film's shape so the player fills the page, records the date, and adds the project to the top of
Stills or Motion (and Featured with `--featured`). Use `--bottom` to add at the end instead.

Optional extras the user may give: a description or credits (plain text lines in `index.md` above the media), or
a different cover (`cover:` in the frontmatter; for Motion a wide 16:9 image works best because listings crop to 16:9).

## 3. Update an existing project

Find it by title or subtitle in `content/projects/*/index.md`; confirm with the user if more than one matches.

- **Add images:** copy them in as the next numbers (`08.jpg`, `09.jpg`…), add `![](08.jpg)` lines where they
  should appear, then run `npm run media` to compress them.
- **Remove an image:** delete its `![](…)` line and the file. If it was the cover, set a new `cover:`.
- **Reorder images:** reorder the `![](…)` lines.
- **Change or add a film:** a line with the link and its size, e.g. `https://vimeo.com/123456789 1920x1080`.
  Get the size from `https://vimeo.com/api/oembed.json?url=<link>` (width × height).
- **Title, subtitle, cover, date:** edit the frontmatter.
- **Order, featuring:** move the slug within `## Stills` / `## Motion` / `## Featured` in `content/site.md`.

## 4. Remove a project

- "Take it down", "hide it": `node scripts/remove-project.mjs <slug>`. It disappears from the site but its files are kept.
- "Delete it permanently": `node scripts/remove-project.mjs <slug> --delete`.
  If the user's wording is ambiguous, hide.

## 5. Finish

Run `npm run check`. Fix anything it reports within these rules. Then, unless the user only wanted a draft,
follow `publish-site` straight away so the change goes live, and tell them in one or two sentences what changed.
