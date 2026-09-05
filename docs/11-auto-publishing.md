# Auto-Publishing — how a new post reaches the site by itself

**Status: partly built.** Sections 4 (YouTube thumbnails) and 5 (partial
layouts) are implemented and tested. **The switch is off** — `index.html` has
`ALLOW_PARTIAL_SECTIONS = false`, so the live site still shows the demo cards
and behaves exactly as before. Flipping that one word is the point of no
return and needs Fero's go-ahead, after real posts exist.
Written 2026-09-05 at Fero's request. This document covers one system and
nothing else: what happens between pressing **Publish** in the editor and the
story appearing in the right place on the site, with no one asking Claude to
do anything.

---

## 1. The short version

Most of this already works. The site does **not** need rebuilding or
redeploying when a post is published — every public page queries Supabase when
it loads, so a new row is visible to the next visitor immediately.

**One rule is what actually stands in the way**, and it is in
`assets/ttt-posts.js`:

```js
function fillSection(container, posts, slots, renderFn) {
  if (!container || !posts || posts.length < slots.length) return false;   // <-- this
```

A homepage section switches to real posts **only when there are enough posts
to fill every one of its slots**. Below that it keeps the hand-written demo
cards. That was a deliberate pre-launch choice — a half-empty homepage looks
broken, demo cards look intentional — and it is exactly the behaviour to
replace now.

So the work is: **remove the demo cards, and make each section render however
many real posts exist, gracefully.**

---

## 2. What exists today

### The four homepage sections

| Section | Slots | Currently filled from | Layout |
|---|---|---|---|
| **Trending** (`main.bento`) | 7 | newest posts, any type | 5-column grid, explicit positions |
| **Videos & Blogs** (`.rail`) | 5 | newest `post_type = 'video'` | horizontal rail |
| **Latest Articles** (`section.articles`) | 6 | newest `post_type = 'article'` | 3-col grid, first card wide |
| **Art & Photography** (`section.gallery`) | 8 | newest posts **that have a cover**, any type | masonry columns |

### The trending grid's geometry

```
.k-opinionvideo   col 1      row 1        1x1
.k-featured       col 2/4    row 1/3      2x2   <-- the big block
.k-artwork        col 4      row 1        1x1
.k-review         col 5      row 1        1x1
.k-photography    col 1      row 2        1x1
.k-newsvideo      col 4      row 2        1x1
.k-opinionart     col 5      row 2        1x1
```

Tablet (≤900px) collapses to 2 columns with the featured card spanning both.
Phone (≤560px) is a single column.

**The newest post already gets the big block.** `BENTO_BY_IMPORTANCE = [1, 0,
2, 3, 4, 5, 6]` maps *post rank* to *slot index*, because `.k-featured` sits at
index 1 in the array rather than index 0. So rank 0 (newest) lands in the 2x2.
That part of Fero's request is done and does not need redesigning — it just
needs to keep working when there are fewer than 7 posts.

### Everything else that is already automatic

- **Category pages** (`category.html?cat=…`) list real posts with real
  pagination, 24 a page.
- **Article pages** (`article.html?post=<slug>`) render from the slug.
- **Share previews** are rewritten at the edge by `functions/_middleware.js`,
  so a link pasted into Discord shows the real story.
- **Images** are uploaded to Cloudinary at publish time and deleted when the
  post is deleted.

---

## 3. Where each post type goes

This is the routing table the implementation should follow.

| `post_type` | Trending | Videos rail | Latest Articles | Gallery wall | Category page |
|---|---|---|---|---|---|
| `article` | yes | — | **yes** | if it has a cover | `?cat=articles` |
| `video` | yes | **yes** | — | if it has a cover | `?cat=videos` |
| `artwork` | yes | — | — | if it has a cover | `?cat=artwork` |
| `magazine` | yes | — | — | if it has a cover | `?cat=magazines` |

**Trending is type-blind on purpose** — it is "what's new at TTT", so the
newest post takes the big block whatever it is. Everything else is filtered by
type, which is what makes "videos go to the videos section" true.

A post therefore appears in **two or three places at once**, which is correct:
the trending grid is a front page, not a separate category.

**Ordering, everywhere:** `published_at` descending, nulls last, ties broken by
`id` descending so the order can never flicker between loads.

---

## 4. The cover photo

### Where it goes

Nothing about this needs to change; recording it so the whole path is in one
place.

1. The editor uploads the file straight from the browser to Cloudinary,
   signed by `/api/sign-upload`, into the `ttt-posts` folder.
2. Cloudinary returns a `secure_url`; the post row stores it in
   `cover_image_url`. **The image is never stored in the database**, only the
   link.
3. Every card asks Cloudinary for the size it needs, through `cdn()` in
   `assets/ttt-posts.js`, which inserts `f_auto,q_auto,w_<n>,c_limit`. One
   upload serves every slot — a phone gets a small WebP, a desktop gets a
   large one, and nobody resizes anything by hand.
4. Deleting the post deletes the image via `/api/delete-image`. Replacing a
   cover deletes the one it replaced.

### Shape

Cards use `.is-natural`, so **the photo keeps its own proportions** — portrait,
square and wide all sit correctly and nothing is cropped to a fixed ratio. The
gallery is a masonry wall precisely so mixed shapes look deliberate.

### When there is no cover

| Where | Behaviour |
|---|---|
| Trending / articles cards | falls back to the mockup's coloured placeholder box |
| Gallery wall | **the post is excluded** — a placeholder on a wall of pictures reads as a broken image |
| Share preview | falls back to `images/og-cover.png` |

**Decided 2026-09-05 and built: yes.** A video post with no cover now uses its
own YouTube thumbnail, so every video has a picture for free.
`https://i.ytimg.com` was added to `img-src`. The id is only ever taken from a
strict 11-character pattern (`watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`),
so a malformed `video_url` produces nothing rather than a broken image, and a
real cover always wins over the thumbnail. `cdn()` leaves these URLs alone
because it only rewrites paths containing `/image/upload/`.

**Note:** the gallery wall still requires a *real* cover. A wall of
photography padded out with video thumbnails is a different thing from a
gallery. Revisit if the wall stays thin.

**Open question (4.2):** should the editor *warn* when publishing without a
cover? Not block — warn. A post with no photo is legal but weaker everywhere it
appears.

---

## 5. The hard part: a homepage with only a few posts

This is the real design work, and it is where the plan needs Fero's decision
rather than Claude's guess.

The trending grid places all seven cards at **explicit** grid coordinates. Drop
three of them and the remaining cards stay pinned where they were, leaving
holes in the middle of the layout. It would look broken, not sparse.

### Built 2026-09-05 — and the research changed the design twice

The approach below was tested at every post count from 1 to 8 before being
built, and **the first two attempts were wrong in ways that only showed up
when measured**:

1. Taking the first N slots off the front of the array gave the newest post
   whichever card sits at index 0 — a *small* one — and **handed the big block
   to the second-newest**. With a single post there was no big block at all.
   The fix: pick slots in *importance* order, so the featured slot is always
   filled first.
2. The "is this grid short?" test lived inside `fillSection`, which compares
   the posts array against the slots array — but the caller now hands over a
   trimmed slot list, so the two are always equal and the packing CSS never
   applied. The fix: the caller decides, because the caller is the only one
   that knows.

Verified after fixing, at every count 1–8: the featured card holds the newest
post every time, and at 7+ the authored layout is used untouched.

### The approach — two layout modes

**When there are 7 or more posts:** keep exactly what exists today. Explicit
positions, byte-identical to the current design. Zero risk to the layout Fero
already approved.

**When there are fewer than 7:** drop the explicit `grid-column` / `grid-row`
from the small cards, keep `.k-featured` spanning `2 x 2`, and let the grid
auto-place with `grid-auto-flow: dense`. The cards then pack from the top-left
with no holes, at any count.

This gives a natural ramp:

| Posts | Trending shows |
|---|---|
| 1 | the featured block alone |
| 2–3 | featured plus small cards beside it |
| 4–6 | featured plus a filled row, packing left to right |
| 7+ | the designed grid, unchanged |

**Verified at exactly 7:** the packing class is absent and the authored
positions are used, so the approved layout cannot drift.

**One case still needs Fero's eye: a single post.** It renders as one 488px
featured card with the rest of the row empty — not broken, but lopsided under
a full-width section rule. Options: let the lone card span the full width, or
accept it as a state the site passes through in its first hour. Not decided.

### Minimums before a section appears at all

An empty band with a heading is worse than no section. Proposed:

| Section | Minimum | Why |
|---|---|---|
| Trending | 1 | one story is a front page |
| Videos & Blogs | 2 | a "rail" of one is not a rail |
| Latest Articles | 1 | the wide lead card stands alone fine |
| Art & Photography | 3 | a masonry wall needs a wall |

Below its minimum, the section **and its heading** hide entirely; the page
closes up around them. **These numbers are a proposal — Fero's call.**

---

## 6. What actually happens when Publish is pressed

```
Fero writes in the editor
   ├── cover uploaded to Cloudinary (signed)  ──> cover_image_url
   ├── type + category chosen                 ──> post_type, category_id
   └── PUBLISH
         │
         ├── one row written: status='published', published_at=now()
         │
         └── that is the entire deployment. No build. No push. No Claude.
               │
               ├── homepage      next load: newest post takes the big block,
               │                 and lands in its type's section
               ├── category page next load: appears in its category, page 1
               ├── article page  immediately live at ?post=<slug>
               ├── share preview edge middleware reads it by slug
               └── sitemap.xml   ** does NOT update — see section 8 **
```

**Timing:** the page HTML is served with `max-age=0, must-revalidate`, so no
visitor gets a stale page, and the post list is fetched live on each load. A
post is visible to the next person who opens the site — no cache to wait out.

### Un-publishing, editing, deleting

| Action | Effect |
|---|---|
| Publish → Draft | drops out of every section on the next load; the article URL shows the real "story isn't here" state |
| Edit and save | new text appears next load; the slug does **not** change, so existing links keep working |
| Delete | removed everywhere; cover and body images deleted from Cloudinary |

**Open question (6.1):** slugs are generated once from the title plus a short
suffix, and never change on edit. That is the right default — changing a slug
breaks every link already shared. Worth confirming Fero agrees.

**Decided 2026-09-05: no scheduled publishing.** Publishing stays manual —
Fero presses Publish and it goes live. `published_at` in the future is
therefore not a supported thing to do; it would appear immediately. Revisit
only if it is ever actually wanted.

---

## 7. Failure modes to handle

Right now, if the database is unreachable the homepage keeps its demo cards and
looks fine. **Once the demo cards are gone, that safety net goes with them.**
The implementation needs to decide what an empty page looks like:

- **Database unreachable:** sections should render nothing rather than a broken
  frame, and the page should still show masthead, footer and newsletter. It
  should never show a spinner forever.
- **A section with zero posts:** hidden, per section 5.
- **Genuinely zero posts site-wide** (the moment the demo cards are deleted and
  before the first real post): the homepage would be almost empty. **This is
  the strongest argument for publishing the first few posts *before* removing
  the demo cards**, which is the sequencing already recorded in
  `07-next-steps.md`.

---

## 8. The one thing that will NOT be automatic

**`sitemap.xml` is hand-written.** Nothing about publishing updates it. Left
alone, Google is handed a map that does not list any real story.

Two options, to decide when this is built:

- **A Pages Function** that renders the sitemap from the `posts` table on
  request. Then it is genuinely automatic and always correct. Costs one more
  Function, and the static `sitemap.xml` file must be deleted or it will win.
- **Regenerate by hand** at launch and occasionally after. Free, but it is a
  chore that will be forgotten.

**Recommendation: the Function.** "Automatic except this one file you must
remember" is how sitemaps rot. This is tracked separately in
`07-next-steps.md` as a blocker before search-engine indexing.

---

## 9. Build order

1. **Publish enough real posts to fill the homepage** (7 trending / 5 videos /
   6 articles / 8 with covers is the current full set). Fero.
2. **Decide the open questions** in sections 4, 5 and 6.
3. **Add the graceful-partial behaviour** (section 5) *while the demo cards are
   still in place*, so it can be tested against real posts without the site
   ever looking broken.
4. **Remove the demo cards** from `index.html`. This is the point of no return
   and the one visible change; it needs Fero's explicit go-ahead.
5. **Generate the sitemap** (section 8).
6. **Watch the first real publish end to end** and check it lands where this
   document says it should.

Steps 3 and 4 are deliberately separate. Doing 4 first is what would leave a
blank homepage.

---

## 10. Questions for Fero, collected

1. **(4.1)** Use the YouTube thumbnail when a video post has no cover? Needs a
   small CSP widening.
2. **(4.2)** Should the editor warn — not block — when publishing without a
   cover photo?
3. **(5)** Are the section minimums right: trending 1, videos 2, articles 1,
   gallery 3?
4. **(5)** Is "hide the section and its heading entirely" the right behaviour
   when a section is under its minimum?
5. **(6.1)** Confirm slugs should never change when a post is edited.
6. **(6.2)** Is scheduled publishing wanted?
7. **(8)** Sitemap: Pages Function, or regenerate by hand?
