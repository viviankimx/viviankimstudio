---
name: add-memories
description: Add photos to the Memories page of Vivian Kim's portfolio. Use when someone wants to upload, add or post photos to Memories / the photo diary, from a folder, Downloads, or attached files.
---

# Add photos to Memories

1. **Find the photos.** Get the file or folder paths from the user (e.g. `~/Downloads/tokyo`). If they attached
   images in chat, save them to disk first. Confirm the count you found matches what they expect.
2. **Choose the position.** New photos go to the **top** by default (newest first). Use `--bottom` only if asked.
   If a specific order matters, pass the files in that order; folder contents are added in filename order.
3. **Run the script** from the repo root:
   ```bash
   node scripts/add-memories.mjs ~/Downloads/tokyo
   node scripts/add-memories.mjs --bottom photo1.jpg photo2.heic
   ```
   It copies the photos in, renumbers everything so filename order = display order (001 = first), converts
   HEIC, compresses to a 2400px max JPEG, and keeps alt-text lines in `content/memories.md` attached to the right photo.
4. **Alt text (optional).** If the user describes the photos, add lines like `- 001.jpg: Friends at the beach`
   under the note in `content/memories.md`.
5. **Check.** Run `npm run check`, then `npm run dev` and open http://127.0.0.1:3000/memories to look at the result
   (or screenshot it for the user).
6. **Publish** with the `publish-site` skill if the user wants it live.

**Removing or reordering:** delete or rename files in `content/memories/`, then run `npm run media`. Gaps in the
numbering are fine; display order always follows filenames. Never copy raw camera files in by hand without
running the media step.
