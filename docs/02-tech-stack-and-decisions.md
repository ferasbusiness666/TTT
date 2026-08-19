# Tech Stack & Why

| Piece | Choice | Why |
|---|---|---|
| Hosting | Cloudflare Pages | The Workers migration was planned but never actually completed — checked directly, zero Workers exist on the account. Turned out not to matter: the real routing bug was that the homepage story cards were never wrapped in real `<a>` links (a plain frontend bug, fixed directly). Pages is confirmed working with auto-deploy already connected, so staying here rather than migrating again for a benefit that's no longer clear-cut. |
| Repo visibility | Private | Cloudflare Pages deploys from private repos for free. |
| Build | Claude Code on the web (cloud), not local | Confirmed this is what's actually being used, correcting the original plan. Cloud Claude Code works more hands-off — a task goes in, a finished result comes back, without the chance to watch it happen step by step. That makes the git-diff review habit below the main safety check, not a backup one. |
| Database + Auth | Supabase | Considered switching to Cloudflare's own database (D1) since hosting is already on Cloudflare — decided against it. D1 has no built-in login system; using it would mean building authentication from scratch. Supabase's built-in login + security rules is exactly what protects against an unauthenticated action slipping through, so it stays. |
| Photo storage | Cloudinary | Free tier comfortably covers a small site's images. |
| Video | YouTube (linked, not uploaded) | Avoids burning through Cloudinary's video-processing credits, which are expensive relative to images. |
| License | Not needed | The repo is private now — only invited collaborators can see it at all, so there's no public visibility to protect against. A short copyright note is still fine to keep, it just isn't doing any real work anymore. |

## Keeping secret keys safe (true no matter what)

- Supabase's **anon key** is *meant* to be public — every Supabase app works this way, private repo or not. Real security comes from the database rules (Row Level Security), not from hiding this key.
- Supabase's **service_role key** and Cloudinary's **API secret** must never be committed to the repo, private or public. Use environment variables / repo secrets instead. Being private isn't a reason to get careless — treat every commit as if it could someday become public.

## Cloudinary setup (as configured)

- **Cloud name:** `dxow1ant2` · **Unsigned upload preset:** `ttt-posts` · **Folder:** `ttt-posts`
- **Why unsigned:** signed uploads need a server holding an API secret to sign each request. This site is static — there is no backend, so there is nowhere safe to keep one. An unsigned preset locked to image formats is the standard approach for a small admin-only upload flow. The cloud name and preset name are public by design (they ship in the page); the **API secret must never appear in the repo**.
- **Restrictions:** the preset limits uploads to `jpg,png,webp,gif`. Cloudinary validates real file contents, not the extension — a `.txt` renamed to `.png` is rejected (verified). The preset has **no max file size**, so a 10MB cap is enforced in the browser before upload (`assets/ttt-upload.js`).
- **Public IDs are auto-generated and unguessable**, so uploaded images can't be enumerated by URL.
- **Delivery:** the database stores the plain uploaded URL as the single source of truth; transformations are applied at render time by `tttPosts.cdn(url, width)` — `f_auto` (WebP/AVIF where supported), `q_auto` (compression), `w_*,c_limit` (never ship more pixels than the slot shows). Cards request 900px, the article hero 1600px. Measured on a 4.3MB test photo: **370KB delivered, ~11.6× smaller.** This matters on a free tier.

## Key decisions made along the way

- **Auth model:** a small, fixed number of staff accounts, created directly in Supabase by an admin. No public sign-up page.
- **Public access:** anyone can read published posts with no login. Only staff can write.
- **No approval workflow (v1):** sign in → post → it's live. Just Draft and Published — nothing in between.
- **No comments (v1):** deliberately left out. The schema is built so comments can be added later without touching existing data.
- **Git workflow:** since Claude Code runs in the cloud, not locally, review its diff after every change (it reports this itself, and it's checkable on GitHub too) before trusting a change is scoped correctly. Ask for one small, scoped change at a time rather than broad open-ended requests — this matters even more without a local step-by-step view.

## Error tracking: build our own, not Sentry (decided 2026-08-19)
Fero asked whether TTT needs Sentry, GlitchTip, or something homemade. **Decision: homemade.** Reasoning, so nobody re-opens this without new information:

- **Sentry's main selling point doesn't apply.** Most of its value is mapping minified stack traces back to source. TTT has no build step — the JavaScript ships exactly as written — so a raw browser stack trace is already readable. That's paying complexity for a solved problem.
- **It would widen the CSP we just narrowed.** Sentry needs its loader script and its ingest domain added to `script-src` and `connect-src`. Reopening those to catch a handful of errors a month is a bad trade against the hardening pass.
- **The pieces already exist.** Two Cloudflare Pages Functions, the environment-variable pattern for secrets, and Telegram as the wanted destination — which through Sentry would be an extra integration hop.
- **GlitchTip is the worst option here**, not the free one: same feature set as Sentry, but self-hosting means renting a server, so it costs more than either alternative.

**Revisit if** TTT adds a build step or a framework (source maps make Sentry genuinely useful), or grows past a handful of contributors (its dashboard, alert routing and issue grouping start to earn their keep). Until then, homemade wins on every axis that matters to this project.
