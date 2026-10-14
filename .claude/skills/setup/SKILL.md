---
name: setup
description: One-time setup so this computer can edit and publish Vivian Kim's portfolio. This installs project dependencies and connects Git to GitHub for publishing. Use when the user says "set me up", "get started", on a first session, or when publishing fails with a GitHub sign-in/authentication error.
---

# First-time setup

Guide the user through this kindly and in plain language. Do every step you can yourself. Only ask them to click
or type when the step needs their hands (installers, password prompts, approving a sign-in in the browser).
Explain each such step in one sentence before asking.

## 1. Tools

- `node --version` must be **22.13 or newer**. If it's missing or old: ask the user to download and run the
  **LTS installer** from https://nodejs.org (big green button), then restart this Claude session. Wait for them.
- `git --version`. If macOS pops up "install command line developer tools", ask them to click **Install** and wait
  for it to finish (a few minutes), then continue.

## 2. Project

From the repository folder:

```bash
git switch main
git pull --rebase origin main
npm ci
npm run check
```

Set the commit identity for this repository if it isn't set (`git config user.email` is empty):

```bash
git config user.name "Vivian Kim"
git config user.email "vk@viviankimstudio.com"
```

## 3. GitHub sign-in (needed to publish)

Test it: `git push --dry-run origin HEAD:main`. If that works, skip to step 4.

Otherwise connect GitHub using the GitHub CLI:

1. If `gh --version` fails, ask the user to download the **macOS installer (.pkg)** from
   https://github.com/cli/cli/releases/latest (file ending `_macOS_universal.pkg`) and double-click it.
2. Run the sign-in **somewhere the user can see and interact with it**. In the Claude desktop app, run it in the
   Terminal panel; otherwise ask them to open the Terminal app and paste it:
   ```bash
   gh auth login --hostname github.com --git-protocol https --web
   ```
   Tell them: press Enter, copy the 8-character code it shows, paste it in the browser page that opens, sign in to
   the GitHub account that owns the site (**viviankimx**), and click **Authorize**.
3. Then run `gh auth setup-git` and repeat the dry-run test.

Never ask the user to paste a password or token into the chat.

## 4. Done

Tell the user they're ready, and give two or three example requests, for example:
- "Add the photos in my Downloads folder called Tokyo to Memories"
- "New Motion project: Vogue, Ask Away with Rosé, here's the Vimeo link …, and feature it"
- "Add Prada to Select Clients and publish"
