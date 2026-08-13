# Changelog

## Planning phase
- Chose hosting: GitHub Pages over Netlify. Repo will be public, with no open-source license (all rights reserved by default).
- Chose stack: Supabase (DB/Auth), Cloudinary (photos), YouTube (video).
- Confirmed content model: flat permissions (any staff account can do anything), no approval workflow, type + category labels, Draft/Published only.
- Confirmed no comments for v1 — schema supports adding later without disrupting existing data.
- Built and then corrected the database schema (Magazine changed from a special type to just a label).

## UI fixes (mockup → matches the real plan)
- Removed the "Review" **status** from the admin posts table and status options — only Draft/Published exist now. (Kept "Review" as a **category** option — that's a topic label like "this post reviews something," unrelated to approval status.)
- Removed "Comments" from the admin sidebar navigation.
- Confirmed "Magazines" is just a post-type label, not a special structure — schema updated to match (see `04-database-schema.md`).

## Hosting reconsidered
- Switched hosting from GitHub Pages to Cloudflare Pages — no bandwidth cap, cleaner default web address. Still deploys from the same GitHub repo.
- Because Cloudflare Pages deploys from private repos for free (GitHub Pages didn't, on the free plan), switched the repo back to **private**. The public-repo decision and the license reasoning from the planning phase no longer apply — see `02-tech-stack-and-decisions.md` for the current state.
- Considered moving the database to Cloudflare D1 (since hosting is now on Cloudflare) — decided against it. D1 has no built-in authentication; Supabase stays.

## Hosting corrected again — Pages → Workers with Static Assets
- Classic Cloudflare Pages (the dashboard/Git-integration flow) defaulted to single-page-app routing behavior, which broke every page except the homepage (only index.html ever loaded).
- Switched to Cloudflare Workers with Static Assets — same free hosting, but Cloudflare's current recommended path, deployed via Wrangler (`wrangler deploy`) instead of the Pages dashboard. Configuration lives in `wrangler.jsonc`, with `not_found_handling: "404-page"` specifically fixing the routing bug.
- Repo visibility stopped mattering to the hosting decision entirely — Wrangler deploys from local files, not from GitHub directly.

## Hosting, final answer — back to Pages, and the real bug found
- The Workers migration never actually happened (checked the account directly — zero Workers existed).
- The real navigation bug turned out to be simpler than the SPA-fallback theory: the homepage story cards were never wrapped in real `<a>` links at all. Fixed directly, tested link-by-link, confirmed a clean 52-line diff (just adding the missing links).
- Since Pages is confirmed working with auto-deploy already connected, staying on it rather than migrating again.
- Confirmed Claude Code has been running in the cloud this whole time, not locally as originally planned — `02-tech-stack-and-decisions.md` updated to match, including what that means for reviewing changes.
- UI fixes: Founders link removed from site navigation; Art & Photography section fixed (details not fully known on my end — worth double-checking the Founders section itself still shows just Liya Tadele and Ije Ezedani, since that was a separate, still-open task).

## Database schema deployed
- Ran the full schema from `04-database-schema.md` against the real Supabase "TTT" project — all 5 tables created (`profiles`, `categories`, `posts`, `post_media`, `subscribers`), RLS enabled on every one.
- Ran Supabase's security advisor afterward, per the pre-launch check we set up. It found one real issue: a `SECURITY DEFINER` function (`rls_auto_enable`, not something in our schema — appears to be a platform-provided safety net that auto-enables RLS on new tables) was publicly callable via the API. Revoked public execute access on it; advisor now reports zero security findings.
- Performance advisor found only minor, expected notes (unused indexes on brand-new empty tables, a couple of redundant policy checks) — nothing urgent, noted for later.
