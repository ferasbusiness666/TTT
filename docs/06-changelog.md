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