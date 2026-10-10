# Vivian Kim Studio

Portfolio site for Vivian Kim. Content is plain Markdown and image folders in `content/`.
There's no CMS: open the repo in Claude Code and ask for changes in plain English. `CLAUDE.md`
tells Claude how the content works and how to publish.

## Editing with Claude Code

```bash
git clone https://github.com/viviankimx/viviankimstudio.git
cd viviankimstudio
npm ci
claude
```

Then ask things like:
- "Add the photos in ~/Downloads/tokyo to the top of Memories"
- "Create a new Stills project called SUMMER for Self-Service from ~/Desktop/summer, and feature it first"
- "Move the Vogue Jennie project to the top of Motion"
- "Change the footer location to 'based in NYC'"
- "Publish it"

Claude uses the project skills in `.claude/skills/` (`add-memories`, `add-project`, `publish-site`). It
compresses new images, checks the build, shows you the result, and pushes to `main` when you confirm.
Vercel then deploys automatically. You can also run the scripts yourself:

```bash
node scripts/add-memories.mjs ~/Downloads/tokyo
node scripts/add-project.mjs --slug nike-air-max --title "NIKE" --subtitle "Air Max" --category stills --featured ~/Desktop/airmax
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
