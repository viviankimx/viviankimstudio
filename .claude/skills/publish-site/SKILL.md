---
name: publish-site
description: Publish changes to Vivian Kim's portfolio (viviankimstudio.com) via Vercel. Use when the user says publish, deploy, go live, push, or ship after editing content.
---

# Publish the site

Vercel deploys automatically from GitHub (`viviankimx/viviankimstudio`): **pushing to `main` updates the live site**
within a few minutes; any other branch gets a preview URL.

1. **Verify.** `npm run check` must pass. Then run `npm run build` (it prerenders every page and fails loudly on a
   broken reference). Fix problems; don't skip them.
2. **Review with the user.** Summarise what will change from `git status` / `git diff --stat` (e.g. "12 new
   Memories photos, new Stills project NIKE — Air Max 2026, featured first"). Confirm they want it live.
   Offer a preview branch first if the change is large.
3. **Commit** only content and intended files, with a plain message:
   ```bash
   git add content/ && git commit -m "Add 12 photos to Memories"
   ```
4. **Push.**
   - Live: `git push origin main` (pull/rebase first if the push is rejected; never force-push `main`).
   - Preview: `git switch -c preview/<short-name> && git push -u origin preview/<short-name>`, then share the
     Vercel preview link from the GitHub PR/commit status (`gh pr create` makes this easy).
5. **Confirm.** After a few minutes, check https://www.viviankimstudio.com (or the preview URL) shows the change.
   If the Vercel build failed, read the error in the Vercel dashboard or `gh pr checks`, fix and push again.

Never commit `node_modules/`, `dist/`, `public/media/` or `.generated/` (they're git-ignored, so keep it that way).
