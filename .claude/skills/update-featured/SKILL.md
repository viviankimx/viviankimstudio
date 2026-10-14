---
name: update-featured
description: Update the homepage (Featured page) of Vivian Kim's portfolio. This covers the intro/header copy, the Select Clients list, and which projects appear under Featured Work and in what order. Use for "change the intro", "add Prada to clients", "feature the new Nike project", "reorder featured work".
---

# Homepage: header copy, Select Clients, Featured Work

Everything here lives in `content/site.md`. Read the **Guardrails** in `CLAUDE.md` first.

## Header copy (`## Hero`)

The paragraph at the top of the homepage. Replace it with the user's wording exactly; don't rewrite their voice.
Line breaks are kept on wide screens (each line in the file is a line on the page), so keep the user's breaks
or ask once where they'd like them if the copy is long. Show them the final text before publishing only if
you had to make a judgement call.

## Select Clients (`## Clients`)

One client per line (`- Prada`). They display uppercase, separated by " / ". The list is **alphabetical**
(ignoring a leading "The"): insert new clients in order, and keep the user's spelling and capitalisation
(e.g. `adidas`, `airbnb`). Remove clients when asked. Don't add clients the user didn't name.

## Featured Work (`## Featured`)

Project slugs in display order (top = first on the homepage). A featured project must also be listed under
`## Stills` or `## Motion`. To find a project's slug, match the user's description against `title:` and
`subtitle:` in `content/projects/*/index.md`, and confirm if more than one matches.

- **Feature:** add its slug where the user wants it (default: top).
- **Unfeature:** remove the slug from `## Featured` only (it stays on Stills/Motion).
- **Reorder:** move lines.

New projects can be featured as they're added (`manage-projects`, `--featured`).

## Finish

Run `npm run check`, then follow `publish-site` straight away unless the user only wanted a draft.
