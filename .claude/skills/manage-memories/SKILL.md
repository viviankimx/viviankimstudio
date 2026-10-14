---
name: manage-memories
description: Add, remove or reorder photos on the Memories page (photo diary) of Vivian Kim's portfolio. Use for "add these to memories", "post these photos", "remove the third photo", "put this one first".
---

# Memories

Read the **Guardrails** in `CLAUDE.md` first. Keep the conversation plain and short.

## Details to collect

- **The photos**: a folder or files on the user's computer (e.g. "Downloads/tokyo"). If they attached them in
  the chat, ask them to drag the files into the chat window or say where they're saved. Confirm the count.
- **Upload date**: optional. Use **today** unless they give one. Don't ask.
- **Position**: new photos go at the **top** (newest first) unless they ask for the bottom or a specific order.
- **Alt text**: optional. Never block on it, but if they describe the photos, record it.

## Add

```bash
node scripts/add-memories.mjs [--date 2026-10-12] [--bottom] ~/Downloads/tokyo
```

This copies the photos in, converts iPhone HEIC files, compresses them, renumbers everything so the order is
right (001 = first on the page), and logs each new photo with its date in `content/memories.md`
(`- 001.jpg | 2026-10-12 | alt text`). To add alt text, fill in the third column of that photo's line.

## Remove

Identify the photo with the user. Describe it, or show it by opening the file, if there's any doubt about which
one they mean. Then:

```bash
node scripts/remove-memories.mjs 3        # or 003.jpg; several at once is fine
```

The rest are renumbered to close the gap.

## Reorder

```bash
node scripts/move-memory.mjs 45 1     # photo 45 becomes the first photo
```

Everything else shifts and is renumbered; dates and alt text stay with their photos.

## Finish

Run `npm run check`, then follow `publish-site` straight away unless the user only wanted a draft. Tell them
in a sentence what changed (e.g. "Added 12 photos to the top of Memories; they'll be live in a few minutes.").
