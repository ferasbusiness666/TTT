# Tech Stack & Why

| Piece | Choice | Why |
|---|---|---|
| Hosting | Cloudflare Pages | No bandwidth cap at all (GitHub Pages had a soft 100GB/month limit), plus a cleaner default web address. Deploys from the same GitHub repo — just a different service pulling from it. |
| Repo visibility | Private | Cloudflare Pages deploys from private repos for free. GitHub Pages didn't allow that on the free plan, which is the only reason the repo was public for a while. That limitation is gone, so it's private. |
| Build | Claude Code, in the terminal, on a local machine | Full control, local preview before pushing, all permission modes available. |
| Database + Auth | Supabase | Considered switching to Cloudflare's own database (D1) since hosting is already on Cloudflare — decided against it. D1 has no built-in login system; using it would mean building authentication from scratch. Supabase's built-in login + security rules is exactly what protects against an unauthenticated action slipping through, so it stays. |
| Photo storage | Cloudinary | Free tier comfortably covers a small site's images. |
| Video | YouTube (linked, not uploaded) | Avoids burning through Cloudinary's video-processing credits, which are expensive relative to images. |
| License | Not needed | The repo is private now — only invited collaborators can see it at all, so there's no public visibility to protect against. A short copyright note is still fine to keep, it just isn't doing any real work anymore. |

## Keeping secret keys safe (true no matter what)

- Supabase's **anon key** is *meant* to be public — every Supabase app works this way, private repo or not. Real security comes from the database rules (Row Level Security), not from hiding this key.
- Supabase's **service_role key** and Cloudinary's **API secret** must never be committed to the repo, private or public. Use environment variables / repo secrets instead. Being private isn't a reason to get careless — treat every commit as if it could someday become public.

## Key decisions made along the way

- **Auth model:** a small, fixed number of staff accounts, created directly in Supabase by an admin. No public sign-up page.
- **Public access:** anyone can read published posts with no login. Only staff can write.
- **No approval workflow (v1):** sign in → post → it's live. Just Draft and Published — nothing in between.
- **No comments (v1):** deliberately left out. The schema is built so comments can be added later without touching existing data.
- **Git workflow:** commit the original Claude Design HTML as the very first commit, before any backend wiring starts. After every Claude Code change, run `git diff` to confirm nothing visual moved that wasn't supposed to. Ask for one small, scoped change at a time rather than broad open-ended requests.