# Vivian Kim Studio

A self-contained portfolio and CMS, migrated from the live site on September 8, 2026. No Webflow runtime or Picflow subscription is needed.

## Run locally

Use Node.js 22.13 or newer (Node 24 recommended).

```sh
npm ci
# On a fresh clone, copy .env.example to .env and set CMS_PASSWORD.
npm run dev
```

Open http://127.0.0.1:3000 for the portfolio and http://127.0.0.1:3000/login for the CMS. Username is `admin`; the delivered local `.env` contains the password you requested. `.env` is intentionally excluded from Git.

For production:

```sh
npm run build
npm start
```

Run from the repository root. Keep `data/` and `public/media/` on persistent writable disk. The CMS uses a single Node process and an atomic JSON content file; do not run multiple application replicas against that file. Put HTTPS in front of it when deploying and set `PUBLIC_ORIGIN=https://your-domain.example` in `.env` when using a reverse proxy. No hosting or repository push has been performed.

## Editing

- **Homepage:** hero copy, uploaded video, poster path, ordered client list, and footer.
- **Navigation:** labels, destinations, and drag ordering. First link is the studio name; last is the right-hand link.
- **Featured work:** add/remove features and drag their homepage sequence.
- **Projects:** create and edit Stills/Motion projects, title, subtitle, URL slug, description/credits, cover, publication status, and ordered images/video/text. Unpublished projects are excluded from public responses. Vimeo/YouTube fields accept player embed URLs. Upload your own MP4/WebM to replace an external film.
- **Memories:** drop multiple images, rearrange the responsive mosaic, and open public images in a fullscreen viewer. New uploads sort newest first using the upload date; click an image to adjust its date. Manual positioning overrides date sorting. New uploads enter ahead of an existing manually positioned sequence. “Reset to newest first” restores automatic order. Keyboard: focus an image and use Alt + Left/Right to move it. The viewer supports Escape and Left/Right.

Press **Save changes** to publish edits locally. Uploads finish before Save is enabled. Unsaved content changes remain in the current editor only. Saves create backups and reject overwriting a newer revision from another editor.

## Authentication

`/admin` and CMS APIs support HTTP Basic Authentication. `/login` offers the same credentials through a browser-friendly form, creating an eight-hour signed, HttpOnly, SameSite=Strict cookie. API mutations require the same Origin. Changing the password in `.env` and restarting invalidates sessions. Keep `.env` out of your repository.

## Content and ownership

- 124 linked project pages: 71 Stills and 53 Motion.
- 18 featured projects, original homepage copy and 38 clients.
- 984 downloaded Webflow media assets plus 135 downloaded Picflow Memories images.
- 52 original video embeds retained as direct Vimeo/YouTube player URLs. Those films still require their external hosts until replaced with original files through the CMS.
- All downloaded media is in `public/media/` (about 1.8 GB). `data/asset-manifest.json` maps original URLs to local files.
- `data/content.json` is the editable live content. `data/seed.json` is the original import. `data/backups/` stores pre-save snapshots.
- Original Memories dates were not publicly available. The imported arrangement is preserved as a manual sequence; unknown dates use an internal sentinel and display blank in the editor. Set real dates before relying on chronological sorting of imported photos.
- Picflow images are the publicly delivered sizes, not camera originals. Hidden legacy Webflow diary images were not mixed into the current public gallery.

## Backup / restore

Back up `data/` and `public/media/` together. To restore, stop the server, copy the desired backup JSON to `data/content.json`, and restart. Do not overwrite a live file while editors are saving. Removing media from a page does not delete the underlying file, so backups remain usable.

## Validation

```sh
npm test
npx tsc --noEmit
npm run build
```

Tests use temporary data and cover authentication, cookie integrity, mutation origins, atomic saves, conflict detection, backups, draft filtering, invalid input, body limits, and imported asset existence. See QA.md for migration checks and tested limitations.

### Deleting projects
Select a project and click **Delete project**. A dismissible reminder explains that the public site changes only after **Save changes**. Reloading before saving discards the pending deletion and other unsaved edits. Media files are retained, and the prior content is backed up on save.

### Upload troubleshooting
Keep the local server running while editing. Uploads accept JPG, PNG, GIF, WebP, MP4 and WebM under 99 MB each; cover images and Memories accept images only. The CMS reports an unreachable server or expired sign-in. Successful files from a partially failed batch remain in the editor; click **Save changes** to publish them.

Headings use the supplied Neue Montreal Medium; body text uses locally stored Inter. See `QA.md` for validation details.

### CMS organization and project ordering
The CMS has three tabs: **General**, **Projects**, and **Memories**. General contains navigation and homepage settings. Projects has a Published toggle and a draggable sidebar. Its array order controls the homepage and both category pages; unpublished projects are excluded publicly. New projects start at the top. Use **Sort newest first** for project dates, or drag/Alt + Up/Down for custom positions, then Save. Imported projects have no invented dates and retain their order until changed. Stills uses the Memories mosaic layout with links to deep dives; Motion uses two columns with 16:9 covers.

### Typography reference update — September 14
The global stylesheet now matches the supplied localhost:8099 reference using locally hosted Helvetica Neue Regular. This supersedes the earlier Neue Montreal/Inter typography choice. Heading/body sizes follow the reference's desktop, tablet/mobile and large-screen breakpoints.

### Image optimization and page data
`npm run optimize:media` creates image dimensions and high-quality responsive WebP cover variants from local content, keeping originals. Run it after adding a batch of projects, then rebuild/restart. New uploads work immediately with their original files even without this optional step. Public pages receive only their own content. Project titles/descriptions populate page metadata; CMS and sign-in pages are marked noindex.

Images use CMS captions as alternative text where available. For imported Memories without captions, the site uses neutral numbered photo-journal labels; add descriptive captions in the CMS for meaningful image-specific alternatives.
