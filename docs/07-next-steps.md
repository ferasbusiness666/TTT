# Next Steps

## Before building
- [x] Decide hosting → Cloudflare Pages, private repo (see `02-tech-stack-and-decisions.md`)
- [x] Decide stack → Supabase + Cloudinary + YouTube, confirmed over Cloudflare D1 (see `02-tech-stack-and-decisions.md`)
- [x] Set up the actual GitHub repo (private) → `ferasbusiness666/TTT`
- [x] Commit the original Claude Design HTML files as the very first commit, untouched
- [x] Auto-deploy confirmed working on Cloudflare Pages
- [x] Real navigation bug found and fixed (missing `<a>` links on homepage cards, not a hosting config issue) — every page confirmed working
- [x] Confirmed Claude Code is running in the cloud, not locally — docs updated to match

## Building
- [x] Deploy the schema in `04-database-schema.md` into the Supabase "TTT" project — done, all 5 tables live with RLS enabled. Security advisor run immediately after (see `06-changelog.md`) — found and fixed one real issue, now clean. Data API GRANTs added (migration `grant_data_api_access`) so reads/writes actually work — verified.
- [x] Turn the hardcoded example posts into real, reusable templates — **there are 4 distinct card styles, not 1** (see `03-features-and-content-model.md`). Done for the **homepage** (all 4 styles, via `assets/ttt-posts.js`) and the **article page** (`article.html?post=<slug>`). Look verified identical in a real browser. The demo cards are deliberately **kept as a fallback** — each section switches to real posts only once there are enough to fill it — so the site never looks half-empty pre-launch. They can be deleted outright once TTT has real content.
- [x] Apply the same treatment to `category.html` — now lists real published posts per category, with real search (`?q=` matches title + excerpt), real counts, and a real empty state. Keeps its demo cards while the site has no published posts at all.
- [x] **Fix the mobile UI** — all four reported symptoms fixed (clipped wordmark, missing search, dead space above the tabs, header on scroll) in both `index.html` and `assets/ttt.css`; measured and screenshotted at 390px, desktop verified unchanged. See `05-known-issues.md` → Resolved for the root cause and numbers. **Still needs a check on Fero's actual phone.**
- [ ] Wire the "MORE FROM TTT" strip at the bottom of `article.html` to real related posts (still the static three).
- [x] Wire up real login (Supabase Auth, email/password) — `assets/ttt-auth.js`; login.html signs in, admin/editor guard-redirect when signed out, log-out ends the session. **Needs a staff account to actually sign in (see below).**
- [x] Wire up real post creation/editing (saves to the `posts` table) — editor Save Draft / Publish insert/update `posts` (author = signed-in user, slug auto-generated, status draft/published); the editor loads an existing post via `editor.html?id=`; the admin dashboard lists real posts (with author name, type→colour, date) and its publish-toggle and delete act on the DB. Publish is single-click (saves + publishes); a minimal **category** picker is wired (seeded `categories` + a second dropdown; posts store `category_id`). **Not yet:** cover image (`cover_image_url`) + `video_url` wait on the Cloudinary/YouTube step.
- [x] Wire up cover photo / image upload to Cloudinary — unsigned preset `ttt-posts` on cloud `dxow1ant2`; the editor's ADD COVER PHOTO and in-body image button upload straight from the browser and the post stores the hosted URL. Delivery is optimised per slot (`f_auto,q_auto,w_*`) — measured 4.3MB → 370KB on a test photo. **Not yet:** a `video_url` (YouTube) field — the schema has the column but the editor has no input for it.
- [ ] Create the real staff accounts in Supabase
- [ ] Wire up the subscribe box to the `subscribers` table
- [x] Show the **real** signed-in user's name (admin sidebar + avatar initials, editor byline) instead of the hardcoded `Liya G. Tadele` placeholder — reads `full_name` from `profiles` via `tttAuth.currentProfile()`. (Value falls back to email until a display name is set — see `05-known-issues.md`.)
- [ ] Confirm the Founders **section content** shows exactly Liya Tadele and Ije Ezedani (the nav link to it was removed, but the section's actual content was never confirmed fixed — double check this)
- [x] Add the real favicon — generated from `images/preview.png` (the circular TTT logo) into `favicon.ico` + 32px/180px/512px PNGs, linked from **all six pages**. Also produced `images/og-cover.png` (1200×630, logo on the brand cream) and wired `og:`/`twitter:` share tags + meta descriptions on the three public pages.

## Before telling anyone it's ready — full security check
- [x] Row Level Security is ON for every table — audited 2026-08-13, all 5 tables
- [x] Every policy matches the plan: public read-only, staff write — audited; grants also tightened to least privilege (migration `harden_table_grants_least_privilege`)
- [~] Nothing can be called without logging in — by design the public CAN read *published* posts and insert into `subscribers`; everything else requires auth (admin/editor pages redirect, and RLS blocks the rest). Re-confirm once posts/subscribe are wired.
- [x] **Public sign-up is switched OFF** in Supabase's Auth settings — disabled by Fero 2026-08-13 and verified (the signup API now returns "Signups not allowed for this instance").
- [~] Leaked-password protection (HaveIBeenPwned) — **Pro-plan only, unavailable on the free plan.** Deferred by decision: accounts are admin-created for a small staff and use strong passwords. Revisit only if the project ever moves to Pro. See `05-known-issues.md`.
- [x] No `service_role` or Cloudinary secret key anywhere in the committed code — verified (only the public publishable key is in client code)
- [ ] Site checked on an actual phone
- [ ] Newsletter-sending approach decided (or explicitly deferred)
