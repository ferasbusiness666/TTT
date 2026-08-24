> **Owner triage (Claude, 2026-08-19) — read this before acting on the table below.**
>
> This re-test was run against the deployed site partway through a day of changes, so **finding #15 is stale in four of its six particulars**. Verified against the live site after the day's pushes: the login page's "Forgot password?" and "Request a contributor account" are now `mailto:` links, and Media / Comments / Settings are gone from the admin sidebar. What genuinely remains is the homepage **ABOUT** link (one `href="#"`, tracked as item 6 in `07-next-steps.md`) and the article share buttons — which are `href="#"` in the markup but have real click handlers attached in JS, so they work; they should become `<button>` elements one day, which is markup tidiness, not a defect.
>
> **Acted on immediately:**
> - `frame-src` trimmed to `https://www.youtube-nocookie.com` only. Confirmed first that the sole iframe the code ever builds is a `-nocookie` embed; the other two `youtube.com` strings are a footer profile link and a placeholder in an input.
> - Added `/.well-known/security.txt` (the CSV's Low finding).
> - Deleted the re-test's leftover rows `retest-01@example.invalid` and `retest-02@example.invalid`. (`retest-03` never landed.) **Left alone: `feroomon10400@gmail.com`** — that is Fero's own real signup from testing the form, not test data. Delete it only if he says so.
> - Cloudinary: the five public_ids listed under Cleanup are **already gone** — the account holds zero assets. Nothing to do.
>
> **Judged and deferred, with reasons:**
> - **No rate limit on `subscribers` (the one residual worth taking seriously).** Anyone can bulk-insert valid-format addresses. The fix is Cloudflare Turnstile on the form — which is also the CSV's "No Turnstile enabled" finding. Deferred with the security batch; it matters when TTT has an audience worth spamming, not before.
> - **Password recovery still enabled (#17).** Now genuinely unused: "Forgot password?" points at an email, so nothing on the site calls `/auth/v1/recover`. It can't be switched off in Supabase, but the Auth email rate limits can be lowered in the dashboard. Low value, low effort — bundle it with the next dashboard visit.
> - **CSP `script-src 'unsafe-inline'`.** Correct as written: every page ships inline `<script>` and `onclick`. Removing it means moving all inline script to files — a real refactor with real regression risk, for a site whose stored HTML is already sanitised. Not now.
> - **#19 `.or()` filter tamper.** Negligible, unchanged, agreed.
> - **Custom sanitiser vs DOMPurify.** Fair caution. DOMPurify would mean adding a CDN script and widening `script-src`, which trades one risk for another. Re-audit if the editor ever allows more tags.
>
> **From the Cloudflare Security Insights CSV (same date):**
> - **Bot Fight Mode "not enabled" on `tadeleteentalk.pages.dev` and `feroomon10400.workers.dev` — not actionable, and this is why Fero couldn't find the setting.** Bot Fight Mode lives under a *zone's* Security settings, and neither of those is a zone he owns; `pages.dev` and `workers.dev` are Cloudflare's own domains. The scanner flags the hostname anyway. This becomes available only once TTT has its own custom domain.
> - **Users without MFA — the most important line in the whole CSV, and it's Fero's to fix.** That Cloudflare account holds `CLOUDINARY_API_SECRET` and controls what deploys to the live site. Turn on 2FA.
> - Security.txt — done, see above.
> - Turnstile — see the subscribers residual.

---

# Tadele Teen Talks — Re-Test After Fixes (Diff Report)

**Target:** https://tadeleteentalk.pages.dev/
**Date:** 2026-08-19
**Compared against:** `TTT-security-report.md` (2026-08-17)
**Method:** Direct HTTP/API re-verification of every original finding + fresh re-read of the changed client assets (`ttt.js`, `ttt-auth.js`, `ttt-posts.js`, `ttt-upload.js`, `ttt-sanitize.js` (new), `article/admin/editor/category/login` pages) + Supabase RLS probes + Cloudinary upload probe.

> ⚠️ **NEW TEST DATA CREATED during this re-test** (see Cleanup at the end). No site code was modified.

---

## VERDICT BY FINDING

| # | Original finding | Sev | Status | Evidence |
|---|------------------|-----|--------|----------|
| 1 | Anon INSERT into `subscribers` (garbage accepted) | HIGH | ✅ **FIXED** (garbage); anon INSERT kept **by design** | CHECK constraint `subscribers_email_format` now rejects `notanemail`, `not-an-email-99`, `##not-valid##` → `400 23514`. Valid-format emails still insert (201) — required for the newsletter feature. No rate limit yet. |
| 2 | Stored XSS `prose.innerHTML = p.body` | HIGH | ✅ **FIXED** | Body now runs through allow-list sanitizer: `prose.innerHTML = window.tttSanitize.clean(p.body)` (article.html:359). New `assets/ttt-sanitize.js` strips script/style/iframe/svg/math/form/etc., allow-lists a closed tag+attr set, blocks `javascript:`/`data:`/`vbscript:` hrefs, restricts `img src` to `res.cloudinary.com` or relative, removes all `on*` attrs. |
| 3 | Admin stored XSS (unescaped `status` in attr) | HIGH | ✅ **FIXED** | `esc()` now escapes quotes too: `&quot;` and `&#39;` (admin.html:121). `p.status` used via `esc()` in both class and text: `'<td><span class="status ' + esc(p.status) + '">' + esc(String(p.status).toUpperCase()) + '</span></td>'` (admin.html:160). Card builders in ttt-posts.js all use `esc()`. |
| 4 | Anon read of `profiles` (staff leak) | MED | ✅ **FIXED** | `GET /rest/v1/profiles?select=*` → `42501 permission denied for table profiles` (HTTP 401). |
| 5 | Unlimited anonymous Cloudinary uploads | MED | ✅ **FIXED** | Preset `ttt-posts` is now **signed-only**: unsigned upload → `400 "Upload preset must be whitelisted for unsigned uploads"`. New `/api/sign-upload` Pages Function issues signatures (401 anon). Client still falls back to the preset if signing is unavailable, but Cloudinary rejects it — hole closed at the preset level. Client-side 10MB + type caps added. |
| 6 | No HSTS | MED | ✅ **FIXED** | `Strict-Transport-Security: max-age=31536000; includeSubDomains` on all pages. |
| 7 | Clickjacking (login/admin/editor iframe-able) | MED | ✅ **FIXED** | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` on all pages. |
| 8 | No CSP | MED | ✅ **FIXED** | Full CSP: `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://res.cloudinary.com; connect-src 'self' https://ruzsbwgwbneqyvbdmwdb.supabase.co https://api.cloudinary.com; frame-src https://www.youtube-nocookie.com https://www.youtube.com; media-src 'self' https://res.cloudinary.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| 9 | `Access-Control-Allow-Origin: *` | MED | ✅ **FIXED** | Now pinned: `Access-Control-Allow-Origin: https://tadeleteentalk.pages.dev` (all pages, incl. article). |
| 10 | Soft-404 catch-all; no robots.txt/sitemap | MED | ✅ **FIXED** | `/nonexistent-page-xyz` → real **HTTP 404** (2859 B). `/robots.txt` → `200 text/plain` (274 B). `/sitemap.xml` → valid XML urlset (static, excludes staff screens; notes it should become generated when posts exist). |
| 11 | Newsletter records nothing (fake "YOU'RE IN") | MED | ✅ **FIXED** | `wireNewsletter()` in ttt-posts.js now inserts into `subscribers` via `client.from("subscribers").insert({ email })` with real success/error feedback; wired on home (`form.nl-form`) and category pages. Combined with the #1 CHECK constraint, this is now a working, validated signup. |
| 12 | All article URLs serve same static sample | MED | ✅ **FIXED** (empty-state) | article.html now queries `posts` by `?post=<slug>` (`.eq("slug", slug).maybeSingle()`). Unknown slug / unpublished → real "This story isn't here" empty state (`textContent`, escaped) + `hasPublished` logic. Demo cards only remain while the DB has zero published posts (pre-launch state, acknowledged in comments). |
| 13 | Admin shows hardcoded fake stats (VIEWS 12.4k) | MED | ✅ **FIXED** | Fake "VIEWS 12.4k / ↑22%" card is gone. Stats now derived from real query: `s-total`/`s-pub`/`s-draft`/`s-photos` computed from `ROWS` in `updateCounts()` (admin.html:173-176). |
| 14 | Guard checks session only, never role | MED | ✅ **FIXED** | `tttAuth.guard()` now reads `profiles.role` for the session user and bounces non-staff (role not in `staff|editor|admin`) to `login.html` with sign-out. Client-side convenience only (RLS is the real boundary) — comments state this correctly. Editor + admin pages hide via `visibility:hidden` before guard runs. |
| 15 | Dead links / no-op buttons | LOW | 🟡 **PARTIAL** | Discord/Instagram/TikTok/YouTube in footer now real URLs. **LOAD MORE STORIES** is now fully wired (real paging in category.html). Still `href="#"`: home "ABOUT", article share buttons, login "Forgot password?"/"Request a contributor account", admin sidebar Media/Comments/Settings. |
| 16 | Login lacks autocomplete control; Remember me decorative | LOW | ✅ **FIXED** | `autocomplete="username"` / `autocomplete="current-password"` added. Remember-me now functional: unchecked → session-only storage shim (`ttt.session-only` flag, sessionStorage vs localStorage); reads check both stores; sign-out clears both. |
| 17 | Password-recovery endpoint enabled (reset-spam) | LOW | 🟡 **UNCHANGED** | `POST /auth/v1/recover` with valid-format JSON → `200 {}`. Non-differential (no enumeration), but still fires real reset emails for guessed addresses. Acceptable residual for a 1-user site. |
| 18 | Schema/column enumeration oracle | LOW | ✅ **FIXED** | `/rest/v1/` root and OpenAPI (`Accept: application/openapi+json`) now require a **secret** key → `401 "Secret API key required"`. Publishable key no longer lists tables. |
| 19 | PostgREST `.or()` filter tamper via `?q=` | LOW | 🟡 **UNCHANGED** | category.html now strips `[%,]` from the term and uses `.or("title.ilike.…,excerpt.ilike.…")`; `,`/`%` sanitized, output escaped. Same negligible impact as before. |

---

## NEW AREAS ADDED SINCE THE ORIGINAL TEST (not previously present)

- **`assets/ttt-sanitize.js` (new):** allow-list HTML sanitizer (see #2). Reviewed for bypass patterns (mXSS via template parsing — inert parse; `javascript:`/`data:` schemes in `href`/`src` blocked after control-char stripping; `on*` attrs stripped; SVG/MathML dropped wholesale; unknown tags unwrapped to text). No obvious bypass found. CSP `object-src 'none'` + `frame-ancestors 'none'` back it up.
- **`/api/sign-upload` (new Pages Function):** issues Cloudinary signed-upload params to signed-in staff. Anon → `401 {"error":"Not signed in."}`.
- **YouTube embed hardening:** `youtubeId()` regex extracts only an 11-char ID from youtube domains; iframe `src` is always `https://www.youtube-nocookie.com/embed/<id>`; any non-YouTube URL → no iframe. CSP `frame-src` restricts to youtube hosts. No arbitrary-iframe injection.
- **Admin stats:** replaced fake numbers with live queries (#13).
- **Editor hardening:** body images now uploaded to Cloudinary and stored as hosted URLs (no base64 in `posts.body`); cover replaced → old Cloudinary image deleted via `/api/delete-image`; 10MB cap enforced client-side.

## REMAINING / RESIDUAL

- **subscribers:** anon INSERT is now intended (newsletter feature), garbage rejected by CHECK. **No rate limit / no dedupe-limit** — an attacker can still bulk-insert valid-format emails (unlimited 201s). Consider a per-IP rate limit or Cloudflare Turnstile on the form if this ever matters.
- **Password recovery (#17)** still enabled — acceptable, but consider disabling or monitoring.
- **Dead `href="#"`** items (#15 partial) — cosmetic, not security.
- **CSP `script-src 'unsafe-inline'`** — retained because the site ships inline scripts; combined with the sanitizer + `object-src 'none'` this is a reasonable trade-off, but if inline scripts can be moved to files, removing `'unsafe-inline'` would be stronger.
- **`frame-src` allows `https://www.youtube.com`** (not just `-nocookie`) — the embed code only uses `-nocookie`; the extra host is harmless but could be trimmed.
- **XSS via a future bad sanitizer input** — the sanitizer is custom, not battle-tested DOMPurify. It's well-written for the closed tag set, but re-audit if the editor ever allows more tags (e.g. `style`).

---

# CLEANUP REQUIRED (test data created during re-test)

**Supabase `subscribers` table** (anon cannot DELETE — owner must remove in Supabase SQL editor):
- From original audit: `x`, `notanemail`, `not-an-email-99`, `##not-valid##`, `chain-probe-77@example.invalid`, `fresh-probe-91@example.invalid`
- **New from re-test:** `retest-01@example.invalid`, `retest-02@example.invalid`, `retest-03@example.invalid`

**Cloudinary public_ids** (from original audit; the preset is now signed, so these can only be deleted by the owner):
- `zxisasjyn4h8atnqczyg`, `oqc6nejcktt43kgoczw6`, `araxlyki5xji6cim2niw`, `q6egctkhysk699nep6ah`, `wpnxrkoqfuo2fg3ysf7k`
- (the ~13MB `big.png` — timed out client-side; may not have landed)

**Recommended SQL for subscribers cleanup:**
```sql
DELETE FROM public.subscribers
WHERE email IN ('x','notanemail','not-an-email-99','##not-valid##',
  'chain-probe-77@example.invalid','fresh-probe-91@example.invalid',
  'retest-01@example.invalid','retest-02@example.invalid','retest-03@example.invalid');
```

---

## SUMMARY

**19 original findings → 14 fully fixed, 3 partial/unchanged (all LOW), 2 residuals.** No original HIGH or MEDIUM finding remains exploitable. The three architectural controls that made the original report scary — no sanitizer, no CSP, an unsigned upload preset — are all in place and verified at the live endpoint. The remaining items are LOW-severity cosmetic/residual concerns plus one new best-practice note (`unsafe-inline`).