# Features & Content Model

## What a post has
Title, subtitle/deck, body, cover photo, optional extra images (for photo essays/galleries), an optional YouTube link, a **type**, and a **category**.

- **Type** = Articles / Videos & Blogs / Art & Photography / Magazines. These are all equal — "Magazine" is just a label like the others, not a special structure. No PDFs, no separate layout, no extra fields.
- **Category** = the topical tag (Opinion, News, Culture, Review, Photo Essay, Tech, Special Issue, etc.), picked by whoever's posting.
- Posts are **Draft** or **Published** — no in-between review/approval state.
- Any staff account can create, edit, or delete any post. No per-person restrictions in v1.

## How posts are displayed (4 different card styles — don't collapse into one)

Same post data, but the site shows it differently depending on which section it's in. All 4 need to keep working once real data is wired in — not just one of them.

1. **Trending grid (homepage)** — solid pastel background (color varies per card), category badge with icon, title, author. The featured post additionally shows a cover photo and a short subtitle.
2. **Video carousel** — cover photo with a centered play-button overlay, category badge shown below the image (not on top of it), title, author. White card background.
3. **Latest Articles list** — larger photo, category badge, title, a short description/excerpt paragraph, author + date. The featured entry uses a 2-column layout (photo beside text); others stack photo-on-top.
4. **Art & Photography gallery** — full-bleed image filling the whole card, aspect ratio varies per piece (portrait / square / landscape / 4:5) matching the actual artwork, title + byline printed directly on the image over a dark gradient at the bottom. No separate text area below the image.

Separately, there's a single **full article page** (`article.html`, using a `?post=slug` URL) that every post links to when clicked — that one *is* just one template, parameterized by which post was picked. It's only the preview cards (the 4 above) that come in multiple styles.

## Who can post
- A small number of named accounts, for people actually working at TTT.
- Created directly in Supabase by an admin — there is no public sign-up page.
- Everyone else (the general public) can only read published posts. No account needed to browse.

## Newsletter
- The footer "Stay in the loop" box captures an email into a table.
- Actually *sending* a newsletter is a separate, later decision (Resend, or just manual sending) — not needed for launch.

## Genuinely undecided (not forgotten, just open — see 05-known-issues.md)
- A public "submit your story" page for non-team members was raised early on and never explicitly decided either way. Don't build it without asking first.