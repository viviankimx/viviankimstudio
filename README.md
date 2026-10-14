# Vivian Kim Studio

Portfolio site for Vivian Kim. Content is plain Markdown and image folders in `content/`.
There's no CMS: open the repo in Claude Code and ask for changes in plain English. `CLAUDE.md`
tells Claude how the content works and how to publish.

## Editing with Claude Code

This repo is set up so the site owner can edit content by chatting with Claude Code, with no technical steps.

- **Setup guide for Vivian (non-technical):** https://claude.ai/artifact/2gek65oXobRTctmVGLGYuj
  (private until shared from its Share menu). In short: Claude desktop app → GitHub Desktop clone →
  Node.js installer → open the folder in the Code tab → say "Set me up".
- **Guardrails:** `CLAUDE.md` limits sessions to homepage copy, Select Clients, Featured Work, and
  Stills/Motion/Memories content, requires complete details for new content (title, client/subtitle,
  Vimeo link for Motion, date defaulting to today), always compresses images, and publishes straight to
  `main` when asked. `.claude/hooks/guard.mjs` enforces it: file edits outside `content/`, force-pushes,
  package installs and similar are blocked. `.claude/settings.json` pre-approves the routine commands so
  there are no permission prompts for them.
- **Skills** (`.claude/skills/`): `setup`, `update-featured`, `manage-projects`, `manage-memories`, `publish-site`.
- **Developers:** turn the guard off on your own machine with
  `{ "env": { "VK_SITE_DEVELOPER": "1" } }` in `.claude/settings.local.json` (git-ignored).

Content scripts (all compress images automatically):

```bash
node scripts/add-memories.mjs [--date YYYY-MM-DD] [--bottom] ~/Downloads/tokyo
node scripts/remove-memories.mjs 3
node scripts/move-memory.mjs 45 1
node scripts/add-project.mjs --slug nike-air-max --title "NIKE" --subtitle "Air Max" --category stills --featured ~/Desktop/airmax
node scripts/add-project.mjs --slug vogue-rose --title "Vogue" --subtitle "Ask Away with Rosé" --category motion --video https://vimeo.com/123 ~/Desktop/rose
node scripts/remove-project.mjs <slug> [--delete]
```

## Editing by hand

See `CLAUDE.md` for the full format. In short:
- `content/site.md` holds the homepage copy, navigation, clients, footer and the Featured / Stills / Motion order
- `content/projects/<slug>/index.md` plus images holds one project
- `content/memories/` holds the Memories photos, in filename order

Run `npm run dev` to preview at http://127.0.0.1:3000. It picks up edits live and compresses new images.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local preview with live reload |
| `npm run media` | Compress new images and generate responsive variants |
| `npm run check` | Validate content and compression, type check, tests |
| `npm run build` | Static build to `dist/client` |
| `npm run preview` | Serve the static build at http://127.0.0.1:3000 |

Requires Node 22.13+ (`brew install node`).

## Deployment (Vercel)

One-time setup: in Vercel, **Add New → Project**, import `viviankimx/viviankimstudio`, and keep the
defaults. `vercel.json` sets the build command, the `dist/client` output and clean URLs, and no
environment variables are needed. Deploy through the Git integration rather than `vercel deploy`
from the CLI: the repository is about 240 MB of images, which is over the CLI's upload limit on Hobby.

After that:
- push to `main` publishes to production
- push any other branch to get a preview URL

## History

The earlier Appwrite/Cloudflare CMS version is preserved on the git tag `archive/cms-appwrite`.
