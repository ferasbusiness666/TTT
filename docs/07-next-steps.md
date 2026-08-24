# Next Steps

## The working list — do these one at a time, top to bottom
Compiled 2026-08-19 from a full read of the docs, all seven pages and the live
database. This is the ordered queue; the sections further down hold the detail
and the history. **M** = Claude can build it now, **F** = only Fero can do it,
**?** = needs a decision before anything can be built.

| # | Who | Item |
|---|-----|------|
| 1  | ✅ | **Library/gallery shows every post's cover** — done. Draws the newest posts of any type that have a cover, each linking to its own post. |
| 2  | ✅ | **Credit line for Fero** — done. A single quiet line under the founder cards, not a fifth card. |
| 3  | ✅ | **Founders section** — done. Now the two real co-CEOs, Ije Ezedani and Liya Tadele, per `01-project-overview.md`. **No bios**: three invented people and four invented bios were removed and nothing was written to replace them. Send real bios and they go straight in. |
| 4  | ✅ | **Newsletter subscribe box** — done on all three pages that carry it (`index`, `category`, `404`). Two separate fakes that claimed "YOU'RE IN" without storing anything are gone. |
| 5  | ✅ | **"MORE FROM TTT"** — done. Newest posts minus the one being read, so an article no longer links to itself. |
| 6  | ⏸ | **ABOUT page — parked at Fero's request** until he supplies the copy. The footer link stays `href="#"` until then; it is the only dead link left on the site. |
| 7  | ✅ | **"Forgot password?"** — done, and no reset page needed: Fero's call was to point it at the administrator, so it is now a mailto. The Supabase redirect-URL step is no longer required. |
| 8  | ✅ | **"Remember me"** — done. Unticked keeps the session in sessionStorage so it dies with the browser. **One visual difference to confirm:** the box now renders ticked by default, which preserves today's behaviour; say if it should start unticked. |
| 9  | ✅ | **"Request a contributor account"** — done, pointed at the same contact address rather than left dead. Removing it outright is still an option. |
| 10 | ✅ | **"LOAD MORE STORIES"** — done. Real pagination, 24 a page; the button hides when the archive runs out. Also removed a 60-row cap that would have silently hidden posts past sixty. |
| 11 | ⚠️ | **Discord** — wired to `https://discord.gg/G8fC4aJtM`. **The invite expires 2026-09-18**, so the button breaks in a month unless it is reissued with no expiry. Also fixed: the homepage's own footer copy still had Instagram/TikTok/YouTube dead, which the earlier social fix missed. |
| 12 | ⏸ | **Invented numbers** — `VOL. 03 · NOV 2025` (masthead, footer), `40+ teen contributors` (login), `VOL. 03 — The Suburbia Issue` (category). **Parked at Fero's request** until the real contributor count is known. |
| 13 | F | **Publish real posts** — enough to fill the homepage sections (trending 7, rail 5, articles 6, gallery 8). |
| 14 | M | **Retire the demo cards** from `index.html` once #13 is done, so every section reads from the database. Order matters: posts first, then removal, or the homepage goes blank in between. |
| 15 | M | **Look pass on real posts** — check they actually read well once published (raised alongside the trending-order fix). |
| 16 | F | **Create the real staff accounts** in Supabase → Authentication → Users. Set `full_name` or the name shows as the email address. |
| 17 | F | **Check the site on a real phone.** The mobile fixes were only ever verified in a simulated 390px browser. |
| 18 | F | **Decide the newsletter-sending approach** — Resend, or send manually. "Deferred" is a valid answer; it doesn't block launch. |
| 19 | ✅ | **Access rules re-confirmed** 2026-08-19 with the subscribe box wired. Anonymous callers can read published `posts`, `categories` and `post_media` and nothing else; **every table refuses a direct write**, including `subscribers`. The only public write path is the rate-limited `subscribe` RPC. |

Nothing security-related is open. Everything above is features, content or polish.

## Cloudflare 2FA — Google 2FA done, Cloudflare's own declined for now
Fero couldn't enable Cloudflare 2FA: he signs in with **Google SSO**, so the account has no password, and the change-password form asks for an old one that never existed. Cloudflare's SSO docs give the way round — *"If a user does not have a password, they can use the forgot password method on the login page to create one"* — then Profile → Authentication → Two-Factor Authentication → Set up.

**Where it landed (2026-08-19): Fero enabled 2FA on the Google account and has declined Cloudflare's own for now.** That is a reasonable stopping point, not an outstanding task, and it should not be raised again unasked. While sign-in goes through Google, that Google account *is* the key to Cloudflare — so the factor that actually guards the login path he uses is in place. Cloudflare's own 2FA would add a second factor for someone who had already got into the Google account; the steps above are recorded for whenever he wants it.

## Done — performance pass (2026-08-19), and what was deliberately left alone
Measured first, on a 390px viewport with the CPU throttled 4x, then again after. **Payload 323KB → 294KB.**

**Fixed:**
- **`images/logo-badge.png`: 33KB → 4KB (88% smaller).** It was a 128px full-colour PNG for a badge displayed at 44px — the single most wasteful asset on the site. Now 96px (still crisp on a 2x screen) with a 128-colour palette. Compared side by side at display size: indistinguishable. A quantised PNG beat WebP here on both size *and* compatibility, so no format change was needed.
- **Dropped Playfair Display weight 900 from the Google Fonts request** on all seven pages. Nothing in any stylesheet asks for `font-weight: 900` — it was being fetched for nothing. Confirmed against the Google Fonts API: 34 `@font-face` sources before, 30 after.

**Already correct, checked rather than assumed:** card and gallery images already carry `loading="lazy"`, real `alt` text and Cloudinary's `f_auto,q_auto,w_*` sizing; `display=swap` is already on the font request; measured **CLS was 0**, because the media boxes reserve space with `aspect-ratio`.

**Deliberately not done, with reasons:**
- **supabase-js is 207KB — 70% of the page weight, and by far the biggest remaining lever.** Replacing it with plain `fetch()` calls on the public pages would remove nearly all of it, since those pages only do unauthenticated reads. It is also a real refactor of every public page's data layer, with real regression risk, in exchange for a page that is *already fast*: Cloudflare's own Web Analytics reports **LCP 100% "Good" and 124ms page load** from real visitors. Worth revisiting only if real-user numbers ever get worse.
- **Making the Google Fonts stylesheet non-render-blocking** (`media="print"` + `onload`) would speed up first paint on a poor connection, but it trades that for a visible flash of fallback text on every load. That is a visual change for a site whose real-world load time is already 124ms, so it needs Fero's say-so rather than being slipped in.

**Test note for next time:** a first measurement showed a 13-second first paint. That was an artifact — Google Fonts is unreachable from the sandbox and the stylesheet blocks render, so the run was measuring a hung request, not the site. Abort font requests in the harness before trusting any timing number from it.

## Done — editor draft backup (2026-08-19)
A browser that died mid-post used to take the whole post with it — the worst thing this editor could do to someone writing a long piece. Everything typed is now mirrored into `localStorage` a second after you stop typing, keyed by post id (or `new`), and offered back the next time that post is opened.

**It only offers a draft back when that is genuinely the right thing:** the backup must differ from what is on screen, and for an existing post it must be **newer than the copy in the database**. Otherwise restoring would quietly undo a save made from another device, which is worse than the crash it protects against. The backup is deleted the moment a real save succeeds, and a brand-new post's `new` key is cleared once it has a real id, so it can't reappear in the next blank editor.

**It also stopped the status line lying.** It used to swap to "Draft · saved just now ✓" on a 900ms timer without saving anything anywhere. It now says what actually happened — "backed up on this device", which is not the same as saved — and says "unsaved changes" if storage is full or blocked (a private window), rather than implying the work is safe when it isn't.

Verified end to end in a real browser: typed a post, closed the tab without saving, reopened — the bar appeared and restored title and body exactly. Discard clears the backup and it does not come back. A fresh editor with no backup shows no bar at all.

## Done — indexing readiness (2026-08-19)
Everything that could be prepared for Google *before* there are posts to index:
- **Per-post metadata on `article.html`.** Every article was serving the site-level title and description, so all of them looked identical to search engines and link previews. Title, `description`, `og:*`, `twitter:*` and canonical are now built from the real post.
- **`NewsArticle` structured data** per post (headline, author, publisher, datePublished, image), and **`Organization`** structured data on the homepage — both were asked for in `08-seo and technical checklist.md` and neither existed.
- **Canonical URLs** on home, article and category. The category canonical deliberately **drops any `?q=` search term**, so a linked search can't be indexed as a near-duplicate of the archive.
- **`noindex` on the "Story not found" state.** A missing slug still returns HTTP 200 — it's a static host, the slug is only known once JS runs — so Google would otherwise have indexed "Story not found" as a real page.
- **`llms.txt`** added, per the checklist. Low expectations by design: it's an unofficial convention with no confirmed uptake.

**One honest limit, worth deciding on later:** these tags are set by JavaScript. Google renders JS and picks them up, but most social scrapers (Discord, Facebook, X) do not — so link previews will still show the static site-level tags from the HTML head. The proper fix is rendering them server-side in a Pages Function for `/article`. Worth doing only if link previews turn out to matter; better decided once there are real posts to test against.

## BLOCKER before indexing — sitemap.xml must be regenerated
`sitemap.xml` is hand-written and lists only the static pages. **Do not submit it to Google until it lists the real published posts**, or Google gets a map that doesn't match the site — which is worse than submitting nothing.

**Sequencing agreed with Fero 2026-08-19: wait until there are real posts, then build it.** Writing the generator against an empty `posts` table would mean shipping something that can't be tested on real data — and the shape of the output (which posts, what `lastmod`, whether drafts are excluded) is easier to get right with something actually in the table. Claude picks this up once Fero has published; it comes before Search Console verification, not after.

## Just before launch — Google Search Console
Fero wants Google crawling the site. Google verifies ownership with **one of** a `<meta name="google-site-verification" content="…">` tag in `<head>`, or an HTML file dropped at the site root. Fero will send whichever Google gives him and Claude puts it in the right place — the meta tag belongs in the `<head>` of `index.html` (and only there; Google checks the homepage).

Worth doing in the same sitting:
- `sitemap.xml` is currently **static and hand-written**. Before submitting it, it should list the real published posts, or Google gets a sitemap that doesn't match the site. Generating it needs a decision — a Pages Function that renders it from `posts`, or regenerating it by hand at launch.
- `robots.txt` already disallows `/admin`, `/editor`, `/login` and `/api/`, so that side is ready.

## Done — visitor analytics (Cloudflare Web Analytics, 2026-08-19)
Free, unlimited, cookieless, no consent banner needed. Reports page views, unique visitors, referrers, countries, top pages and Core Web Vitals.

**Automatic injection IS active, and no snippet belongs in the repo.** Cloudflare injects the beacon at the edge on every page of the site — verified in the served HTML, including the staff pages, which contain no beacon in the source. The injected tag carries site token `bde6e2861a064d2980f1caddf6772d22`.

**A wrong turn worth recording, because the reasoning sounded right.** Reading Cloudflare's docs on "sites proxied through Cloudflare", Claude concluded that automatic injection can't work for a `pages.dev` hostname (no zone, same reason Bot Fight Mode is unavailable) and added the manual snippet to the four public pages. That was wrong: **Cloudflare Pages has its own Web Analytics integration that injects for `*.pages.dev` regardless of zones.** The result was two beacons per page with two different tokens — and Cloudflare's own FAQ says only one snippet per page is used. The manual snippet has been removed. **Check what the server actually serves before reasoning from docs about what it must be doing.**

**Likely why the dashboard looked empty before today:** the auto-injected beacon loads from `static.cloudflareinsights.com` and reports to `cloudflareinsights.com`. Neither was in our CSP until 2026-08-19, so the browser would have blocked it. Those entries are in `_headers` now and must stay — **removing them would silently switch analytics off again.**

**Housekeeping for Fero:** the Web Analytics dashboard now has a second, unused site carrying token `7e1be1b0c3704050b90d401991dcef86`, created while setting this up manually. Delete it so there's one site and no confusion about which numbers are real.

**Two things to expect, so neither looks like a bug:**
- **Ad blockers block the beacon** — uBlock, Brave, DuckDuckGo and friends all do. If Fero browses with one, his own visits won't appear. Test in a clean browser before concluding it's broken.
- **Data is unsampled for 7 days**, then aggregated to roughly 10% for long-term storage. Six months of history available.

## Later — Cloudflare Observability shows no traffic (2026-08-19)
Fero noticed the Observability tab reporting zero traffic even though he and the tests have been hitting the site. **This is expected, not a bug:** that tab reports on **Workers/Functions invocations**, and TTT is static files plus two `/api/*` Functions. Requests for `index.html`, the CSS, the images — the actual traffic — never invoke a Worker, so they are correctly absent. Only `/api/sign-upload` and `/api/delete-image` calls would ever appear there.

For real visitor numbers the tool is **Cloudflare Web Analytics** (free, privacy-preserving, no cookies). One catch to handle when we do it: it injects a beacon from `static.cloudflareinsights.com`, so `_headers` needs that host added to `script-src` and `connect-src`. Small, but it must be done in the same change or the CSP silently blocks the beacon and the tab stays empty — which would look exactly like the current symptom.

## Done — newsletter rate limiting (2026-08-19)
Built in the database rather than as a Pages Function; see `04-database-schema.md`. 30/IP/hour, 100/IP/day, 1000 and 3000 site-wide; anon INSERT revoked so the `subscribe` RPC is the only way in. (The first numbers were far too low — they treated one IP as one person, which breaks on school wifi and mobile CGNAT. Raised the same day.) **Turnstile is still the upgrade** if a determined attacker with a proxy pool ever becomes a real problem — per-IP limiting doesn't stop that, the site-wide cap only bounds it.

## Later — error + attack reporting to Telegram (decided 2026-08-19, not started)
Parked at Fero's request; the decision is made, the build is not. Rationale for building rather than buying is in `02-tech-stack-and-decisions.md`.

**What to build (small):**
- `assets/` gets a `window.onerror` + `unhandledrejection` handler that POSTs to a new `/api/report` Pages Function.
- The CSP in `_headers` gains a `report-to` so **CSP violations land in the same place** — that is the piece that catches real XSS attempts, and it costs almost nothing because the policy already exists.
- The Function forwards to a Telegram bot. **`TELEGRAM_BOT_TOKEN` goes in a Cloudflare environment variable, never in the repo** — same rule as `CLOUDINARY_API_SECRET`. Fero creates the bot with @BotFather and pastes the token into Cloudflare himself.
- The endpoint needs a hard rate cap. Without one, the first bot that finds it turns Fero's phone into a slot machine.

**Free and worth turning on regardless, no code:** Cloudflare's free plan includes 5 custom WAF rules, 1 rate-limiting rule, and Bot Fight Mode. Managed OWASP rulesets are paid ($20/mo) and not needed.

**What this will NOT do, so nobody expects it to:** it cannot see attacks against Supabase. Anyone with the public key can hit `ruzsbwgwbneqyvbdmwdb.supabase.co` directly — the site never loads and none of our code runs. No static site can watch that; the defence there is RLS, which is already audited. Likewise SQL injection is not a live risk (PostgREST parameterises everything; nothing concatenates SQL), and XSS is already handled by the sanitiser plus the CSP. A homemade detector catches noisy scanners and genuine client-side breakage — not a competent attacker.

## Newly found 2026-08-19 (were not tracked anywhere)
- **There is no About page.** The footer's ABOUT link is `href="#"`. The site has exactly seven pages: `index`, `article`, `category`, `login`, `admin`, `editor`, `404`. Either an About page gets written or the link goes.
- **"Request a contributor account →"** on `login.html` is a dead link, and no contributor-application flow exists or is planned. It reads like a promise the site can't keep.
- **Invented numbers are live.** `VOL. 03 · NOV 2025` (masthead + footer), `40+ teen contributors` (login screen), `VOL. 03 — The Suburbia Issue` (category page). These came from the original mockup and have never been checked against reality — worth fixing before anyone outside the team sees the site.

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
- [x] **Orphaned Cloudinary images** — built automatic cleanup via a Cloudflare Pages Function (`functions/api/delete-image.js`). Deleting a post removes its cover and body images; replacing a cover removes the old one. **Needs its environment variables set in Cloudflare before it works — see `05-known-issues.md`.**
- [x] Wire up real login (Supabase Auth, email/password) — `assets/ttt-auth.js`; login.html signs in, admin/editor guard-redirect when signed out, log-out ends the session. **Needs a staff account to actually sign in (see below).**
- [x] Wire up real post creation/editing (saves to the `posts` table) — editor Save Draft / Publish insert/update `posts` (author = signed-in user, slug auto-generated, status draft/published); the editor loads an existing post via `editor.html?id=`; the admin dashboard lists real posts (with author name, type→colour, date) and its publish-toggle and delete act on the DB. Publish is single-click (saves + publishes); a minimal **category** picker is wired (seeded `categories` + a second dropdown; posts store `category_id`). **Not yet:** cover image (`cover_image_url`) + `video_url` wait on the Cloudinary/YouTube step.
- [x] Wire up cover photo / image upload to Cloudinary — unsigned preset `ttt-posts` on cloud `dxow1ant2`; the editor's ADD COVER PHOTO and in-body image button upload straight from the browser and the post stores the hosted URL. Delivery is optimised per slot (`f_auto,q_auto,w_*`) — measured 4.3MB → 370KB on a test photo. The YouTube `video_url` field was added afterwards and is wired (`#video-url` in the editor, saved and reloaded with the post), so this item is fully done.
- [ ] Create the real staff accounts in Supabase
- [ ] Wire up the subscribe box to the `subscribers` table
- [x] Show the **real** signed-in user's name (admin sidebar + avatar initials, editor byline) instead of the hardcoded `Liya G. Tadele` placeholder — reads `full_name` from `profiles` via `tttAuth.currentProfile()`. (Value falls back to email until a display name is set — see `05-known-issues.md`.)
- [x] Confirm the Founders **section content** shows exactly Liya Tadele and Ije Ezedani — done 2026-08-19. It had been showing four people, three of whom don't exist.
- [x] Add the real favicon — generated from `images/preview.png` (the circular TTT logo) into `favicon.ico` + 32px/180px/512px PNGs, linked from **all six pages**. Also produced `images/og-cover.png` (1200×630, logo on the brand cream) and wired `og:`/`twitter:` share tags + meta descriptions on the three public pages.

## Security hardening (from the stress test — see `09-security-stress-test.md`)
Ordered by value-for-effort, not by the report's numbering.

- [x] **Security headers via a `_headers` file** — HSTS, `X-Frame-Options: DENY`, a strict CSP, and pin `Access-Control-Allow-Origin` to the site origin. One small file closes findings #6, #7, #8 and #9, and is the single biggest win available.
- [x] **Escape output in the admin table** (#3) — `p.status` is interpolated straight into a `class` attribute, and admin's `esc()` doesn't escape quotes. Small, unambiguous fix.
- [x] **Sanitize post bodies before rendering** (#2) — `assets/ttt-sanitize.js`, allow-list based; tested against 11 payloads — `article.html` does `prose.innerHTML = p.body`. Add sanitization (DOMPurify or an allow-list) so a pasted `<img onerror=…>` can't run for readers. Pair with the CSP above.
- [x] **Email validation on `subscribers`** (#1) — add a format CHECK constraint + length cap. Keep the public INSERT (the newsletter needs it); reject junk like `##not-valid##`.
- [x] **Narrow the public view of `profiles`** (#4) — two parts, both done. Column-level grants stop anon reading `role`/`created_at`; migration `stop_anon_enumerating_profiles` then replaced the `using (true)` row policy so anon can only read the profile of someone who has a **published** post. Before that, the whole staff list (names + auth UUIDs) was dumpable with the public key. Verified against the live API.
- [x] **Check `role` in `tttAuth.guard()`** (#14) — today any authenticated account passes the admin/editor guard. Only one account exists, so no exposure yet, but it should verify staff.
- [x] **Real 404 + `robots.txt` + `sitemap.xml`** (#10) — every unknown path currently returns the homepage with HTTP 200. `08-seo and technical checklist.md` already has the content ready to use.
- [x] **Sign Cloudinary uploads for signed-in staff** (#5) — **closed 2026-08-19.** `/api/sign-upload` signs uploads for authenticated staff and the editor prefers it; Fero then switched the `ttt-posts` preset to **Signed** in the Cloudinary dashboard and confirmed a photo still uploads. Anonymous uploads to the account are now rejected. Note the unsigned fallback in `assets/ttt-upload.js` is dead code from here on — if the Pages Function ever fails, uploads fail rather than silently going unsigned, which is the behaviour we want.
- [x] **Remove the fake admin stats** (#13) — the views card is now a real PHOTOS count — `VIEWS · 30D 12.4k` and "↑ 4 this month" are hardcoded and never updated.
- [x] **Per-slug "story not found" state** (#12) — instead of silently showing the demo essay under someone else's headline.
- [~] Low-priority tidy-ups (#15–#19) — dead `href="#"` links, login `autocomplete`, the decorative "Remember me", the no-op admin search and LOAD MORE button. **Done:** footer Instagram/TikTok/YouTube now point at the documented @tadeleteentalks accounts, the admin search box filters the list, the article share buttons copy the link (or open the native share sheet), and the login inputs carry `autocomplete`. **Still open:** the Discord button has no invite URL on record, "Forgot password?" needs a password-reset page to land on before it can be wired, and "Remember me" is still decorative.

## Fero's list (raised 2026-08-19)
Recorded verbatim in intent; several need a decision from Fero before they can be built (marked **ASK**).

- [x] **Admin desk cleanup** — **Media**, **Comments** and **Settings** all removed from the sidebar. All three were `href="#"` placeholders inherited from the mockup with nothing behind them: comments aren't in v1, media lives in Cloudinary, and there's nothing settings could configure that isn't in Supabase or Cloudinary. Removing Settings also retired its malformed gear SVG, so the broken-icon fix is moot.
- [ ] **Retire the demo posts and go live on the templates** — delete the hand-authored mockup cards from `index.html` (trending, rail, articles, gallery) so every section reads from the database, and publish real posts to fill them. This is the design change `05-known-issues.md` says to ask about first; Fero has now asked for it. Sequence matters: publish enough real posts *first*, then remove the demo markup, or the homepage goes blank in between.
- [ ] **Library/gallery shows every post's image** — today the gallery section only pulls posts of type `artwork`, and only fills when there are 8 of them. It should show the images from **all** posts, each linking to the post it belongs to. **Decided:** cover images only — one image per post, no duplicates, each image maps to exactly one article.
- [ ] **Founders section: credit line for Fero** — not as a founder; a separate line below them naming him as the person who designed and built the site, with an email for support, bug reports and contact. **Decided:** `feroomon10400@gmail.com`.
- [ ] **Social buttons** — Instagram, TikTok and YouTube already point at the documented `@tadeleteentalks` accounts. Discord still has no URL. **ASK:** what Fero meant here — supply the Discord invite, or correct the other three?
- [~] **Trending order** — **fixed.** `.k-featured` is the big card (2 columns × 2 rows) but sat at index 1 of `BENTO_SLOTS`, so slots filled in sequence put the *newest* post in a small top-left card and the second-newest in the hero. `BENTO_BY_IMPORTANCE` now maps post rank → slot index, so the newest post gets the featured slot and the rest follow in date order. DOM order is untouched, so the grid is identical on desktop and mobile. Measured before/after with 7 seeded posts at 1440px: featured card 488×384 held rank 2, now holds rank 1; the six small cards are 237×185 and run 2,3,4,5,6,7. **Still open:** a look at how real posts actually read once TTT publishes some.

## Before telling anyone it's ready — full security check
- [x] Row Level Security is ON for every table — audited 2026-08-13, all 5 tables
- [x] Every policy matches the plan: public read-only, staff write — audited; grants also tightened to least privilege (migration `harden_table_grants_least_privilege`)
- [x] Nothing can be called without logging in — **re-confirmed 2026-08-19** now that posts and subscribe are wired. Probed every table as an anonymous caller with the public key: reads succeed only on published `posts`, `categories` and `post_media`; `profiles` (via `select=*`), `subscribers` and `subscribe_attempts` all return `42501`. **Every table refuses a direct INSERT**, `subscribers` included — the sole public write path is `rpc/subscribe`, which validates and rate-limits before writing.
- [x] **Public sign-up is switched OFF** in Supabase's Auth settings — disabled by Fero 2026-08-13 and verified (the signup API now returns "Signups not allowed for this instance").
- [~] Leaked-password protection (HaveIBeenPwned) — **Pro-plan only, unavailable on the free plan.** Deferred by decision: accounts are admin-created for a small staff and use strong passwords. Revisit only if the project ever moves to Pro. See `05-known-issues.md`.
- [x] No `service_role` or Cloudinary secret key anywhere in the committed code — verified (only the public publishable key is in client code)
- [ ] Site checked on an actual phone
- [ ] Newsletter-sending approach decided (or explicitly deferred)
