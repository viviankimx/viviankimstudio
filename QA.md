# QA — September 10, 2026

- Six isolated backend tests pass; TypeScript check and production build pass.
- Independent QA agent reviewed uploads, project deletion, ordering cleanup, and save lifecycle; no blocker found.
- Browser cover upload returned a local image path with no alert. The reported network failure coincided with the local server being stopped; restarting restored uploads. Network and expired-session errors now have actionable messages.
- Production HTTP upload verified image bytes, HEAD, range responses, and content save/reload against a separate data copy.
- Browser deletion modal is dismissible. An existing project returned HTTP 200 before Save, then 404 after Save in the isolated copy. Live portfolio data was not changed by this test.
- Neue Montreal Medium is served locally for headings; Inter is served locally for body copy. Desktop hero at 1280px matches reference font size, line height, four-line height and video dimensions/vertical position. Horizontal position differs slightly with requested replacement font metrics.
- Mobile breakpoint rules mirror the reference, but the browser viewport override did not apply reliably to the local tab during this final pass; final mobile visual verification remains outstanding.

## Content portability
The import contains 124 projects and 135 memories. Downloaded assets are local; existing Vimeo/YouTube film embeds still depend on those services. Original source dates were unavailable for imported memories, so source order is retained until edited.

## CMS simplification and listing layouts
- CMS tabs are General (navigation/home content), Projects, and Memories.
- The projects array is the canonical order. Homepage includes published projects; Stills/Motion filter that same order. Sidebar dragging and Alt + arrow keys reorder the full array, including when search is active. Optional date sorting keeps undated imports stable.
- Independent QA reviewed ordering, publication and category filtering; six tests and TypeScript passed.
- Motion browser screenshot verified full-width two-column 16:9 cards, title above and captions below.
- Stills uses the same Mosaic component as Memories, with links to project pages. Fixed cached images missing their pre-hydration load events. Reloaded browser screenshot and measured tile heights confirm varied natural image ratios and shortest-column packing.

## September 14 — local reference typography
Global typography now uses the supplied reference's Helvetica Neue Regular, locally hosted, and shared heading/body size tokens. Browser comparison at1280px confirmed identical hero bounds (x281.71875,y86.41406,w998.28125,h115.1875),28.8px size,400 weight,28.8px line height and-.24px tracking. At900px the heading is18.4px with four lines; at390px it has eight lines,147.1875px height, and no horizontal overflow. Mobile single-row navigation verified visually. Temporary viewport reset. Independent source QA found no major regression; its large-screen nav line-height discrepancy was corrected.

## October 5 — performance, accessibility and bug audit
- Seven isolated backend tests and TypeScript check pass; final production build succeeds.
- Independent QA identified and reviewed fixes for CMS edits during Save, cancelled drag state, gallery accessible names, low-contrast small CMS text, and missing video pause/skip controls.
- Public route payloads measured as serialized JSON: homepage50,977bytes, Stills28,289, Motion22,360, Memories26,499, example project1,891. Previously every page received roughly145KB of content. These are payload measurements, not end-to-end speed scores.
- Generated dimensions for1,117 local images and high-quality640/1280WebP cover variants; all referenced paths validated. Sample aggregate:640px covers7,463,018bytes vs216,374,649original bytes. Browser srcset retains originals for larger displays; no original media deleted. Three duplicate srcset descriptors corrected.
- Browser production checks: homepage fade-ins complete after scroll; film pause works; no missing alt attributes. Memories135items, named buttons, fullscreen Next and Escape work. Stills71items at390px is a varied-height mosaic without horizontal overflow. No captured console errors during tested flows.
- Production HTTP: home/Stills/Motion/Memories/example project return200 with appropriate titles, missing route404, unauthenticated content API401, login metadata noindex.
- Removed11unused legacy layout CSS rules and consolidated card rendering on the shared mosaic.
- Responsive image optimization is optional for future uploads; originals work immediately. Run npm run optimize:media then rebuild/restart after adding batches. Imported memories lacking captions have neutral numbered alternatives; specific visual descriptions should be entered in CMS rather than inferred from filenames.
- Final screenshot: qa-homepage.png. Browser viewport restored after mobile QA.
