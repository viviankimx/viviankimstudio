---
name: publish-site
description: Publish changes to Vivian Kim's portfolio so they go live. Use whenever the user says publish, update the site, push, deploy, go live, save it, or finishes an edit. Runs the whole Git and deploy process automatically without asking follow-up questions.
---

# Publish (no-fuss, fully automatic)

The user is not technical. When they ask to publish, update the site or push changes, **do all of the work below
without asking for confirmation or showing commands**. Only come back to them if something needs a decision
that's genuinely theirs (e.g. missing project details), or if it fails in a way you can't fix within the Guardrails.

Pushing to `main` on GitHub (`viviankimx/viviankimstudio`) makes Vercel deploy production automatically.
Site address: see **Live site** in `CLAUDE.md`.

## Steps

1. **Anything to publish?** `git status --porcelain content/`. If there are no content changes and nothing
   unpushed (`git log origin/main..HEAD`), tell the user the site is already up to date and stop.
2. **Check.** `npm run check`. If it fails, read the message and fix the content problem (missing file, typo in a
   slug, oversized image needing `npm run media`). Re-run until it passes. Never edit code to make it pass.
3. **Commit** only content:
   ```bash
   git add content/
   git commit -m "<plain summary, e.g. Add 12 photos to Memories>"
   ```
4. **Bring in anyone else's changes, then publish to main.** This works whether you're on `main` or a session branch:
   ```bash
   git pull --rebase --autostash origin main
   git push origin HEAD:main
   ```
   - **Rejected because main moved:** repeat step 4.
   - **Rebase conflict:** it's almost always `content/site.md` lists. Resolve by keeping both sides' entries
     (no duplicates), `git add` the file, `git rebase --continue`, push. If you can't resolve it confidently,
     `git rebase --abort` and tell the user plainly that someone else changed the same thing and Eric
     (the developer) should take a look.
   - **Authentication error** (asks for a username, "could not read Username", 403): follow the `setup`
     skill's GitHub sign-in step, then push again.
5. **Confirm.** Tell the user in one or two sentences what went live and that it takes about 3–5 minutes to
   appear. Give the live site link. If `gh` is available you may check once that a Vercel deployment started:
   `gh api repos/viviankimx/viviankimstudio/commits/$(git rev-parse HEAD)/status --jq .state`.

Never force-push, never push other branches, never change `vercel.json` or settings to make a deploy work.
